-- Crear tabla para múltiples imágenes por banner
CREATE TABLE IF NOT EXISTS public.banner_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    banner_id UUID NOT NULL REFERENCES public.homepage_banners(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    alt_text TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índice para mejorar el rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_banner_images_banner_id ON public.banner_images(banner_id);
CREATE INDEX IF NOT EXISTS idx_banner_images_display_order ON public.banner_images(display_order);

-- Comentarios para documentación
COMMENT ON TABLE public.banner_images IS 'Almacena múltiples imágenes para cada banner, permitiendo carruseles/slideshow';
COMMENT ON COLUMN public.banner_images.banner_id IS 'ID del banner al que pertenece esta imagen';
COMMENT ON COLUMN public.banner_images.image_url IS 'URL de la imagen';
COMMENT ON COLUMN public.banner_images.display_order IS 'Orden de visualización en el carrusel (menor = primero)';
COMMENT ON COLUMN public.banner_images.alt_text IS 'Texto alternativo para accesibilidad';
COMMENT ON COLUMN public.banner_images.is_active IS 'Si la imagen está activa y visible';

-- Políticas RLS (Row Level Security)
ALTER TABLE public.banner_images ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: Todos pueden ver imágenes activas
CREATE POLICY "banner_images_select_policy" ON public.banner_images
    FOR SELECT
    USING (true);

-- Política para INSERT: Solo administradores
CREATE POLICY "banner_images_insert_policy" ON public.banner_images
    FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- Política para UPDATE: Solo administradores
CREATE POLICY "banner_images_update_policy" ON public.banner_images
    FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin'::text))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- Política para DELETE: Solo administradores
CREATE POLICY "banner_images_delete_policy" ON public.banner_images
    FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'::text));

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_banner_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_banner_images_updated_at_trigger
    BEFORE UPDATE ON public.banner_images
    FOR EACH ROW
    EXECUTE FUNCTION public.update_banner_images_updated_at();
