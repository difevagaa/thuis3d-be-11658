-- FASE 1: Mejoras en la tabla seo_keywords
ALTER TABLE seo_keywords 
ADD COLUMN IF NOT EXISTS relevance_score INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS keyword_type TEXT DEFAULT 'secondary',
ADD COLUMN IF NOT EXISTS search_volume_estimate TEXT DEFAULT 'medium';

-- Crear índices mejorados
CREATE INDEX IF NOT EXISTS idx_seo_keywords_relevance 
ON seo_keywords(relevance_score DESC, is_active);

CREATE INDEX IF NOT EXISTS idx_seo_keywords_type 
ON seo_keywords(keyword_type, source_type);

CREATE INDEX IF NOT EXISTS idx_seo_keywords_source_id 
ON seo_keywords(source_id, source_type, is_active);

-- FASE 2: Función optimizada para generar keywords de productos (máximo 5 por producto)
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
          keyword_type = 'primary';
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
              SET relevance_score = GREATEST(seo_keywords.relevance_score, 80);
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
              SET relevance_score = GREATEST(seo_keywords.relevance_score, 85);
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
            SET relevance_score = GREATEST(seo_keywords.relevance_score, 70);
          END IF;
        END IF;
      END;
    END IF;
    
    -- 4. Extraer frases relevantes de la descripción (máximo 2)
    IF LENGTH(clean_desc) >= 20 THEN
      DECLARE
        desc_words TEXT[];
        phrase TEXT;
        phrase_count INTEGER := 0;
      BEGIN
        desc_words := string_to_array(clean_desc, ' ');
        FOR i IN 1..(array_length(desc_words, 1) - 2) LOOP
          IF phrase_count >= 2 THEN EXIT; END IF;
          
          IF NOT EXISTS (SELECT 1 FROM stop_words WHERE word = desc_words[i]) THEN
            phrase := desc_words[i] || ' ' || desc_words[i+1] || ' ' || desc_words[i+2];
            
            -- Solo si contiene una palabra del nombre del producto
            IF LENGTH(phrase) >= 12 AND 
               LENGTH(phrase) <= 40 AND
               clean_name LIKE '%' || desc_words[i] || '%' AND
               NOT (phrase = ANY(keywords_array)) THEN
              
              keywords_array := array_append(keywords_array, phrase);
              phrase_count := phrase_count + 1;
              
              INSERT INTO seo_keywords (keyword, source_type, source_id, auto_generated, is_active, relevance_score, keyword_type, search_volume_estimate)
              VALUES (phrase, 'product', product_record.id, true, true, 60, 'long-tail', 'low')
              ON CONFLICT (keyword) DO UPDATE
              SET relevance_score = GREATEST(seo_keywords.relevance_score, 60);
            END IF;
          END IF;
        END LOOP;
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
          AND keyword = ANY(keywords_array)
        ORDER BY relevance_score DESC
        LIMIT 5
      );
    
  END LOOP;
  
  DROP TABLE IF EXISTS stop_words;
END;
$$;

-- FASE 3: Función de limpieza de keywords obsoletas
CREATE OR REPLACE FUNCTION cleanup_low_quality_keywords()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Eliminar keywords genéricas de baja calidad
  WITH deleted AS (
    DELETE FROM seo_keywords 
    WHERE (
      -- Muy cortas
      length(keyword) < 5
      -- Stop words individuales
      OR keyword IN ('este', 'esta', 'estos', 'estas', 'siempre', 'puede', 'pueden', 'tiene', 'tienen', 'hacer', 'hace', 'hacen', 'muy', 'más')
      -- Keywords con relevancia muy baja y no activas
      OR (relevance_score < 30 AND is_active = false)
    )
    AND auto_generated = true
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$;

-- FASE 4: Función para regenerar keywords de un producto específico
CREATE OR REPLACE FUNCTION regenerate_product_keywords(p_product_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Desactivar keywords actuales del producto
  UPDATE seo_keywords
  SET is_active = false
  WHERE source_type = 'product' 
    AND source_id = p_product_id
    AND auto_generated = true;
  
  -- Regenerar (la función principal manejará este producto)
  PERFORM generate_product_keywords_optimized();
END;
$$;