-- Enhance translation system: comprehensive enqueue_all, add missing triggers, improve page_builder_sections trigger

-- ============================================================
-- 1. Add trigger for page_builder_pages (missing entirely)
-- ============================================================
DROP TRIGGER IF EXISTS queue_page_builder_pages_translations ON public.page_builder_pages;
CREATE TRIGGER queue_page_builder_pages_translations
AFTER INSERT OR UPDATE ON public.page_builder_pages
FOR EACH ROW
EXECUTE FUNCTION public.queue_translation();

-- ============================================================
-- 2. Update queue_translation() to handle page_builder_pages
-- ============================================================
CREATE OR REPLACE FUNCTION public.queue_translation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
        WHEN 'homepage_sections' THEN ARRAY['title', 'subtitle']
        WHEN 'homepage_quick_access_cards' THEN ARRAY['title', 'description', 'button_text']
        WHEN 'homepage_features' THEN ARRAY['title', 'description']
        WHEN 'page_builder_pages' THEN ARRAY['page_name', 'description']
        WHEN 'footer_settings' THEN ARRAY[
          'brand_tagline',
          'help_section_title',
          'quick_links_title',
          'newsletter_title',
          'newsletter_description',
          'newsletter_placeholder',
          'payment_methods_title',
          'copyright_text'
        ]
        ELSE ARRAY[]::TEXT[]
      END
    LOOP
      BEGIN
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
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Translation queue error for %: %', v_field_name, SQLERRM;
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Enhance page_builder_sections trigger to handle slides, plans, and emailPlaceholder
-- ============================================================
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
  j INTEGER;
  fld_name TEXT;
  feat TEXT;
BEGIN
  content_json := COALESCE(NEW.content, '{}'::jsonb);

  -- Enqueue section_name
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  VALUES ('page_builder_sections', NEW.id, 'section_name', 'es', target_langs, 'pending')
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();

  -- Top-level text fields (including emailPlaceholder)
  FOR k, v IN SELECT key, value FROM jsonb_each_text(content_json)
  LOOP
    IF v IS NOT NULL AND length(trim(v)) > 0 AND
       k ~ '^(title|subtitle|description|text|headline|subheadline|label|tagline|message|placeholder|buttonText|emailPlaceholder)$' THEN
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

  -- Process 'slides' array
  IF content_json ? 'slides' AND jsonb_typeof(content_json->'slides') = 'array' THEN
    FOR i IN 0..jsonb_array_length(content_json->'slides') - 1 LOOP
      FOR k, v IN SELECT key, value FROM jsonb_each_text(content_json->'slides'->i)
      LOOP
        IF v IS NOT NULL AND length(trim(v)) > 0 AND k ~ '^(title|description|text|label|buttonText|name|content)$' THEN
          fld_name := 'slides_' || i || '_' || k;
          INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
          VALUES ('page_builder_sections', NEW.id, fld_name, 'es', target_langs, 'pending')
          ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
        END IF;
      END LOOP;
    END LOOP;
  END IF;

  -- Process 'plans' array (pricing plans)
  IF content_json ? 'plans' AND jsonb_typeof(content_json->'plans') = 'array' THEN
    FOR i IN 0..jsonb_array_length(content_json->'plans') - 1 LOOP
      -- Plan-level text fields
      FOR k, v IN SELECT key, value FROM jsonb_each_text(content_json->'plans'->i)
      LOOP
        IF v IS NOT NULL AND length(trim(v)) > 0 AND k ~ '^(name|period|buttonText|description)$' THEN
          fld_name := 'plans_' || i || '_' || k;
          INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
          VALUES ('page_builder_sections', NEW.id, fld_name, 'es', target_langs, 'pending')
          ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
        END IF;
      END LOOP;
      -- Plan features (string array)
      IF content_json->'plans'->i ? 'features' AND jsonb_typeof(content_json->'plans'->i->'features') = 'array' THEN
        FOR j IN 0..jsonb_array_length(content_json->'plans'->i->'features') - 1 LOOP
          feat := content_json->'plans'->i->'features'->>j;
          IF feat IS NOT NULL AND length(trim(feat)) > 0 THEN
            fld_name := 'plans_' || i || '_features_' || j;
            INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
            VALUES ('page_builder_sections', NEW.id, fld_name, 'es', target_langs, 'pending')
            ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_queue_page_builder_section_translation ON public.page_builder_sections;
