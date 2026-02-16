-- ============================================================================
-- FASE 3: TABLAS PARA SISTEMA DE PAGOS
-- ============================================================================
-- Este script crea las tablas necesarias para:
-- 1. Auditoría de cambios de estado de pagos
-- 2. Prevención de transacciones duplicadas (idempotencia)
--
-- EJECUTAR EN: Editor SQL de Lovable/Supabase
-- FECHA: Febrero 2026
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLA: payment_audit_logs
-- Log de auditoría de cambios de estado de pagos
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  transaction_id TEXT,
  payment_method TEXT,
  metadata JSONB,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_status_values CHECK (
    old_status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled') AND
    new_status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled')
  ),
  CONSTRAINT order_or_invoice_required CHECK (
    order_id IS NOT NULL OR invoice_id IS NOT NULL
  )
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_payment_audit_order_id 
ON public.payment_audit_logs(order_id) WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_audit_invoice_id 
ON public.payment_audit_logs(invoice_id) WHERE invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_audit_transaction_id 
ON public.payment_audit_logs(transaction_id) WHERE transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_audit_created_at 
ON public.payment_audit_logs(created_at DESC);

-- Comentarios
COMMENT ON TABLE public.payment_audit_logs IS 
'Log de auditoría de todos los cambios de estado de pagos. Registra quién, cuándo y por qué cambió un estado de pago.';

COMMENT ON COLUMN public.payment_audit_logs.old_status IS 
'Estado de pago anterior';

COMMENT ON COLUMN public.payment_audit_logs.new_status IS 
'Nuevo estado de pago';

COMMENT ON COLUMN public.payment_audit_logs.transaction_id IS 
'ID de transacción único para trazabilidad';

COMMENT ON COLUMN public.payment_audit_logs.metadata IS 
'Datos adicionales del cambio en formato JSON';

-- ============================================================================
-- 2. TABLA: payment_transactions
-- Registro de transacciones para prevención de duplicados
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_transaction_status CHECK (
    status IN ('pending', 'completed', 'failed')
  ),
  CONSTRAINT valid_amount CHECK (
    amount >= 0
  ),
  CONSTRAINT valid_currency CHECK (
    currency ~ '^[A-Z]{3}$'
  ),
  CONSTRAINT valid_transaction_id_format CHECK (
    transaction_id ~ '^TXN-[0-9]+-[a-z0-9]+-[a-f0-9]+$'
  )
);

