-- ============================================
-- Fix for multilingual SEO keywords and shipping RLS policies
-- This migration addresses two critical issues:
-- 1. Missing 'language' column in seo_keywords table for multilingual support
-- 2. Restrictive SELECT policies on shipping tables that prevent admins from managing inactive records
-- ============================================

-- ============================================
-- PART 1: Add 'language' column to seo_keywords table
-- This enables storing keywords in multiple languages (ES, EN, NL) for Belgium market
-- ============================================

-- Add language column if it doesn't exist
ALTER TABLE public.seo_keywords 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es';

-- Create index for language-based queries
CREATE INDEX IF NOT EXISTS idx_seo_keywords_language 
ON public.seo_keywords(language, is_active);

-- Create composite index for multilingual keyword lookups
CREATE INDEX IF NOT EXISTS idx_seo_keywords_language_source 
ON public.seo_keywords(language, source_type, source_id);

-- Drop the old unique constraint that only considers keyword
-- The new constraint considers keyword + language to allow same keyword in different languages
ALTER TABLE public.seo_keywords
DROP CONSTRAINT IF EXISTS seo_keywords_keyword_unique;

-- Drop the old unique index
DROP INDEX IF EXISTS idx_seo_keywords_unique;

-- Create new unique constraint that includes language
-- This allows the same keyword to exist in different languages (e.g., "quality" in EN, "calidad" in ES are different)
-- But also allows keywords like "3d printing" to exist with language='en' and "3d printing" with language='nl' 
-- since Dutch and English share some terms
CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_keywords_unique_lang 
ON public.seo_keywords(keyword, COALESCE(language, 'es'), source_type, COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ============================================
-- PART 2: Fix SELECT policies for shipping tables
-- Admins need to see ALL records (including inactive) to manage them
-- ============================================

-- Fix shipping_zones SELECT policy
DROP POLICY IF EXISTS "Anyone can view active shipping zones" ON public.shipping_zones;
DROP POLICY IF EXISTS "Admins can view all shipping zones" ON public.shipping_zones;

-- Allow anyone to view active zones (for checkout)
CREATE POLICY "Anyone can view active shipping zones" 
ON public.shipping_zones 
FOR SELECT 
USING (is_active = true);

-- Allow admins to view ALL zones (including inactive) for management
CREATE POLICY "Admins can view all shipping zones" 
ON public.shipping_zones 
FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text));

-- Fix shipping_postal_codes SELECT policy
DROP POLICY IF EXISTS "Anyone can view enabled postal codes" ON public.shipping_postal_codes;
DROP POLICY IF EXISTS "Admins can view all postal codes" ON public.shipping_postal_codes;

-- Allow anyone to view enabled postal codes (for checkout)
CREATE POLICY "Anyone can view enabled postal codes" 
ON public.shipping_postal_codes 
FOR SELECT 
USING (is_enabled = true);

-- Allow admins to view ALL postal codes (including disabled) for management
CREATE POLICY "Admins can view all postal codes" 
ON public.shipping_postal_codes 
FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text));

-- Fix shipping_countries SELECT policy
DROP POLICY IF EXISTS "Anyone can view enabled shipping countries" ON public.shipping_countries;
DROP POLICY IF EXISTS "Admins can view all shipping countries" ON public.shipping_countries;

-- Allow anyone to view enabled countries (for checkout)
CREATE POLICY "Anyone can view enabled shipping countries" 
ON public.shipping_countries 
FOR SELECT 
USING (is_enabled = true);

-- Allow admins to view ALL countries (including disabled) for management
CREATE POLICY "Admins can view all shipping countries" 
ON public.shipping_countries 
FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text));

-- Fix product_shipping_rates SELECT policy
DROP POLICY IF EXISTS "Anyone can view product shipping rates" ON public.product_shipping_rates;
DROP POLICY IF EXISTS "Admins can view all product shipping rates" ON public.product_shipping_rates;

-- Allow anyone to view enabled shipping rates (for checkout)
CREATE POLICY "Anyone can view enabled product shipping rates" 
ON public.product_shipping_rates 
FOR SELECT 
USING (is_enabled = true);

-- Allow admins to view ALL shipping rates for management
CREATE POLICY "Admins can view all product shipping rates" 
ON public.product_shipping_rates 
FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text));

-- ============================================
-- PART 3: Ensure shipping_settings has proper SELECT policy for admins
-- ============================================

-- The existing policy allows anyone to view, but let's ensure admins can also SELECT
-- (This is already covered by "Anyone can view shipping settings" but we add explicit admin policy for clarity)
DROP POLICY IF EXISTS "Admins can select shipping settings" ON public.shipping_settings;

CREATE POLICY "Admins can select shipping settings" 
ON public.shipping_settings 
FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::text));
