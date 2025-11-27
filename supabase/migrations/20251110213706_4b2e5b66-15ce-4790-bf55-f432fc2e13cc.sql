-- Corregir funciones SQL sin search_path establecido (advertencias de seguridad)

-- 1. Función generate_blog_keywords
CREATE OR REPLACE FUNCTION public.generate_blog_keywords()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  blog_record RECORD;
  keyword_array text[];
  word text;
BEGIN
  FOR blog_record IN 
    SELECT id, title, excerpt, content 
    FROM blog_posts 
    WHERE deleted_at IS NULL AND is_published = true
  LOOP
    -- Extraer palabras del contenido del blog
    keyword_array := regexp_split_to_array(
      lower(COALESCE(blog_record.title, '') || ' ' || COALESCE(blog_record.excerpt, '') || ' ' || COALESCE(blog_record.content, '')),
      '\s+'
    );
    
    -- Insertar keywords únicas (filtrar palabras cortas y comunes)
    FOREACH word IN ARRAY keyword_array
    LOOP
      -- Limpiar palabra de caracteres especiales
      word := regexp_replace(word, '[^a-záéíóúñ0-9]', '', 'g');
      
      -- Solo agregar si tiene más de 3 caracteres y no es un número
      IF length(word) > 3 AND word !~ '^[0-9]+$' THEN
        INSERT INTO seo_keywords (keyword, source_type, source_id, auto_generated, is_active)
        VALUES (word, 'blog', blog_record.id, true, true)
        ON CONFLICT (keyword, source_type, COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid))
        DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✅ [SEO] Keywords de blog generadas exitosamente';
END;
$$;

-- 2. Rehacer generate_product_keywords con search_path
DROP FUNCTION IF EXISTS public.generate_product_keywords();

CREATE OR REPLACE FUNCTION public.generate_product_keywords()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  product_record RECORD;
  keyword_array text[];
  word text;
BEGIN
  FOR product_record IN 
    SELECT id, name, description 
    FROM products 
    WHERE deleted_at IS NULL
  LOOP
    -- Extraer palabras del nombre y descripción
    keyword_array := regexp_split_to_array(
      lower(COALESCE(product_record.name, '') || ' ' || COALESCE(product_record.description, '')),
      '\s+'
    );
    
    -- Insertar keywords únicas
    FOREACH word IN ARRAY keyword_array
    LOOP
      -- Limpiar palabra de caracteres especiales
      word := regexp_replace(word, '[^a-záéíóúñ0-9]', '', 'g');
      
      -- Solo agregar si tiene más de 3 caracteres y no es un número
      IF length(word) > 3 AND word !~ '^[0-9]+$' THEN
        INSERT INTO seo_keywords (keyword, source_type, source_id, auto_generated, is_active)
        VALUES (word, 'product', product_record.id, true, true)
        ON CONFLICT (keyword, source_type, COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid))
        DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✅ [SEO] Keywords de productos generadas exitosamente';
END;
$$;

-- 3. Agregar índice único para evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_keywords_unique 
ON seo_keywords (keyword, source_type, COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid));