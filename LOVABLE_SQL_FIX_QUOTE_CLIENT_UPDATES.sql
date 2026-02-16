-- ============================================================================
-- CORRECCIÓN CRÍTICA: Permitir que Clientes Actualicen sus Cotizaciones
-- ============================================================================
-- Este script soluciona el problema donde los clientes no pueden aprobar o 
-- rechazar cotizaciones porque falta la política RLS de UPDATE.
--
-- EJECUTAR EN: Editor SQL de Lovable/Supabase
-- FECHA: Febrero 2026
-- ============================================================================

-- ============================================================================
-- 1. ELIMINAR POLÍTICA ANTERIOR SI EXISTE
-- ============================================================================

DROP POLICY IF EXISTS "Users can update their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can update quote status" ON public.quotes;

-- ============================================================================
-- 2. CREAR POLÍTICA DE UPDATE PARA CLIENTES
-- ============================================================================

-- Esta política permite que los usuarios actualicen SOLO sus propias cotizaciones
-- y SOLO los campos permitidos (status_id y custom_text para comentarios)
CREATE POLICY "Users can update their own quote status and comments"
ON public.quotes
FOR UPDATE
TO authenticated
USING (
  -- El usuario debe ser el dueño de la cotización O tener el mismo email
  auth.uid() = user_id OR customer_email = auth.email()
)
WITH CHECK (
  -- Misma verificación para el CHECK
  auth.uid() = user_id OR customer_email = auth.email()
);

-- ============================================================================
-- 3. COMENTARIO Y DOCUMENTACIÓN
-- ============================================================================

COMMENT ON POLICY "Users can update their own quote status and comments" ON public.quotes IS 
'Permite a los clientes actualizar el estado (aprobar/rechazar) y añadir comentarios a sus propias cotizaciones. Esencial para el flujo de aprobación del cliente.';

-- ============================================================================
-- 4. VERIFICACIÓN
-- ============================================================================

-- Mostrar todas las políticas actuales en la tabla quotes
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
  AND tablename = 'quotes'
ORDER BY cmd, policyname;

-- ============================================================================
-- 5. RESULTADO ESPERADO
-- ============================================================================

-- Después de ejecutar este script, deberías ver 4 políticas para 'quotes':
-- 1. "Admins can manage all quotes" (ALL) - para administradores
-- 2. "Users can create quotes" (INSERT) - para crear cotizaciones
-- 3. "Users can view their own quotes" (SELECT) - para ver cotizaciones
-- 4. "Users can update their own quote status and comments" (UPDATE) - NUEVA política

-- ============================================================================
-- 6. TESTING MANUAL
-- ============================================================================

-- Para probar que funciona, desde la aplicación:
-- 1. Un cliente entra a /cotizacion/:id
-- 2. Ve el botón "Aceptar Cambios" o "Rechazar Cambios"
-- 3. Al hacer clic, el estado se actualiza correctamente
-- 4. Ya NO debe ver el error "row-level security policy" o "permission denied"

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
