-- ============================================================================
-- MIGRACIÓN: Crear función has_role y tabla user_roles (Idempotente)
-- ============================================================================
-- Fecha: 2024-11-24
-- Propósito: Asegurar que la función has_role existe para políticas RLS
-- Tipo: Idempotente (se puede ejecutar múltiples veces sin problemas)
--
-- CONTEXTO:
-- Esta migración soluciona el error:
--   "ERROR: function public.has_role(uuid, text) does not exist"
-- 
-- La función has_role es esencial para las políticas de seguridad RLS que
-- verifican si un usuario tiene un rol específico (por ejemplo, 'admin').
--
-- INSTRUCCIONES:
-- 1. Este script se ejecutará automáticamente al aplicar migraciones
-- 2. También puede ejecutarse manualmente en Supabase SQL Editor si es necesario
-- 3. Es seguro ejecutarlo múltiples veces
-- ============================================================================

-- ============================================================================
-- PARTE 1: Crear tipo ENUM app_role si no existe
-- ============================================================================

DO $$ 
BEGIN
  -- Verificar si el tipo app_role ya existe
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    -- Crear el tipo ENUM con los roles permitidos
    CREATE TYPE public.app_role AS ENUM (
      'admin',      -- Administrador: acceso completo
      'client',     -- Cliente: acceso limitado
      'moderator'   -- Moderador: acceso intermedio
    );
    
    RAISE NOTICE '✅ Tipo ENUM app_role creado exitosamente';
  ELSE
    RAISE NOTICE '✓ Tipo ENUM app_role ya existe - saltando creación';
  END IF;
END $$;

-- ============================================================================
-- PARTE 2: Crear tabla user_roles si no existe
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  -- ID único del registro
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ID del usuario (referencia a auth.users)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Rol asignado al usuario
  role TEXT NOT NULL DEFAULT 'client',
  
  -- Fecha de creación del registro
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: Un usuario no puede tener el mismo rol duplicado
  CONSTRAINT unique_user_role UNIQUE(user_id, role)
);

-- Agregar comentarios para documentación
COMMENT ON TABLE public.user_roles IS 
  'Tabla que almacena los roles asignados a cada usuario. Un usuario puede tener múltiples roles.';

COMMENT ON COLUMN public.user_roles.user_id IS 
  'ID del usuario en auth.users al que se le asigna el rol';

COMMENT ON COLUMN public.user_roles.role IS 
  'Rol asignado: admin (administrador), client (cliente), moderator (moderador)';

COMMENT ON COLUMN public.user_roles.created_at IS 
  'Fecha y hora en que se asignó el rol al usuario';

-- ============================================================================
-- PARTE 3: Crear índices para optimizar consultas
-- ============================================================================

-- Índice en user_id para búsquedas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
  ON public.user_roles(user_id);

-- Índice en role para búsquedas rápidas por rol
CREATE INDEX IF NOT EXISTS idx_user_roles_role 
  ON public.user_roles(role);

-- Índice compuesto para verificación rápida de usuario + rol
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role 
  ON public.user_roles(user_id, role);

-- ============================================================================
-- PARTE 4: Crear o reemplazar la función has_role
-- ============================================================================

-- Crear o reemplazar la función has_role (idempotente y seguro)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text) 
RETURNS boolean
LANGUAGE sql 
STABLE                    -- La función no modifica la base de datos
SECURITY DEFINER          -- Se ejecuta con los permisos del creador
SET search_path TO 'public'  -- Usar solo el schema public
AS $$
  -- Verificar si existe un registro que coincida con el usuario y rol
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id 
      AND role = _role
  )
$$;

-- Agregar comentario de documentación
COMMENT ON FUNCTION public.has_role(uuid, text) IS 
  'Verifica si un usuario específico tiene asignado un rol determinado. 
   Parámetros:
   - _user_id: UUID del usuario a verificar
   - _role: Nombre del rol a verificar (admin, client, moderator)
   Retorna: true si el usuario tiene el rol, false en caso contrario';

-- ============================================================================
-- PARTE 5: Habilitar Row Level Security en user_roles
-- ============================================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 6: Crear políticas RLS básicas para user_roles
-- ============================================================================

-- Política: Los usuarios pueden ver sus propios roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_roles' 
      AND policyname = 'Los usuarios pueden ver sus propios roles'
  ) THEN
    CREATE POLICY "Los usuarios pueden ver sus propios roles"
      ON public.user_roles 
      FOR SELECT
      USING (auth.uid() = user_id);
    
    RAISE NOTICE '✅ Política SELECT creada para user_roles';
  ELSE
    RAISE NOTICE '✓ Política SELECT ya existe para user_roles';
  END IF;