-- Índices para búsquedas y prevención de duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_transactions_transaction_id 
ON public.payment_transactions(transaction_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id 
ON public.payment_transactions(order_id) WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice_id 
ON public.payment_transactions(invoice_id) WHERE invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
ON public.payment_transactions(status);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id 
ON public.payment_transactions(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at 
ON public.payment_transactions(created_at DESC);

-- Comentarios
COMMENT ON TABLE public.payment_transactions IS 
'Registro de todas las transacciones de pago para prevenir duplicados (idempotencia). Cada transacción tiene un ID único.';

COMMENT ON COLUMN public.payment_transactions.transaction_id IS 
'ID único de transacción. Formato: TXN-{timestamp}-{random}-{hash}. Usado para idempotencia.';

COMMENT ON COLUMN public.payment_transactions.status IS 
'Estado actual de la transacción: pending, completed, failed';

COMMENT ON COLUMN public.payment_transactions.completed_at IS 
'Timestamp de cuando la transacción fue completada exitosamente';

-- ============================================================================
-- 3. TRIGGER: Actualizar updated_at en payment_transactions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payment_transactions_updated_at 
ON public.payment_transactions;

CREATE TRIGGER trigger_update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_transactions_updated_at();

-- ============================================================================
-- 4. POLÍTICAS RLS PARA payment_audit_logs
-- ============================================================================

ALTER TABLE public.payment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins pueden ver todos los logs
DROP POLICY IF EXISTS "Admins can view all payment audit logs" 
ON public.payment_audit_logs;

CREATE POLICY "Admins can view all payment audit logs"
ON public.payment_audit_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Sistema puede crear logs
DROP POLICY IF EXISTS "System can create payment audit logs" 
ON public.payment_audit_logs;

CREATE POLICY "System can create payment audit logs"
ON public.payment_audit_logs
FOR INSERT
WITH CHECK (true);

-- Service role puede hacer todo
DROP POLICY IF EXISTS "Service role can manage payment audit logs" 
ON public.payment_audit_logs;

CREATE POLICY "Service role can manage payment audit logs"
ON public.payment_audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 5. POLÍTICAS RLS PARA payment_transactions
-- ============================================================================

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Admins pueden ver todas las transacciones
DROP POLICY IF EXISTS "Admins can view all payment transactions" 
ON public.payment_transactions;

CREATE POLICY "Admins can view all payment transactions"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Usuarios pueden ver sus propias transacciones
DROP POLICY IF EXISTS "Users can view their own payment transactions" 
ON public.payment_transactions;

CREATE POLICY "Users can view their own payment transactions"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Sistema puede crear transacciones
DROP POLICY IF EXISTS "System can create payment transactions" 
ON public.payment_transactions;

CREATE POLICY "System can create payment transactions"
ON public.payment_transactions
FOR INSERT
WITH CHECK (true);

-- Sistema puede actualizar transacciones
DROP POLICY IF EXISTS "System can update payment transactions" 
ON public.payment_transactions;

CREATE POLICY "System can update payment transactions"
ON public.payment_transactions
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Service role puede hacer todo
DROP POLICY IF EXISTS "Service role can manage payment transactions" 
ON public.payment_transactions;

CREATE POLICY "Service role can manage payment transactions"
ON public.payment_transactions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- 6. FUNCIÓN: Limpiar transacciones antiguas (>30 días)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_payment_transactions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Eliminar transacciones completadas o fallidas de más de 30 días
  WITH deleted AS (
    DELETE FROM public.payment_transactions
    WHERE 
      status IN ('completed', 'failed')
      AND created_at < NOW() - INTERVAL '30 days'
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Log de limpieza
  RAISE NOTICE 'Cleaned up % old payment transactions', deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_old_payment_transactions() IS 
'Limpia transacciones completadas o fallidas de más de 30 días. Retorna número de registros eliminados.';

-- ============================================================================
-- 7. VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
  audit_count INTEGER;
  transactions_count INTEGER;
BEGIN
  -- Contar registros en tablas
  SELECT COUNT(*) INTO audit_count FROM public.payment_audit_logs;
  SELECT COUNT(*) INTO transactions_count FROM public.payment_transactions;
  
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'VERIFICACIÓN FINAL - Tablas de Sistema de Pagos';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Tabla payment_audit_logs: % registros', audit_count;
  RAISE NOTICE 'Tabla payment_transactions: % registros', transactions_count;
  RAISE NOTICE 'Tablas creadas exitosamente';
  RAISE NOTICE 'Políticas RLS configuradas';
  RAISE NOTICE 'Índices creados para rendimiento';
  RAISE NOTICE 'Función de limpieza disponible: cleanup_old_payment_transactions()';
  RAISE NOTICE '=================================================================';
END;
$$;

COMMIT;

-- ============================================================================
-- RESUMEN DE CAMBIOS APLICADOS
-- ============================================================================

-- ✅ Tabla payment_audit_logs creada
-- ✅ Tabla payment_transactions creada
-- ✅ Índices de rendimiento creados
-- ✅ Políticas RLS configuradas
-- ✅ Triggers de updated_at configurados
-- ✅ Función de limpieza creada
-- ✅ Constraints de validación agregados

-- ============================================================================
-- USO DE LA FUNCIÓN DE LIMPIEZA
-- ============================================================================

-- Para limpiar transacciones antiguas manualmente:
-- SELECT public.cleanup_old_payment_transactions();

-- Para configurar limpieza automática, crear un pg_cron job:
-- SELECT cron.schedule(
--   'cleanup-old-transactions',
--   '0 2 * * *',  -- Cada día a las 2 AM
--   'SELECT public.cleanup_old_payment_transactions();'
-- );

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
