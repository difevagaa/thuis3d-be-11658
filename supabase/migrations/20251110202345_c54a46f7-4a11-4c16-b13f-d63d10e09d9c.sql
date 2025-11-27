-- ============================================================================
-- CORRECCIÓN DEFINITIVA: STORAGE BUCKETS Y POLÍTICAS RLS
-- ============================================================================
-- Fecha: 2025-01-10
-- Propósito: Crear infraestructura de almacenamiento desde cero
--            Eliminar causa raíz del error "Bucket not found"
-- ============================================================================

-- 1. ELIMINAR BUCKETS EXISTENTES (si los hay, para empezar limpio)
DELETE FROM storage.buckets WHERE id IN ('quote-files', 'message-attachments', 'product-images', 'product-videos');

-- 2. CREAR BUCKETS CON CONFIGURACIÓN CORRECTA
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  -- Bucket para archivos STL de calibración y cotizaciones (PRIVADO)
  ('quote-files', 'quote-files', false, 52428800, ARRAY['model/stl', 'model/x.stl-binary', 'application/octet-stream']),
  
  -- Bucket para adjuntos de mensajes (PRIVADO)
  ('message-attachments', 'message-attachments', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  
  -- Bucket para imágenes de productos (PÚBLICO lectura)
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  
  -- Bucket para videos de productos (PÚBLICO lectura)
  ('product-videos', 'product-videos', true, 104857600, ARRAY['video/mp4', 'video/webm'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. ELIMINAR POLÍTICAS EXISTENTES (limpieza)
DROP POLICY IF EXISTS "Users can upload to their own folder in quote-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files in quote-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files in quote-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files in quote-files" ON storage.objects;
DROP POLICY IF EXISTS "Admins have full access to quote-files" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload to their own folder in message-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files in message-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files in message-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins have full access to message-attachments" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;

DROP POLICY IF EXISTS "Anyone can view product videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product videos" ON storage.objects;

-- 4. CREAR POLÍTICAS RLS PARA quote-files (PRIVADO, POR USUARIO)
CREATE POLICY "Users can upload to their own folder in quote-files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quote-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own files in quote-files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'quote-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own files in quote-files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'quote-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own files in quote-files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'quote-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins have full access to quote-files"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'quote-files' 
  AND has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'quote-files' 
  AND has_role(auth.uid(), 'admin')
);

-- 5. CREAR POLÍTICAS RLS PARA message-attachments (PRIVADO, POR USUARIO)
CREATE POLICY "Users can upload to their own folder in message-attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own files in message-attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'message-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own files in message-attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins have full access to message-attachments"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'message-attachments' 
  AND has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND has_role(auth.uid(), 'admin')
);

-- 6. CREAR POLÍTICAS RLS PARA product-images (PÚBLICO lectura, AUTENTICADO escritura)
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND has_role(auth.uid(), 'admin')
);

-- 7. CREAR POLÍTICAS RLS PARA product-videos (PÚBLICO lectura, AUTENTICADO escritura)
CREATE POLICY "Anyone can view product videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-videos');

CREATE POLICY "Authenticated users can upload product videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-videos');

CREATE POLICY "Admins can delete product videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-videos' 
  AND has_role(auth.uid(), 'admin')
);

-- 8. AGREGAR CONFIGURACIÓN PARA TOGGLE DE CALIBRACIONES
INSERT INTO printing_calculator_settings (setting_key, setting_value)
VALUES ('use_calibration_adjustments', 'true'::jsonb)
ON CONFLICT (setting_key) DO UPDATE SET setting_value = 'true'::jsonb;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Verificar buckets creados:
-- SELECT id, name, public, file_size_limit FROM storage.buckets;
-- 
-- Verificar políticas:
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'objects';
-- ============================================================================