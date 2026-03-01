
-- Fix infinite recursion in user_roles RLS policy
-- The current "Roles_Admin_Manage" policy queries user_roles within its own policy, causing infinite loop

-- Drop the recursive policy
DROP POLICY IF EXISTS "Roles_Admin_Manage" ON public.user_roles;

-- Recreate using is_admin_or_superadmin() which is SECURITY DEFINER and bypasses RLS
CREATE POLICY "Roles_Admin_Manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_admin_or_superadmin(auth.uid()))
  WITH CHECK (public.is_admin_or_superadmin(auth.uid()));
