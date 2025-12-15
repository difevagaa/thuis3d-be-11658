
-- Drop existing policies on site_settings
DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;

-- Create new policy that includes both admin and superadmin
CREATE POLICY "Admins can manage site settings" ON public.site_settings
FOR ALL
TO authenticated
USING (public.is_admin_or_superadmin(auth.uid()))
WITH CHECK (public.is_admin_or_superadmin(auth.uid()));
