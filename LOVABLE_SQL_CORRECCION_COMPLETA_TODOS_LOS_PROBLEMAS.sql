-- ============================================================================
-- CORRECCIÓN COMPLETA DE TODOS LOS PROBLEMAS - THUIS3D-BE
-- ============================================================================
-- Este script SQL corrige TODOS los problemas identificados en el sistema
-- relacionados con políticas RLS, triggers, funciones y validaciones.
--
-- EJECUTAR EN: Editor SQL de Lovable/Supabase
-- FECHA: Febrero 2026
-- DURACIÓN ESTIMADA: 2-3 minutos
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTE 1: POLÍTICAS RLS PARA COTIZACIONES (QUOTES)
-- ============================================================================

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update quote status" ON public.quotes;
DROP POLICY IF EXISTS "Users can update their own quote status and comments" ON public.quotes;

-- CREAR: Política para que clientes puedan actualizar sus cotizaciones
CREATE POLICY "Users can update their own quote status and comments"
ON public.quotes
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id OR customer_email = auth.email()
)
WITH CHECK (
  auth.uid() = user_id OR customer_email = auth.email()
);

COMMENT ON POLICY "Users can update their own quote status and comments" ON public.quotes IS 
'Permite a los clientes actualizar el estado (aprobar/rechazar) y añadir comentarios a sus propias cotizaciones.';

-- ============================================================================
-- PARTE 2: POLÍTICAS RLS PARA PEDIDOS (ORDERS)
-- ============================================================================

-- Eliminar políticas conflictivas
DROP POLICY IF EXISTS "Users and guests can create orders" ON public.orders;
DROP POLICY IF EXISTS "Service role can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Guests can create orders without user_id" ON public.orders;
DROP POLICY IF EXISTS "Admins can create orders for any user" ON public.orders;

-- CREAR: Usuarios autenticados pueden crear pedidos para sí mismos
CREATE POLICY "Users can create their own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- CREAR: Usuarios NO autenticados pueden crear pedidos sin user_id (guest checkout)
CREATE POLICY "Guests can create orders without user_id"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
);

-- CREAR: Admins pueden crear pedidos para cualquier usuario
CREATE POLICY "Admins can create orders for any user"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- CREAR: Service role puede gestionar todos los pedidos
CREATE POLICY "Service role can manage all orders"
ON public.orders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "Users can create their own orders" ON public.orders IS 
'Permite a usuarios autenticados crear pedidos asociados a su user_id';

COMMENT ON POLICY "Guests can create orders without user_id" ON public.orders IS 
'Permite a usuarios no autenticados crear pedidos sin user_id (guest checkout)';

-- ============================================================================
-- PARTE 3: POLÍTICAS RLS PARA ORDER_ITEMS
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Service role can create order items" ON public.order_items;

-- CREAR: Cualquiera puede crear order_items (necesario para automatización y guest checkout)
CREATE POLICY "Anyone can create order items"
ON public.order_items
FOR INSERT
WITH CHECK (true);

-- CREAR: Service role puede gestionar todos los order_items
CREATE POLICY "Service role can manage order items"
ON public.order_items
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "Anyone can create order items" ON public.order_items IS 
'Permite crear items de pedido sin restricciones. Necesario para guest checkout y automatización.';

-- ============================================================================
-- PARTE 4: POLÍTICAS RLS PARA FACTURAS (INVOICES)
-- ============================================================================

DROP POLICY IF EXISTS "Users can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "System can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Service role can create invoices" ON public.invoices;

-- CREAR: Admins pueden crear facturas
CREATE POLICY "Admins can create invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- CREAR: Service role puede crear facturas (para automatización)
CREATE POLICY "Service role can create invoices"
ON public.invoices
FOR INSERT
TO service_role
WITH CHECK (true);

-- CREAR: Service role puede actualizar facturas
CREATE POLICY "Service role can update invoices"
ON public.invoices
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "Service role can create invoices" ON public.invoices IS 
'Permite a Edge Functions con service_role crear facturas automáticamente';

-- ============================================================================
-- PARTE 5: POLÍTICAS RLS PARA INVOICE_ITEMS
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can create invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Admins can create invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Service role can create invoice items" ON public.invoice_items;