END $$;

-- Política: Los administradores pueden ver todos los roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_roles' 
      AND policyname = 'Admins pueden ver todos los roles'
  ) THEN
    CREATE POLICY "Admins pueden ver todos los roles"
      ON public.user_roles 
      FOR SELECT
      USING (public.has_role(auth.uid(), 'admin'));
    
    RAISE NOTICE '✅ Política SELECT admin creada para user_roles';
  ELSE
    RAISE NOTICE '✓ Política SELECT admin ya existe para user_roles';
  END IF;
END $$;

-- Política: Solo administradores pueden insertar roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_roles' 
      AND policyname = 'Solo admins pueden insertar roles'
  ) THEN
    CREATE POLICY "Solo admins pueden insertar roles"
      ON public.user_roles 
      FOR INSERT
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
    
    RAISE NOTICE '✅ Política INSERT creada para user_roles';
  ELSE
    RAISE NOTICE '✓ Política INSERT ya existe para user_roles';
  END IF;
END $$;

-- Política: Solo administradores pueden actualizar roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_roles' 
      AND policyname = 'Solo admins pueden actualizar roles'
  ) THEN
    CREATE POLICY "Solo admins pueden actualizar roles"
      ON public.user_roles 
      FOR UPDATE
      USING (public.has_role(auth.uid(), 'admin'));
    
    RAISE NOTICE '✅ Política UPDATE creada para user_roles';
  ELSE
    RAISE NOTICE '✓ Política UPDATE ya existe para user_roles';
  END IF;
END $$;

-- Política: Solo administradores pueden eliminar roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_roles' 
      AND policyname = 'Solo admins pueden eliminar roles'
  ) THEN
    CREATE POLICY "Solo admins pueden eliminar roles"
      ON public.user_roles 
      FOR DELETE
      USING (public.has_role(auth.uid(), 'admin'));
    
    RAISE NOTICE '✅ Política DELETE creada para user_roles';
  ELSE
    RAISE NOTICE '✓ Política DELETE ya existe para user_roles';
  END IF;
END $$;

-- ============================================================================
-- PARTE 7: Verificación de la instalación
-- ============================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_table_exists BOOLEAN;
  v_policies_count INTEGER;
BEGIN
  -- Verificar que la función has_role existe
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'has_role' 
      AND pg_catalog.pg_function_is_visible(oid)
  ) INTO v_function_exists;
  
  -- Verificar que la tabla user_roles existe
  SELECT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'user_roles'
  ) INTO v_table_exists;
  
  -- Contar políticas creadas
  SELECT COUNT(*) 
  INTO v_policies_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'user_roles';
  
  -- Mostrar resumen de verificación
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICACIÓN DE INSTALACIÓN';
  RAISE NOTICE '========================================';
  
  IF v_function_exists THEN
    RAISE NOTICE '✅ Función has_role: INSTALADA';
  ELSE
    RAISE NOTICE '❌ Función has_role: NO ENCONTRADA';
  END IF;
  
  IF v_table_exists THEN
    RAISE NOTICE '✅ Tabla user_roles: CREADA';
  ELSE
    RAISE NOTICE '❌ Tabla user_roles: NO ENCONTRADA';
  END IF;
  
  RAISE NOTICE '📋 Políticas RLS: % configuradas', v_policies_count;
  
  IF v_function_exists AND v_table_exists AND v_policies_count >= 5 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅✅✅ INSTALACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'PRÓXIMOS PASOS:';
    RAISE NOTICE '1. Asigna el rol de admin a tu usuario ejecutando:';
    RAISE NOTICE '   ⚠️  IMPORTANTE: Usa parámetros seguros, no concatenes el email directamente';
    RAISE NOTICE '   INSERT INTO public.user_roles (user_id, role)';
    RAISE NOTICE '   SELECT id, ''admin'' FROM auth.users';
    RAISE NOTICE '   WHERE email = $1  -- Usa el parámetro aquí, NO concatenes';
    RAISE NOTICE '   ON CONFLICT (user_id, role) DO NOTHING;';
    RAISE NOTICE '';
    RAISE NOTICE '2. Espera 10 segundos para que el schema cache se actualice';
    RAISE NOTICE '3. Recarga tu aplicación';
  ELSE
    RAISE NOTICE '========================================';
    RAISE NOTICE '⚠️ INSTALACIÓN INCOMPLETA';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Por favor, revisa los mensajes anteriores para identificar el problema';
  END IF;
END $$;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
