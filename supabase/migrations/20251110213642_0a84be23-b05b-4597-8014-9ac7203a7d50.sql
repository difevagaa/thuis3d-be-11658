-- Agregar columnas de envío a la tabla quotes
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text;

-- Agregar columnas de envío a la tabla profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS city text;