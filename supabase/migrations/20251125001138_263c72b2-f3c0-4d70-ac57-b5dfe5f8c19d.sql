-- Add display_order column to homepage_sections if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'homepage_sections' 
    AND column_name = 'display_order'
  ) THEN
    ALTER TABLE public.homepage_sections 
    ADD COLUMN display_order integer DEFAULT 0;
    
    -- Update existing records with sequential display_order based on created_at
    WITH numbered_sections AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 AS new_order
      FROM public.homepage_sections
    )
    UPDATE public.homepage_sections
    SET display_order = numbered_sections.new_order
    FROM numbered_sections
    WHERE homepage_sections.id = numbered_sections.id;
    
    -- Create index for better performance
    CREATE INDEX IF NOT EXISTS idx_homepage_sections_display_order 
    ON public.homepage_sections(display_order);
  END IF;
END $$;