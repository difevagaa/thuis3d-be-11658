-- Fix RLS policy for site_customization to allow admins to INSERT/UPDATE
-- The previous policy only had USING clause which works for SELECT but not for INSERT/UPDATE
-- We need to add WITH CHECK clause for modification operations

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage site customization" ON public.site_customization;

-- Create separate policies for different operations for clarity
-- Policy for SELECT (read) - already exists as "Anyone can view site customization"
-- No need to recreate it

-- Policy for INSERT - admins can insert new customization records
CREATE POLICY "Admins can insert site customization" 
ON public.site_customization 
FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- Policy for UPDATE - admins can update existing customization records  
CREATE POLICY "Admins can update site customization" 
ON public.site_customization 
FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text))
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- Policy for DELETE - admins can delete customization records
CREATE POLICY "Admins can delete site customization" 
ON public.site_customization 
FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text));

-- Also fix site_settings table which has the same issue
DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;

-- Policy for INSERT - admins can insert new settings
CREATE POLICY "Admins can insert site settings" 
ON public.site_settings 
FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- Policy for UPDATE - admins can update existing settings
CREATE POLICY "Admins can update site settings" 
ON public.site_settings 
FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text))
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- Policy for DELETE - admins can delete settings
CREATE POLICY "Admins can delete site settings" 
ON public.site_settings 
FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text));