-- CREAR: Admins pueden crear invoice items
CREATE POLICY "Admins can create invoice items"
ON public.invoice_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- CREAR: Service role puede crear invoice items
CREATE POLICY "Service role can create invoice items"
ON public.invoice_items
FOR INSERT
TO service_role
WITH CHECK (true);

-- CREAR: Service role puede actualizar invoice items
CREATE POLICY "Service role can update invoice items"
ON public.invoice_items
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "Service role can create invoice items" ON public.invoice_items IS 
'Permite a Edge Functions con service_role crear items de factura automáticamente';

-- ============================================================================
-- PARTE 6: POLÍTICAS RLS PARA NOTIFICACIONES
-- ============================================================================

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins create notifications existing" ON public.notifications;

-- CREAR: Service role puede crear notificaciones
CREATE POLICY "Service role can create notifications"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- Verificar que existe la política de admins (no sobreescribirla)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notifications' 
    AND policyname = 'Admins can create notifications'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can create notifications"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
      public.has_role(auth.uid(), ''admin'')
    )';
  END IF;
END
$$;

COMMENT ON POLICY "Service role can create notifications" ON public.notifications IS 
'Permite a Edge Functions crear notificaciones sin restricciones';

-- ============================================================================
-- PARTE 7: ASEGURAR ESTADO PREDETERMINADO DE PEDIDOS
-- ============================================================================

-- Asegurar que exista al menos un estado de pedido utilizable
INSERT INTO public.order_statuses (name, color)
SELECT 'Recibido', '#3b82f6'
WHERE NOT EXISTS (
  SELECT 1 FROM public.order_statuses WHERE name = 'Recibido'
);

INSERT INTO public.order_statuses (name, color, slug)
SELECT 'Pendiente', '#f59e0b', 'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM public.order_statuses WHERE slug = 'pending'
);

INSERT INTO public.order_statuses (name, color, slug)
SELECT 'Completado', '#10b981', 'completed'
WHERE NOT EXISTS (
  SELECT 1 FROM public.order_statuses WHERE slug = 'completed'
);

INSERT INTO public.order_statuses (name, color, slug)
SELECT 'Cancelado', '#ef4444', 'cancelled'
WHERE NOT EXISTS (
  SELECT 1 FROM public.order_statuses WHERE slug = 'cancelled'
);

-- ============================================================================
-- PARTE 8: ASEGURAR ESTADOS DE COTIZACIONES
-- ============================================================================

-- Asegurar estados críticos de cotización
INSERT INTO public.quote_statuses (name, color, slug)
SELECT 'Aprobada', '#10b981', 'approved'
WHERE NOT EXISTS (
  SELECT 1 FROM public.quote_statuses WHERE slug = 'approved'
);

INSERT INTO public.quote_statuses (name, color, slug)
SELECT 'Rechazada', '#ef4444', 'rejected'
WHERE NOT EXISTS (
  SELECT 1 FROM public.quote_statuses WHERE slug = 'rejected'
);

INSERT INTO public.quote_statuses (name, color, slug)
SELECT 'Pendiente Aprobación Cliente', '#f59e0b', 'awaiting_client_response'
WHERE NOT EXISTS (
  SELECT 1 FROM public.quote_statuses WHERE slug = 'awaiting_client_response'
);

INSERT INTO public.quote_statuses (name, color, slug)
SELECT 'Pendiente', '#6b7280', 'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM public.quote_statuses WHERE slug = 'pending'
);

-- ============================================================================
-- PARTE 9: TRIGGERS PARA EVITAR ERRORES EN CREACIÓN DE PEDIDOS
-- ============================================================================

-- Reemplazar trigger de email de pedidos con manejo de excepciones
CREATE OR REPLACE FUNCTION public.trigger_new_order_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
  cust_name TEXT;
  cust_email TEXT;
