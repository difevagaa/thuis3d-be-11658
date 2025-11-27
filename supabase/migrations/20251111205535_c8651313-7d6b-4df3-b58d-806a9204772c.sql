-- Create function to enqueue all existing translatable content
CREATE OR REPLACE FUNCTION public.enqueue_all_translatable_content()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  -- Products (name, description)
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name)
  SELECT 'products', p.id, 'name'
  FROM public.products p
  WHERE p.deleted_at IS NULL
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name)
  SELECT 'products', p.id, 'description'
  FROM public.products p
  WHERE p.deleted_at IS NULL AND p.description IS NOT NULL
  ON CONFLICT DO NOTHING;

  -- Categories
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name)
  SELECT 'categories', c.id, 'name'
  FROM public.categories c
  WHERE c.deleted_at IS NULL
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name)
  SELECT 'categories', c.id, 'description'
  FROM public.categories c
  WHERE c.deleted_at IS NULL AND c.description IS NOT NULL
  ON CONFLICT DO NOTHING;

  -- Materials
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name)
  SELECT 'materials', m.id, 'name'
  FROM public.materials m
  WHERE m.deleted_at IS NULL
  ON CONFLICT DO NOTHING;

  -- Colors
  INSERT INTO public.translation_queue (entity_type, entity_id, field_name)
  SELECT 'colors', cl.id, 'name'
  FROM public.colors cl
  WHERE cl.deleted_at IS NULL
  ON CONFLICT DO NOTHING;

  -- Count total inserted
  SELECT COUNT(*) INTO v_inserted FROM public.translation_queue;
  
  RETURN v_inserted;
END;
$$;