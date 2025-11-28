-- Ensure message-attachments bucket exists with correct permissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('message-attachments', 'message-attachments', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800;

-- Create or replace storage policies for message-attachments bucket
-- Allow authenticated users to upload to their own folder
DROP POLICY IF EXISTS "Authenticated users can upload to message-attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload to message-attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to view their own attachments
DROP POLICY IF EXISTS "Users can view their own message attachments" ON storage.objects;
CREATE POLICY "Users can view their own message attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public access to read all attachments (for admins viewing client attachments)
DROP POLICY IF EXISTS "Public can view message attachments" ON storage.objects;
CREATE POLICY "Public can view message attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'message-attachments');

-- Allow authenticated users to delete their own attachments
DROP POLICY IF EXISTS "Users can delete their own message attachments" ON storage.objects;
CREATE POLICY "Users can delete their own message attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'message-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Grant admins full access to message-attachments
DROP POLICY IF EXISTS "Admins can manage all message attachments" ON storage.objects;
CREATE POLICY "Admins can manage all message attachments"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'message-attachments' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);