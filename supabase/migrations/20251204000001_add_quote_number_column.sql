-- Add quote_number column to quotes table with same format as orders/invoices
-- This ensures consistency across all transaction types

-- Step 1: Add quote_number column without NOT NULL constraint first (to handle existing data)
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS quote_number text;

-- Step 2: Generate unique quote numbers for any existing rows that don't have one
DO $$
DECLARE
  quote_record RECORD;
  new_number TEXT;
  max_attempts INT := 100;
  attempt INT;
BEGIN
  FOR quote_record IN 
    SELECT id FROM public.quotes WHERE quote_number IS NULL
  LOOP
    attempt := 0;
    LOOP
      -- Generate a new unique number
      new_number := public.generate_order_number();
      
      -- Check if this number already exists in quotes, orders, or invoices tables
      IF NOT EXISTS (SELECT 1 FROM public.quotes WHERE quote_number = new_number)
         AND NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = new_number)
         AND NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = new_number) THEN
        -- Update the record with the unique number
        UPDATE public.quotes 
        SET quote_number = new_number 
        WHERE id = quote_record.id;
        EXIT; -- Exit the loop once we have a unique number
      END IF;
      
      attempt := attempt + 1;
      IF attempt >= max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique quote number after % attempts for quote id %. This may indicate insufficient randomness in generate_order_number() function or high data volume. Please contact support.', max_attempts, quote_record.id;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Step 3: Now set the default for new records
ALTER TABLE public.quotes 
ALTER COLUMN quote_number SET DEFAULT public.generate_order_number();

-- Step 4: Make the column NOT NULL after all existing data has values
ALTER TABLE public.quotes 
ALTER COLUMN quote_number SET NOT NULL;

-- Step 5: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON public.quotes(quote_number);

-- Step 6: Add unique constraint to ensure no duplicate quote numbers
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_quote_number' 
    AND conrelid = 'public.quotes'::regclass
  ) THEN
    ALTER TABLE public.quotes 
    ADD CONSTRAINT unique_quote_number UNIQUE (quote_number);
  END IF;
END $$;

COMMENT ON COLUMN public.quotes.quote_number IS 'Unique quote reference number in format L1N1L2N2L3N3 (3 letters and 3 numbers in alternating pattern, e.g., A1B2C3)';
