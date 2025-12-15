-- Añadir 25+ nuevas columnas funcionales a productos
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_new boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_bestseller boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_on_sale boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sale_price numeric(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sale_end_date timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sku text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS barcode text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS brand text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS manufacturer text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS origin_country text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS min_order_quantity integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_order_quantity integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS low_stock_alert integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS is_digital boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS digital_file_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS requires_shipping boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_fragile boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS estimated_delivery_days integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS warranty_months integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS return_policy text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meta_title text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meta_description text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meta_keywords text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS seo_slug text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS compare_at_price numeric(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cost_price numeric(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS profit_margin numeric(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_preorder boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS preorder_release_date timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_gift_wrappable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gift_wrap_price numeric(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS age_restriction integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_eco_friendly boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS materials_info text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS care_instructions text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS related_product_ids uuid[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS upsell_product_ids uuid[] DEFAULT NULL;

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_is_new ON products(is_new) WHERE is_new = true;
CREATE INDEX IF NOT EXISTS idx_products_is_bestseller ON products(is_bestseller) WHERE is_bestseller = true;
CREATE INDEX IF NOT EXISTS idx_products_is_on_sale ON products(is_on_sale) WHERE is_on_sale = true;
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand) WHERE brand IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_display_order ON products(display_order);
CREATE INDEX IF NOT EXISTS idx_products_seo_slug ON products(seo_slug) WHERE seo_slug IS NOT NULL;

-- Añadir constraint único para SKU
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_sku_unique') THEN
    ALTER TABLE products ADD CONSTRAINT products_sku_unique UNIQUE (sku);
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- Añadir constraint único para SEO slug
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_seo_slug_unique') THEN
    ALTER TABLE products ADD CONSTRAINT products_seo_slug_unique UNIQUE (seo_slug);
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;