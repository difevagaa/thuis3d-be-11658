-- ============================================================================
-- VERIFICACIÓN Y CORRECCIÓN DE POLÍTICAS RLS PARA CREACIÓN DE PEDIDOS
-- ============================================================================
-- Este script asegura que las políticas RLS permitan la creación de pedidos
-- cuando se utiliza el Service Role Key desde Edge Functions.
--
-- NOTA: El Service Role Key BYPASEA las políticas RLS, pero este script
--       garantiza que las políticas sean correctas para cualquier escenario.
-- ============================================================================

-- ============================================================================
-- 1. POLÍTICAS PARA TABLA: orders
-- ============================================================================

-- Eliminar políticas existentes para recrearlas correctamente
DROP POLICY IF EXISTS "Users and guests can create orders" ON public.orders;
DROP POLICY IF EXISTS "Service role can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;

-- Política: Usuarios autenticados pueden crear pedidos para sí mismos
CREATE POLICY "Users can create their own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- Política: Usuarios NO autenticados (guests) pueden crear pedidos sin user_id
CREATE POLICY "Guests can create orders without user_id"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
);

-- Política: Admins pueden crear pedidos para cualquier usuario
CREATE POLICY "Admins can create orders for any user"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- ============================================================================
-- 2. POLÍTICAS PARA TABLA: order_items
-- ============================================================================

-- Eliminar política existente
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated can create order items" ON public.order_items;

-- Política: Cualquiera puede crear order_items (necesario para guest checkout)
CREATE POLICY "Anyone can create order items"
ON public.order_items
FOR INSERT
WITH CHECK (true);

-- Política alternativa más restrictiva (comentada por defecto):
-- CREATE POLICY "Users can create order items for their orders"
-- ON public.order_items
-- FOR INSERT
-- WITH CHECK (
--   EXISTS (
--     SELECT 1 FROM public.orders
--     WHERE orders.id = order_items.order_id
--     AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
--   )
-- );

-- ============================================================================
-- 3. POLÍTICAS PARA TABLA: invoices
-- ============================================================================

-- Verificar política de inserción para facturas
DROP POLICY IF EXISTS "Users can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "System can create invoices" ON public.invoices;

-- Política: Admins pueden crear facturas
CREATE POLICY "Admins can create invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- Política: Sistema puede crear facturas (para automatización)
-- Nota: Esto permite a funciones con service_role crear facturas
CREATE POLICY "Service role can create invoices"
ON public.invoices
FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================================================
-- 4. POLÍTICAS PARA TABLA: invoice_items
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can create invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Admins can create invoice items" ON public.invoice_items;

-- Política: Admins pueden crear invoice items
CREATE POLICY "Admins can create invoice items"
ON public.invoice_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- Política: Service role puede crear invoice items
CREATE POLICY "Service role can create invoice items"
ON public.invoice_items
FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================================================
-- 5. POLÍTICAS PARA TABLA: notifications
-- ============================================================================

-- Asegurar que se puedan crear notificaciones sin conflictos
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Service role can create notifications" ON public.notifications;

-- Política: Sistema puede crear notificaciones
CREATE POLICY "Service role can create notifications"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- Política: Admins pueden crear notificaciones
CREATE POLICY "Admins can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);

-- ============================================================================
-- 6. VERIFICACIÓN: Mostrar todas las políticas actuales
-- ============================================================================

-- Esta consulta mostrará todas las políticas RLS activas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'order_items', 'invoices', 'invoice_items', 'notifications')
ORDER BY tablename, policyname;

-- ============================================================================
-- 7. COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================================

COMMENT ON POLICY "Users can create their own orders" ON public.orders IS 
'Permite a usuarios autenticados crear pedidos asociados a su user_id';

COMMENT ON POLICY "Guests can create orders without user_id" ON public.orders IS 
'Permite a usuarios no autenticados crear pedidos sin user_id (guest checkout)';

COMMENT ON POLICY "Admins can create orders for any user" ON public.orders IS 
'Permite a administradores crear pedidos para cualquier usuario';

COMMENT ON POLICY "Anyone can create order items" ON public.order_items IS 
'Permite crear items de pedido sin restricciones. Necesario para guest checkout y automatización.';

COMMENT ON POLICY "Service role can create invoices" ON public.invoices IS 
'Permite a Edge Functions con service_role crear facturas automáticamente';

COMMENT ON POLICY "Service role can create invoice items" ON public.invoice_items IS 
'Permite a Edge Functions con service_role crear items de factura automáticamente';

COMMENT ON POLICY "Service role can create notifications" ON public.notifications IS 
'Permite a Edge Functions crear notificaciones sin restricciones';

-- ============================================================================
-- 8. NOTAS IMPORTANTES
-- ============================================================================

-- NOTA 1: El Service Role Key BYPASEA TODAS las políticas RLS
-- Por lo tanto, las Edge Functions que usan service_role NO necesitan
-- políticas específicas, pero las creamos por buenas prácticas.

-- NOTA 2: Si la automatización sigue fallando después de aplicar este script,
-- el problema NO es de políticas RLS sino de los triggers (ya corregidos en
-- la migración 20260215171700_fix_order_triggers_exception_handling.sql)

-- NOTA 3: Para verificar que el service_role está configurado correctamente:
-- SELECT current_setting('role');  -- Debe mostrar 'service_role' en Edge Functions

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
