-- Improve automatic translation queueing for Page Builder sections
-- This makes sure ALL relevant text fields from the editor are enqueued automatically

CREATE OR REPLACE FUNCTION public.queue_page_builder_section_translation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_langs TEXT[] := ARRAY['en', 'nl'];
  content_json JSONB;
  key TEXT;
  value TEXT;
  i INTEGER;
  field_name TEXT;
BEGIN
  content_json := COALESCE(NEW.content, '{}'::jsonb);

  -- Always enqueue the human-readable section name
  INSERT INTO public.translation_queue (
    entity_type, entity_id, field_name, source_language, target_languages, status
  ) VALUES (
    'page_builder_sections', NEW.id, 'section_name', 'es', target_langs, 'pending'
  ) ON CONFLICT (entity_type, entity_id, field_name) 
  DO UPDATE SET status = 'pending', updated_at = NOW();

  -- Top-level content fields: pick up any text-like keys automatically
  FOR key, value IN
    SELECT key, value
    FROM jsonb_each_text(content_json)
  LOOP
    IF value IS NOT NULL AND length(trim(value)) > 0 AND
       key ~* '(title|subtitle|description|text|headline|subheadline|label|tagline|message|placeholder)' THEN
      INSERT INTO public.translation_queue (
        entity_type, entity_id, field_name, source_language, target_languages, status
      ) VALUES (
        'page_builder_sections', NEW.id, key, 'es', target_langs, 'pending'
      ) ON CONFLICT (entity_type, entity_id, field_name) 
      DO UPDATE SET status = 'pending', updated_at = NOW();
    END IF;
  END LOOP;

  -- Items array elements (cards like "Por qué elegirnos", beneficios, etc.)
  IF content_json ? 'items' AND jsonb_typeof(content_json->'items') = 'array' THEN
    FOR i IN 0..jsonb_array_length(content_json->'items') - 1 LOOP
      FOR key, value IN
        SELECT key, value
        FROM jsonb_each_text(content_json->'items'->i)
      LOOP
        IF value IS NOT NULL AND length(trim(value)) > 0 AND
           key ~* '(title|subtitle|description|text|label|tagline|message|placeholder|buttonText)' THEN
          field_name := format('items_%s_%s', i, key);

          INSERT INTO public.translation_queue (
            entity_type, entity_id, field_name, source_language, target_languages, status
          ) VALUES (
            'page_builder_sections', NEW.id, field_name, 'es', target_langs, 'pending'
          ) ON CONFLICT (entity_type, entity_id, field_name) 
          DO UPDATE SET status = 'pending', updated_at = NOW();
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  -- Cards array elements (used by "Por qué elegirnos" style sections)
  IF content_json ? 'cards' AND jsonb_typeof(content_json->'cards') = 'array' THEN
    FOR i IN 0..jsonb_array_length(content_json->'cards') - 1 LOOP
      FOR key, value IN
        SELECT key, value
        FROM jsonb_each_text(content_json->'cards'->i)
      LOOP
        IF value IS NOT NULL AND length(trim(value)) > 0 AND
           key ~* '(title|subtitle|description|text|label|tagline|message|placeholder|buttonText)' THEN
          field_name := format('cards_%s_%s', i, key);

          INSERT INTO public.translation_queue (
            entity_type, entity_id, field_name, source_language, target_languages, status
          ) VALUES (
            'page_builder_sections', NEW.id, field_name, 'es', target_langs, 'pending'
          ) ON CONFLICT (entity_type, entity_id, field_name) 
          DO UPDATE SET status = 'pending', updated_at = NOW();
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Re-enqueue all existing sections to pick up any newly-handled fields
SELECT public.enqueue_all_page_builder_sections();