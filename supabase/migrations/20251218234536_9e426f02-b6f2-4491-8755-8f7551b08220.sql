-- 1) Ensure superadmin is treated as admin in role checks used by many RLS policies
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role::text = _role
        OR (_role = 'admin' AND role::text = 'superadmin')
      )
  )
$$;

-- 2) Fix linter: set search_path for immutable function
CREATE OR REPLACE FUNCTION public.is_valid_uuid(text_value text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF text_value IS NULL OR text_value = '' OR text_value = 'undefined' OR text_value = 'null' THEN
    RETURN FALSE;
  END IF;

  PERFORM text_value::UUID;
  RETURN TRUE;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN FALSE;
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- 3) Remove overly-restrictive admin-only policies that break superadmin flows
-- 3a) product_roles: the FOR ALL policy without WITH CHECK forces exact 'admin' and blocks 'superadmin'
DROP POLICY IF EXISTS "Admins can manage product roles" ON public.product_roles;

-- 3b) storage message attachments: remove duplicate admin-only FOR ALL policy that blocks superadmin
DROP POLICY IF EXISTS "Admins can manage all message attachments" ON storage.objects;

-- 4) Make role assignment atomic & server-validated to prevent users ending up with 'Sin rol'
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id is required';
  END IF;

  IF new_role IS NULL OR btrim(new_role) = '' THEN
    RAISE EXCEPTION 'new_role is required';
  END IF;

  IF NOT public.is_admin_or_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Validate role exists (system roles or custom roles)
  IF NOT (
    new_role IN ('superadmin','admin','moderator','client')
    OR EXISTS (SELECT 1 FROM public.custom_roles cr WHERE cr.name = new_role)
  ) THEN
    RAISE EXCEPTION 'invalid role: %', new_role;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (target_user_id, new_role);
END;
$$;