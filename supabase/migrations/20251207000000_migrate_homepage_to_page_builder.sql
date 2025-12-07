-- =====================================================
-- MIGRATE HOMEPAGE CONTENT TO PAGE BUILDER
-- Converts all homepage_* table content to page_builder_sections
-- so everything can be edited from the page builder
-- =====================================================

-- Get the home page ID and migrate all content
DO $$
DECLARE
  home_page_id UUID;
  banner_record RECORD;
  section_record RECORD;
  feature_record RECORD;
  card_record RECORD;
  current_order INT := 0;
  features_array JSONB := '[]'::jsonb;
BEGIN
  -- Get home page ID
  SELECT id INTO home_page_id FROM page_builder_pages WHERE page_key = 'home';
  
  IF home_page_id IS NULL THEN
    RAISE EXCEPTION 'Home page not found in page_builder_pages';
  END IF;

  -- Clear existing sections for home page to avoid duplicates
  DELETE FROM page_builder_sections WHERE page_id = home_page_id;

  -- Migrate homepage_banners to hero sections
  FOR banner_record IN 
    SELECT * FROM homepage_banners 
    WHERE is_active = true 
    ORDER BY COALESCE(display_order, position_order, 0)
  LOOP
    INSERT INTO page_builder_sections (
      page_id, section_type, section_name, display_order, is_visible,
      settings, content, styles
    ) VALUES (
      home_page_id,
      'hero',
      COALESCE(banner_record.title, 'Banner'),
      current_order,
      COALESCE(banner_record.is_active, true),
      jsonb_build_object(
        'fullWidth', CASE WHEN banner_record.display_style = 'fullscreen' THEN true ELSE false END,
        'height', COALESCE(banner_record.height, '500px')
      ),
      jsonb_build_object(
        'title', banner_record.title,
        'subtitle', banner_record.description,
        'backgroundImage', banner_record.image_url,
        'buttonText', CASE WHEN banner_record.link_url IS NOT NULL THEN 'Ver más' ELSE '' END,
        'buttonUrl', banner_record.link_url
      ),
      jsonb_build_object(
        'backgroundColor', 'transparent',
        'textColor', COALESCE(banner_record.title_color, '#ffffff'),
        'padding', 80,
        'textAlign', 'center'
      )
    );
    current_order := current_order + 1;
  END LOOP;

  -- Migrate homepage_sections to banner or text sections
  FOR section_record IN 
    SELECT * FROM homepage_sections 
    WHERE is_active = true 
    ORDER BY COALESCE(display_order, 0)
  LOOP
    INSERT INTO page_builder_sections (
      page_id, section_type, section_name, display_order, is_visible,
      settings, content, styles
    ) VALUES (
      home_page_id,
      CASE WHEN section_record.image_url IS NOT NULL THEN 'banner' ELSE 'text' END,
      COALESCE(section_record.title, 'Sección'),
      current_order,
      COALESCE(section_record.is_active, true),
      jsonb_build_object('fullWidth', true),
      jsonb_build_object(
        'title', section_record.title,
        'subtitle', section_record.subtitle,
        'text', section_record.description,
        'backgroundImage', section_record.image_url
      ),
      jsonb_build_object(
        'backgroundColor', COALESCE(section_record.background_color, 'transparent'),
        'textColor', CASE WHEN section_record.image_url IS NOT NULL THEN '#ffffff' ELSE 'inherit' END,
        'padding', 60,
        'textAlign', 'center'
      )
    );
    current_order := current_order + 1;
  END LOOP;

  -- Collect all features into a JSON array
  FOR feature_record IN 
    SELECT * FROM homepage_features 
    WHERE is_active = true 
    ORDER BY COALESCE(display_order, 0)
  LOOP
    features_array := features_array || jsonb_build_object(
      'id', feature_record.id::text,
      'icon', feature_record.icon_name,
      'title', feature_record.title,
      'description', feature_record.description
    );
  END LOOP;

  -- Create a single features section with all features
  IF jsonb_array_length(features_array) > 0 THEN
    INSERT INTO page_builder_sections (
      page_id, section_type, section_name, display_order, is_visible,
      settings, content, styles
    ) VALUES (
      home_page_id,
      'features',
      'Por Qué Elegirnos',
      current_order,
      true,
      jsonb_build_object('fullWidth', true, 'columns', 3),
      jsonb_build_object(
        'title', 'Por Qué Elegirnos',
        'features', features_array
      ),
      jsonb_build_object(
        'backgroundColor', 'transparent',
        'padding', 60
      )
    );
    current_order := current_order + 1;
  END IF;

  -- Migrate homepage_quick_access_cards to CTA sections
  FOR card_record IN 
    SELECT * FROM homepage_quick_access_cards 
    WHERE is_active = true 
    ORDER BY COALESCE(display_order, 0)
  LOOP
    INSERT INTO page_builder_sections (
      page_id, section_type, section_name, display_order, is_visible,
      settings, content, styles
    ) VALUES (
      home_page_id,
      'cta',
      COALESCE(card_record.title, 'Tarjeta de acceso rápido'),
      current_order,
      COALESCE(card_record.is_active, true),
      jsonb_build_object('fullWidth', false),
      jsonb_build_object(
        'title', card_record.title,
        'description', card_record.description,
        'buttonText', card_record.button_text,
        'buttonUrl', card_record.button_url
      ),
      jsonb_build_object(
        'backgroundColor', 'transparent',
        'padding', 40
      )
    );
    current_order := current_order + 1;
  END LOOP;

  RAISE NOTICE 'Migration completed. Created % sections for home page.', current_order;
END $$;
