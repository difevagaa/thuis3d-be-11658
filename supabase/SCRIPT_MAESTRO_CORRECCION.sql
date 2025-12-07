-- ============================================================================
-- SCRIPT MAESTRO PARA CORREGIR SUPABASE
-- ============================================================================
-- Este script crea y puebla todas las tablas necesarias para el Page Builder
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================================================

-- PASO 1: Verificar si las tablas existen, si no, las creamos
-- ============================================================================

-- Verificar y crear tabla page_builder_pages si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'page_builder_pages') THEN
    CREATE TABLE public.page_builder_pages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      page_key TEXT UNIQUE NOT NULL,
      page_name TEXT NOT NULL,
      description TEXT,
      is_enabled BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    
    -- Enable RLS
    ALTER TABLE public.page_builder_pages ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Anyone can view enabled pages" 
      ON public.page_builder_pages FOR SELECT 
      USING (is_enabled = true);
      
    CREATE POLICY "Authenticated users can view all pages" 
      ON public.page_builder_pages FOR SELECT 
      USING (auth.role() = 'authenticated');
      
    RAISE NOTICE 'Created table: page_builder_pages';
  ELSE
    RAISE NOTICE 'Table page_builder_pages already exists';
  END IF;
END $$;

-- Verificar y crear tabla page_builder_sections si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'page_builder_sections') THEN
    CREATE TABLE public.page_builder_sections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      page_id UUID NOT NULL REFERENCES public.page_builder_pages(id) ON DELETE CASCADE,
      section_type TEXT NOT NULL,
      section_name TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      is_visible BOOLEAN DEFAULT true,
      content JSONB DEFAULT '{}',
      settings JSONB DEFAULT '{}',
      styles JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    
    -- Create indexes
    CREATE INDEX idx_page_builder_sections_page_id ON public.page_builder_sections(page_id);
    CREATE INDEX idx_page_builder_sections_display_order ON public.page_builder_sections(display_order);
    
    -- Enable RLS
    ALTER TABLE public.page_builder_sections ENABLE ROW LEVEL SECURITY;
    
    -- Create policies
    CREATE POLICY "Anyone can view visible sections" 
      ON public.page_builder_sections FOR SELECT 
      USING (is_visible = true);
      
    CREATE POLICY "Authenticated users can view all sections" 
      ON public.page_builder_sections FOR SELECT 
      USING (auth.role() = 'authenticated');
      
    RAISE NOTICE 'Created table: page_builder_sections';
  ELSE
    RAISE NOTICE 'Table page_builder_sections already exists';
  END IF;
END $$;

-- ============================================================================
-- PASO 2: Insertar o actualizar todas las páginas
-- ============================================================================

INSERT INTO public.page_builder_pages (page_key, page_name, description, is_enabled)
VALUES 
  -- Páginas principales
  ('home', 'Página de Inicio', 'Página principal del sitio web', true),
  ('products', 'Productos', 'Catálogo de productos', true),
  ('blog', 'Blog', 'Blog y artículos', true),
  ('gallery', 'Galería', 'Galería de imágenes y proyectos', true),
  ('about-us', 'Sobre Nosotros', 'Información sobre la empresa', true),
  ('contact', 'Contacto', 'Página de contacto', true),
  ('faq', 'Preguntas Frecuentes', 'Preguntas frecuentes de los clientes', true),
  
  -- Páginas legales
  ('privacy-policy', 'Política de Privacidad', 'Política de privacidad del sitio', true),
  ('terms-of-service', 'Términos y Condiciones', 'Términos y condiciones de uso', true),
  ('cookies-policy', 'Política de Cookies', 'Información sobre el uso de cookies', true),
  ('legal-notice', 'Aviso Legal', 'Aviso legal del sitio web', true),
  ('shipping-policy', 'Política de Envíos', 'Información sobre envíos y entregas', true),
  ('return-policy', 'Política de Devoluciones', 'Información sobre devoluciones', true)
ON CONFLICT (page_key) DO UPDATE SET
  page_name = EXCLUDED.page_name,
  description = EXCLUDED.description,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = now();

-- ============================================================================
-- PASO 3: Función helper para obtener ID de página
-- ============================================================================

CREATE OR REPLACE FUNCTION get_page_id_by_key(page_key_param TEXT)
RETURNS UUID AS $$
DECLARE
  page_id_var UUID;
BEGIN
  SELECT id INTO page_id_var
  FROM public.page_builder_pages
  WHERE page_key = page_key_param;
  RETURN page_id_var;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PASO 4: Poblar contenido de la página HOME
-- ============================================================================

-- Limpiar secciones existentes de home (opcional, comentar si quieres mantener)
-- DELETE FROM public.page_builder_sections WHERE page_id = get_page_id_by_key('home');

