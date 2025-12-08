-- Create page-builder-images bucket for the Page Builder system
-- This bucket stores images uploaded directly through the Page Builder image upload components

-- Create the bucket with 10MB file size limit (same as ImageUploadField default)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'page-builder-images', 
  'page-builder-images', 
  true, 
  10485760, -- 10MB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true, 
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- Allow authenticated users to upload images
DROP POLICY IF EXISTS "Authenticated users can upload to page-builder-images" ON storage.objects;
CREATE POLICY "Authenticated users can upload to page-builder-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'page-builder-images');

-- Allow public access to read all images (needed for public pages)
DROP POLICY IF EXISTS "Public can view page-builder-images" ON storage.objects;
CREATE POLICY "Public can view page-builder-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'page-builder-images');

-- Allow authenticated users to delete images
DROP POLICY IF EXISTS "Authenticated users can delete page-builder-images" ON storage.objects;
CREATE POLICY "Authenticated users can delete page-builder-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'page-builder-images');

-- Allow authenticated users to update images
DROP POLICY IF EXISTS "Authenticated users can update page-builder-images" ON storage.objects;
CREATE POLICY "Authenticated users can update page-builder-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'page-builder-images');
