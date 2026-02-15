-- Add new quote status: "Pendiente respuesta del cliente" (Awaiting Client Response)
-- This status is used when admin makes changes to a quote and needs client approval

INSERT INTO quote_statuses (name, color, slug)
SELECT 'Pendiente respuesta del cliente', '#f59e0b', 'awaiting_client_response'
WHERE NOT EXISTS (
  SELECT 1 FROM quote_statuses 
  WHERE slug = 'awaiting_client_response' 
  OR name = 'Pendiente respuesta del cliente'
);

-- Add comment for documentation
COMMENT ON COLUMN quote_statuses.slug IS 'Language-independent identifier for status. Used for programmatic status checks.';
