-- Tabla para almacenar traducciones de contenido dinámico
CREATE TABLE IF NOT EXISTS public.translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('es', 'en', 'nl')),
  translated_text TEXT NOT NULL,
  is_auto_translated BOOLEAN DEFAULT true,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, entity_id, field_name, language)
);

CREATE INDEX idx_translations_lookup ON public.translations(entity_type, entity_id, field_name, language);
CREATE INDEX idx_translations_entity ON public.translations(entity_type, entity_id);
CREATE INDEX idx_translations_language ON public.translations(language);

-- Tabla para cola de traducciones pendientes
CREATE TABLE IF NOT EXISTS public.translation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_name TEXT NOT NULL,
  source_language TEXT DEFAULT 'es',
  target_languages TEXT[] DEFAULT ARRAY['en', 'nl'],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_queue_status ON public.translation_queue(status);
CREATE INDEX idx_queue_entity ON public.translation_queue(entity_type, entity_id);

-- Tabla de configuración de traducción
CREATE TABLE IF NOT EXISTS public.translation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar configuración por defecto
INSERT INTO public.translation_settings (setting_key, setting_value) VALUES
('enabled_languages', '["es", "en", "nl"]'::jsonb),
('default_language', '"es"'::jsonb),
('auto_translate_new_content', 'true'::jsonb),
('auto_detect_language', 'true'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_translation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_translations_updated_at
  BEFORE UPDATE ON public.translations
  FOR EACH ROW
  EXECUTE FUNCTION update_translation_updated_at();

-- Función trigger genérica para agregar a cola de traducción
CREATE OR REPLACE FUNCTION queue_translation()
RETURNS TRIGGER AS $$
DECLARE
  auto_translate BOOLEAN;
  field_name TEXT;
  translatable_fields TEXT[];
BEGIN
  -- Verificar si auto-traducción está habilitada
  SELECT (setting_value::text)::boolean INTO auto_translate
  FROM public.translation_settings
  WHERE setting_key = 'auto_translate_new_content';

  IF auto_translate IS NULL OR auto_translate = false THEN
    RETURN NEW;
  END IF;

  -- Determinar campos traducibles según tipo de entidad
  CASE TG_TABLE_NAME
    WHEN 'products' THEN
      translatable_fields := ARRAY['name', 'description', 'specifications'];
    WHEN 'categories' THEN
      translatable_fields := ARRAY['name', 'description'];
    WHEN 'materials' THEN
      translatable_fields := ARRAY['name', 'description'];
    WHEN 'colors' THEN
      translatable_fields := ARRAY['name'];
    WHEN 'blog_posts' THEN
      translatable_fields := ARRAY['title', 'excerpt', 'content'];
    WHEN 'pages' THEN
      translatable_fields := ARRAY['title', 'content', 'meta_description'];
    WHEN 'legal_pages' THEN
      translatable_fields := ARRAY['title', 'content'];
    WHEN 'homepage_banners' THEN
      translatable_fields := ARRAY['title', 'description'];
    WHEN 'gallery_items' THEN
      translatable_fields := ARRAY['title', 'description'];
    WHEN 'footer_links' THEN
      translatable_fields := ARRAY['title'];
    ELSE
      RETURN NEW;
  END CASE;

  -- Agregar a cola de traducción para cada campo
  FOREACH field_name IN ARRAY translatable_fields
  LOOP
    -- Solo agregar si el campo tiene contenido
    IF (TG_OP = 'INSERT' OR OLD IS NULL OR 
        to_jsonb(NEW) ->> field_name IS DISTINCT FROM to_jsonb(OLD) ->> field_name) AND
       to_jsonb(NEW) ->> field_name IS NOT NULL AND
       to_jsonb(NEW) ->> field_name != '' THEN
      
      INSERT INTO public.translation_queue (entity_type, entity_id, field_name)
      VALUES (TG_TABLE_NAME, NEW.id, field_name)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para auto-cola de traducción
CREATE TRIGGER queue_product_translations
  AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION queue_translation();

CREATE TRIGGER queue_category_translations
  AFTER INSERT OR UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION queue_translation();

CREATE TRIGGER queue_material_translations
  AFTER INSERT OR UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION queue_translation();

CREATE TRIGGER queue_color_translations
  AFTER INSERT OR UPDATE ON public.colors
  FOR EACH ROW
  EXECUTE FUNCTION queue_translation();

CREATE TRIGGER queue_blog_post_translations
  AFTER INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION queue_translation();

CREATE TRIGGER queue_page_translations
  AFTER INSERT OR UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION queue_translation();

CREATE TRIGGER queue_legal_page_translations
  AFTER INSERT OR UPDATE ON public.legal_pages
  FOR EACH ROW
  EXECUTE FUNCTION queue_translation();

CREATE TRIGGER queue_banner_translations
  AFTER INSERT OR UPDATE ON public.homepage_banners
  FOR EACH ROW
  EXECUTE FUNCTION queue_translation();

CREATE TRIGGER queue_gallery_translations
  AFTER INSERT OR UPDATE ON public.gallery_items
  FOR EACH ROW
  EXECUTE FUNCTION queue_translation();

CREATE TRIGGER queue_footer_link_translations
  AFTER INSERT OR UPDATE ON public.footer_links
  FOR EACH ROW
  EXECUTE FUNCTION queue_translation();

-- RLS Policies
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_settings ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver traducciones
CREATE POLICY "Anyone can view translations"
  ON public.translations FOR SELECT
  USING (true);

-- Solo admins pueden gestionar traducciones
CREATE POLICY "Admins can manage translations"
  ON public.translations FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Solo admins pueden ver y gestionar cola
CREATE POLICY "Admins can view translation queue"
  ON public.translation_queue FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage translation queue"
  ON public.translation_queue FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Todos pueden ver configuración
CREATE POLICY "Anyone can view translation settings"
  ON public.translation_settings FOR SELECT
  USING (true);

-- Solo admins pueden modificar configuración
CREATE POLICY "Admins can manage translation settings"
  ON public.translation_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));