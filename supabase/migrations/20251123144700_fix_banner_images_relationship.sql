-- Asegurar que la relación entre banner_images y homepage_banners esté correctamente registrada
-- Este script verifica y corrige la foreign key si es necesario

-- Primero, eliminar la constraint existente si existe (sin error si no existe)
DO $$ 
BEGIN
    -- Intentar eliminar la constraint si existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'banner_images_banner_id_fkey' 
        AND table_name = 'banner_images'
    ) THEN
        ALTER TABLE public.banner_images 
        DROP CONSTRAINT banner_images_banner_id_fkey;
    END IF;
END $$;

-- Crear la foreign key constraint con el nombre explícito que PostgREST espera
ALTER TABLE public.banner_images 
ADD CONSTRAINT banner_images_banner_id_fkey 
FOREIGN KEY (banner_id) 
REFERENCES public.homepage_banners(id) 
ON DELETE CASCADE;

-- Comentario para documentación
COMMENT ON CONSTRAINT banner_images_banner_id_fkey ON public.banner_images 
IS 'Relación entre banner_images y homepage_banners para permitir múltiples imágenes por banner';