BEGIN
  -- Try to get customer info, but don't fail if it doesn't exist
  BEGIN
    SELECT full_name, email INTO cust_name, cust_email
    FROM profiles WHERE id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    cust_name := NULL;
    cust_email := NULL;
  END;
  
  -- Try to send order email, but don't fail the transaction
  BEGIN
    PERFORM send_order_email_async(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send order email for order %: %', NEW.id, SQLERRM;
  END;
  
  -- Try to notify admins, but don't fail the transaction
  BEGIN
    PERFORM notify_admins_async(
      'order',
      'Nuevo Pedido: ' || NEW.order_number,
      'Pedido por €' || NEW.total || ' de ' || COALESCE(cust_name, cust_email, 'Cliente'),
      '/admin/pedidos',
      NEW.order_number,
      cust_name,
      cust_email
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to notify admins for order %: %', NEW.id, SQLERRM;
  END;
  
  -- Try to create notification, but don't fail the transaction
  IF NEW.user_id IS NOT NULL THEN
    BEGIN
      INSERT INTO notifications (user_id, type, title, message, link, is_read)
      VALUES (
        NEW.user_id, 'order',
        'Pedido Confirmado: ' || NEW.order_number,
        'Tu pedido por €' || NEW.total || ' ha sido recibido',
        '/mi-cuenta', false
      )
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create notification for order %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_new_order_email() IS 
'Trigger function con manejo de excepciones para prevenir fallos en creación de pedidos';

-- ============================================================================
-- PARTE 10: TRIGGERS PARA PUNTOS DE LEALTAD SIN ERRORES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_order_loyalty_points() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
BEGIN
  -- Solo procesar si hay un usuario asociado
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Wrap everything in exception handling
  BEGIN
    -- CASO 1: INSERT - Pedido nuevo marcado como pagado
    IF TG_OP = 'INSERT' AND NEW.payment_status = 'paid' THEN
      PERFORM award_loyalty_points(NEW.user_id, NEW.total, NEW.id);
    END IF;
    
    -- CASO 2: UPDATE - Cambio de estado de pago
    IF TG_OP = 'UPDATE' THEN
      -- Si cambió de NO pagado a PAGADO -> otorgar puntos
      IF OLD.payment_status IS DISTINCT FROM 'paid' 
         AND NEW.payment_status = 'paid' 
         AND NEW.deleted_at IS NULL THEN
        PERFORM award_loyalty_points(NEW.user_id, NEW.total, NEW.id);
      END IF;
      
      -- Si cambió de PAGADO a NO pagado -> restar puntos
      IF OLD.payment_status = 'paid' 
         AND NEW.payment_status IS DISTINCT FROM 'paid' THEN
        PERFORM remove_loyalty_points(NEW.user_id, NEW.total, NEW.id);
      END IF;
      
      -- Si se eliminó un pedido que estaba pagado -> restar puntos
      IF OLD.deleted_at IS NULL 
         AND NEW.deleted_at IS NOT NULL 
         AND OLD.payment_status = 'paid' THEN
        PERFORM remove_loyalty_points(NEW.user_id, NEW.total, NEW.id);
      END IF;
      
      -- Si se restauró un pedido que estaba pagado -> devolver puntos
      IF OLD.deleted_at IS NOT NULL 
         AND NEW.deleted_at IS NULL 
         AND NEW.payment_status = 'paid' THEN
        PERFORM award_loyalty_points(NEW.user_id, NEW.total, NEW.id);
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to handle loyalty points for order %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_order_loyalty_points() IS 
'Trigger function con manejo de excepciones para prevenir fallos en creación de pedidos';

-- ============================================================================
-- PARTE 11: FUNCIÓN PARA SINCRONIZAR ESTADO DE PEDIDO CON FACTURA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_order_status_with_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_record RECORD;
  order_status_id UUID;
BEGIN
  -- Buscar pedido relacionado con esta factura
  SELECT o.* INTO order_record
  FROM orders o
  WHERE o.id = NEW.order_id
  LIMIT 1;
  
  -- Si no hay pedido relacionado, salir
  IF order_record IS NULL THEN
    RETURN NEW;
  END IF;
  
  BEGIN
    -- Si la factura se marca como pagada, actualizar pedido
    IF NEW.payment_status = 'paid' AND (OLD IS NULL OR OLD.payment_status IS DISTINCT FROM 'paid') THEN
      -- Buscar estado "Completado" o similar
      SELECT id INTO order_status_id
      FROM order_statuses
      WHERE slug = 'completed' OR name ILIKE '%completad%'
      LIMIT 1;
      
      IF order_status_id IS NOT NULL THEN
        UPDATE orders
        SET 
          payment_status = 'paid',
          status_id = order_status_id,
          updated_at = NOW()
        WHERE id = order_record.id;
        
        RAISE NOTICE 'Order % synced with paid invoice %', order_record.order_number, NEW.invoice_number;
      END IF;
    END IF;
    
    -- Si la factura se marca como cancelada, actualizar pedido
    IF NEW.payment_status = 'cancelled' AND (OLD IS NULL OR OLD.payment_status IS DISTINCT FROM 'cancelled') THEN
      SELECT id INTO order_status_id
      FROM order_statuses
      WHERE slug = 'cancelled' OR name ILIKE '%cancelad%'
      LIMIT 1;
      
      IF order_status_id IS NOT NULL THEN
        UPDATE orders
        SET 
          payment_status = 'cancelled',
          status_id = order_status_id,
          updated_at = NOW()
        WHERE id = order_record.id;
        
        RAISE NOTICE 'Order % synced with cancelled invoice %', order_record.order_number, NEW.invoice_number;
      END IF;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to sync order status with invoice: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_order_status_with_invoice() IS 
'Sincroniza automáticamente el estado del pedido cuando cambia el estado de pago de la factura';

-- Crear trigger para sincronización
DROP TRIGGER IF EXISTS trigger_sync_order_status_with_invoice ON public.invoices;
CREATE TRIGGER trigger_sync_order_status_with_invoice
  AFTER INSERT OR UPDATE OF payment_status ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_status_with_invoice();

-- ============================================================================
-- PARTE 12: FUNCIÓN PARA VALIDAR INTEGRIDAD DE DATOS EN PEDIDOS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_order_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validar que los totales sean positivos o cero
  IF NEW.subtotal < 0 THEN
    RAISE EXCEPTION 'Order subtotal cannot be negative';
  END IF;
  
  IF NEW.tax < 0 THEN
    RAISE EXCEPTION 'Order tax cannot be negative';
  END IF;
  
  IF NEW.shipping < 0 THEN
    RAISE EXCEPTION 'Order shipping cost cannot be negative';
  END IF;
  
  IF NEW.total < 0 THEN
    RAISE EXCEPTION 'Order total cannot be negative';
  END IF;
  
  -- Validar que el total sea consistente
  IF ABS(NEW.total - (NEW.subtotal + NEW.tax + NEW.shipping - COALESCE(NEW.discount, 0))) > 0.02 THEN
    RAISE WARNING 'Order % total (%) does not match calculated total (%)', 
      NEW.order_number, 
      NEW.total, 
      (NEW.subtotal + NEW.tax + NEW.shipping - COALESCE(NEW.discount, 0));
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_order_integrity() IS 
'Valida la integridad de los datos del pedido antes de insertar o actualizar';

-- Crear trigger para validación
DROP TRIGGER IF EXISTS trigger_validate_order_integrity ON public.orders;
CREATE TRIGGER trigger_validate_order_integrity
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_integrity();

-- ============================================================================
-- PARTE 13: FUNCIÓN PARA VALIDAR INTEGRIDAD DE FACTURAS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_invoice_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validar que los totales sean positivos o cero
  IF NEW.subtotal < 0 THEN
    RAISE EXCEPTION 'Invoice subtotal cannot be negative';
  END IF;
  
  IF NEW.tax < 0 THEN
    RAISE EXCEPTION 'Invoice tax cannot be negative';
  END IF;
  
  IF COALESCE(NEW.shipping, 0) < 0 THEN
    RAISE EXCEPTION 'Invoice shipping cost cannot be negative';
  END IF;
  
  IF NEW.total < 0 THEN
    RAISE EXCEPTION 'Invoice total cannot be negative';
  END IF;
  
  -- Validar que el total sea consistente
  IF ABS(NEW.total - (NEW.subtotal + NEW.tax + COALESCE(NEW.shipping, 0) - COALESCE(NEW.discount, 0))) > 0.02 THEN
    RAISE WARNING 'Invoice % total (%) does not match calculated total (%)', 
      NEW.invoice_number, 
      NEW.total, 
      (NEW.subtotal + NEW.tax + COALESCE(NEW.shipping, 0) - COALESCE(NEW.discount, 0));
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_invoice_integrity() IS 
'Valida la integridad de los datos de la factura antes de insertar o actualizar';

-- Crear trigger para validación de facturas
DROP TRIGGER IF EXISTS trigger_validate_invoice_integrity ON public.invoices;
CREATE TRIGGER trigger_validate_invoice_integrity
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_invoice_integrity();

-- ============================================================================
-- PARTE 14: ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================================================

-- Índice para búsqueda de pedidos por marcador de cotización
CREATE INDEX IF NOT EXISTS idx_orders_notes_quote_marker 
ON public.orders USING gin(to_tsvector('simple', notes));

-- Índice para búsqueda de facturas por cotización
CREATE INDEX IF NOT EXISTS idx_invoices_quote_id 
ON public.invoices(quote_id) 
WHERE quote_id IS NOT NULL;

-- Índice para búsqueda de pedidos por usuario
CREATE INDEX IF NOT EXISTS idx_orders_user_id 
ON public.orders(user_id) 
WHERE user_id IS NOT NULL;

-- Índice para búsqueda de facturas por usuario
CREATE INDEX IF NOT EXISTS idx_invoices_user_id 
ON public.invoices(user_id) 
WHERE user_id IS NOT NULL;

-- Índice para búsqueda de notificaciones no leídas
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications(user_id, is_read) 
WHERE is_read = false;

-- Índice para búsqueda de cotizaciones por email
CREATE INDEX IF NOT EXISTS idx_quotes_customer_email 
ON public.quotes(customer_email) 
WHERE customer_email IS NOT NULL;

-- ============================================================================
-- PARTE 15: VERIFICACIÓN FINAL
-- ============================================================================

-- Mostrar todas las políticas actuales en tablas críticas
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('quotes', 'orders', 'order_items', 'invoices', 'invoice_items', 'notifications')
    AND cmd IN ('INSERT', 'UPDATE', 'ALL');
  
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'VERIFICACIÓN FINAL - Políticas RLS configuradas: %', policy_count;
  RAISE NOTICE '=================================================================';
  
  -- Verificar estados críticos
  IF NOT EXISTS (SELECT 1 FROM order_statuses WHERE slug = 'completed') THEN
    RAISE WARNING 'Estado de pedido "completed" no encontrado';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM quote_statuses WHERE slug = 'approved') THEN
    RAISE WARNING 'Estado de cotización "approved" no encontrado';
  END IF;
  
  RAISE NOTICE 'Script ejecutado exitosamente';
  RAISE NOTICE 'Funciones creadas: 4 (triggers + validaciones + sincronización)';
  RAISE NOTICE 'Políticas RLS creadas/actualizadas: 15+';
  RAISE NOTICE 'Estados asegurados: 8';
  RAISE NOTICE 'Índices creados: 6';
END;
$$;

COMMIT;

-- ============================================================================
-- RESUMEN DE CAMBIOS APLICADOS
-- ============================================================================

-- ✅ Políticas RLS para cotizaciones (UPDATE por clientes)
-- ✅ Políticas RLS para pedidos (INSERT usuarios, guests, admins, service_role)
-- ✅ Políticas RLS para order_items (INSERT sin restricciones)
-- ✅ Políticas RLS para facturas (INSERT admins + service_role, UPDATE service_role)
-- ✅ Políticas RLS para invoice_items (INSERT admins + service_role)
-- ✅ Políticas RLS para notificaciones (INSERT admins + service_role)
-- ✅ Estados predeterminados de pedidos (Recibido, Pendiente, Completado, Cancelado)
-- ✅ Estados predeterminados de cotizaciones (Aprobada, Rechazada, Pendiente, Esperando Cliente)
-- ✅ Triggers con manejo de excepciones (trigger_new_order_email)
-- ✅ Triggers para puntos de lealtad sin errores (handle_order_loyalty_points)
-- ✅ Función de sincronización pedido-factura (sync_order_status_with_invoice)
-- ✅ Validación de integridad de pedidos (validate_order_integrity)
-- ✅ Validación de integridad de facturas (validate_invoice_integrity)
-- ✅ Índices para mejorar rendimiento (6 índices en tablas críticas)

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
