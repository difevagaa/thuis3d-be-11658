-- Actualizar bucket quote-files para permitir todos los tipos de archivo
UPDATE storage.buckets
SET 
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/sla',
    'model/stl',
    'model/obj',
    'model/3mf',
    'application/octet-stream'
  ],
  file_size_limit = 52428800  -- 50MB limit
WHERE id = 'quote-files';

-- Si el bucket no existe, crearlo
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
  'quote-files',
  'quote-files',
  false,
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/sla',
    'model/stl',
    'model/obj',
    'model/3mf',
    'application/octet-stream'
  ],
  52428800
)
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit;
