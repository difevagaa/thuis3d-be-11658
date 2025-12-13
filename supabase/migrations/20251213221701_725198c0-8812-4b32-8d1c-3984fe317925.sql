-- Add trigger for page_builder_sections to queue translations automatically
CREATE OR REPLACE FUNCTION public.queue_page_builder_section_translation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_langs TEXT[] := ARRAY['en', 'nl'];
  content_json JSONB;
  item_record RECORD;
  i INTEGER;
BEGIN
  content_json := COALESCE(NEW.content, '{}'::jsonb);
  
  -- Queue section_name
  INSERT INTO public.translation_queue (
    entity_type, entity_id, field_name, source_language, target_languages, status
  ) VALUES (
    'page_builder_sections', NEW.id, 'section_name', 'es', target_langs, 'pending'
  ) ON CONFLICT (entity_type, entity_id, field_name) 
  DO UPDATE SET status = 'pending', updated_at = NOW();
  
  -- Queue title if exists
  IF content_json ? 'title' AND content_json->>'title' IS NOT NULL AND LENGTH(TRIM(content_json->>'title')) > 0 THEN
    INSERT INTO public.translation_queue (
      entity_type, entity_id, field_name, source_language, target_languages, status
    ) VALUES (
      'page_builder_sections', NEW.id, 'title', 'es', target_langs, 'pending'
    ) ON CONFLICT (entity_type, entity_id, field_name) 
    DO UPDATE SET status = 'pending', updated_at = NOW();
  END IF;
  
  -- Queue subtitle if exists
  IF content_json ? 'subtitle' AND content_json->>'subtitle' IS NOT NULL AND LENGTH(TRIM(content_json->>'subtitle')) > 0 THEN
    INSERT INTO public.translation_queue (
      entity_type, entity_id, field_name, source_language, target_languages, status
    ) VALUES (
      'page_builder_sections', NEW.id, 'subtitle', 'es', target_langs, 'pending'
    ) ON CONFLICT (entity_type, entity_id, field_name) 
    DO UPDATE SET status = 'pending', updated_at = NOW();
  END IF;
  
  -- Queue description if exists
  IF content_json ? 'description' AND content_json->>'description' IS NOT NULL AND LENGTH(TRIM(content_json->>'description')) > 0 THEN
    INSERT INTO public.translation_queue (
      entity_type, entity_id, field_name, source_language, target_languages, status
    ) VALUES (
      'page_builder_sections', NEW.id, 'description', 'es', target_langs, 'pending'
    ) ON CONFLICT (entity_type, entity_id, field_name) 
    DO UPDATE SET status = 'pending', updated_at = NOW();
  END IF;
  
  -- Queue buttonText if exists
  IF content_json ? 'buttonText' AND content_json->>'buttonText' IS NOT NULL AND LENGTH(TRIM(content_json->>'buttonText')) > 0 THEN
    INSERT INTO public.translation_queue (
      entity_type, entity_id, field_name, source_language, target_languages, status
    ) VALUES (
      'page_builder_sections', NEW.id, 'buttonText', 'es', target_langs, 'pending'
    ) ON CONFLICT (entity_type, entity_id, field_name) 
    DO UPDATE SET status = 'pending', updated_at = NOW();
  END IF;
  
  -- Queue text if exists
  IF content_json ? 'text' AND content_json->>'text' IS NOT NULL AND LENGTH(TRIM(content_json->>'text')) > 0 THEN
    INSERT INTO public.translation_queue (
      entity_type, entity_id, field_name, source_language, target_languages, status
    ) VALUES (
      'page_builder_sections', NEW.id, 'text', 'es', target_langs, 'pending'
    ) ON CONFLICT (entity_type, entity_id, field_name) 
    DO UPDATE SET status = 'pending', updated_at = NOW();
  END IF;
  
  -- Queue items array elements
  IF content_json ? 'items' AND jsonb_typeof(content_json->'items') = 'array' THEN
    FOR i IN 0..jsonb_array_length(content_json->'items') - 1 LOOP
      -- Item title
      IF content_json->'items'->i ? 'title' THEN
        INSERT INTO public.translation_queue (
          entity_type, entity_id, field_name, source_language, target_languages, status
        ) VALUES (
          'page_builder_sections', NEW.id, 'items_' || i || '_title', 'es', target_langs, 'pending'
        ) ON CONFLICT (entity_type, entity_id, field_name) 
        DO UPDATE SET status = 'pending', updated_at = NOW();
      END IF;
      -- Item description
      IF content_json->'items'->i ? 'description' THEN
        INSERT INTO public.translation_queue (
          entity_type, entity_id, field_name, source_language, target_languages, status
        ) VALUES (
          'page_builder_sections', NEW.id, 'items_' || i || '_description', 'es', target_langs, 'pending'
        ) ON CONFLICT (entity_type, entity_id, field_name) 
        DO UPDATE SET status = 'pending', updated_at = NOW();
      END IF;
    END LOOP;
  END IF;
  
  -- Queue cards array elements
  IF content_json ? 'cards' AND jsonb_typeof(content_json->'cards') = 'array' THEN
    FOR i IN 0..jsonb_array_length(content_json->'cards') - 1 LOOP
      -- Card title
      IF content_json->'cards'->i ? 'title' THEN
        INSERT INTO public.translation_queue (
          entity_type, entity_id, field_name, source_language, target_languages, status
        ) VALUES (
          'page_builder_sections', NEW.id, 'cards_' || i || '_title', 'es', target_langs, 'pending'
        ) ON CONFLICT (entity_type, entity_id, field_name) 
        DO UPDATE SET status = 'pending', updated_at = NOW();
      END IF;
      -- Card description
      IF content_json->'cards'->i ? 'description' THEN
        INSERT INTO public.translation_queue (
          entity_type, entity_id, field_name, source_language, target_languages, status
        ) VALUES (
          'page_builder_sections', NEW.id, 'cards_' || i || '_description', 'es', target_langs, 'pending'
        ) ON CONFLICT (entity_type, entity_id, field_name) 
        DO UPDATE SET status = 'pending', updated_at = NOW();
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error queueing page builder section translation: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger for page_builder_sections
DROP TRIGGER IF EXISTS trigger_queue_page_builder_section_translation ON public.page_builder_sections;
CREATE TRIGGER trigger_queue_page_builder_section_translation
AFTER INSERT OR UPDATE ON public.page_builder_sections
FOR EACH ROW
EXECUTE FUNCTION public.queue_page_builder_section_translation();

