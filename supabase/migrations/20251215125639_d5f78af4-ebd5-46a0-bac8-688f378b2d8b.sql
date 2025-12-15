
-- Fix RLS policies to include superadmin role

-- First, update the has_role function to check for superadmin as well when checking admin
-- This is more efficient than updating every single policy

-- Create a helper function that checks if user is admin OR superadmin
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = is_admin_or_superadmin.user_id
      AND role IN ('admin', 'superadmin')
  )
$$;

-- Drop old policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create new policies that include superadmin
CREATE POLICY "Admins and superadmins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (public.is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Admins and superadmins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (public.is_admin_or_superadmin(auth.uid()));

-- Users can still view and update their own profile
-- (These policies already exist, no need to change)

-- Drop old policy on user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Create new policy that includes superadmin
CREATE POLICY "Admins and superadmins can manage all roles"
ON user_roles FOR ALL
TO authenticated
USING (public.is_admin_or_superadmin(auth.uid()))
WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- Update notify_admins_async to also notify superadmins
CREATE OR REPLACE FUNCTION public.notify_admins_async(
  p_type text, 
  p_subject text, 
  p_message text, 
  p_link text DEFAULT '/admin/pedidos'::text, 
  p_order_number text DEFAULT NULL::text, 
  p_customer_name text DEFAULT NULL::text, 
  p_customer_email text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  admin_rec RECORD;
  req_id bigint;
BEGIN
  -- Include both admin AND superadmin
  FOR admin_rec IN 
    SELECT DISTINCT p.id, p.email
    FROM profiles p
    INNER JOIN user_roles ur ON p.id = ur.user_id
    WHERE ur.role IN ('admin', 'superadmin')
  LOOP
    -- Crear notificación in-app
    INSERT INTO notifications (user_id, type, title, message, link, is_read)
    VALUES (admin_rec.id, p_type, p_subject, p_message, p_link, false)
    ON CONFLICT DO NOTHING;
    
    -- Enviar email al admin
    IF admin_rec.email IS NOT NULL THEN
      SELECT net.http_post(
        url := 'https://ljygreayxxpsdmncwzia.supabase.co/functions/v1/send-admin-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeWdyZWF5eHhwc2RtbmN3emlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODMxOTUsImV4cCI6MjA3ODM1OTE5NX0.309lxyM-chybzF-Df_nj9PiW83dE379iw1D5EgKLkUI"}'::jsonb,
        body := jsonb_build_object(
          'to', admin_rec.email,
          'type', p_type,
          'subject', p_subject,
          'message', p_message,
          'link', p_link,
          'order_number', p_order_number,
          'customer_name', p_customer_name,
          'customer_email', p_customer_email
        )
      ) INTO req_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '📧 Admin notifications queued';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '⚠️ Admin notify error: %', SQLERRM;
END;
$function$;

-- Update notify_all_admins to also include superadmins
CREATE OR REPLACE FUNCTION public.notify_all_admins(
  p_type text, 
  p_title text, 
  p_message text, 
  p_link text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  admin_record RECORD;
  notification_exists BOOLEAN;
BEGIN
  -- Include both admin AND superadmin
  FOR admin_record IN 
    SELECT DISTINCT p.id
    FROM profiles p
    INNER JOIN user_roles ur ON p.id = ur.user_id
    WHERE ur.role IN ('admin', 'superadmin')
  LOOP
    -- Verificar si ya existe notificación similar en los últimos 30 segundos
    SELECT EXISTS(
      SELECT 1 FROM notifications
      WHERE user_id = admin_record.id
        AND type = p_type
        AND title = p_title
        AND created_at > NOW() - INTERVAL '30 seconds'
    ) INTO notification_exists;
    
    -- Solo insertar si no existe
    IF NOT notification_exists THEN
      INSERT INTO notifications (user_id, type, title, message, link, is_read)
      VALUES (admin_record.id, p_type, p_title, p_message, p_link, false)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$function$;

-- Grant execute on the new function
GRANT EXECUTE ON FUNCTION public.is_admin_or_superadmin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_superadmin TO anon;
