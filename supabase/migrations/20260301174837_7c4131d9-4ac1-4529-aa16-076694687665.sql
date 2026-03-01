-- Create storage bucket for review images
INSERT INTO storage.buckets (id, name, public) VALUES ('review-images', 'review-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Review images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'review-images');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload review images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'review-images' AND auth.uid() IS NOT NULL);

-- Users can delete their own images
CREATE POLICY "Users can delete own review images"
ON storage.objects FOR DELETE
USING (bucket_id = 'review-images' AND auth.uid()::text = (storage.foldername(name))[1]);