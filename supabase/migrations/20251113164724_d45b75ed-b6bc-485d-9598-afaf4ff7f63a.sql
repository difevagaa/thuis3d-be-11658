-- =====================================================
-- VERIFICACIÓN Y CREACIÓN DE TRIGGERS PARA AUTO-TRADUCCIÓN
-- Fase 2: Sistema de Traducción Automática
-- =====================================================

-- Función auxiliar para encolar traducciones
CREATE OR REPLACE FUNCTION public.queue_translation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  field_name TEXT;
  original_value TEXT;
  target_languages TEXT[] := ARRAY['en', 'nl'];
  lang TEXT;
BEGIN
  -- Solo procesar en INSERT o UPDATE
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Iterar sobre los campos traducibles según la tabla
    FOREACH field_name IN ARRAY 
      CASE TG_TABLE_NAME
        WHEN 'products' THEN ARRAY['name', 'description']
        WHEN 'categories' THEN ARRAY['name', 'description']
        WHEN 'materials' THEN ARRAY['name', 'description']
        WHEN 'colors' THEN ARRAY['name']
        WHEN 'blog_posts' THEN ARRAY['title', 'excerpt', 'content']
        WHEN 'pages' THEN ARRAY['title', 'content']
        WHEN 'legal_pages' THEN ARRAY['title', 'content']
        WHEN 'homepage_banners' THEN ARRAY['title', 'subtitle', 'button_text']
        WHEN 'gallery_items' THEN ARRAY['title', 'description']
        WHEN 'footer_links' THEN ARRAY['label']
        WHEN 'reviews' THEN ARRAY['comment']
        ELSE ARRAY[]::TEXT[]
      END
    LOOP
      -- Obtener valor del campo
      EXECUTE format('SELECT ($1).%I', field_name) INTO original_value USING NEW;
      
      -- Solo encolar si hay contenido
      IF original_value IS NOT NULL AND LENGTH(TRIM(original_value)) > 0 THEN
        -- Encolar para inglés y neerlandés
        FOREACH lang IN ARRAY target_languages LOOP
          INSERT INTO public.translation_queue (
            entity_type,
            entity_id,
            field_name,
            source_language,
            target_language,
            status
          ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            field_name,
            'es',
            lang,
            'pending'
          )
          ON CONFLICT (entity_type, entity_id, field_name, target_language) 
          DO UPDATE SET 
            status = 'pending',
            source_language = 'es',
            updated_at = NOW();
        END LOOP;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- CREAR/REEMPLAZAR TRIGGERS PARA CADA TABLA
-- =====================================================

-- Products
DROP TRIGGER IF EXISTS trigger_queue_product_translation ON public.products;
CREATE TRIGGER trigger_queue_product_translation
  AFTER INSERT OR UPDATE ON public.products
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION public.queue_translation();

-- Categories
DROP TRIGGER IF EXISTS trigger_queue_category_translation ON public.categories;
CREATE TRIGGER trigger_queue_category_translation
  AFTER INSERT OR UPDATE ON public.categories
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION public.queue_translation();

-- Materials
DROP TRIGGER IF EXISTS trigger_queue_material_translation ON public.materials;
CREATE TRIGGER trigger_queue_material_translation
  AFTER INSERT OR UPDATE ON public.materials
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION public.queue_translation();

-- Colors
DROP TRIGGER IF EXISTS trigger_queue_color_translation ON public.colors;
CREATE TRIGGER trigger_queue_color_translation
  AFTER INSERT OR UPDATE ON public.colors
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION public.queue_translation();

-- Blog Posts
DROP TRIGGER IF EXISTS trigger_queue_blog_post_translation ON public.blog_posts;
CREATE TRIGGER trigger_queue_blog_post_translation
  AFTER INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL AND NEW.is_published = true)
  EXECUTE FUNCTION public.queue_translation();

-- Pages
DROP TRIGGER IF EXISTS trigger_queue_page_translation ON public.pages;
CREATE TRIGGER trigger_queue_page_translation
  AFTER INSERT OR UPDATE ON public.pages
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL AND NEW.is_published = true)
  EXECUTE FUNCTION public.queue_translation();

-- Legal Pages
DROP TRIGGER IF EXISTS trigger_queue_legal_page_translation ON public.legal_pages;
CREATE TRIGGER trigger_queue_legal_page_translation
  AFTER INSERT OR UPDATE ON public.legal_pages
  FOR EACH ROW
  WHEN (NEW.is_published = true)
  EXECUTE FUNCTION public.queue_translation();

-- Homepage Banners
DROP TRIGGER IF EXISTS trigger_queue_banner_translation ON public.homepage_banners;
CREATE TRIGGER trigger_queue_banner_translation
  AFTER INSERT OR UPDATE ON public.homepage_banners
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.queue_translation();

-- Gallery Items
DROP TRIGGER IF EXISTS trigger_queue_gallery_translation ON public.gallery_items;
CREATE TRIGGER trigger_queue_gallery_translation
  AFTER INSERT OR UPDATE ON public.gallery_items
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL AND NEW.is_published = true)
  EXECUTE FUNCTION public.queue_translation();

-- Footer Links
DROP TRIGGER IF EXISTS trigger_queue_footer_link_translation ON public.footer_links;
CREATE TRIGGER trigger_queue_footer_link_translation
  AFTER INSERT OR UPDATE ON public.footer_links
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.queue_translation();

-- Reviews
DROP TRIGGER IF EXISTS trigger_queue_review_translation ON public.reviews;
CREATE TRIGGER trigger_queue_review_translation
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_translation();

-- =====================================================
-- AÑADIR COLUMNA preferred_language A PROFILES
-- =====================================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'es';

CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language 
ON public.profiles(preferred_language);

-- =====================================================
-- COLUMNA language PARA NOTIFICATIONS
-- =====================================================

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'es';

CREATE INDEX IF NOT EXISTS idx_notifications_language 
ON public.notifications(language);

COMMENT ON TABLE public.products IS 'Tabla de productos con soporte de traducción automática';
COMMENT ON TABLE public.translations IS 'Almacena traducciones de contenido dinámico generadas automáticamente';
COMMENT ON TABLE public.translation_queue IS 'Cola de contenido pendiente de traducción automática';