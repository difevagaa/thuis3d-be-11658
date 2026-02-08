-- Fix: Allow 'file_upload' in product_customization_sections section_type check constraint
ALTER TABLE public.product_customization_sections
  DROP CONSTRAINT product_customization_sections_section_type_check;

ALTER TABLE public.product_customization_sections
  ADD CONSTRAINT product_customization_sections_section_type_check
  CHECK (section_type = ANY (ARRAY['color'::text, 'image'::text, 'file_upload'::text]));
