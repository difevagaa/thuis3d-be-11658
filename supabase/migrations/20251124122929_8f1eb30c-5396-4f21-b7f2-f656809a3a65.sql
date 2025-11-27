-- ============================================================================
-- CORRECCIÓN CRÍTICA: Agregar columnas faltantes y tabla banner_images
-- ============================================================================
-- Esta migración corrige dos problemas:
-- 1. Falta la columna header_bg_color en site_customization
-- 2. Falta la tabla banner_images en el schema cache
-- ============================================================================

-- ============================================================================
-- PARTE 1: Corregir site_customization
-- ============================================================================

-- Agregar columnas faltantes a site_customization si no existen
DO $$ 
BEGIN
    -- Agregar header_bg_color si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'site_customization' 
          AND column_name = 'header_bg_color'
    ) THEN
        ALTER TABLE public.site_customization 
        ADD COLUMN header_bg_color TEXT DEFAULT NULL;
    END IF;

    -- Agregar selected_palette si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'site_customization' 
          AND column_name = 'selected_palette'
    ) THEN
        ALTER TABLE public.site_customization 
        ADD COLUMN selected_palette TEXT DEFAULT NULL;
    END IF;
END $$;

-- ============================================================================
-- PARTE 2: Crear tabla banner_images
-- ============================================================================

-- Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS public.banner_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    banner_id UUID NOT NULL,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    alt_text TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- PASO 2: Foreign key constraint
-- ============================================================================

-- Eliminar constraints existentes de forma segura
DO $$ 
DECLARE
    drop_commands TEXT;
BEGIN
    SELECT string_agg('ALTER TABLE public.banner_images DROP CONSTRAINT IF EXISTS ' || constraint_name || ';', ' ')
    INTO drop_commands
    FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
      AND table_name = 'banner_images' 
      AND constraint_type = 'FOREIGN KEY';
    
    IF drop_commands IS NOT NULL THEN
        EXECUTE drop_commands;
    END IF;
END $$;

-- Crear foreign key con nombre que PostgREST espera
ALTER TABLE public.banner_images 
DROP CONSTRAINT IF EXISTS banner_images_banner_id_fkey;

ALTER TABLE public.banner_images 
ADD CONSTRAINT banner_images_banner_id_fkey 
FOREIGN KEY (banner_id) 
REFERENCES public.homepage_banners(id) 
ON DELETE CASCADE
ON UPDATE CASCADE;

-- ============================================================================
-- PASO 3: Índices para rendimiento
-- ============================================================================

DROP INDEX IF EXISTS idx_banner_images_banner_id;
CREATE INDEX idx_banner_images_banner_id 
ON public.banner_images(banner_id);

DROP INDEX IF EXISTS idx_banner_images_display_order;
CREATE INDEX idx_banner_images_display_order 
ON public.banner_images(display_order);

DROP INDEX IF EXISTS idx_banner_images_banner_display;
CREATE INDEX idx_banner_images_banner_display 
ON public.banner_images(banner_id, display_order);

DROP INDEX IF EXISTS idx_banner_images_active;
CREATE INDEX idx_banner_images_active 
ON public.banner_images(is_active) 
WHERE is_active = true;

-- ============================================================================
-- PASO 4: RLS y políticas de seguridad
-- ============================================================================

ALTER TABLE public.banner_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banner_images_select_policy" ON public.banner_images;
DROP POLICY IF EXISTS "banner_images_insert_policy" ON public.banner_images;
DROP POLICY IF EXISTS "banner_images_update_policy" ON public.banner_images;
DROP POLICY IF EXISTS "banner_images_delete_policy" ON public.banner_images;

-- Todos pueden ver imágenes
CREATE POLICY "banner_images_select_policy" 
ON public.banner_images
FOR SELECT
USING (true);

-- Solo admins pueden insertar
CREATE POLICY "banner_images_insert_policy" 
ON public.banner_images
FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'admin'::text)
);

-- Solo admins pueden actualizar
CREATE POLICY "banner_images_update_policy" 
ON public.banner_images
FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::text)
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin'::text)
);

-- Solo admins pueden eliminar
CREATE POLICY "banner_images_delete_policy" 
ON public.banner_images
FOR DELETE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::text)
);

-- ============================================================================
-- PASO 5: Trigger para updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_banner_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_banner_images_updated_at_trigger ON public.banner_images;

CREATE TRIGGER update_banner_images_updated_at_trigger
    BEFORE UPDATE ON public.banner_images
    FOR EACH ROW
    EXECUTE FUNCTION public.update_banner_images_updated_at();

-- ============================================================================
-- PASO 6: Documentación
-- ============================================================================

COMMENT ON TABLE public.banner_images IS 
'Almacena múltiples imágenes para cada banner, permitiendo carruseles/slideshow. Relación 1:N con homepage_banners.';

COMMENT ON COLUMN public.banner_images.banner_id IS 
'ID del banner al que pertenece esta imagen (FK a homepage_banners.id)';

COMMENT ON COLUMN public.banner_images.display_order IS 
'Orden de visualización en el carrusel (menor número = aparece primero)';

-- ============================================================================
-- PASO 7: Recargar schema cache
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada exitosamente';
    RAISE NOTICE '✓ Tabla banner_images creada/verificada';
    RAISE NOTICE '✓ Columnas agregadas a site_customization';
    RAISE NOTICE '✓ Schema cache actualizado';
END $$;