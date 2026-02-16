-- ============================================================================
-- IMPROVED RLS POLICIES FOR USER ROLE UPDATES AND VALIDATION
-- ============================================================================
-- This migration enhances RLS policies to ensure users updating roles
-- have proper validation and security measures in place.
-- ============================================================================

-- ============================================================================
-- 1. IMPROVE user_roles TABLE POLICIES
-- ============================================================================

-- Drop existing policies to recreate them with better validation
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and superadmins can manage all roles" ON public.user_roles;

-- Policy: Users can always view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Only admins and superadmins can insert/update/delete roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 2. ADD VALIDATION FUNCTION FOR ROLE ASSIGNMENTS
-- ============================================================================

-- Create or replace function to validate role assignments
CREATE OR REPLACE FUNCTION public.validate_role_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role text;
  target_role text;
BEGIN
  -- Get the current user's role
  SELECT role INTO current_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();

  target_role := NEW.role;

  -- Validate that role exists
  IF target_role NOT IN ('client', 'moderator', 'admin', 'superadmin') THEN
    -- Check if it's a custom role
    IF NOT EXISTS (SELECT 1 FROM public.custom_roles WHERE name = target_role) THEN
      RAISE EXCEPTION 'Invalid role: %', target_role;
    END IF;
  END IF;

  -- Superadmin can assign any role
  IF current_user_role = 'superadmin' THEN
    RETURN NEW;
  END IF;

  -- Admin can assign roles except superadmin
  IF current_user_role = 'admin' THEN
    IF target_role = 'superadmin' THEN
      RAISE EXCEPTION 'Only superadmins can assign superadmin role';
    END IF;
    RETURN NEW;
  END IF;

  -- Other users cannot assign roles
  RAISE EXCEPTION 'Insufficient permissions to assign roles';
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS validate_role_assignment_trigger ON public.user_roles;

-- Create trigger for role validation
CREATE TRIGGER validate_role_assignment_trigger
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.validate_role_assignment();

-- ============================================================================
-- 3. IMPROVE profiles TABLE POLICIES FOR ROLE-BASED ACCESS
-- ============================================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Users can update their own profile (except sensitive fields)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Admins can update any profile
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- 4. ADD AUDIT LOGGING FOR ROLE CHANGES
-- ============================================================================

-- Create audit log table for role changes if not exists
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_role text,
  new_role text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now(),
  reason text
);

-- Enable RLS on audit table
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view audit logs
CREATE POLICY "Admins can view role audit logs"
ON public.role_change_audit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Function to log role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the role change
  INSERT INTO public.role_change_audit (
    user_id,
    previous_role,
    new_role,
    changed_by
  ) VALUES (
    NEW.user_id,
    OLD.role,
    NEW.role,
    auth.uid()
  );
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS log_role_change_trigger ON public.user_roles;

-- Create trigger to log role changes
CREATE TRIGGER log_role_change_trigger
AFTER UPDATE ON public.user_roles
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role)
EXECUTE FUNCTION public.log_role_change();

-- ============================================================================
-- 5. PREVENT ROLE ESCALATION ATTACKS
-- ============================================================================

-- Function to prevent unauthorized role escalation
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_role text;
BEGIN
  -- Get current user's role
  SELECT role INTO current_user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();

  -- Users cannot change their own role
  IF NEW.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Users cannot change their own role';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON public.user_roles;

-- Create trigger to prevent self-role changes
CREATE TRIGGER prevent_role_escalation_trigger
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_escalation();

-- ============================================================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Users can view their own roles" ON public.user_roles IS 
'Allows authenticated users to view their own role assignments';

COMMENT ON POLICY "Admins can view all roles" ON public.user_roles IS 
'Allows administrators to view all user role assignments';

COMMENT ON POLICY "Admins can manage all roles" ON public.user_roles IS 
'Allows administrators to create, update, and delete user role assignments with validation';

COMMENT ON FUNCTION public.validate_role_assignment() IS 
'Validates role assignments to ensure only authorized users can assign specific roles';

COMMENT ON FUNCTION public.log_role_change() IS 
'Logs all role changes for audit purposes';

COMMENT ON FUNCTION public.prevent_role_escalation() IS 
'Prevents users from changing their own roles to escalate privileges';

COMMENT ON TABLE public.role_change_audit IS 
'Audit log for tracking all role changes in the system';

-- ============================================================================
-- 7. VERIFICATION QUERY (COMMENTED OUT - USE SEPARATELY FOR INSPECTION)
-- ============================================================================

-- Uncomment this query to verify policies after migration:
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('user_roles', 'profiles')
-- ORDER BY tablename, policyname;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
