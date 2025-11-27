-- Eliminar TODAS las políticas existentes de orders primero
DROP POLICY IF EXISTS "Only authenticated users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Allow order creation for authenticated and guest users" ON public.orders;
DROP POLICY IF EXISTS "Users and guests can create orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;

-- CREAR políticas nuevas que requieren autenticación
-- Solo usuarios autenticados pueden crear pedidos
CREATE POLICY "authenticated_users_create_orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND user_id = auth.uid()
);

-- Los usuarios pueden ver solo sus propios pedidos
CREATE POLICY "users_view_own_orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Admins pueden ver todos los pedidos
CREATE POLICY "admins_view_all_orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Admins pueden actualizar todos los pedidos
CREATE POLICY "admins_update_orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));