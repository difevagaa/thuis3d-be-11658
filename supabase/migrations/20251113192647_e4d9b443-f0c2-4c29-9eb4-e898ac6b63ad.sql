-- ============================================
-- FIX: Agregar políticas RLS para subida de imágenes en SiteCustomizer
-- ============================================

-- Políticas para bucket product-images: permitir a admins subir imágenes
CREATE POLICY "Admins can upload to product-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update product-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete from product-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Anyone can view product-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');