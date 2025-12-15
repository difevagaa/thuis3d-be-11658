-- ==============================================
-- CORRECCIONES PRE-DESPLIEGUE
-- ==============================================

-- 1. Política RLS para email_subscribers (permitir suscripciones)
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.email_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter"
ON public.email_subscribers
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own subscription" ON public.email_subscribers;
CREATE POLICY "Users can view their own subscription"
ON public.email_subscribers
FOR SELECT
USING (
  email = current_setting('request.jwt.claims', true)::json->>'email'
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS "Admins can manage subscribers" ON public.email_subscribers;
CREATE POLICY "Admins can manage subscribers"
ON public.email_subscribers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'superadmin')
  )
);

-- 2. Función para desactivar tarjetas regalo expiradas automáticamente
CREATE OR REPLACE FUNCTION public.deactivate_expired_gift_cards()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE gift_cards
  SET is_active = false
  WHERE expires_at < NOW()
  AND is_active = true;
END;
$$;

-- Desactivar tarjetas expiradas ahora
SELECT public.deactivate_expired_gift_cards();

-- 3. Trigger para validar tarjeta regalo antes de uso
CREATE OR REPLACE FUNCTION public.validate_gift_card_before_use()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si la tarjeta está expirada, desactivarla
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() THEN
    NEW.is_active := false;
  END IF;
  
  -- Si el balance es 0, desactivarla
  IF NEW.current_balance <= 0 THEN
    NEW.is_active := false;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_gift_card ON public.gift_cards;
CREATE TRIGGER trigger_validate_gift_card
BEFORE UPDATE ON public.gift_cards
FOR EACH ROW
EXECUTE FUNCTION public.validate_gift_card_before_use();

-- 4. Limpiar políticas RLS duplicadas en orders
DROP POLICY IF EXISTS "Admin full access to orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;

-- Crear política unificada para admins
CREATE POLICY "Admin full access to orders"
ON public.orders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'superadmin')
  )
);

-- Asegurar política para usuarios normales
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Users can create their own orders"
ON public.orders
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- 5. Crear función para validar UUID antes de queries
CREATE OR REPLACE FUNCTION public.is_valid_uuid(text_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF text_value IS NULL OR text_value = '' OR text_value = 'undefined' OR text_value = 'null' THEN
    RETURN FALSE;
  END IF;
  
  PERFORM text_value::UUID;
  RETURN TRUE;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN FALSE;
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- 6. Índices adicionales para mejor rendimiento con muchos usuarios
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_id ON public.orders(status_id);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_display_order ON public.products(display_order);
CREATE INDEX IF NOT EXISTS idx_cart_items_session ON public.cart_items(session_id);

-- 7. Limpiar políticas duplicadas en otras tablas críticas
DROP POLICY IF EXISTS "Admins can view all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admin full access to quotes" ON public.quotes;
CREATE POLICY "Admin full access to quotes"
ON public.quotes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'superadmin')
  )
);

DROP POLICY IF EXISTS "Admins can view all invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admin full access to invoices" ON public.invoices;
CREATE POLICY "Admin full access to invoices"
ON public.invoices
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'superadmin')
  )
);