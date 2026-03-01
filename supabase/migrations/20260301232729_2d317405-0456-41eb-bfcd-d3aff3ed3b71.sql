-- Eliminar el trigger que genera facturas duplicadas al cambiar estimated_price
-- La edge function process-quote-approval ya maneja la creación de facturas correctamente
DROP TRIGGER IF EXISTS trigger_generate_invoice_from_quote_price ON public.quotes;
DROP FUNCTION IF EXISTS public.generate_invoice_from_quote_price();