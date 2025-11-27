-- Corregir el error de ON CONFLICT agregando restricción UNIQUE
-- Primero eliminar duplicados si existen
DELETE FROM seo_keywords a USING seo_keywords b 
WHERE a.id > b.id 
  AND a.keyword = b.keyword;

-- Agregar restricción UNIQUE a la columna keyword
ALTER TABLE seo_keywords 
ADD CONSTRAINT seo_keywords_keyword_unique UNIQUE (keyword);

-- Corregir función generate_product_keywords_optimized para manejar mejor los conflictos
CREATE OR REPLACE FUNCTION generate_product_keywords_optimized()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_record RECORD;
  keyword_text TEXT;
  keywords_array TEXT[];
  keyword_count INTEGER;
  clean_name TEXT;
  clean_desc TEXT;
  category_name TEXT;
BEGIN
  -- Lista de stop words en español
  CREATE TEMP TABLE IF NOT EXISTS stop_words (word TEXT);
  TRUNCATE stop_words;
  INSERT INTO stop_words VALUES 
    ('de'), ('el'), ('la'), ('los'), ('las'), ('un'), ('una'), ('unos'), ('unas'),
    ('y'), ('o'), ('en'), ('con'), ('por'), ('para'), ('este'), ('esta'), ('estos'),
    ('estas'), ('del'), ('al'), ('que'), ('su'), ('sus'), ('se'), ('es'), ('son'),
    ('muy'), ('más'), ('pero'), ('como'), ('sin'), ('sobre'), ('desde'), ('hasta'),
    ('puede'), ('pueden'), ('tiene'), ('tienen'), ('hacer'), ('hace'), ('hacen'),
    ('siempre'), ('también'), ('solo'), ('sólo'), ('cada');

  -- Procesar cada producto
  FOR product_record IN 
    SELECT p.id, p.name, p.description, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.deleted_at IS NULL
  LOOP
    -- Limpiar texto
    clean_name := LOWER(TRIM(product_record.name));
    clean_desc := LOWER(TRIM(COALESCE(product_record.description, '')));
    category_name := LOWER(TRIM(COALESCE(product_record.category_name, '')));
    
    keywords_array := ARRAY[]::TEXT[];
    
    -- 1. Keyword Principal: Nombre completo del producto (máxima relevancia)
    IF LENGTH(clean_name) >= 8 THEN
      keywords_array := array_append(keywords_array, clean_name);
      
      INSERT INTO seo_keywords (keyword, source_type, source_id, auto_generated, is_active, relevance_score, keyword_type, search_volume_estimate)
      VALUES (clean_name, 'product', product_record.id, true, true, 100, 'primary', 'high')
      ON CONFLICT (keyword) DO UPDATE
      SET relevance_score = GREATEST(seo_keywords.relevance_score, 100),
          keyword_type = 'primary',
          source_type = EXCLUDED.source_type,
          source_id = EXCLUDED.source_id,
          is_active = true;
    END IF;
    
    -- 2. Bigramas y trigramas del nombre (frases de 2-3 palabras)
    DECLARE
      words TEXT[];
      i INTEGER;
      bigram TEXT;
      trigram TEXT;
      word_count INTEGER;
    BEGIN
      words := string_to_array(clean_name, ' ');
      word_count := array_length(words, 1);
      
      -- Bigramas (2 palabras)
      IF word_count >= 2 THEN
        FOR i IN 1..(word_count - 1) LOOP
          IF NOT EXISTS (SELECT 1 FROM stop_words WHERE word = words[i]) AND
             NOT EXISTS (SELECT 1 FROM stop_words WHERE word = words[i+1]) THEN
            bigram := words[i] || ' ' || words[i+1];
            IF LENGTH(bigram) >= 8 AND NOT (bigram = ANY(keywords_array)) THEN
              keywords_array := array_append(keywords_array, bigram);
              
              INSERT INTO seo_keywords (keyword, source_type, source_id, auto_generated, is_active, relevance_score, keyword_type, search_volume_estimate)
              VALUES (bigram, 'product', product_record.id, true, true, 80, 'long-tail', 'medium')
              ON CONFLICT (keyword) DO UPDATE
              SET relevance_score = GREATEST(seo_keywords.relevance_score, 80),
                  source_type = EXCLUDED.source_type,
                  source_id = EXCLUDED.source_id,
                  is_active = true;
            END IF;
          END IF;
        END LOOP;
      END IF;
      
      -- Trigramas (3 palabras)
      IF word_count >= 3 THEN
        FOR i IN 1..(word_count - 2) LOOP
          IF NOT EXISTS (SELECT 1 FROM stop_words WHERE word = words[i]) THEN
            trigram := words[i] || ' ' || words[i+1] || ' ' || words[i+2];
            IF LENGTH(trigram) >= 12 AND NOT (trigram = ANY(keywords_array)) THEN
              keywords_array := array_append(keywords_array, trigram);
              
              INSERT INTO seo_keywords (keyword, source_type, source_id, auto_generated, is_active, relevance_score, keyword_type, search_volume_estimate)
              VALUES (trigram, 'product', product_record.id, true, true, 85, 'long-tail', 'low')
              ON CONFLICT (keyword) DO UPDATE
              SET relevance_score = GREATEST(seo_keywords.relevance_score, 85),
                  source_type = EXCLUDED.source_type,
                  source_id = EXCLUDED.source_id,
                  is_active = true;
            END IF;
          END IF;
        END LOOP;
      END IF;
    END;
    
    -- 3. Keyword de Categoría + Primera palabra significativa del producto
    IF category_name != '' AND LENGTH(category_name) >= 3 THEN
      DECLARE
        first_significant_word TEXT;
        words TEXT[];
      BEGIN
        words := string_to_array(clean_name, ' ');
        FOR i IN 1..array_length(words, 1) LOOP
          IF NOT EXISTS (SELECT 1 FROM stop_words WHERE word = words[i]) AND LENGTH(words[i]) >= 4 THEN
            first_significant_word := words[i];
            EXIT;
          END IF;
        END LOOP;
        
        IF first_significant_word IS NOT NULL THEN
          keyword_text := category_name || ' ' || first_significant_word;
          IF LENGTH(keyword_text) >= 8 AND NOT (keyword_text = ANY(keywords_array)) THEN
            keywords_array := array_append(keywords_array, keyword_text);
            
            INSERT INTO seo_keywords (keyword, source_type, source_id, auto_generated, is_active, relevance_score, keyword_type, search_volume_estimate)
            VALUES (keyword_text, 'product', product_record.id, true, true, 70, 'secondary', 'medium')
            ON CONFLICT (keyword) DO UPDATE
            SET relevance_score = GREATEST(seo_keywords.relevance_score, 70),
                source_type = EXCLUDED.source_type,
                source_id = EXCLUDED.source_id,
                is_active = true;
          END IF;
        END IF;
      END;
    END IF;
    
    -- Limitar a las 5 keywords más relevantes por producto
    -- Desactivar keywords antiguas de este producto que no están en el top 5
    UPDATE seo_keywords
    SET is_active = false
    WHERE source_type = 'product' 
      AND source_id = product_record.id
      AND id NOT IN (
        SELECT id FROM seo_keywords
        WHERE source_type = 'product' 
          AND source_id = product_record.id
        ORDER BY relevance_score DESC
        LIMIT 5
      );
    
  END LOOP;
  
  DROP TABLE IF EXISTS stop_words;
