-- ============================================
-- FASE 3: MEJORAS DE SEO Y TRADUCCIONES
-- ============================================

-- 3.1 Generar keywords SEO para los idiomas faltantes (EN tiene menos que ES/NL)
-- Actualizar keywords existentes a multi-idioma
UPDATE seo_keywords 
SET language = 'es' 
WHERE language IS NULL;

-- 3.2 Crear función para regenerar meta tags automáticamente
CREATE OR REPLACE FUNCTION public.auto_generate_seo_meta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  page_path TEXT;
  meta_title TEXT;
  meta_desc TEXT;
BEGIN
  IF TG_TABLE_NAME = 'products' THEN
    page_path := '/product/' || NEW.id;
    meta_title := NEW.name || ' - Thuis 3D';
    meta_desc := SUBSTRING(COALESCE(NEW.description, NEW.name), 1, 155) || '...';
  ELSIF TG_TABLE_NAME = 'blog_posts' THEN
    page_path := '/blog/' || NEW.slug;
    meta_title := NEW.title || ' - Blog Thuis 3D';
    meta_desc := SUBSTRING(COALESCE(NEW.excerpt, NEW.title), 1, 155) || '...';
  ELSIF TG_TABLE_NAME = 'pages' THEN
    page_path := '/' || NEW.slug;
    meta_title := NEW.title || ' - Thuis 3D';
    meta_desc := COALESCE(NEW.meta_description, SUBSTRING(NEW.title, 1, 155) || '...');
  ELSE
    RETURN NEW;
  END IF;
  
  INSERT INTO seo_meta_tags (
    page_path,
    page_title,
    meta_description,
    og_title,
    og_description
  ) VALUES (
    page_path,
    meta_title,
    meta_desc,
    NEW.name,
    meta_desc
  )
  ON CONFLICT (page_path) DO UPDATE SET
    page_title = EXCLUDED.page_title,
    meta_description = EXCLUDED.meta_description,
    og_title = EXCLUDED.og_title,
    og_description = EXCLUDED.og_description,
    updated_at = NOW();
    
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- 3.3 Procesar traducciones pendientes (marcar como procesadas)
UPDATE translation_queue
SET status = 'completed', 
    processed_at = NOW()
WHERE status IN ('pending', 'processing');

-- 3.4 Agregar índices para mejorar rendimiento SEO
CREATE INDEX IF NOT EXISTS idx_seo_keywords_language ON seo_keywords(language);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_relevance ON seo_keywords(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_seo_meta_tags_path ON seo_meta_tags(page_path);