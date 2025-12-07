-- Ensure all pages exist in page_builder_pages
-- This migration adds any missing pages without creating new tables

-- Insert all pages with ON CONFLICT DO NOTHING to avoid duplicates
INSERT INTO public.page_builder_pages (page_key, page_name, description, is_enabled)
VALUES 
  -- Core pages
  ('home', 'Página de Inicio', 'Página principal del sitio web', true),
  ('products', 'Productos', 'Catálogo de productos', true),
  ('quotes', 'Cotizaciones', 'Página de cotizaciones', true),
  ('gift-cards', 'Tarjetas de Regalo', 'Página de tarjetas regalo', true),
  ('blog', 'Blog', 'Blog y artículos', true),
  ('gallery', 'Galería', 'Galería de imágenes y proyectos', true),
  ('my-account', 'Mi Cuenta', 'Página de cuenta de usuario', true),
  
  -- Legal pages
  ('privacy-policy', 'Política de Privacidad', 'Página de política de privacidad del sitio', true),
  ('terms-of-service', 'Términos y Condiciones', 'Términos y condiciones de uso del sitio', true),
  ('cookies-policy', 'Política de Cookies', 'Información sobre el uso de cookies', true),
  ('legal-notice', 'Aviso Legal', 'Aviso legal del sitio web', true),
  ('shipping-policy', 'Política de Envíos', 'Información sobre envíos y entregas', true),
  ('return-policy', 'Política de Devoluciones', 'Información sobre devoluciones y reembolsos', true),
  
  -- Additional pages
  ('about-us', 'Sobre Nosotros', 'Información sobre la empresa', true),
  ('contact', 'Contacto', 'Página de contacto', true),
  ('faq', 'Preguntas Frecuentes', 'Preguntas frecuentes de los clientes', true)
ON CONFLICT (page_key) DO UPDATE SET
  page_name = EXCLUDED.page_name,
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled;

-- Add comment
COMMENT ON TABLE public.page_builder_pages IS 'All pages in the system - managed through page builder without additional tables';
