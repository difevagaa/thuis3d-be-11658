-- Añadir columnas faltantes a shipping_settings
ALTER TABLE public.shipping_settings 
ADD COLUMN IF NOT EXISTS free_shipping_products_only boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS enable_shipping_for_quotes boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS quotes_default_shipping_cost numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quotes_free_shipping_threshold numeric DEFAULT NULL;

-- Añadir columnas faltantes a shipping_postal_codes
ALTER TABLE public.shipping_postal_codes 
ADD COLUMN IF NOT EXISTS applies_to_products boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS applies_to_quotes boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS quotes_shipping_cost numeric DEFAULT NULL;

-- Añadir columnas faltantes a shipping_zones
ALTER TABLE public.shipping_zones 
ADD COLUMN IF NOT EXISTS applies_to_products boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS applies_to_quotes boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS quotes_base_cost numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quotes_cost_per_kg numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quotes_minimum_cost numeric DEFAULT NULL;