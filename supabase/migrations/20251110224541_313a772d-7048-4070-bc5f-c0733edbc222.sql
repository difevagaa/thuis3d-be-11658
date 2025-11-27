-- Agregar columna para archivos adjuntos de servicios
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS service_attachments jsonb DEFAULT NULL;

COMMENT ON COLUMN public.quotes.service_attachments IS 'Rutas de archivos adjuntos para cotizaciones de tipo servicio (fotos, PDFs, etc.)';
