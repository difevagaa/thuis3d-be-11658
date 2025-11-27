-- Crear bucket para medios de galería
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES (
  'gallery-media',
  'gallery-media',
  true,
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ],
  104857600  -- 100MB limit for videos
)
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit;

-- Crear tabla de items de galería
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER DEFAULT 0,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies para gallery_items
CREATE POLICY "Anyone can view published gallery items"
ON public.gallery_items
FOR SELECT
USING (is_published = true AND deleted_at IS NULL);

CREATE POLICY "Admins can manage gallery items"
ON public.gallery_items
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies para storage.objects del bucket gallery-media
CREATE POLICY "Anyone can view gallery media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'gallery-media');

CREATE POLICY "Admins can upload gallery media"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'gallery-media' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update gallery media"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'gallery-media' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete gallery media"
ON storage.objects
FOR DELETE
USING (bucket_id = 'gallery-media' AND has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_gallery_items_updated_at
BEFORE UPDATE ON public.gallery_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Añadir columna opcional a quotes para referencia de galería
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS gallery_reference_id UUID REFERENCES public.gallery_items(id);