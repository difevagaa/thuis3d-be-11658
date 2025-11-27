-- Añadir campos para personalización completa de banners
ALTER TABLE homepage_banners 
ADD COLUMN IF NOT EXISTS height VARCHAR(20) DEFAULT '400px',
ADD COLUMN IF NOT EXISTS width VARCHAR(20) DEFAULT '100%',
ADD COLUMN IF NOT EXISTS page_section VARCHAR(50) DEFAULT 'hero';

-- Añadir comentarios para documentación
COMMENT ON COLUMN homepage_banners.height IS 'Altura del banner (ej: 400px, 50vh, 100%)';
COMMENT ON COLUMN homepage_banners.width IS 'Ancho del banner (ej: 100%, 80%, 1200px)';
COMMENT ON COLUMN homepage_banners.page_section IS 'Sección de la página: hero, after-products, after-quick-access, after-features, bottom';

-- Actualizar banners existentes para que aparezcan en el hero por defecto
UPDATE homepage_banners 
SET page_section = 'hero'
WHERE page_section IS NULL OR page_section = '';