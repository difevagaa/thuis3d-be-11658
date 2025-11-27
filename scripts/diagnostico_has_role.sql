-- ============================================================================
-- SCRIPT DE DIAGNÓSTICO: Verificar función has_role y sistema de roles
-- ============================================================================
-- Propósito: Diagnosticar problemas con la función has_role y el sistema de roles
-- Uso: Ejecutar en Supabase SQL Editor para verificar el estado actual
-- Fecha: 2024-11-24
-- ============================================================================

-- Mensaje de inicio
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  DIAGNÓSTICO DEL SISTEMA DE ROLES                          ║';
  RAISE NOTICE '║  Fecha: %                                       ║', NOW()::date;
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECCIÓN 1: Verificar existencia de la función has_role
-- ============================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_function_owner TEXT;
BEGIN
  RAISE NOTICE '1️⃣  VERIFICANDO FUNCIÓN has_role';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  -- Verificar si la función existe
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'has_role'
  ) INTO v_function_exists;
  
  IF v_function_exists THEN
    -- Obtener el propietario de la función
    SELECT pg_catalog.pg_get_userbyid(p.proowner)
    INTO v_function_owner
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'has_role'
    LIMIT 1;
    
    RAISE NOTICE '✅ Estado: FUNCIÓN EXISTE';
    RAISE NOTICE '   Propietario: %', v_function_owner;
    RAISE NOTICE '   Schema: public';
    RAISE NOTICE '   Firma: has_role(uuid, text) RETURNS boolean';
  ELSE
    RAISE NOTICE '❌ Estado: FUNCIÓN NO EXISTE';
    RAISE NOTICE '';
    RAISE NOTICE '   ⚠️  PROBLEMA DETECTADO:';
    RAISE NOTICE '   La función has_role no está definida en la base de datos.';
    RAISE NOTICE '';
    RAISE NOTICE '   📝 SOLUCIÓN:';
    RAISE NOTICE '   1. Consulta el archivo: GUIA_SOLUCION_ERROR_HAS_ROLE.md';
    RAISE NOTICE '   2. O ejecuta la migración: 20251124171853_fix_has_role_function.sql';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECCIÓN 2: Verificar existencia de la tabla user_roles
-- ============================================================================

DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_row_count INTEGER;
  v_rls_enabled BOOLEAN;
BEGIN
  RAISE NOTICE '2️⃣  VERIFICANDO TABLA user_roles';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  -- Verificar si la tabla existe
  SELECT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'user_roles'
  ) INTO v_table_exists;
  
  IF v_table_exists THEN
    RAISE NOTICE '✅ Estado: TABLA EXISTE';
    
    -- Contar registros directamente (no usar EXECUTE para consultas simples)
    SELECT COUNT(*) INTO v_row_count FROM public.user_roles;
    RAISE NOTICE '   Registros: % rol(es) asignado(s)', v_row_count;
    
    -- Verificar si RLS está habilitado
    SELECT relrowsecurity 
    INTO v_rls_enabled
    FROM pg_class 
    WHERE relname = 'user_roles';
    
    IF v_rls_enabled THEN
      RAISE NOTICE '   RLS: ✅ Habilitado';
    ELSE
      RAISE NOTICE '   RLS: ⚠️  Deshabilitado';
    END IF;
  ELSE
    RAISE NOTICE '❌ Estado: TABLA NO EXISTE';
    RAISE NOTICE '';
    RAISE NOTICE '   ⚠️  PROBLEMA DETECTADO:';
    RAISE NOTICE '   La tabla user_roles no está creada.';
    RAISE NOTICE '';
    RAISE NOTICE '   📝 SOLUCIÓN:';
    RAISE NOTICE '   1. Consulta el archivo: GUIA_SOLUCION_ERROR_HAS_ROLE.md';
    RAISE NOTICE '   2. O ejecuta la migración: 20251124171853_fix_has_role_function.sql';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECCIÓN 3: Verificar tipo ENUM app_role
-- ============================================================================

DO $$
DECLARE
  v_enum_exists BOOLEAN;
  v_enum_values TEXT[];
