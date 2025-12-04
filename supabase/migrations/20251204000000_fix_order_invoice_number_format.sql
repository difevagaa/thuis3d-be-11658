-- Fix order and invoice number generation to use exactly 3 letters + 3 numbers mixed
-- Format: L1N1L2N2L3N3 (e.g., A1B2C3)

-- Drop and recreate generate_order_number function with new format
DROP FUNCTION IF EXISTS public.generate_order_number();

CREATE OR REPLACE FUNCTION public.generate_order_number() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_number TEXT;
  letter1 CHAR(1);
  letter2 CHAR(1);
  letter3 CHAR(1);
  num1 INT;
  num2 INT;
  num3 INT;
BEGIN
  -- Generar 3 letras aleatorias (A-Z)
  letter1 := chr(65 + floor(random() * 26)::int);
  letter2 := chr(65 + floor(random() * 26)::int);
  letter3 := chr(65 + floor(random() * 26)::int);
  
  -- Generar 3 números aleatorios (0-9)
  num1 := floor(random() * 10)::int;
  num2 := floor(random() * 10)::int;
  num3 := floor(random() * 10)::int;
  
  -- Formato entremezclado: L1N1L2N2L3N3
  -- Ejemplo: A1B2C3
  new_number := letter1 || num1 || letter2 || num2 || letter3 || num3;
  
  RETURN new_number;
END;
$$;

-- Update generate_invoice_number to use the same format as order numbers
DROP FUNCTION IF EXISTS public.generate_invoice_number();

CREATE OR REPLACE FUNCTION public.generate_invoice_number() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_number TEXT;
BEGIN
  -- Use the same format as order numbers
  new_number := public.generate_order_number();
  RETURN new_number;
END;
$$;

-- Note: Quotes don't currently have a quote_number column with a default,
-- but if needed in the future, they should use the same format
