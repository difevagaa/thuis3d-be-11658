-- Add quote_number column to quotes table with same format as orders/invoices
-- This ensures consistency across all transaction types

-- Add quote_number column with default value using the same generation function
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS quote_number text DEFAULT public.generate_order_number() NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON public.quotes(quote_number);

-- Add unique constraint to ensure no duplicate quote numbers
ALTER TABLE public.quotes 
ADD CONSTRAINT unique_quote_number UNIQUE (quote_number);

COMMENT ON COLUMN public.quotes.quote_number IS 'Unique quote reference number in format L1N1L2N2L3N3 (3 letters and 3 numbers in alternating pattern, e.g., A1B2C3)';
