-- Agregar columna product_code a la tabla products
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code TEXT UNIQUE;

-- Crear índice para mejorar rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);

-- Función para generar código de producto único (3 letras + 3 números mezclados)
CREATE OR REPLACE FUNCTION generate_product_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluye caracteres confusos: I, O, 0, 1
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generar código de 6 caracteres aleatorios
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Verificar si el código ya existe
    SELECT EXISTS(SELECT 1 FROM products WHERE product_code = code) INTO code_exists;
    
    -- Si no existe, retornar el código
    IF NOT code_exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Trigger para generar código automáticamente al insertar un producto (solo si no se proporciona)
CREATE OR REPLACE FUNCTION set_product_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_code IS NULL OR NEW.product_code = '' THEN
    NEW.product_code := generate_product_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_product_code ON products;
CREATE TRIGGER trigger_set_product_code
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_product_code();

-- Generar códigos para productos existentes que no tienen código
UPDATE products 
SET product_code = generate_product_code()
WHERE product_code IS NULL OR product_code = '';