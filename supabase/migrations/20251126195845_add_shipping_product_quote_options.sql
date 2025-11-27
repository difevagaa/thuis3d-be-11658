-- Migration: Add product/quote differentiation options to shipping tables
-- This allows administrators to configure shipping costs separately for products and quotes

-- Add columns to shipping_postal_codes table
ALTER TABLE public.shipping_postal_codes 
ADD COLUMN IF NOT EXISTS applies_to_products boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS applies_to_quotes boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS quotes_shipping_cost numeric DEFAULT NULL;

-- Add columns to shipping_zones table
ALTER TABLE public.shipping_zones 
ADD COLUMN IF NOT EXISTS applies_to_products boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS applies_to_quotes boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS quotes_base_cost numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quotes_cost_per_kg numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quotes_minimum_cost numeric DEFAULT NULL;

-- Add columns to shipping_settings table for global configuration
ALTER TABLE public.shipping_settings 
ADD COLUMN IF NOT EXISTS free_shipping_products_only boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_shipping_for_quotes boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS quotes_default_shipping_cost numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quotes_free_shipping_threshold numeric DEFAULT NULL;

-- Add helpful comments
COMMENT ON COLUMN public.shipping_postal_codes.applies_to_products IS 'Whether this postal code rate applies to product orders';
COMMENT ON COLUMN public.shipping_postal_codes.applies_to_quotes IS 'Whether this postal code rate applies to quote orders';
COMMENT ON COLUMN public.shipping_postal_codes.quotes_shipping_cost IS 'Optional separate shipping cost for quotes (uses shipping_cost if NULL)';

COMMENT ON COLUMN public.shipping_zones.applies_to_products IS 'Whether this zone applies to product orders';
COMMENT ON COLUMN public.shipping_zones.applies_to_quotes IS 'Whether this zone applies to quote orders';
COMMENT ON COLUMN public.shipping_zones.quotes_base_cost IS 'Optional separate base cost for quotes';
COMMENT ON COLUMN public.shipping_zones.quotes_cost_per_kg IS 'Optional separate cost per kg for quotes';
COMMENT ON COLUMN public.shipping_zones.quotes_minimum_cost IS 'Optional separate minimum cost for quotes';

COMMENT ON COLUMN public.shipping_settings.free_shipping_products_only IS 'When true, free shipping threshold only applies to products';
COMMENT ON COLUMN public.shipping_settings.enable_shipping_for_quotes IS 'Enable shipping calculation for quotes';
COMMENT ON COLUMN public.shipping_settings.quotes_default_shipping_cost IS 'Default shipping cost for quotes (uses default_shipping_cost if NULL)';
COMMENT ON COLUMN public.shipping_settings.quotes_free_shipping_threshold IS 'Free shipping threshold specifically for quotes';
