-- Add legal and additional pages to page_builder_pages
-- This allows all pages to be edited through the Page Builder

-- Insert legal pages if they don't exist
INSERT INTO public.page_builder_pages (page_key, page_name, description, is_enabled)
VALUES 
  ('privacy-policy', 'Política de Privacidad', 'Página de política de privacidad del sitio', true),
  ('terms-of-service', 'Términos y Condiciones', 'Términos y condiciones de uso del sitio', true),
  ('cookies-policy', 'Política de Cookies', 'Información sobre el uso de cookies', true),
  ('legal-notice', 'Aviso Legal', 'Aviso legal del sitio web', true),
  ('shipping-policy', 'Política de Envíos', 'Información sobre envíos y entregas', true),
  ('return-policy', 'Política de Devoluciones', 'Información sobre devoluciones y reembolsos', true),
  ('about-us', 'Sobre Nosotros', 'Información sobre la empresa', true),
  ('contact', 'Contacto', 'Página de contacto', true),
  ('faq', 'Preguntas Frecuentes', 'Preguntas frecuentes de los clientes', true)
ON CONFLICT (page_key) DO NOTHING;

-- Ensure existing pages are present
INSERT INTO public.page_builder_pages (page_key, page_name, description, is_enabled)
VALUES 
  ('home', 'Inicio', 'Página principal del sitio', true),
  ('products', 'Productos', 'Catálogo de productos', true),
  ('quotes', 'Cotizaciones', 'Página de cotizaciones', true),
  ('gift-cards', 'Tarjetas Regalo', 'Página de tarjetas regalo', true),
  ('blog', 'Blog', 'Blog y artículos', true),
  ('gallery', 'Galería', 'Galería de imágenes y proyectos', true),
  ('my-account', 'Mi Cuenta', 'Página de cuenta de usuario', true)
ON CONFLICT (page_key) DO NOTHING;

-- Create a function to migrate legal_pages content to page_builder_sections
CREATE OR REPLACE FUNCTION migrate_legal_pages_to_sections()
RETURNS void AS $$
DECLARE
  legal_page RECORD;
  page_id UUID;
  page_mapping JSONB := '{
    "privacy": "privacy-policy",
    "terms": "terms-of-service", 
    "cookies": "cookies-policy",
    "legal_notice": "legal-notice"
  }'::jsonb;
BEGIN
  -- Iterate through legal_pages
  FOR legal_page IN SELECT * FROM public.legal_pages LOOP
    -- Get corresponding page_builder_page id
    SELECT id INTO page_id 
    FROM public.page_builder_pages 
    WHERE page_key = page_mapping->>legal_page.page_type;
    
    IF page_id IS NOT NULL THEN
      -- Check if a section already exists for this page
      IF NOT EXISTS (
        SELECT 1 FROM public.page_builder_sections 
        WHERE page_id = page_id AND section_type = 'text'
      ) THEN
        -- Create a text section with the legal page content
        INSERT INTO public.page_builder_sections (
          page_id, 
          section_type, 
          section_name, 
          display_order, 
          is_visible,
          content,
          settings,
          styles
        ) VALUES (
          page_id,
          'text',
          legal_page.title,
          0,
          true,
          jsonb_build_object(
            'title', legal_page.title,
            'text', legal_page.content
          ),
          jsonb_build_object('fullWidth', true),
          jsonb_build_object(
            'padding', '40px',
            'maxWidth', 'contained'
          )
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_legal_pages_to_sections();

-- Drop the function after use
DROP FUNCTION IF EXISTS migrate_legal_pages_to_sections();

-- Add comment to explain the migration
COMMENT ON TABLE public.page_builder_pages IS 'Unified page management system - includes all pages (legal, static, dynamic)';
