-- Migration: Add allow_quote_request column to products table
-- This column controls visibility of the "Request Quote" button on product pages
-- Previously this field was in the frontend but missing from the database, causing save errors

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS allow_quote_request boolean DEFAULT true;

-- Add helpful comment
COMMENT ON COLUMN public.products.allow_quote_request IS 'Controls whether the "Request Quote" button is shown on the product page. Default is true.';

-- Update existing products to have quote request enabled by default
UPDATE public.products 
SET allow_quote_request = true 
WHERE allow_quote_request IS NULL;
