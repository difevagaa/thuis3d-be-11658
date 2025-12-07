-- Populate Page Builder with sample content for main pages
-- This migration creates sections for Home, Products, Gallery, and Blog pages

-- Helper function to get page ID by key
CREATE OR REPLACE FUNCTION get_page_id(page_key_param TEXT)
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
-- HOME PAGE CONTENT
-- ============================================================================

-- Hero Banner for Home Page
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id('home'),
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
  jsonb_build_object(
    'showSecondButton', true,
    'buttonStyle', 'primary',
    'secondButtonStyle', 'outline',
    'fullWidth', true,
    'height', 'large'
  ),
  jsonb_build_object(
    'backgroundColor', '#f8f9fa',
    'textColor', '#1a1a1a',
    'padding', 80,
    'textAlign', 'center'
  )
) ON CONFLICT DO NOTHING;

-- Why Choose Us Section
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id('home'),
  'features',
  '¿Por Qué Elegirnos?',
  1,
  true,
  jsonb_build_object(
    'title', '¿Por Qué Elegirnos?',
    'subtitle', 'Calidad, experiencia y servicio excepcional',
    'features', jsonb_build_array(
      jsonb_build_object(
        'title', 'Calidad Premium',
        'description', 'Utilizamos las mejores tecnologías de impresión 3D del mercado para garantizar resultados excepcionales',
        'icon', 'star'
      ),
      jsonb_build_object(
        'title', 'Entrega Rápida',
        'description', 'Tiempos de producción optimizados sin comprometer la calidad de tus proyectos',
        'icon', 'zap'
      ),
      jsonb_build_object(
        'title', 'Asesoría Experta',
        'description', 'Nuestro equipo te acompaña en cada etapa, desde el diseño hasta la entrega final',
        'icon', 'users'
      ),
      jsonb_build_object(
        'title', 'Precios Competitivos',
        'description', 'Cotizaciones transparentes y justas con la mejor relación calidad-precio',
        'icon', 'dollar-sign'
      )
    )
  ),
  jsonb_build_object(
    'layout', 'grid',
    'columns', 4,
    'showIcons', true
  ),
  jsonb_build_object(
    'backgroundColor', '#ffffff',
    'padding', 60,
    'textAlign', 'center'
  )
) ON CONFLICT DO NOTHING;

-- Featured Products Carousel
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id('home'),
  'products-carousel',
  'Productos Destacados',
  2,
  true,
  jsonb_build_object(
    'title', 'Productos Destacados',
    'subtitle', 'Descubre nuestros productos más populares'
  ),
  jsonb_build_object(
    'featured', true,
    'sortBy', 'created_at',
    'sortOrder', 'desc',
    'limit', 8,
    'itemsPerView', 4,
    'itemsPerViewTablet', 3,
    'itemsPerViewMobile', 1,
    'showPrices', true,
    'showAddToCart', true,
    'showRating', true,
    'autoplay', false,
    'showNavigation', true,
    'showPagination', false,
    'loop', true
  ),
  jsonb_build_object(
    'backgroundColor', '#f8f9fa',
    'padding', 60
  )
) ON CONFLICT DO NOTHING;

-- CTA Section
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id('home'),
  'cta',
  'Comienza Tu Proyecto',
  3,
  true,
  jsonb_build_object(
    'title', '¿Listo para dar vida a tu proyecto?',
    'description', 'Solicita una cotización gratuita y descubre cómo podemos ayudarte a materializar tus ideas',
    'buttonText', 'Solicitar Cotización',
    'buttonUrl', '/cotizaciones'
  ),
  jsonb_build_object(
    'centered', true,
    'fullWidth', false
  ),
  jsonb_build_object(
    'backgroundColor', '#0066cc',
    'textColor', '#ffffff',
    'padding', 80,
    'textAlign', 'center'
  )
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- PRODUCTS PAGE CONTENT
-- ============================================================================

