-- Añadir colores personalizables para texto de banners
ALTER TABLE public.homepage_banners
  ADD COLUMN IF NOT EXISTS title_color varchar NULL,
  ADD COLUMN IF NOT EXISTS text_color varchar NULL;