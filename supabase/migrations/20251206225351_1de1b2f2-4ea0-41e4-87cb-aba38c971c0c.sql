-- =====================================================
-- PAGE BUILDER SYSTEM - Editor Visual tipo Shopify
-- =====================================================

-- Tabla principal de configuración de páginas editables
CREATE TABLE IF NOT EXISTS public.page_builder_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key TEXT NOT NULL UNIQUE, -- 'home', 'products', 'quotes', 'gift-cards', 'blog', 'gallery', 'my-account'
  page_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de secciones dentro de cada página
CREATE TABLE IF NOT EXISTS public.page_builder_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.page_builder_pages(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL, -- 'hero', 'text', 'image', 'gallery', 'products', 'banner', 'cta', 'features', 'testimonials', 'custom'
  section_name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}', -- Configuración específica de la sección
  content JSONB DEFAULT '{}', -- Contenido de la sección (textos, imágenes, etc.)
  styles JSONB DEFAULT '{}', -- Estilos personalizados (colores, fuentes, espaciado)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de elementos dentro de cada sección
CREATE TABLE IF NOT EXISTS public.page_builder_elements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.page_builder_sections(id) ON DELETE CASCADE,
  element_type TEXT NOT NULL, -- 'heading', 'paragraph', 'image', 'button', 'divider', 'spacer', 'icon', 'video', 'html'
  content JSONB DEFAULT '{}', -- Contenido del elemento
  styles JSONB DEFAULT '{}', -- Estilos del elemento
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de plantillas de secciones predefinidas
CREATE TABLE IF NOT EXISTS public.page_builder_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- 'section', 'page'
  category TEXT, -- 'hero', 'features', 'testimonials', 'cta', etc.
  preview_image TEXT,
  config JSONB NOT NULL, -- Configuración completa de la plantilla
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de historial de cambios (para deshacer/rehacer)
CREATE TABLE IF NOT EXISTS public.page_builder_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.page_builder_pages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  entity_type TEXT NOT NULL, -- 'section', 'element'
  entity_id UUID,
  previous_state JSONB,
  new_state JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.page_builder_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_builder_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_builder_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_builder_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_builder_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for page_builder_pages
CREATE POLICY "Admins can manage page builder pages"
  ON public.page_builder_pages FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view enabled pages"
  ON public.page_builder_pages FOR SELECT
  USING (is_enabled = true);

-- RLS Policies for page_builder_sections
CREATE POLICY "Admins can manage page builder sections"
  ON public.page_builder_sections FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view visible sections"
  ON public.page_builder_sections FOR SELECT
  USING (is_visible = true);

-- RLS Policies for page_builder_elements
CREATE POLICY "Admins can manage page builder elements"
  ON public.page_builder_elements FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view visible elements"
  ON public.page_builder_elements FOR SELECT
  USING (is_visible = true);

-- RLS Policies for page_builder_templates
CREATE POLICY "Admins can manage page builder templates"
  ON public.page_builder_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active templates"
  ON public.page_builder_templates FOR SELECT
  USING (is_active = true);

-- RLS Policies for page_builder_history
CREATE POLICY "Admins can view page builder history"
  ON public.page_builder_history FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_page_builder_sections_page_id ON public.page_builder_sections(page_id);
CREATE INDEX idx_page_builder_sections_order ON public.page_builder_sections(page_id, display_order);
CREATE INDEX idx_page_builder_elements_section_id ON public.page_builder_elements(section_id);
CREATE INDEX idx_page_builder_elements_order ON public.page_builder_elements(section_id, display_order);
CREATE INDEX idx_page_builder_history_page_id ON public.page_builder_history(page_id);

-- Create trigger for updated_at
CREATE TRIGGER update_page_builder_pages_updated_at
  BEFORE UPDATE ON public.page_builder_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_page_builder_sections_updated_at
  BEFORE UPDATE ON public.page_builder_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_page_builder_elements_updated_at
  BEFORE UPDATE ON public.page_builder_elements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default pages
INSERT INTO public.page_builder_pages (page_key, page_name, description) VALUES
  ('home', 'Página de Inicio', 'Página principal de la tienda'),
  ('products', 'Productos', 'Página de catálogo de productos'),
  ('quotes', 'Cotizaciones', 'Página de solicitud de cotizaciones'),
  ('gift-cards', 'Tarjetas de Regalo', 'Página de tarjetas de regalo'),
  ('blog', 'Blog', 'Página del blog'),
  ('gallery', 'Galería', 'Galería de trabajos realizados'),
  ('my-account', 'Mi Cuenta', 'Panel de cuenta del usuario')
ON CONFLICT (page_key) DO NOTHING;

-- Insert default section templates
INSERT INTO public.page_builder_templates (template_name, template_type, category, config) VALUES
  ('Hero Principal', 'section', 'hero', '{"type": "hero", "settings": {"fullWidth": true, "height": "80vh"}, "elements": [{"type": "heading", "content": {"text": "Título Principal"}}, {"type": "paragraph", "content": {"text": "Descripción del hero"}}, {"type": "button", "content": {"text": "Llamada a la acción", "link": "/"}}]}'),
  ('Características', 'section', 'features', '{"type": "features", "settings": {"columns": 3}, "elements": [{"type": "icon", "content": {"icon": "Star"}}, {"type": "heading", "content": {"text": "Característica 1"}}, {"type": "paragraph", "content": {"text": "Descripción de la característica"}}]}'),
  ('Banner Promocional', 'section', 'banner', '{"type": "banner", "settings": {"backgroundColor": "#f3f4f6"}, "elements": [{"type": "heading", "content": {"text": "Oferta Especial"}}, {"type": "button", "content": {"text": "Ver más"}}]}'),
  ('Galería de Imágenes', 'section', 'gallery', '{"type": "gallery", "settings": {"columns": 4, "gap": 16}, "elements": []}'),
  ('Texto con Imagen', 'section', 'text-image', '{"type": "text-image", "settings": {"imagePosition": "left"}, "elements": [{"type": "image", "content": {}}, {"type": "heading", "content": {"text": "Título"}}, {"type": "paragraph", "content": {"text": "Descripción"}}]}'),
  ('Testimonios', 'section', 'testimonials', '{"type": "testimonials", "settings": {"columns": 2}, "elements": []}'),
  ('CTA Sección', 'section', 'cta', '{"type": "cta", "settings": {"centered": true}, "elements": [{"type": "heading", "content": {"text": "¿Listo para empezar?"}}, {"type": "button", "content": {"text": "Contactar", "link": "/contacto"}}]}'),
  ('Separador', 'section', 'divider', '{"type": "divider", "settings": {"style": "line"}, "elements": []}'),
  ('Espaciador', 'section', 'spacer', '{"type": "spacer", "settings": {"height": 60}, "elements": []}'),
  ('HTML Personalizado', 'section', 'custom', '{"type": "custom", "settings": {}, "elements": [{"type": "html", "content": {"html": ""}}]}')
ON CONFLICT DO NOTHING;