-- Añadir nuevos campos para personalización avanzada de colores por sección
-- Requisito 2: Color de header, menú lateral, y menús en vista de inicio

ALTER TABLE public.site_customization
ADD COLUMN IF NOT EXISTS header_bg_color text DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS header_text_color text DEFAULT '#1A1A1A',
ADD COLUMN IF NOT EXISTS sidebar_bg_color text DEFAULT '#1E293B',
ADD COLUMN IF NOT EXISTS sidebar_active_bg_color text DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS home_menu_bg_color text DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS home_menu_text_color text DEFAULT '#1A1A1A',
ADD COLUMN IF NOT EXISTS home_menu_hover_bg_color text DEFAULT '#F3F4F6';

-- Comentarios para documentar los nuevos campos
COMMENT ON COLUMN public.site_customization.header_bg_color IS 'Color de fondo de la barra superior/header principal';
COMMENT ON COLUMN public.site_customization.header_text_color IS 'Color del texto en la barra superior/header';
COMMENT ON COLUMN public.site_customization.sidebar_bg_color IS 'Color de fondo del menú lateral del panel de administración';
COMMENT ON COLUMN public.site_customization.sidebar_active_bg_color IS 'Color de fondo de elementos activos en el menú lateral';
COMMENT ON COLUMN public.site_customization.home_menu_bg_color IS 'Color de fondo de los menús en la vista de inicio';
COMMENT ON COLUMN public.site_customization.home_menu_text_color IS 'Color del texto de los menús en la vista de inicio';
COMMENT ON COLUMN public.site_customization.home_menu_hover_bg_color IS 'Color de fondo al pasar el cursor sobre elementos del menú de inicio';