-- All Products Carousel
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id('products'),
  'products-carousel',
  'Todos Nuestros Productos',
  0,
  true,
  jsonb_build_object(
    'title', 'Catálogo Completo de Productos',
    'subtitle', 'Explora nuestra amplia gama de soluciones de impresión 3D'
  ),
  jsonb_build_object(
    'featured', false,
    'sortBy', 'name',
    'sortOrder', 'asc',
    'limit', 50,
    'itemsPerView', 4,
    'itemsPerViewTablet', 3,
    'itemsPerViewMobile', 2,
    'showPrices', true,
    'showAddToCart', true,
    'showRating', true,
    'showOutOfStock', true,
    'autoplay', false,
    'showNavigation', true,
    'showPagination', true,
    'loop', false
  ),
  jsonb_build_object(
    'backgroundColor', '#ffffff',
    'padding', 40
  )
) ON CONFLICT DO NOTHING;

-- Products Information Section
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id('products'),
  'text',
  'Información de Productos',
  1,
  true,
  jsonb_build_object(
    'title', 'Impresión 3D de Calidad Profesional',
    'text', '<p>Ofrecemos una amplia variedad de servicios de impresión 3D utilizando las tecnologías más avanzadas del mercado. Trabajamos con múltiples materiales y acabados para adaptarnos a las necesidades específicas de cada proyecto.</p><p>Nuestro equipo de expertos está disponible para asesorarte en la selección del material, tecnología y acabado más apropiado para tu aplicación.</p>'
  ),
  jsonb_build_object(
    'fullWidth', false
  ),
  jsonb_build_object(
    'backgroundColor', '#f8f9fa',
    'padding', 60,
    'maxWidth', '800px'
  )
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- GALLERY PAGE CONTENT
-- ============================================================================

-- Gallery Grid Section
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id('gallery'),
  'gallery-grid',
  'Galería de Proyectos',
  0,
  true,
  jsonb_build_object(
    'title', 'Nuestros Trabajos',
    'subtitle', 'Explora algunos de los proyectos que hemos realizado para nuestros clientes'
  ),
  jsonb_build_object(
    'limit', 24,
    'columns', 4,
    'columnsTablet', 3,
    'columnsMobile', 2,
    'gap', 16,
    'enableLightbox', true,
    'showTitles', true,
    'showDescriptions', false
  ),
  jsonb_build_object(
    'backgroundColor', '#ffffff',
    'padding', 60
  )
) ON CONFLICT DO NOTHING;

-- Gallery Description
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id('gallery'),
  'text',
  'Descripción de Galería',
  1,
  true,
  jsonb_build_object(
    'title', 'Calidad que Habla por Sí Misma',
    'text', '<p>Cada proyecto es único y representa nuestro compromiso con la excelencia. Trabajamos en estrecha colaboración con nuestros clientes para asegurar que cada pieza cumpla con sus expectativas y especificaciones.</p>'
  ),
  jsonb_build_object(
    'fullWidth', false
  ),
  jsonb_build_object(
    'backgroundColor', '#f8f9fa',
    'padding', 40,
    'textAlign', 'center',
    'maxWidth', '700px'
  )
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- BLOG PAGE CONTENT
-- ============================================================================

-- Blog Carousel Section
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id('blog'),
  'blog-carousel',
  'Últimas Publicaciones',
  0,
  true,
  jsonb_build_object(
    'title', 'Blog y Noticias',
    'subtitle', 'Mantente al día con las últimas tendencias en impresión 3D'
  ),
  jsonb_build_object(
    'limit', 12,
    'sortBy', 'created_at',
    'sortOrder', 'desc',
    'postsPerRow', 3,
    'postsPerRowTablet', 2,
    'postsPerRowMobile', 1,
    'showFeaturedImage', true,
    'showExcerpt', true,
    'showAuthor', true,
    'showDate', true,
    'showCategories', true,
    'showReadMore', true
  ),
  jsonb_build_object(
    'backgroundColor', '#ffffff',
    'padding', 60
  )
) ON CONFLICT DO NOTHING;

