
-- Función corregida sin FOREACH (usando IF statements directos para cada tipo de array)
CREATE OR REPLACE FUNCTION public.queue_page_builder_section_translation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_langs TEXT[] := ARRAY['en', 'nl'];
  content_json JSONB;
  k TEXT;
  v TEXT;
  i INTEGER;
  fld_name TEXT;
BEGIN
  content_json := COALESCE(NEW.content, '{}'::jsonb);

  -- Enqueue section_name
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  VALUES ('page_builder_sections', NEW.id, 'section_name', 'es', target_langs, 'pending')
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();

  -- Top-level text fields
  FOR k, v IN SELECT key, value FROM jsonb_each_text(content_json)
  LOOP
    IF v IS NOT NULL AND length(trim(v)) > 0 AND
       k ~ '^(title|subtitle|description|text|headline|subheadline|label|tagline|message|placeholder|buttonText)$' THEN
      INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
      VALUES ('page_builder_sections', NEW.id, k, 'es', target_langs, 'pending')
      ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
    END IF;
  END LOOP;

  -- Process 'items' array
  IF content_json ? 'items' AND jsonb_typeof(content_json->'items') = 'array' THEN
    FOR i IN 0..jsonb_array_length(content_json->'items') - 1 LOOP
      FOR k, v IN SELECT key, value FROM jsonb_each_text(content_json->'items'->i)
      LOOP
        IF v IS NOT NULL AND length(trim(v)) > 0 AND k ~ '^(title|description|text|label|buttonText|name|content)$' THEN
          fld_name := 'items_' || i || '_' || k;
          INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
          VALUES ('page_builder_sections', NEW.id, fld_name, 'es', target_langs, 'pending')
          ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  -- Process 'cards' array
  IF content_json ? 'cards' AND jsonb_typeof(content_json->'cards') = 'array' THEN
    FOR i IN 0..jsonb_array_length(content_json->'cards') - 1 LOOP
      FOR k, v IN SELECT key, value FROM jsonb_each_text(content_json->'cards'->i)
      LOOP
        IF v IS NOT NULL AND length(trim(v)) > 0 AND k ~ '^(title|description|text|label|buttonText|name|content)$' THEN
          fld_name := 'cards_' || i || '_' || k;
          INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
          VALUES ('page_builder_sections', NEW.id, fld_name, 'es', target_langs, 'pending')
          ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  -- Process 'features' array
  IF content_json ? 'features' AND jsonb_typeof(content_json->'features') = 'array' THEN
    FOR i IN 0..jsonb_array_length(content_json->'features') - 1 LOOP
      FOR k, v IN SELECT key, value FROM jsonb_each_text(content_json->'features'->i)
      LOOP
        IF v IS NOT NULL AND length(trim(v)) > 0 AND k ~ '^(title|description|text|label|buttonText|name|content)$' THEN
          fld_name := 'features_' || i || '_' || k;
          INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
          VALUES ('page_builder_sections', NEW.id, fld_name, 'es', target_langs, 'pending')
          ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  -- Process 'testimonials' array
  IF content_json ? 'testimonials' AND jsonb_typeof(content_json->'testimonials') = 'array' THEN
    FOR i IN 0..jsonb_array_length(content_json->'testimonials') - 1 LOOP
      FOR k, v IN SELECT key, value FROM jsonb_each_text(content_json->'testimonials'->i)
      LOOP
        IF v IS NOT NULL AND length(trim(v)) > 0 AND k ~ '^(title|description|text|label|buttonText|name|content|quote|author)$' THEN
          fld_name := 'testimonials_' || i || '_' || k;
          INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
          VALUES ('page_builder_sections', NEW.id, fld_name, 'es', target_langs, 'pending')
          ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  -- Process 'benefits' array
  IF content_json ? 'benefits' AND jsonb_typeof(content_json->'benefits') = 'array' THEN
    FOR i IN 0..jsonb_array_length(content_json->'benefits') - 1 LOOP
      FOR k, v IN SELECT key, value FROM jsonb_each_text(content_json->'benefits'->i)
      LOOP
        IF v IS NOT NULL AND length(trim(v)) > 0 AND k ~ '^(title|description|text|label|buttonText|name|content)$' THEN
          fld_name := 'benefits_' || i || '_' || k;
          INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
          VALUES ('page_builder_sections', NEW.id, fld_name, 'es', target_langs, 'pending')
          ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  -- Process 'steps' array
  IF content_json ? 'steps' AND jsonb_typeof(content_json->'steps') = 'array' THEN
    FOR i IN 0..jsonb_array_length(content_json->'steps') - 1 LOOP
      FOR k, v IN SELECT key, value FROM jsonb_each_text(content_json->'steps'->i)
      LOOP
        IF v IS NOT NULL AND length(trim(v)) > 0 AND k ~ '^(title|description|text|label|buttonText|name|content)$' THEN
          fld_name := 'steps_' || i || '_' || k;
          INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
          VALUES ('page_builder_sections', NEW.id, fld_name, 'es', target_langs, 'pending')
          ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recrear trigger
DROP TRIGGER IF EXISTS trigger_queue_page_builder_section_translation ON public.page_builder_sections;
CREATE TRIGGER trigger_queue_page_builder_section_translation
AFTER INSERT OR UPDATE ON public.page_builder_sections
FOR EACH ROW EXECUTE FUNCTION queue_page_builder_section_translation();
