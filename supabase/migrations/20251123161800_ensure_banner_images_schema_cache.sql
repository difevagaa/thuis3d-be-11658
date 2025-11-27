-- Migración para asegurar que la tabla banner_images esté correctamente reconocida
-- en el schema cache de PostgREST y solucionar el error:
-- "Could not find the table 'public.banner_images' in the schema cache"

-- Esta migración es idempotente y puede ejecutarse múltiples veces de forma segura

-- ============================================================================
-- PASO 1: Verificar y recrear la tabla banner_images si es necesario
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
-- PASO 2: Asegurar que la foreign key constraint existe con el nombre correcto
-- ============================================================================

-- Eliminar todas las constraints de foreign key existentes en banner_id
DO $$ 
DECLARE
    drop_commands TEXT;
BEGIN
    -- Construir comandos para eliminar constraints existentes
    SELECT string_agg('ALTER TABLE public.banner_images DROP CONSTRAINT IF EXISTS ' || constraint_name || ';', ' ')
    INTO drop_commands
    FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
      AND table_name = 'banner_images' 
      AND constraint_type = 'FOREIGN KEY';
    
    -- Ejecutar solo si hay comandos (evitar error de NULL)
    IF drop_commands IS NOT NULL THEN
        EXECUTE drop_commands;
    END IF;
END $$;

-- Crear la foreign key constraint con el nombre explícito que PostgREST espera
-- Este nombre sigue la convención de PostgREST: {tabla}_{columna}_fkey
ALTER TABLE public.banner_images 
DROP CONSTRAINT IF EXISTS banner_images_banner_id_fkey;

ALTER TABLE public.banner_images 
ADD CONSTRAINT banner_images_banner_id_fkey 
FOREIGN KEY (banner_id) 
REFERENCES public.homepage_banners(id) 
ON DELETE CASCADE
ON UPDATE CASCADE;

-- ============================================================================
-- PASO 3: Crear o recrear índices para mejor rendimiento
-- ============================================================================

-- Índice en banner_id para joins rápidos
DROP INDEX IF EXISTS idx_banner_images_banner_id;
CREATE INDEX idx_banner_images_banner_id 
ON public.banner_images(banner_id);

-- Índice en display_order para ordenamiento
DROP INDEX IF EXISTS idx_banner_images_display_order;
CREATE INDEX idx_banner_images_display_order 
ON public.banner_images(display_order);

-- Índice compuesto para consultas filtradas por banner_id y ordenadas por display_order
DROP INDEX IF EXISTS idx_banner_images_banner_display;
CREATE INDEX idx_banner_images_banner_display 
ON public.banner_images(banner_id, display_order);

-- Índice para imágenes activas
DROP INDEX IF EXISTS idx_banner_images_active;
CREATE INDEX idx_banner_images_active 
ON public.banner_images(is_active) 
WHERE is_active = true;

-- ============================================================================
-- PASO 4: Habilitar RLS y configurar políticas
-- ============================================================================

-- Habilitar Row Level Security
ALTER TABLE public.banner_images ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para recrearlas
DROP POLICY IF EXISTS "banner_images_select_policy" ON public.banner_images;
DROP POLICY IF EXISTS "banner_images_insert_policy" ON public.banner_images;
DROP POLICY IF EXISTS "banner_images_update_policy" ON public.banner_images;
DROP POLICY IF EXISTS "banner_images_delete_policy" ON public.banner_images;

-- Política para SELECT: Todos pueden ver todas las imágenes
-- (el filtrado por is_active se hace en la aplicación)
CREATE POLICY "banner_images_select_policy" 
ON public.banner_images
FOR SELECT
USING (true);

-- Política para INSERT: Solo administradores pueden insertar
CREATE POLICY "banner_images_insert_policy" 
ON public.banner_images
FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'admin'::text)
);

-- Política para UPDATE: Solo administradores pueden actualizar
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

-- Política para DELETE: Solo administradores pueden eliminar
CREATE POLICY "banner_images_delete_policy" 
ON public.banner_images
FOR DELETE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::text)
);

-- ============================================================================
-- PASO 5: Configurar trigger para updated_at
-- ============================================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_banner_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS update_banner_images_updated_at_trigger ON public.banner_images;

-- Crear trigger
CREATE TRIGGER update_banner_images_updated_at_trigger
    BEFORE UPDATE ON public.banner_images
    FOR EACH ROW
    EXECUTE FUNCTION public.update_banner_images_updated_at();

-- ============================================================================
-- PASO 6: Agregar comentarios de documentación
-- ============================================================================

COMMENT ON TABLE public.banner_images IS 
'Almacena múltiples imágenes para cada banner, permitiendo carruseles/slideshow. Relación 1:N con homepage_banners.';

COMMENT ON COLUMN public.banner_images.id IS 
'Identificador único de la imagen';

COMMENT ON COLUMN public.banner_images.banner_id IS 
'ID del banner al que pertenece esta imagen (FK a homepage_banners.id)';

COMMENT ON COLUMN public.banner_images.image_url IS 
'URL completa de la imagen almacenada (puede ser de Supabase Storage o externa)';

COMMENT ON COLUMN public.banner_images.display_order IS 
'Orden de visualización en el carrusel (menor número = aparece primero)';

COMMENT ON COLUMN public.banner_images.alt_text IS 
'Texto alternativo para accesibilidad (SEO y screen readers)';

COMMENT ON COLUMN public.banner_images.is_active IS 
'Indica si la imagen está activa y debe mostrarse en el frontend';

COMMENT ON COLUMN public.banner_images.created_at IS 
'Fecha y hora de creación del registro';

COMMENT ON COLUMN public.banner_images.updated_at IS 
'Fecha y hora de la última actualización (actualizada automáticamente por trigger)';

COMMENT ON CONSTRAINT banner_images_banner_id_fkey ON public.banner_images IS 
'Relación con homepage_banners. Elimina en cascada si se borra el banner padre.';

-- ============================================================================
-- PASO 7: Forzar actualización del schema cache de PostgREST
-- ============================================================================

-- Notificar a PostgREST que recargue el schema cache
-- Esto se hace mediante una notificación en el canal 'pgrst'
NOTIFY pgrst, 'reload schema';

-- Nota: En Supabase, el schema cache se actualizará automáticamente
-- después de ejecutar esta migración. Si el problema persiste, puede
-- ser necesario reiniciar el servicio de API desde el Dashboard de Supabase.

-- ============================================================================
-- VERIFICACIÓN: Mostrar información sobre la tabla creada
-- ============================================================================

DO $$
DECLARE
    constraint_count INTEGER;
    policy_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Contar constraints
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints
    WHERE table_schema = 'public' 
      AND table_name = 'banner_images';
    
    -- Contar políticas RLS
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'banner_images';
    
    -- Contar índices
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public' 
      AND tablename = 'banner_images';
    
    RAISE NOTICE '✓ Tabla banner_images verificada:';
    RAISE NOTICE '  - Constraints: %', constraint_count;
    RAISE NOTICE '  - Políticas RLS: %', policy_count;
    RAISE NOTICE '  - Índices: %', index_count;
END $$;