BEGIN
  RAISE NOTICE '3️⃣  VERIFICANDO TIPO ENUM app_role';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  -- Verificar si el tipo existe
  SELECT EXISTS (
    SELECT 1 
    FROM pg_type 
    WHERE typname = 'app_role'
  ) INTO v_enum_exists;
  
  IF v_enum_exists THEN
    -- Obtener los valores del enum
    SELECT ARRAY_AGG(enumlabel ORDER BY enumsortorder)
    INTO v_enum_values
    FROM pg_enum
    WHERE enumtypid = 'public.app_role'::regtype;
    
    RAISE NOTICE '✅ Estado: TIPO ENUM EXISTE';
    RAISE NOTICE '   Valores permitidos: %', ARRAY_TO_STRING(v_enum_values, ', ');
  ELSE
    RAISE NOTICE '⚠️  Estado: TIPO ENUM NO EXISTE';
    RAISE NOTICE '   Nota: El tipo app_role es opcional si user_roles.role es TEXT';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECCIÓN 4: Verificar políticas RLS en user_roles
-- ============================================================================

DO $$
DECLARE
  v_policies_count INTEGER;
  v_policy_record RECORD;
BEGIN
  RAISE NOTICE '4️⃣  VERIFICANDO POLÍTICAS RLS';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  -- Verificar si la tabla existe antes de consultar políticas
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
    -- Contar políticas
    SELECT COUNT(*) 
    INTO v_policies_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_roles';
    
    IF v_policies_count > 0 THEN
      RAISE NOTICE '✅ Políticas encontradas: %', v_policies_count;
      RAISE NOTICE '';
      
      -- Listar cada política
      FOR v_policy_record IN 
        SELECT policyname, cmd
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'user_roles'
        ORDER BY policyname
      LOOP
        RAISE NOTICE '   📋 %', v_policy_record.policyname;
        RAISE NOTICE '      Operación: %', v_policy_record.cmd;
      END LOOP;
    ELSE
      RAISE NOTICE '⚠️  No hay políticas RLS configuradas';
      RAISE NOTICE '   Esto significa que nadie podrá acceder a user_roles';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Saltando verificación (tabla user_roles no existe)';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECCIÓN 5: Verificar roles asignados
-- ============================================================================

DO $$
DECLARE
  v_admin_count INTEGER := 0;
  v_client_count INTEGER := 0;
  v_moderator_count INTEGER := 0;
  v_total_count INTEGER := 0;
BEGIN
  RAISE NOTICE '5️⃣  VERIFICANDO ROLES ASIGNADOS';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  -- Verificar si la tabla existe
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
    -- Contar por tipo de rol
    SELECT 
      COUNT(*) FILTER (WHERE role = 'admin'),
      COUNT(*) FILTER (WHERE role = 'client'),
      COUNT(*) FILTER (WHERE role = 'moderator'),
      COUNT(*)
    INTO v_admin_count, v_client_count, v_moderator_count, v_total_count
    FROM public.user_roles;
    
    RAISE NOTICE '📊 Resumen de roles:';
    RAISE NOTICE '   👑 Administradores: %', v_admin_count;
    RAISE NOTICE '   👤 Clientes: %', v_client_count;
    RAISE NOTICE '   🛡️  Moderadores: %', v_moderator_count;
    RAISE NOTICE '   📈 Total: %', v_total_count;
    
    IF v_admin_count = 0 THEN
      RAISE NOTICE '';
      RAISE NOTICE '   ⚠️  ADVERTENCIA: No hay administradores asignados';
      RAISE NOTICE '   Sin administradores, nadie podrá gestionar roles o contenido restringido.';
      RAISE NOTICE '';
      RAISE NOTICE '   📝 SOLUCIÓN: Asigna un admin con este código:';
      RAISE NOTICE '   INSERT INTO public.user_roles (user_id, role)';
      RAISE NOTICE '   SELECT id, ''admin'' FROM auth.users';
      RAISE NOTICE '   WHERE email = ''tu-email@ejemplo.com''';
      RAISE NOTICE '   ON CONFLICT (user_id, role) DO NOTHING;';
    END IF;
  ELSE
    RAISE NOTICE '⏭️  Saltando verificación (tabla user_roles no existe)';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECCIÓN 6: Listar usuarios con roles
-- ============================================================================

SELECT 
  '6️⃣  USUARIOS CON ROLES ASIGNADOS' as "Sección";

SELECT 
  ur.role as "Rol",
  u.email as "Email Usuario",
  ur.created_at as "Fecha Asignación",
  CASE 
    WHEN u.email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
    ELSE '⏳ Pendiente'
  END as "Estado Email"
FROM public.user_roles ur
LEFT JOIN auth.users u ON ur.user_id = u.id
ORDER BY 
  CASE ur.role 
    WHEN 'admin' THEN 1 
    WHEN 'moderator' THEN 2 
    ELSE 3 
  END,
  ur.created_at DESC
