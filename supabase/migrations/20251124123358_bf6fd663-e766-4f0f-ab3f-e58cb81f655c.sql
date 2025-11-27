-- ============================================================================
-- CORRECCIÓN: Agregar columnas faltantes a site_customization
-- ============================================================================
-- Esta migración agrega todas las columnas que faltan en site_customization
-- para soportar la personalización completa del sitio
-- ============================================================================

-- Agregar columnas faltantes de personalización
ALTER TABLE public.site_customization 
ADD COLUMN IF NOT EXISTS header_text_color TEXT DEFAULT '#1A1A1A',
ADD COLUMN IF NOT EXISTS sidebar_bg_color TEXT DEFAULT '#1E293B',
ADD COLUMN IF NOT EXISTS sidebar_active_bg_color TEXT DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS home_menu_bg_color TEXT DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS home_menu_text_color TEXT DEFAULT '#1A1A1A',
ADD COLUMN IF NOT EXISTS home_menu_hover_bg_color TEXT DEFAULT '#F3F4F6';

-- Actualizar comentarios de documentación
COMMENT ON COLUMN public.site_customization.header_text_color IS 
'Color del texto en el header/navegación principal';

COMMENT ON COLUMN public.site_customization.sidebar_bg_color IS 
'Color de fondo del sidebar del panel de administración';

COMMENT ON COLUMN public.site_customization.sidebar_active_bg_color IS 
'Color de fondo del item activo en el sidebar del panel admin';

COMMENT ON COLUMN public.site_customization.home_menu_bg_color IS 
'Color de fondo del menú en la página principal';

COMMENT ON COLUMN public.site_customization.home_menu_text_color IS 
'Color del texto en el menú de la página principal';

COMMENT ON COLUMN public.site_customization.home_menu_hover_bg_color IS 
'Color de fondo al hacer hover en items del menú principal';

-- Recargar schema cache
NOTIFY pgrst, 'reload schema';