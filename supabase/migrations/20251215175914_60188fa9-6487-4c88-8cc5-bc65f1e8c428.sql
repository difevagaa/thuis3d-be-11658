-- =============================================
-- SISTEMA DE RESERVA TEMPORAL DE STOCK
-- =============================================

-- 1. Tabla para reservas de stock (cuando producto está en carrito)
CREATE TABLE public.stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT, -- Para usuarios no autenticados
  quantity INTEGER NOT NULL DEFAULT 1,
  reserved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabla para lista de espera cuando no hay stock
CREATE TABLE public.stock_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  quantity_requested INTEGER NOT NULL DEFAULT 1,
  notified_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'purchased', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

-- 3. Añadir columna stock_quantity a productos si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'stock_quantity'
  ) THEN
    ALTER TABLE public.products ADD COLUMN stock_quantity INTEGER DEFAULT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'track_stock'
  ) THEN
    ALTER TABLE public.products ADD COLUMN track_stock BOOLEAN DEFAULT false;
  END IF;
END $$;

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX idx_stock_reservations_product_status ON public.stock_reservations(product_id, status);
CREATE INDEX idx_stock_reservations_expires ON public.stock_reservations(expires_at) WHERE status = 'active';
CREATE INDEX idx_stock_reservations_user ON public.stock_reservations(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_stock_reservations_session ON public.stock_reservations(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_stock_waitlist_product ON public.stock_waitlist(product_id, status);

-- =============================================
-- FUNCIONES
-- =============================================

-- Función para obtener stock disponible (real - reservado)
CREATE OR REPLACE FUNCTION public.get_available_stock(p_product_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_stock INTEGER;
  v_reserved INTEGER;
  v_track_stock BOOLEAN;
BEGIN
  -- Obtener stock total y si se rastrea
  SELECT stock_quantity, track_stock 
  INTO v_total_stock, v_track_stock
  FROM products 
  WHERE id = p_product_id AND deleted_at IS NULL;
  
  -- Si no se rastrea stock, retornar NULL (stock ilimitado)
  IF NOT COALESCE(v_track_stock, false) THEN
    RETURN NULL;
  END IF;
  
  -- Si no hay stock configurado, retornar 0
  IF v_total_stock IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calcular stock reservado activo
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_reserved
  FROM stock_reservations
  WHERE product_id = p_product_id
    AND status = 'active'
    AND expires_at > now();
  
  RETURN GREATEST(v_total_stock - v_reserved, 0);
END;
$$;

-- Función para crear reserva de stock
CREATE OR REPLACE FUNCTION public.create_stock_reservation(
  p_product_id UUID,
  p_quantity INTEGER,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_available INTEGER;
  v_reservation_id UUID;
  v_track_stock BOOLEAN;
BEGIN
  -- Verificar si el producto rastrea stock
  SELECT track_stock INTO v_track_stock
  FROM products WHERE id = p_product_id AND deleted_at IS NULL;
  
  -- Si no rastrea stock, no crear reserva (stock ilimitado)
  IF NOT COALESCE(v_track_stock, false) THEN
    RETURN jsonb_build_object('success', true, 'unlimited', true);
  END IF;
  
  -- Obtener stock disponible
  v_available := get_available_stock(p_product_id);
  
  -- Verificar si hay suficiente stock
  IF v_available < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'insufficient_stock',
      'available', v_available
    );
  END IF;
  
  -- Cancelar reservas anteriores del mismo usuario/sesión para este producto
  UPDATE stock_reservations
  SET status = 'cancelled'
  WHERE product_id = p_product_id
    AND status = 'active'
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id)
      OR (p_session_id IS NOT NULL AND session_id = p_session_id)
    );
  
  -- Crear nueva reserva
  INSERT INTO stock_reservations (product_id, user_id, session_id, quantity)
  VALUES (p_product_id, p_user_id, p_session_id, p_quantity)
  RETURNING id INTO v_reservation_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'expires_at', (now() + INTERVAL '30 minutes')
  );
END;
$$;

-- Función para completar reserva (al pagar)
CREATE OR REPLACE FUNCTION public.complete_stock_reservation(
  p_product_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_quantity INTEGER;
BEGIN
  -- Obtener cantidad reservada
  SELECT quantity INTO v_quantity
  FROM stock_reservations
  WHERE product_id = p_product_id
    AND status = 'active'
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id)
      OR (p_session_id IS NOT NULL AND session_id = p_session_id)
    )
  LIMIT 1;
  
  IF v_quantity IS NULL THEN
    RETURN false;
  END IF;
  
  -- Marcar reserva como completada
  UPDATE stock_reservations
  SET status = 'completed'
  WHERE product_id = p_product_id
    AND status = 'active'
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id)
      OR (p_session_id IS NOT NULL AND session_id = p_session_id)
    );
  
  -- Reducir stock real del producto
  UPDATE products
  SET stock_quantity = stock_quantity - v_quantity
  WHERE id = p_product_id AND track_stock = true;
  
  RETURN true;