INSERT INTO public.page_builder_sections (page_id, section_type, section_name, display_order, is_visible, content, settings, styles)
VALUES 
  -- Hero Banner
  (
    get_page_id_by_key('home'),
    'hero',
    'Banner Principal',
    0,
    true,
    jsonb_build_object(
      'title', 'Impresión 3D Profesional',
      'subtitle', 'Transformamos tus ideas en realidad con tecnología de vanguardia',
      'description', 'Servicio de impresión 3D de alta calidad para profesionales y entusiastas',
      'buttonText', 'Ver Productos',
      'buttonUrl', '/productos',
      'secondButtonText', 'Solicitar Cotización',
      'secondButtonUrl', '/cotizaciones'
    ),
    jsonb_build_object('showSecondButton', true, 'buttonStyle', 'primary', 'secondButtonStyle', 'outline', 'fullWidth', true, 'height', 'large'),
    jsonb_build_object('backgroundColor', '#f8f9fa', 'textColor', '#1a1a1a', 'padding', 80, 'textAlign', 'center')
  ),
  
  -- Features Section
  (
    get_page_id_by_key('home'),
    'features',
    '¿Por Qué Elegirnos?',
    1,
    true,
    jsonb_build_object(
      'title', '¿Por Qué Elegirnos?',
      'subtitle', 'Calidad, experiencia y servicio excepcional',
      'features', jsonb_build_array(
        jsonb_build_object('title', 'Calidad Premium', 'description', 'Utilizamos las mejores tecnologías de impresión 3D del mercado', 'icon', 'star'),
        jsonb_build_object('title', 'Entrega Rápida', 'description', 'Tiempos de producción optimizados sin comprometer la calidad', 'icon', 'zap'),
        jsonb_build_object('title', 'Asesoría Experta', 'description', 'Nuestro equipo te acompaña en cada etapa del proyecto', 'icon', 'users'),
        jsonb_build_object('title', 'Precios Competitivos', 'description', 'Cotizaciones transparentes con la mejor relación calidad-precio', 'icon', 'dollar-sign')
      )
    ),
    jsonb_build_object('layout', 'grid', 'columns', 4, 'showIcons', true),
    jsonb_build_object('backgroundColor', '#ffffff', 'padding', 60, 'textAlign', 'center')
  ),
  
  -- CTA Section
  (
    get_page_id_by_key('home'),
    'cta',
    'Comienza Tu Proyecto',
    2,
    true,
    jsonb_build_object(
      'title', '¿Listo para dar vida a tu proyecto?',
      'description', 'Solicita una cotización gratuita y descubre cómo podemos ayudarte',
      'buttonText', 'Solicitar Cotización',
      'buttonUrl', '/cotizaciones'
    ),
    jsonb_build_object('centered', true, 'fullWidth', false),
    jsonb_build_object('backgroundColor', '#0066cc', 'textColor', '#ffffff', 'padding', 80, 'textAlign', 'center')
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PASO 5: Poblar contenido de FAQ
-- ============================================================================

INSERT INTO public.page_builder_sections (page_id, section_type, section_name, display_order, is_visible, content, settings, styles)
VALUES (
  get_page_id_by_key('faq'),
  'accordion',
  'Preguntas Frecuentes',
  0,
  true,
  jsonb_build_object(
    'title', 'Preguntas Frecuentes',
    'items', jsonb_build_array(
      jsonb_build_object('title', '¿Qué formatos de archivo aceptan?', 'content', 'Aceptamos archivos STL, OBJ, 3MF y STEP.'),
      jsonb_build_object('title', '¿Cuánto cuesta un proyecto?', 'content', 'El coste depende del tamaño, material y complejidad. Usa nuestra calculadora online.'),
      jsonb_build_object('title', '¿Cuánto tiempo tarda?', 'content', 'Generalmente entre 3-7 días laborables.'),
      jsonb_build_object('title', '¿Qué materiales están disponibles?', 'content', 'Ofrecemos PLA, ABS, PETG, TPU, resinas, nylon y materiales especiales.')
    )
  ),
  jsonb_build_object('allowMultiple', false),
  jsonb_build_object('backgroundColor', '#ffffff', 'padding', 60, 'maxWidth', '900px')
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- PASO 6: Poblar contenido de CONTACT
-- ============================================================================

INSERT INTO public.page_builder_sections (page_id, section_type, section_name, display_order, is_visible, content, settings, styles)
VALUES (
  get_page_id_by_key('contact'),
  'text',
  'Información de Contacto',
  0,
  true,
  jsonb_build_object(
    'title', 'Contáctanos',
    'text', '<h2>Estamos Aquí para Ayudarte</h2><p><strong>Email:</strong> info@thuis3d.be<br><strong>Teléfono:</strong> +32 3 XXX XX XX</p><h3>Horario</h3><p>Lunes a Viernes: 9:00 - 18:00<br>Sábados: 10:00 - 14:00</p>'
  ),
  jsonb_build_object('fullWidth', false),
  jsonb_build_object('backgroundColor', '#ffffff', 'padding', 60, 'maxWidth', '800px', 'textAlign', 'center')
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- PASO 7: Poblar contenido de ABOUT US
-- ============================================================================

INSERT INTO public.page_builder_sections (page_id, section_type, section_name, display_order, is_visible, content, settings, styles)
VALUES (
  get_page_id_by_key('about-us'),
  'text',
  'Nuestra Historia',
  0,
  true,
  jsonb_build_object(
    'title', 'Sobre Nosotros',
    'text', '<h2>Nuestra Historia</h2><p>Comenzamos como un pequeño taller en Sint-Niklaas y hemos crecido hasta convertirnos en un referente en impresión 3D profesional en Bélgica.</p><p>Nuestra misión es hacer accesible la tecnología de impresión 3D con soluciones de calidad a precios competitivos.</p>'
  ),
  jsonb_build_object('fullWidth', false),
  jsonb_build_object('backgroundColor', '#ffffff', 'padding', 60, 'maxWidth', '800px')
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Mostrar resumen de páginas creadas
SELECT 
  'PÁGINAS CREADAS' as tipo,
  COUNT(*) as total
FROM public.page_builder_pages;

-- Mostrar resumen de secciones creadas
SELECT 
  p.page_key,
  COUNT(s.id) as secciones
FROM public.page_builder_pages p
LEFT JOIN public.page_builder_sections s ON s.page_id = p.id
GROUP BY p.page_key
ORDER BY p.page_key;

-- Limpiar función helper
DROP FUNCTION IF EXISTS get_page_id_by_key(TEXT);

-- ============================================================================
-- ¡LISTO! 
-- ============================================================================
-- Las páginas ahora deberían mostrar contenido
-- Si necesitas más secciones, úsalas el Page Builder en /admin
-- ============================================================================