END;
$$;

-- Crear función para generar meta tags automáticamente
CREATE OR REPLACE FUNCTION generate_meta_tags_automatically()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  generated_count INTEGER := 0;
  product_record RECORD;
  blog_record RECORD;
  page_title TEXT;
  meta_desc TEXT;
BEGIN
  -- Generar meta tags para productos
  FOR product_record IN 
    SELECT p.id, p.name, p.description
    FROM products p
    WHERE p.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM seo_meta_tags 
      WHERE page_path = '/product/' || p.id::text
    )
  LOOP
    page_title := product_record.name || ' - Thuis 3D';
    meta_desc := SUBSTRING(COALESCE(product_record.description, product_record.name), 1, 160);
    
    INSERT INTO seo_meta_tags (
      page_path, 
      page_title, 
      meta_description,
      og_title,
      og_description,
      twitter_title,
      twitter_description
    ) VALUES (
      '/product/' || product_record.id,
      page_title,
      meta_desc,
      product_record.name,
      meta_desc,
      product_record.name,
      meta_desc
    );
    
    generated_count := generated_count + 1;
  END LOOP;
  
  -- Generar meta tags para blog posts
  FOR blog_record IN 
    SELECT bp.id, bp.slug, bp.title, bp.excerpt
    FROM blog_posts bp
    WHERE bp.is_published = true
    AND bp.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM seo_meta_tags 
      WHERE page_path = '/blog/' || bp.slug
    )
  LOOP
    page_title := blog_record.title || ' - Blog Thuis 3D';
    meta_desc := SUBSTRING(COALESCE(blog_record.excerpt, blog_record.title), 1, 160);
    
    INSERT INTO seo_meta_tags (
      page_path, 
      page_title, 
      meta_description,
      og_title,
      og_description,
      twitter_title,
      twitter_description
    ) VALUES (
      '/blog/' || blog_record.slug,
      page_title,
      meta_desc,
      blog_record.title,
      meta_desc,
      blog_record.title,
      meta_desc
    );
    
    generated_count := generated_count + 1;
  END LOOP;
  
  -- Generar meta tags para páginas principales si no existen
  INSERT INTO seo_meta_tags (page_path, page_title, meta_description, og_title, og_description)
  SELECT '/', 'Thuis 3D - Impresión 3D Profesional', 
    'Servicio profesional de impresión 3D de alta calidad. Cotizaciones rápidas, envíos seguros y la mejor tecnología.',
    'Thuis 3D - Impresión 3D Profesional',
    'Servicio profesional de impresión 3D de alta calidad'
  WHERE NOT EXISTS (SELECT 1 FROM seo_meta_tags WHERE page_path = '/');
  
  INSERT INTO seo_meta_tags (page_path, page_title, meta_description, og_title, og_description)
  SELECT '/products', 'Productos - Thuis 3D', 
    'Explora nuestro catálogo de productos de impresión 3D. Materiales de calidad y acabados profesionales.',
    'Productos - Thuis 3D',
    'Catálogo de productos de impresión 3D'
  WHERE NOT EXISTS (SELECT 1 FROM seo_meta_tags WHERE page_path = '/products');
  
  INSERT INTO seo_meta_tags (page_path, page_title, meta_description, og_title, og_description)
  SELECT '/quotes', 'Cotizaciones - Thuis 3D', 
    'Solicita una cotización gratuita para tu proyecto de impresión 3D. Respuesta rápida y precios competitivos.',
    'Cotizaciones - Thuis 3D',
    'Cotización gratuita de impresión 3D'
  WHERE NOT EXISTS (SELECT 1 FROM seo_meta_tags WHERE page_path = '/quotes');
  
  generated_count := generated_count + 3;
  
  RETURN generated_count;
END;
$$;