END;
$$;

-- Función para cancelar reserva
CREATE OR REPLACE FUNCTION public.cancel_stock_reservation(
  p_product_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE stock_reservations
  SET status = 'cancelled'
  WHERE product_id = p_product_id
    AND status = 'active'
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id)
      OR (p_session_id IS NOT NULL AND session_id = p_session_id)
    );
  
  RETURN FOUND;
END;
$$;

-- Función para limpiar reservas expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
  v_product_ids UUID[];
BEGIN
  -- Obtener productos afectados antes de actualizar
  SELECT ARRAY_AGG(DISTINCT product_id) INTO v_product_ids
  FROM stock_reservations
  WHERE status = 'active' AND expires_at < now();
  
  -- Marcar reservas expiradas
  UPDATE stock_reservations
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < now();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Si hay productos afectados, notificar a lista de espera
  IF v_product_ids IS NOT NULL AND array_length(v_product_ids, 1) > 0 THEN
    PERFORM notify_waitlist_for_products(v_product_ids);
  END IF;
  
  RETURN v_count;
END;
$$;

-- Función para añadir a lista de espera
CREATE OR REPLACE FUNCTION public.join_stock_waitlist(
  p_product_id UUID,
  p_user_id UUID,
  p_email TEXT,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO stock_waitlist (product_id, user_id, email, quantity_requested)
  VALUES (p_product_id, p_user_id, p_email, p_quantity)
  ON CONFLICT (product_id, user_id) 
  DO UPDATE SET 
    quantity_requested = p_quantity,
    status = 'waiting',
    notified_at = NULL;
  
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Función para notificar lista de espera cuando hay stock
CREATE OR REPLACE FUNCTION public.notify_waitlist_for_products(p_product_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_notified INTEGER := 0;
  v_product_id UUID;
  v_available INTEGER;
  v_waitlist RECORD;
BEGIN
  FOREACH v_product_id IN ARRAY p_product_ids
  LOOP
    v_available := get_available_stock(v_product_id);
    
    -- Si hay stock disponible, notificar a la lista de espera
    IF v_available IS NULL OR v_available > 0 THEN
      FOR v_waitlist IN 
        SELECT w.*, p.name as product_name
        FROM stock_waitlist w
        JOIN products p ON w.product_id = p.id
        WHERE w.product_id = v_product_id 
          AND w.status = 'waiting'
          AND (w.notified_at IS NULL OR w.notified_at < now() - INTERVAL '24 hours')
        ORDER BY w.created_at
        LIMIT 5 -- Notificar máximo 5 personas por producto
      LOOP
        -- Crear notificación in-app
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (
          v_waitlist.user_id,
          'stock_available',
          '🎉 ¡Producto disponible!',
          'El producto "' || v_waitlist.product_name || '" ya está disponible. ¡Date prisa antes de que se agote!',
          '/productos/' || v_product_id
        );
        
        -- Marcar como notificado
        UPDATE stock_waitlist
        SET notified_at = now(), status = 'notified'
        WHERE id = v_waitlist.id;
        
        v_notified := v_notified + 1;
      END LOOP;
    END IF;
  END LOOP;
  
  RETURN v_notified;
END;
$$;

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_waitlist ENABLE ROW LEVEL SECURITY;

-- Reservaciones: usuarios pueden ver/gestionar las suyas, admins todas
CREATE POLICY "Users can view own reservations"
  ON public.stock_reservations FOR SELECT
  USING (
    user_id = auth.uid() 
    OR is_admin_or_superadmin(auth.uid())
  );

CREATE POLICY "Anyone can create reservations"
  ON public.stock_reservations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage all reservations"
  ON public.stock_reservations FOR ALL
  USING (is_admin_or_superadmin(auth.uid()))
  WITH CHECK (is_admin_or_superadmin(auth.uid()));

-- Lista de espera: usuarios pueden gestionar la suya
CREATE POLICY "Users can view own waitlist entries"
  ON public.stock_waitlist FOR SELECT
  USING (user_id = auth.uid() OR is_admin_or_superadmin(auth.uid()));

CREATE POLICY "Users can join waitlist"
  ON public.stock_waitlist FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own waitlist"
  ON public.stock_waitlist FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can leave waitlist"
  ON public.stock_waitlist FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all waitlist"
  ON public.stock_waitlist FOR ALL
  USING (is_admin_or_superadmin(auth.uid()))
  WITH CHECK (is_admin_or_superadmin(auth.uid()));

-- =============================================
-- CRON JOB para limpiar reservas expiradas cada 5 minutos
-- =============================================
SELECT cron.schedule(
  'cleanup-expired-stock-reservations',
  '*/5 * * * *', -- Cada 5 minutos
  $$SELECT cleanup_expired_reservations()$$
);