-- Añadir campo tax_enabled a la tabla quotes
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS tax_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.quotes.tax_enabled IS 'Indica si se debe aplicar IVA a esta cotización específica';
