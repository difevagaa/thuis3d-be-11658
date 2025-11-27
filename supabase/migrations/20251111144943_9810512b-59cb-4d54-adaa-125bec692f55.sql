-- Eliminar políticas conflictivas existentes
DROP POLICY IF EXISTS "Users and guests can create orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;

-- Crear política unificada que permite tanto usuarios autenticados como no autenticados
CREATE POLICY "Allow order creation for authenticated and guest users"
ON public.orders
FOR INSERT
TO authenticated, anon
WITH CHECK (
  -- Permitir si el usuario está autenticado Y el user_id coincide
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- Permitir si es guest checkout (sin autenticación, user_id NULL)
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- Asegurar que la política de lectura permita ver pedidos propios y de guests con su email
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
TO authenticated, anon
USING (
  -- Si está autenticado, puede ver sus pedidos
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR
  -- Si es guest, puede ver por shipping_email (esto se manejará en el código)
  (auth.uid() IS NULL)
);

-- Verificar que admins puedan ver todos los pedidos
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Verificar que admins puedan actualizar todos los pedidos
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Admins can update all orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));