LIMIT 20;

-- ============================================================================
-- SECCIÓN 7: Verificar usuarios sin roles
-- ============================================================================

SELECT 
  '7️⃣  USUARIOS SIN ROLES ASIGNADOS' as "Sección";

SELECT 
  u.email as "Email Usuario",
  u.created_at as "Fecha Registro",
  CASE 
    WHEN u.email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
    ELSE '⏳ Pendiente'
  END as "Estado Email"
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.id IS NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- ============================================================================
-- SECCIÓN 8: Prueba de la función has_role (si existe)
-- ============================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_test_user_id UUID;
  v_test_result BOOLEAN;
BEGIN
  -- Verificar si la función existe
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'has_role'
  ) INTO v_function_exists;
  
  IF v_function_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '8️⃣  PRUEBA DE FUNCIÓN has_role';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    -- Verificar si hay algún usuario con rol admin
    SELECT user_id INTO v_test_user_id
    FROM public.user_roles
    WHERE role = 'admin'
    LIMIT 1;
    
    IF v_test_user_id IS NOT NULL THEN
      -- Probar la función con un admin real (con manejo de errores)
      BEGIN
        SELECT public.has_role(v_test_user_id, 'admin') INTO v_test_result;
        
        IF v_test_result THEN
          RAISE NOTICE '✅ Prueba exitosa: has_role retorna TRUE para un admin';
        ELSE
          RAISE NOTICE '❌ Prueba fallida: has_role retorna FALSE para un admin';
        END IF;
        
        -- Probar con un rol que no tiene
        SELECT public.has_role(v_test_user_id, 'role_inexistente') INTO v_test_result;
        
        IF NOT v_test_result THEN
          RAISE NOTICE '✅ Prueba exitosa: has_role retorna FALSE para rol inexistente';
        ELSE
          RAISE NOTICE '❌ Prueba fallida: has_role retorna TRUE para rol inexistente';
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE '❌ Error al probar la función: %', SQLERRM;
      END;
    ELSE
      RAISE NOTICE '⏭️  No hay usuarios admin para probar la función';
    END IF;
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '8️⃣  PRUEBA DE FUNCIÓN has_role';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '⏭️  Saltando prueba (función has_role no existe)';
  END IF;
END $$;

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_table_exists BOOLEAN;
  v_has_admins BOOLEAN;
  v_all_ok BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  RESUMEN DEL DIAGNÓSTICO                                   ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  
  -- Verificar función
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'has_role'
  ) INTO v_function_exists;
  
  -- Verificar tabla
  SELECT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'user_roles'
  ) INTO v_table_exists;
  
  -- Verificar admins
  IF v_table_exists THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles WHERE role = 'admin'
    ) INTO v_has_admins;
  ELSE
    v_has_admins := FALSE;
  END IF;
  
  -- Todo OK si están los 3
  v_all_ok := v_function_exists AND v_table_exists AND v_has_admins;
  
  IF v_all_ok THEN
    RAISE NOTICE '✅✅✅ SISTEMA DE ROLES FUNCIONANDO CORRECTAMENTE';
    RAISE NOTICE '';
    RAISE NOTICE 'Todos los componentes están instalados y configurados:';
    RAISE NOTICE '  ✓ Función has_role existe';
    RAISE NOTICE '  ✓ Tabla user_roles existe';
    RAISE NOTICE '  ✓ Al menos un administrador asignado';
  ELSE
    RAISE NOTICE '⚠️⚠️⚠️ SE ENCONTRARON PROBLEMAS';
    RAISE NOTICE '';
    RAISE NOTICE 'Estado de componentes:';
    RAISE NOTICE '  % Función has_role', CASE WHEN v_function_exists THEN '✓' ELSE '✗' END;
    RAISE NOTICE '  % Tabla user_roles', CASE WHEN v_table_exists THEN '✓' ELSE '✗' END;
    RAISE NOTICE '  % Administradores asignados', CASE WHEN v_has_admins THEN '✓' ELSE '✗' END;
    RAISE NOTICE '';
    RAISE NOTICE '📚 CONSULTA LA DOCUMENTACIÓN:';
    RAISE NOTICE '   Archivo: GUIA_SOLUCION_ERROR_HAS_ROLE.md';
    RAISE NOTICE '   Migración: supabase/migrations/20251124171853_fix_has_role_function.sql';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Fin del diagnóstico - %', NOW();
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- FIN DEL DIAGNÓSTICO
-- ============================================================================