-- Blog Introduction
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id('blog'),
  'text',
  'Introducción del Blog',
  1,
  true,
  jsonb_build_object(
    'title', 'Conocimiento y Experiencia Compartida',
    'text', '<p>En nuestro blog compartimos consejos, tutoriales, casos de éxito y las últimas novedades del mundo de la impresión 3D. Nuestro objetivo es ayudarte a aprovechar al máximo esta tecnología revolucionaria.</p>'
  ),
  jsonb_build_object(
    'fullWidth', false
  ),
  jsonb_build_object(
    'backgroundColor', '#f8f9fa',
    'padding', 40,
    'textAlign', 'center',
    'maxWidth', '700px'
  )
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- ABOUT US PAGE CONTENT
-- ============================================================================

-- About Us Hero
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id('about-us'),
  'hero',
  'Sobre Nosotros Hero',
  0,
  true,
  jsonb_build_object(
    'title', 'Sobre Nosotros',
    'subtitle', 'Expertos en impresión 3D desde 2018',
    'description', 'Somos un equipo apasionado por la tecnología y la innovación'
  ),
  jsonb_build_object(
    'fullWidth', true,
    'height', 'medium',
    'showSecondButton', false
  ),
  jsonb_build_object(
    'backgroundColor', '#f8f9fa',
    'padding', 60,
    'textAlign', 'center'
  )
) ON CONFLICT DO NOTHING;

-- About Us Content
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id('about-us'),
  'text',
  'Nuestra Historia',
  1,
  true,
  jsonb_build_object(
    'title', 'Nuestra Historia',
    'text', '<p>Comenzamos como un pequeño taller de prototipado y hemos crecido hasta convertirnos en un referente en servicios de impresión 3D profesional.</p><p>Nuestra misión es hacer accesible la tecnología de impresión 3D a empresas y particulares, ofreciendo soluciones de calidad a precios competitivos.</p><p>Contamos con un equipo de profesionales altamente capacitados y maquinaria de última generación para garantizar los mejores resultados en cada proyecto.</p>'
  ),
  jsonb_build_object(
    'fullWidth', false
  ),
  jsonb_build_object(
    'backgroundColor', '#ffffff',
    'padding', 60,
    'maxWidth', '800px'
  )
) ON CONFLICT DO NOTHING;

-- About Us Values
INSERT INTO public.page_builder_sections (
  page_id, section_type, section_name, display_order, is_visible, content, settings, styles
) VALUES (
  get_page_id('about-us'),
  'features',
  'Nuestros Valores',
  2,
  true,
  jsonb_build_object(
    'title', 'Nuestros Valores',
    'features', jsonb_build_array(
      jsonb_build_object(
        'title', 'Innovación',
        'description', 'Estamos siempre a la vanguardia de la tecnología',
        'icon', 'lightbulb'
      ),
      jsonb_build_object(
        'title', 'Calidad',
        'description', 'Cada proyecto recibe nuestra máxima atención al detalle',
        'icon', 'award'
      ),
      jsonb_build_object(
        'title', 'Compromiso',
        'description', 'Tu satisfacción es nuestra prioridad',
        'icon', 'heart'
      )
    )
  ),
  jsonb_build_object(
    'layout', 'grid',
    'columns', 3,
    'showIcons', true
  ),
  jsonb_build_object(
    'backgroundColor', '#f8f9fa',
    'padding', 60,
    'textAlign', 'center'
  )
) ON CONFLICT DO NOTHING;

-- Clean up helper function
DROP FUNCTION IF EXISTS get_page_id(TEXT);

-- Add comment
COMMENT ON TABLE public.page_builder_sections IS 'Page Builder sections with sample content for main pages (Home, Products, Gallery, Blog, About Us)';
