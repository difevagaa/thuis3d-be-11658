
-- 1. Otorgar rol de admin a difevaga@outlook.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('f16df0ba-da47-4f4b-9366-e11830ba688b', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Agregar también rol 'client' por defecto
INSERT INTO public.user_roles (user_id, role)
VALUES ('f16df0ba-da47-4f4b-9366-e11830ba688b', 'client')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Eliminar políticas RLS antiguas de gift_cards
DROP POLICY IF EXISTS "Users can only insert their own gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Users can view their own gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Admins can view all gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Admins can insert gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Admins can update gift cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Gift card recipients can view their cards" ON public.gift_cards;
DROP POLICY IF EXISTS "Users can view gift cards they purchased" ON public.gift_cards;

-- 4. Crear nuevas políticas RLS para gift_cards
-- Permitir a cualquier usuario autenticado crear tarjetas de regalo
CREATE POLICY "Authenticated users can insert gift cards"
ON public.gift_cards
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir ver tarjetas según el email del destinatario
CREATE POLICY "Users can view gift cards sent to their email"
ON public.gift_cards
FOR SELECT
TO authenticated
USING (
  recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Admins pueden ver todas las tarjetas
CREATE POLICY "Admins can view all gift cards"
ON public.gift_cards
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins pueden actualizar tarjetas
CREATE POLICY "Admins can update all gift cards"
ON public.gift_cards
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins pueden eliminar tarjetas
CREATE POLICY "Admins can delete gift cards"
ON public.gift_cards
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Políticas de orders - permitir a usuarios autenticados crear pedidos
DROP POLICY IF EXISTS "Users can only insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;

CREATE POLICY "Authenticated users can insert orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Políticas de quotes - permitir a cualquier usuario crear cotizaciones
DROP POLICY IF EXISTS "Users can create quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can view their quotes" ON public.quotes;
DROP POLICY IF EXISTS "Allow users to create quotes" ON public.quotes;
DROP POLICY IF EXISTS "Anyone can create quotes" ON public.quotes;
DROP POLICY IF EXISTS "Anyone can insert quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can view all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can update quotes" ON public.quotes;

-- Permitir a usuarios autenticados Y anónimos crear cotizaciones
CREATE POLICY "Anyone can insert quotes"
ON public.quotes
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Users can view their own quotes"
ON public.quotes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all quotes"
ON public.quotes
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update quotes"
ON public.quotes
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Crear perfil si no existe
INSERT INTO public.profiles (id, email, full_name)
VALUES (
  'f16df0ba-da47-4f4b-9366-e11830ba688b',
  'difevaga@outlook.com',
  'Diego Valdes'
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

-- 8. Inicializar puntos de lealtad si no existe
INSERT INTO public.loyalty_points (user_id, points_balance, lifetime_points)
VALUES ('f16df0ba-da47-4f4b-9366-e11830ba688b', 0, 0)
ON CONFLICT (user_id) DO NOTHING;
