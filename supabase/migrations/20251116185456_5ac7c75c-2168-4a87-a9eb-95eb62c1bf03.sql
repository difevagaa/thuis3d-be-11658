-- Actualizar función de traducción para usar 'title' en lugar de 'label' para footer_links
CREATE OR REPLACE FUNCTION public.queue_translation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_field_name TEXT;
  original_value TEXT;
  target_langs TEXT[] := ARRAY['en', 'nl'];
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    FOREACH v_field_name IN ARRAY 
      CASE TG_TABLE_NAME
        WHEN 'products' THEN ARRAY['name', 'description']
        WHEN 'categories' THEN ARRAY['name', 'description']
        WHEN 'materials' THEN ARRAY['name', 'description']
        WHEN 'colors' THEN ARRAY['name']
        WHEN 'blog_posts' THEN ARRAY['title', 'excerpt', 'content']
        WHEN 'pages' THEN ARRAY['title', 'content']
        WHEN 'legal_pages' THEN ARRAY['title', 'content']
        WHEN 'homepage_banners' THEN ARRAY['title', 'description']
        WHEN 'gallery_items' THEN ARRAY['title', 'description']
        WHEN 'footer_links' THEN ARRAY['title']
        WHEN 'reviews' THEN ARRAY['comment']
        ELSE ARRAY[]::TEXT[]
      END
    LOOP
      EXECUTE format('SELECT ($1).%I', v_field_name) INTO original_value USING NEW;
      
      IF original_value IS NOT NULL AND LENGTH(TRIM(original_value)) > 0 THEN
        INSERT INTO public.translation_queue (
          entity_type,
          entity_id,
          field_name,
          source_language,
          target_languages,
          status
        ) VALUES (
          TG_TABLE_NAME,
          NEW.id,
          v_field_name,
          'es',
          target_langs,
          'pending'
        )
        ON CONFLICT (entity_type, entity_id, field_name) 
        DO UPDATE SET 
          status = 'pending',
          source_language = 'es',
          target_languages = target_langs,
          updated_at = NOW();
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;