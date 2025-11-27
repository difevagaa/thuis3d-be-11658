-- Corregir función para evitar tablas temporales (incompatible con transacciones read-only)
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
  stop_words TEXT[] := ARRAY[
    'de', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'y', 'o', 'en', 'con', 'por', 'para', 'este', 'esta', 'estos',
    'estas', 'del', 'al', 'que', 'su', 'sus', 'se', 'es', 'son',
    'muy', 'más', 'pero', 'como', 'sin', 'sobre', 'desde', 'hasta',
    'puede', 'pueden', 'tiene', 'tienen', 'hacer', 'hace', 'hacen',
    'siempre', 'también', 'solo', 'sólo', 'cada'
  ];
  clean_name TEXT;
  clean_desc TEXT;
  category_name TEXT;
  words TEXT[];
  i INTEGER;
  bigram TEXT;
  trigram TEXT;
  word_count INTEGER;
  first_significant_word TEXT;
BEGIN
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
    words := string_to_array(clean_name, ' ');
    word_count := array_length(words, 1);
    
    -- Bigramas (2 palabras)
    IF word_count >= 2 THEN
      FOR i IN 1..(word_count - 1) LOOP
        IF NOT (words[i] = ANY(stop_words)) AND NOT (words[i+1] = ANY(stop_words)) THEN
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
        IF NOT (words[i] = ANY(stop_words)) THEN
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
    
    -- 3. Keyword de Categoría + Primera palabra significativa del producto
    IF category_name != '' AND LENGTH(category_name) >= 3 THEN
      FOR i IN 1..word_count LOOP
        IF NOT (words[i] = ANY(stop_words)) AND LENGTH(words[i]) >= 4 THEN
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
END;
$$;