-- Function to enqueue all existing page builder sections for translation
CREATE OR REPLACE FUNCTION public.enqueue_all_page_builder_sections()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  section_record RECORD;
  enqueued_count INTEGER := 0;
BEGIN
  FOR section_record IN SELECT * FROM public.page_builder_sections LOOP
    -- Call the trigger function logic for each section
    PERFORM public.queue_page_builder_section_translation_manual(section_record.id);
    enqueued_count := enqueued_count + 1;
  END LOOP;
  
  RETURN enqueued_count;
END;
$$;

-- Manual enqueue function for a single section
CREATE OR REPLACE FUNCTION public.queue_page_builder_section_translation_manual(p_section_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_langs TEXT[] := ARRAY['en', 'nl'];
  section_record RECORD;
  content_json JSONB;
  i INTEGER;
BEGIN
  SELECT * INTO section_record FROM public.page_builder_sections WHERE id = p_section_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  content_json := COALESCE(section_record.content, '{}'::jsonb);
  
  -- Queue section_name
  INSERT INTO public.translation_queue (
    entity_type, entity_id, field_name, source_language, target_languages, status
  ) VALUES (
    'page_builder_sections', p_section_id, 'section_name', 'es', target_langs, 'pending'
  ) ON CONFLICT (entity_type, entity_id, field_name) 
  DO UPDATE SET status = 'pending', updated_at = NOW();
  
  -- Queue content fields
  IF content_json ? 'title' AND content_json->>'title' IS NOT NULL THEN
    INSERT INTO public.translation_queue (
      entity_type, entity_id, field_name, source_language, target_languages, status
    ) VALUES (
      'page_builder_sections', p_section_id, 'title', 'es', target_langs, 'pending'
    ) ON CONFLICT (entity_type, entity_id, field_name) 
    DO UPDATE SET status = 'pending', updated_at = NOW();
  END IF;
  
  IF content_json ? 'subtitle' AND content_json->>'subtitle' IS NOT NULL THEN
    INSERT INTO public.translation_queue (
      entity_type, entity_id, field_name, source_language, target_languages, status
    ) VALUES (
      'page_builder_sections', p_section_id, 'subtitle', 'es', target_langs, 'pending'
    ) ON CONFLICT (entity_type, entity_id, field_name) 
    DO UPDATE SET status = 'pending', updated_at = NOW();
  END IF;
  
  IF content_json ? 'description' AND content_json->>'description' IS NOT NULL THEN
    INSERT INTO public.translation_queue (
      entity_type, entity_id, field_name, source_language, target_languages, status
    ) VALUES (
      'page_builder_sections', p_section_id, 'description', 'es', target_langs, 'pending'
    ) ON CONFLICT (entity_type, entity_id, field_name) 
    DO UPDATE SET status = 'pending', updated_at = NOW();
  END IF;
  
  IF content_json ? 'buttonText' AND content_json->>'buttonText' IS NOT NULL THEN
    INSERT INTO public.translation_queue (
      entity_type, entity_id, field_name, source_language, target_languages, status
    ) VALUES (
      'page_builder_sections', p_section_id, 'buttonText', 'es', target_langs, 'pending'
    ) ON CONFLICT (entity_type, entity_id, field_name) 
    DO UPDATE SET status = 'pending', updated_at = NOW();
  END IF;
  
  IF content_json ? 'text' AND content_json->>'text' IS NOT NULL THEN
    INSERT INTO public.translation_queue (
      entity_type, entity_id, field_name, source_language, target_languages, status
    ) VALUES (
      'page_builder_sections', p_section_id, 'text', 'es', target_langs, 'pending'
    ) ON CONFLICT (entity_type, entity_id, field_name) 
    DO UPDATE SET status = 'pending', updated_at = NOW();
  END IF;
  
  -- Queue items
  IF content_json ? 'items' AND jsonb_typeof(content_json->'items') = 'array' THEN
    FOR i IN 0..jsonb_array_length(content_json->'items') - 1 LOOP
      IF content_json->'items'->i ? 'title' THEN
        INSERT INTO public.translation_queue (
          entity_type, entity_id, field_name, source_language, target_languages, status
        ) VALUES (
          'page_builder_sections', p_section_id, 'items_' || i || '_title', 'es', target_langs, 'pending'
        ) ON CONFLICT (entity_type, entity_id, field_name) 
        DO UPDATE SET status = 'pending', updated_at = NOW();
      END IF;
      IF content_json->'items'->i ? 'description' THEN
        INSERT INTO public.translation_queue (
          entity_type, entity_id, field_name, source_language, target_languages, status
        ) VALUES (
          'page_builder_sections', p_section_id, 'items_' || i || '_description', 'es', target_langs, 'pending'
        ) ON CONFLICT (entity_type, entity_id, field_name) 
        DO UPDATE SET status = 'pending', updated_at = NOW();
      END IF;
    END LOOP;
  END IF;
  
  -- Queue cards
  IF content_json ? 'cards' AND jsonb_typeof(content_json->'cards') = 'array' THEN
    FOR i IN 0..jsonb_array_length(content_json->'cards') - 1 LOOP
      IF content_json->'cards'->i ? 'title' THEN
        INSERT INTO public.translation_queue (
          entity_type, entity_id, field_name, source_language, target_languages, status
        ) VALUES (
          'page_builder_sections', p_section_id, 'cards_' || i || '_title', 'es', target_langs, 'pending'
        ) ON CONFLICT (entity_type, entity_id, field_name) 
        DO UPDATE SET status = 'pending', updated_at = NOW();
      END IF;
      IF content_json->'cards'->i ? 'description' THEN
        INSERT INTO public.translation_queue (
          entity_type, entity_id, field_name, source_language, target_languages, status
        ) VALUES (
          'page_builder_sections', p_section_id, 'cards_' || i || '_description', 'es', target_langs, 'pending'
        ) ON CONFLICT (entity_type, entity_id, field_name) 
        DO UPDATE SET status = 'pending', updated_at = NOW();
      END IF;
    END LOOP;
  END IF;
END;
$$;