CREATE TRIGGER trigger_queue_page_builder_section_translation
AFTER INSERT OR UPDATE ON public.page_builder_sections
FOR EACH ROW EXECUTE FUNCTION queue_page_builder_section_translation();

-- ============================================================
-- 4. Comprehensive enqueue_all_translatable_content() covering ALL entity types
-- ============================================================
CREATE OR REPLACE FUNCTION public.enqueue_all_translatable_content()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_partial integer;
BEGIN
  -- Products (name, description)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'products', p.id, unnest(ARRAY['name', 'description']), 'es', ARRAY['en','nl'], 'pending'
  FROM public.products p
  WHERE p.deleted_at IS NULL
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Categories (name, description)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'categories', c.id, unnest(ARRAY['name', 'description']), 'es', ARRAY['en','nl'], 'pending'
  FROM public.categories c
  WHERE c.deleted_at IS NULL
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Materials (name, description)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'materials', m.id, unnest(ARRAY['name', 'description']), 'es', ARRAY['en','nl'], 'pending'
  FROM public.materials m
  WHERE m.deleted_at IS NULL
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Colors (name)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'colors', cl.id, 'name', 'es', ARRAY['en','nl'], 'pending'
  FROM public.colors cl
  WHERE cl.deleted_at IS NULL
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Blog posts (title, excerpt, content)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'blog_posts', bp.id, unnest(ARRAY['title', 'excerpt', 'content']), 'es', ARRAY['en','nl'], 'pending'
  FROM public.blog_posts bp
  WHERE bp.deleted_at IS NULL
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Pages (title, content)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'pages', pg.id, unnest(ARRAY['title', 'content']), 'es', ARRAY['en','nl'], 'pending'
  FROM public.pages pg
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Legal pages (title, content)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'legal_pages', lp.id, unnest(ARRAY['title', 'content']), 'es', ARRAY['en','nl'], 'pending'
  FROM public.legal_pages lp
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Homepage banners (title, description)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'homepage_banners', hb.id, unnest(ARRAY['title', 'description']), 'es', ARRAY['en','nl'], 'pending'
  FROM public.homepage_banners hb
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Homepage sections (title, subtitle)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'homepage_sections', hs.id, unnest(ARRAY['title', 'subtitle']), 'es', ARRAY['en','nl'], 'pending'
  FROM public.homepage_sections hs
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Homepage quick access cards (title, description, button_text)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'homepage_quick_access_cards', hqac.id, unnest(ARRAY['title', 'description', 'button_text']), 'es', ARRAY['en','nl'], 'pending'
  FROM public.homepage_quick_access_cards hqac
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Homepage features (title, description)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'homepage_features', hf.id, unnest(ARRAY['title', 'description']), 'es', ARRAY['en','nl'], 'pending'
  FROM public.homepage_features hf
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Gallery items (title, description)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'gallery_items', gi.id, unnest(ARRAY['title', 'description']), 'es', ARRAY['en','nl'], 'pending'
  FROM public.gallery_items gi
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Footer links (title)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'footer_links', fl.id, 'title', 'es', ARRAY['en','nl'], 'pending'
  FROM public.footer_links fl
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Footer settings (all text fields)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'footer_settings', fs.id, v.field_name, 'es', ARRAY['en','nl'], 'pending'
  FROM public.footer_settings fs
  CROSS JOIN LATERAL (
    SELECT 'brand_tagline'::text AS field_name, fs.brand_tagline AS value
    UNION ALL SELECT 'help_section_title', fs.help_section_title
    UNION ALL SELECT 'quick_links_title', fs.quick_links_title
    UNION ALL SELECT 'newsletter_title', fs.newsletter_title
    UNION ALL SELECT 'newsletter_description', fs.newsletter_description
    UNION ALL SELECT 'newsletter_placeholder', fs.newsletter_placeholder
    UNION ALL SELECT 'payment_methods_title', fs.payment_methods_title
    UNION ALL SELECT 'copyright_text', fs.copyright_text
  ) v
  WHERE v.value IS NOT NULL AND length(trim(v.value)) > 0
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Reviews (comment)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'reviews', r.id, 'comment', 'es', ARRAY['en','nl'], 'pending'
  FROM public.reviews r
  WHERE r.comment IS NOT NULL AND length(trim(r.comment)) > 0
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Page builder pages (page_name, description)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'page_builder_pages', pbp.id, unnest(ARRAY['page_name', 'description']), 'es', ARRAY['en','nl'], 'pending'
  FROM public.page_builder_pages pbp
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Page builder sections: trigger the section trigger for each existing section
  -- We re-enqueue section_name and top-level content fields
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'page_builder_sections', pbs.id, 'section_name', 'es', ARRAY['en','nl'], 'pending'
  FROM public.page_builder_sections pbs
  WHERE pbs.section_name IS NOT NULL AND length(trim(pbs.section_name)) > 0
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Page builder sections: enqueue top-level JSONB text fields
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'page_builder_sections', pbs.id, kv.key, 'es', ARRAY['en','nl'], 'pending'
  FROM public.page_builder_sections pbs,
  LATERAL jsonb_each_text(COALESCE(pbs.content, '{}'::jsonb)) AS kv(key, value)
  WHERE kv.value IS NOT NULL AND length(trim(kv.value)) > 0
    AND kv.key ~ '^(title|subtitle|description|text|headline|subheadline|label|tagline|message|placeholder|buttonText|emailPlaceholder)$'
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Page builder sections: enqueue array item fields (items, cards, features, testimonials, benefits, steps, slides)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'page_builder_sections', pbs.id, 
         arr_key || '_' || (elem_idx - 1) || '_' || fld.key,
         'es', ARRAY['en','nl'], 'pending'
  FROM public.page_builder_sections pbs,
  LATERAL (
    SELECT key AS arr_key, value AS arr_val
    FROM jsonb_each(COALESCE(pbs.content, '{}'::jsonb))
    WHERE key IN ('items', 'cards', 'features', 'testimonials', 'benefits', 'steps', 'slides')
      AND jsonb_typeof(value) = 'array'
  ) arrays,
  LATERAL jsonb_array_elements(arrays.arr_val) WITH ORDINALITY AS elems(elem, elem_idx),
  LATERAL jsonb_each_text(elems.elem) AS fld(key, value)
  WHERE fld.value IS NOT NULL AND length(trim(fld.value)) > 0
    AND fld.key ~ '^(title|description|text|label|buttonText|name|content|quote|author)$'
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Page builder sections: enqueue plans fields
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'page_builder_sections', pbs.id,
         'plans_' || (plan_idx - 1) || '_' || fld.key,
         'es', ARRAY['en','nl'], 'pending'
  FROM public.page_builder_sections pbs,
  LATERAL jsonb_array_elements(COALESCE(pbs.content->'plans', '[]'::jsonb)) WITH ORDINALITY AS plans(plan, plan_idx),
  LATERAL jsonb_each_text(plans.plan) AS fld(key, value)
  WHERE jsonb_typeof(COALESCE(pbs.content->'plans', 'null'::jsonb)) = 'array'
    AND fld.value IS NOT NULL AND length(trim(fld.value)) > 0
    AND fld.key ~ '^(name|period|buttonText|description)$'
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  -- Page builder sections: enqueue plan features (string arrays)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name, source_language, target_languages, status)
  SELECT 'page_builder_sections', pbs.id,
         'plans_' || (plan_idx - 1) || '_features_' || (feat_idx - 1),
         'es', ARRAY['en','nl'], 'pending'
  FROM public.page_builder_sections pbs,
  LATERAL jsonb_array_elements(COALESCE(pbs.content->'plans', '[]'::jsonb)) WITH ORDINALITY AS plans(plan, plan_idx),
  LATERAL jsonb_array_elements_text(COALESCE(plans.plan->'features', '[]'::jsonb)) WITH ORDINALITY AS feats(feat, feat_idx)
  WHERE jsonb_typeof(COALESCE(pbs.content->'plans', 'null'::jsonb)) = 'array'
    AND jsonb_typeof(COALESCE(plans.plan->'features', 'null'::jsonb)) = 'array'
    AND feats.feat IS NOT NULL AND length(trim(feats.feat)) > 0
  ON CONFLICT (entity_type, entity_id, field_name) DO UPDATE SET status = 'pending', updated_at = NOW();
  GET DIAGNOSTICS v_partial = ROW_COUNT;
  v_count := v_count + v_partial;

  RETURN v_count;
END;
$$;
