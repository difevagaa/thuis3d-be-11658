-- Eliminar política restrictiva existente
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;

-- Crear nueva política que permita ver cotizaciones por user_id O por email
CREATE POLICY "Users can view their quotes by ID or email"
ON public.quotes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR customer_email = auth.email()
  OR has_role(auth.uid(), 'admin'::text)
);

-- Asegurar que el bucket quote-files sea público
UPDATE storage.buckets
SET public = true
WHERE id = 'quote-files';