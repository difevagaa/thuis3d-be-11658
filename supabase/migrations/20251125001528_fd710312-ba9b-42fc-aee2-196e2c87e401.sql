-- Add missing columns to homepage_sections table
DO $$ 
BEGIN
  -- Add display_order if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'homepage_sections' 
    AND column_name = 'display_order'
  ) THEN
    ALTER TABLE public.homepage_sections 
    ADD COLUMN display_order integer DEFAULT 0;
  END IF;

  -- Add image_url for section images
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'homepage_sections' 
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.homepage_sections 
    ADD COLUMN image_url text;
  END IF;

  -- Add description for extended text
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'homepage_sections' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE public.homepage_sections 
    ADD COLUMN description text;
  END IF;

  -- Add background_color for custom section styling
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'homepage_sections' 
    AND column_name = 'background_color'
  ) THEN
    ALTER TABLE public.homepage_sections 
    ADD COLUMN background_color varchar(50);
  END IF;

  -- Add icon_name for section icons (lucide icon names)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'homepage_sections' 
    AND column_name = 'icon_name'
  ) THEN
    ALTER TABLE public.homepage_sections 
    ADD COLUMN icon_name varchar(100);
  END IF;
END $$;

-- Update existing records to have sequential display_order if they're null
UPDATE public.homepage_sections 
SET display_order = subquery.row_num - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM public.homepage_sections
  WHERE display_order IS NULL
) AS subquery
WHERE homepage_sections.id = subquery.id AND homepage_sections.display_order IS NULL;

-- Create index for better performance on display_order
CREATE INDEX IF NOT EXISTS idx_homepage_sections_display_order 
ON public.homepage_sections(display_order);

-- Create index for section_key lookups
CREATE INDEX IF NOT EXISTS idx_homepage_sections_section_key 
ON public.homepage_sections(section_key);