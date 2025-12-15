-- Add footer_settings to automatic translation queueing

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
        -- Silenciar errores para no bloquear operaciones
        RAISE WARNING 'Translation queue error for %: %', v_field_name, SQLERRM;
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for footer_settings (translations for custom footer texts)
DROP TRIGGER IF EXISTS queue_footer_settings_translations ON public.footer_settings;
CREATE TRIGGER queue_footer_settings_translations
AFTER INSERT OR UPDATE ON public.footer_settings
FOR EACH ROW
EXECUTE FUNCTION public.queue_translation();

-- Backfill: enqueue existing footer_settings text fields for translation (without modifying footer_settings rows)
INSERT INTO public.translation_queue (
  entity_type,
  entity_id,
  field_name,
  source_language,
  target_languages,
  status
)
SELECT
  'footer_settings' AS entity_type,
  fs.id AS entity_id,
  v.field_name,
  'es' AS source_language,
  ARRAY['en','nl']::text[] AS target_languages,
  'pending' AS status
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
ON CONFLICT (entity_type, entity_id, field_name)
DO UPDATE SET
  status = 'pending',
  source_language = 'es',
  target_languages = ARRAY['en','nl']::text[],
  updated_at = NOW();
