-- ============================================
-- FASE 1: CORRECCIONES DE SEGURIDAD (VERSIÓN 2)
-- ============================================

-- 1.1 Limpiar políticas existentes de profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Recrear políticas seguras para profiles
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::text));

-- 1.2 Limpiar y recrear política de quotes
DROP POLICY IF EXISTS "Authenticated users can insert their own quotes" ON quotes;

CREATE POLICY "Authenticated users can insert quotes"
ON quotes FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (user_id = auth.uid() OR user_id IS NULL)
);

-- 1.3 Limpiar y recrear política de checkout_sessions
DROP POLICY IF EXISTS "Users can manage their own checkout sessions" ON checkout_sessions;

CREATE POLICY "Users can manage own checkout sessions"
ON checkout_sessions FOR ALL
USING (
  auth.uid() = user_id OR 
  (user_id IS NULL AND auth.uid() IS NOT NULL)
)
WITH CHECK (
  auth.uid() = user_id OR 
  (user_id IS NULL AND auth.uid() IS NOT NULL)
);