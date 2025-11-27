-- Agregar columna para tipo de sección (color o imagen)
ALTER TABLE product_customization_sections 
ADD COLUMN section_type TEXT NOT NULL DEFAULT 'color' CHECK (section_type IN ('color', 'image'));

-- Crear tabla para opciones de imágenes por sección
CREATE TABLE product_section_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES product_customization_sections(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear bucket de storage para las imágenes de personalización si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-customization-images', 'product-customization-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS para product_section_images
ALTER TABLE product_section_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage section images"
ON product_section_images
FOR ALL
USING (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Anyone can view section images"
ON product_section_images
FOR SELECT
USING (true);

-- RLS para storage bucket de imágenes de personalización
CREATE POLICY "Anyone can view customization images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-customization-images');

CREATE POLICY "Admins can upload customization images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-customization-images' AND has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins can update customization images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-customization-images' AND has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Admins can delete customization images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-customization-images' AND has_role(auth.uid(), 'admin'::text));

-- Agregar columnas en cart_items para guardar selecciones de imágenes
ALTER TABLE cart_items 
ADD COLUMN customization_selections JSONB DEFAULT '[]'::jsonb;

-- Agregar columnas en order_items para guardar selecciones de imágenes
ALTER TABLE order_items 
ADD COLUMN customization_selections JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN cart_items.customization_selections IS 'Array de objetos con section_id, section_name, selection_type (color/image), color_id, color_name, image_id, image_name, image_url';
COMMENT ON COLUMN order_items.customization_selections IS 'Array de objetos con section_id, section_name, selection_type (color/image), color_id, color_name, image_id, image_name, image_url';