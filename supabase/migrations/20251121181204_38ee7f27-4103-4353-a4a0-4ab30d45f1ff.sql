-- Agregar campo og_image a site_customization para la imagen que aparece en buscadores
ALTER TABLE site_customization ADD COLUMN IF NOT EXISTS og_image TEXT;