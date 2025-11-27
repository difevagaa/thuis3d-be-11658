-- Fix RLS policies for shipping tables to allow admins to INSERT/UPDATE/DELETE
-- The previous policies only had USING clause which works for SELECT but not for INSERT
-- We need to add WITH CHECK clause for INSERT operations
-- This follows the same pattern used for site_customization fix

-- ============================================
-- FIX: shipping_settings table
-- ============================================

-- Drop the existing restrictive policy for shipping_settings
DROP POLICY IF EXISTS "Admins can manage shipping settings" ON public.shipping_settings;

-- Policy for INSERT - admins can insert new shipping settings
CREATE POLICY "Admins can insert shipping settings" 
ON public.shipping_settings 
FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- Policy for UPDATE - admins can update existing shipping settings  
CREATE POLICY "Admins can update shipping settings" 
ON public.shipping_settings 
FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text))
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- Policy for DELETE - admins can delete shipping settings
CREATE POLICY "Admins can delete shipping settings" 
ON public.shipping_settings 
FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text));

-- ============================================
-- FIX: shipping_countries table
-- ============================================

-- Drop the existing restrictive policy for shipping_countries
DROP POLICY IF EXISTS "Admins can manage shipping countries" ON public.shipping_countries;

-- Policy for INSERT - admins can insert new shipping countries
CREATE POLICY "Admins can insert shipping countries" 
ON public.shipping_countries 
FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- Policy for UPDATE - admins can update existing shipping countries  
CREATE POLICY "Admins can update shipping countries" 
ON public.shipping_countries 
FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text))
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- Policy for DELETE - admins can delete shipping countries
CREATE POLICY "Admins can delete shipping countries" 
ON public.shipping_countries 
FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text));

-- ============================================
-- FIX: shipping_zones table
-- ============================================

-- Drop the existing restrictive policy for shipping_zones
DROP POLICY IF EXISTS "Admins can manage shipping zones" ON public.shipping_zones;

-- Policy for INSERT - admins can insert new shipping zones
CREATE POLICY "Admins can insert shipping zones" 
ON public.shipping_zones 
FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- Policy for UPDATE - admins can update existing shipping zones  
CREATE POLICY "Admins can update shipping zones" 
ON public.shipping_zones 
FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text))
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- Policy for DELETE - admins can delete shipping zones
CREATE POLICY "Admins can delete shipping zones" 
ON public.shipping_zones 
FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text));

-- ============================================
-- FIX: shipping_postal_codes table
-- ============================================

-- Drop the existing restrictive policy for shipping_postal_codes
DROP POLICY IF EXISTS "Admins can manage postal codes" ON public.shipping_postal_codes;

-- Policy for INSERT - admins can insert new postal codes
CREATE POLICY "Admins can insert postal codes" 
ON public.shipping_postal_codes 
FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- Policy for UPDATE - admins can update existing postal codes  
CREATE POLICY "Admins can update postal codes" 
ON public.shipping_postal_codes 
FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text))
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- Policy for DELETE - admins can delete postal codes
CREATE POLICY "Admins can delete postal codes" 
ON public.shipping_postal_codes 
FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text));

-- ============================================
-- FIX: product_shipping_rates table
-- ============================================

-- Drop the existing restrictive policy for product_shipping_rates
DROP POLICY IF EXISTS "Admins can manage product shipping rates" ON public.product_shipping_rates;

-- Policy for INSERT - admins can insert new product shipping rates
CREATE POLICY "Admins can insert product shipping rates" 
ON public.product_shipping_rates 
FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- Policy for UPDATE - admins can update existing product shipping rates  
CREATE POLICY "Admins can update product shipping rates" 
ON public.product_shipping_rates 
FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text))
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- Policy for DELETE - admins can delete product shipping rates
CREATE POLICY "Admins can delete product shipping rates" 
ON public.product_shipping_rates 
FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text));
