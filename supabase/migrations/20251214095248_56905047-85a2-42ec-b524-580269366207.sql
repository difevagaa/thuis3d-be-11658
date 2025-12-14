-- Ensure trigger for auto-queueing page builder section translations exists and enqueue existing sections

-- 1) Recreate trigger safely to guarantee it is attached
DO $$
BEGIN
  -- Drop existing trigger if it exists to avoid duplicates
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_queue_page_builder_section_translation'
  ) THEN
    DROP TRIGGER trigger_queue_page_builder_section_translation ON public.page_builder_sections;
  END IF;

  -- Recreate trigger using existing function queue_page_builder_section_translation()
  CREATE TRIGGER trigger_queue_page_builder_section_translation
  AFTER INSERT OR UPDATE ON public.page_builder_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_page_builder_section_translation();
END;
$$ LANGUAGE plpgsql;

-- 2) Enqueue ALL existing page builder sections for translation so past content also gets translated
SELECT public.enqueue_all_page_builder_sections();