-- Actualizar bucket de product-images para aceptar más formatos de imagen
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg', 
  'image/png', 
  'image/gif', 
  'image/webp',
  'image/avif',
  'image/svg+xml'
]::text[]
WHERE id = 'product-images';

-- Actualizar bucket de product-videos para aceptar más formatos
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'video/mp4', 
  'video/webm', 
  'video/quicktime',
  'video/x-msvideo',
  'video/avi'
]::text[]
WHERE id = 'product-videos';