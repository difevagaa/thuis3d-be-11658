-- Migration: Update order number format to 3 letters and 3 numbers mixed (6 characters total)
-- Format: L1N1L2N2L3N3 (e.g., A1B2C3)
-- Previous format was 7 characters: L1N1N2L2N3L3N4 (e.g., A12B3C4)

-- Drop the existing function and recreate with new format
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
  -- Generate 3 random letters (A-Z)
  letter1 := chr(65 + floor(random() * 26)::int);
  letter2 := chr(65 + floor(random() * 26)::int);
  letter3 := chr(65 + floor(random() * 26)::int);
  
  -- Generate 3 random numbers (0-9)
  num1 := floor(random() * 10)::int;
  num2 := floor(random() * 10)::int;
  num3 := floor(random() * 10)::int;
  
  -- Mixed format: L1N1L2N2L3N3
  -- Example: A1B2C3
  new_number := letter1 || num1 || letter2 || num2 || letter3 || num3;
  
  RETURN new_number;
END;
$$;

COMMENT ON FUNCTION public.generate_order_number() IS 'Generates a unique order number with 3 letters and 3 numbers mixed (format: L1N1L2N2L3N3, e.g., A1B2C3)';
