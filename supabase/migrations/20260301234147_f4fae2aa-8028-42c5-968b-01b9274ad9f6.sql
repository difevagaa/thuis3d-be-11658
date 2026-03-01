
-- 1. Replace generate_order_number with 6-char format: 3 letters + 3 numbers mixed (e.g., A2B5C3)
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_number TEXT;
  letter1 CHAR(1);
  letter2 CHAR(1);
  letter3 CHAR(1);
  num1 INT;
  num2 INT;
  num3 INT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    letter1 := chr(65 + floor(random() * 26)::int);
    letter2 := chr(65 + floor(random() * 26)::int);
    letter3 := chr(65 + floor(random() * 26)::int);
    num1 := floor(random() * 10)::int;
    num2 := floor(random() * 10)::int;
    num3 := floor(random() * 10)::int;
    -- Interleave: L1 N1 L2 N2 L3 N3 => e.g. A2B5C3
    new_number := letter1 || num1 || letter2 || num2 || letter3 || num3;
    
    SELECT EXISTS(
      SELECT 1 FROM orders WHERE order_number = new_number
      UNION ALL
      SELECT 1 FROM invoices WHERE invoice_number = new_number
      UNION ALL
      SELECT 1 FROM quotes WHERE quote_number = new_number
    ) INTO code_exists;
    
    IF NOT code_exists THEN
      RETURN new_number;
    END IF;
  END LOOP;
END;
$$;

-- 2. Create a unified reference code generator for all entities
CREATE OR REPLACE FUNCTION public.generate_reference_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN generate_order_number();
END;
$$;

-- 3. Add quote_number to quotes
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS quote_number TEXT;

-- 4. Set default for quote_number
ALTER TABLE public.quotes ALTER COLUMN quote_number SET DEFAULT generate_reference_code();

-- 5. Fill existing quotes that don't have a quote_number
UPDATE public.quotes SET quote_number = generate_reference_code() WHERE quote_number IS NULL;

-- 6. Make quote_number unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quotes_quote_number_key'
  ) THEN
    ALTER TABLE public.quotes ADD CONSTRAINT quotes_quote_number_key UNIQUE (quote_number);
  END IF;
END $$;

-- 7. Replace generate_invoice_number to use same format
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN generate_order_number();
END;
$$;

-- 8. Replace generate_next_invoice_number to use same format
CREATE OR REPLACE FUNCTION public.generate_next_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN generate_order_number();
END;
$$;

-- 9. Drop the redundant trigger that creates duplicate invoices from quotes
DROP TRIGGER IF EXISTS trigger_auto_generate_invoice_from_quote ON public.quotes;
DROP FUNCTION IF EXISTS public.auto_generate_invoice_from_quote();
