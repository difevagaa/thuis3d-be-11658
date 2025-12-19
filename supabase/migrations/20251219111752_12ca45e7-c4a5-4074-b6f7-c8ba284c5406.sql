-- Create uploads bucket if not exists (for lithophany images and STL files)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads', 
  'uploads', 
  true, 
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/sla', 'application/octet-stream', 'model/stl']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Storage policies for uploads bucket
DROP POLICY IF EXISTS "Public read access for uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to uploads" ON storage.objects;

-- Public read access
CREATE POLICY "Public read access for uploads" ON storage.objects
  FOR SELECT USING (bucket_id = 'uploads');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload to uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'uploads' 
    AND auth.role() = 'authenticated'
  );

-- Users can update their own files
CREATE POLICY "Users can update own uploads" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'uploads' 
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- Users can delete their own files
CREATE POLICY "Users can delete own uploads" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'uploads' 
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

-- Verify lithophany_orders table has correct RLS
ALTER TABLE public.lithophany_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for lithophany_orders if they exist
DROP POLICY IF EXISTS "Users can view own lithophany orders" ON public.lithophany_orders;
DROP POLICY IF EXISTS "Users can create own lithophany orders" ON public.lithophany_orders;
DROP POLICY IF EXISTS "Users can update own lithophany orders" ON public.lithophany_orders;
DROP POLICY IF EXISTS "Admins can view all lithophany orders" ON public.lithophany_orders;
DROP POLICY IF EXISTS "Admins can update all lithophany orders" ON public.lithophany_orders;

-- RLS policies for lithophany_orders
CREATE POLICY "Users can view own lithophany orders" ON public.lithophany_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own lithophany orders" ON public.lithophany_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lithophany orders" ON public.lithophany_orders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all lithophany orders" ON public.lithophany_orders
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all lithophany orders" ON public.lithophany_orders
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Update minimum dimensions constraints (10x10mm minimum)
ALTER TABLE public.lithophany_lamp_templates 
  ALTER COLUMN min_width_mm SET DEFAULT 10,
  ALTER COLUMN min_height_mm SET DEFAULT 10;

UPDATE public.lithophany_lamp_templates 
SET 
  min_width_mm = GREATEST(COALESCE(min_width_mm, 10), 10),
  min_height_mm = GREATEST(COALESCE(min_height_mm, 10), 10)
WHERE min_width_mm < 10 OR min_height_mm < 10 OR min_width_mm IS NULL OR min_height_mm IS NULL;