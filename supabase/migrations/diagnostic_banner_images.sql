-- ============================================================================
-- SCRIPT DE DIAGNÓSTICO: Sistema de Banners con Imágenes Múltiples
-- ============================================================================
-- Este script verifica el estado completo del sistema de banners
-- y ayuda a diagnosticar problemas con la tabla banner_images
--
-- INSTRUCCIONES:
-- 1. Copiar todo este archivo
-- 2. Pegar en Supabase Dashboard → SQL Editor → New Query
-- 3. Ejecutar (Run o Ctrl/Cmd + Enter)
-- 4. Revisar los resultados para identificar problemas
--
-- Fecha: 23 de Noviembre, 2025
-- ============================================================================

\echo '============================================================================'
\echo 'DIAGNÓSTICO DEL SISTEMA DE BANNERS - THUIS3D'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- SECCIÓN 1: Verificar existencia de tablas
-- ============================================================================
\echo '1. VERIFICACIÓN DE TABLAS'
\echo '------------------------'

DO $$
DECLARE
    homepage_banners_exists BOOLEAN;
    banner_images_exists BOOLEAN;
BEGIN
    -- Verificar homepage_banners
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'homepage_banners'
    ) INTO homepage_banners_exists;
    
    -- Verificar banner_images
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'banner_images'
    ) INTO banner_images_exists;
    
    RAISE NOTICE '✓ Verificación de tablas:';
    RAISE NOTICE '  - homepage_banners: %', 
        CASE WHEN homepage_banners_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    RAISE NOTICE '  - banner_images: %', 
        CASE WHEN banner_images_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END;
    
    IF NOT homepage_banners_exists THEN
        RAISE WARNING '⚠️  La tabla homepage_banners no existe. El sistema de banners no funcionará.';
    END IF;
    
    IF NOT banner_images_exists THEN
        RAISE WARNING '⚠️  La tabla banner_images no existe. El modo carrusel no funcionará.';
        RAISE WARNING '→  SOLUCIÓN: Ejecutar migración 20251123161800_ensure_banner_images_schema_cache.sql';
    END IF;
END $$;

\echo ''

-- ============================================================================
-- SECCIÓN 2: Estructura de la tabla banner_images (si existe)
-- ============================================================================
\echo '2. ESTRUCTURA DE banner_images'
\echo '------------------------------'

DO $$
DECLARE
    table_exists BOOLEAN;
    column_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'banner_images'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO column_count
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'banner_images';
        
        RAISE NOTICE '✓ Columnas en banner_images: %', column_count;
        RAISE NOTICE '';
        RAISE NOTICE 'Detalle de columnas:';
    ELSE
        RAISE WARNING '⚠️  No se puede mostrar estructura: tabla no existe';
    END IF;
END $$;

-- Mostrar columnas solo si la tabla existe
SELECT 
    column_name AS "Columna",
    data_type AS "Tipo",
    is_nullable AS "Nullable",
    column_default AS "Default"
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'banner_images'
ORDER BY ordinal_position;

\echo ''

-- ============================================================================
-- SECCIÓN 3: Verificar Foreign Key Constraints
-- ============================================================================
\echo '3. FOREIGN KEY CONSTRAINTS'
\echo '-------------------------'

DO $$
DECLARE
    fk_exists BOOLEAN;
    fk_name TEXT;
BEGIN
    -- Buscar la foreign key constraint
    SELECT 
        COUNT(*) > 0,
        MAX(constraint_name)
    INTO fk_exists, fk_name
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'banner_images'
      AND constraint_type = 'FOREIGN KEY';
    
    IF fk_exists THEN
        RAISE NOTICE '✅ Foreign key constraint encontrada: %', fk_name;
        
        -- Verificar que tenga el nombre correcto
        IF fk_name = 'banner_images_banner_id_fkey' THEN
            RAISE NOTICE '✅ Nombre de constraint es correcto (sigue convención PostgREST)';
        ELSE
            RAISE WARNING '⚠️  Nombre de constraint no sigue convención: %', fk_name;
            RAISE WARNING '→  Esperado: banner_images_banner_id_fkey';
            RAISE WARNING '→  SOLUCIÓN: Ejecutar migración 20251123144700_fix_banner_images_relationship.sql';
        END IF;
    ELSE
        RAISE WARNING '❌ No se encontró foreign key constraint';
        RAISE WARNING '→  SOLUCIÓN: Ejecutar migración 20251123161800_ensure_banner_images_schema_cache.sql';
    END IF;
END $$;

-- Detalle de constraints
SELECT 
    tc.constraint_name AS "Constraint",
    tc.constraint_type AS "Tipo",
    kcu.column_name AS "Columna",
    ccu.table_name AS "Tabla Referenciada",
    ccu.column_name AS "Columna Referenciada"
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'banner_images'
  AND tc.constraint_type = 'FOREIGN KEY';

\echo ''

-- ============================================================================
-- SECCIÓN 4: Verificar Índices
-- ============================================================================
\echo '4. ÍNDICES'
\echo '---------'

DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public' 
      AND tablename = 'banner_images';
    
    RAISE NOTICE '✓ Número de índices: %', index_count;
    
    IF index_count < 4 THEN
        RAISE WARNING '⚠️  Faltan índices (esperados: 4-5)';
        RAISE WARNING '→  Esto puede afectar el rendimiento';
        RAISE WARNING '→  SOLUCIÓN: Ejecutar migración 20251123161800_ensure_banner_images_schema_cache.sql';
    END IF;
END $$;

-- Detalle de índices
SELECT 
    indexname AS "Índice",
    indexdef AS "Definición"
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'banner_images'
ORDER BY indexname;

\echo ''

-- ============================================================================
-- SECCIÓN 5: Verificar Políticas RLS (Row Level Security)
-- ============================================================================
\echo '5. POLÍTICAS RLS'
\echo '---------------'

DO $$
DECLARE
    rls_enabled BOOLEAN;
    policy_count INTEGER;
BEGIN
    -- Verificar si RLS está habilitado
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'banner_images'
      AND relnamespace = 'public'::regnamespace;
    
    IF rls_enabled THEN
        RAISE NOTICE '✅ RLS está habilitado en banner_images';
    ELSE
        RAISE WARNING '❌ RLS NO está habilitado';
        RAISE WARNING '→  Esto puede ser un problema de seguridad';
        RAISE WARNING '→  SOLUCIÓN: Ejecutar migración 20251123161800_ensure_banner_images_schema_cache.sql';
    END IF;
    
    -- Contar políticas
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'banner_images';
    
    RAISE NOTICE '✓ Número de políticas: %', policy_count;
    
    IF policy_count < 4 THEN
        RAISE WARNING '⚠️  Faltan políticas (esperadas: 4)';
        RAISE WARNING '→  SELECT, INSERT, UPDATE, DELETE';
        RAISE WARNING '→  SOLUCIÓN: Ejecutar migración 20251123161800_ensure_banner_images_schema_cache.sql';
    END IF;
END $$;

-- Detalle de políticas
SELECT 
    policyname AS "Política",
    cmd AS "Operación",
    qual AS "Condición",
    with_check AS "Verificación"
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'banner_images'
ORDER BY cmd;

\echo ''

-- ============================================================================
-- SECCIÓN 6: Verificar Triggers
-- ============================================================================
\echo '6. TRIGGERS'
\echo '----------'

DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'banner_images';
    
    RAISE NOTICE '✓ Número de triggers: %', trigger_count;
    
    IF trigger_count = 0 THEN
        RAISE WARNING '⚠️  No hay triggers configurados';
        RAISE WARNING '→  El campo updated_at no se actualizará automáticamente';
        RAISE WARNING '→  SOLUCIÓN: Ejecutar migración 20251123161800_ensure_banner_images_schema_cache.sql';
    END IF;
END $$;

-- Detalle de triggers
SELECT 
    trigger_name AS "Trigger",
    event_manipulation AS "Evento",
    action_statement AS "Acción"
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'banner_images';

\echo ''

-- ============================================================================
-- SECCIÓN 7: Contar registros en las tablas
-- ============================================================================
\echo '7. CONTENIDO DE LAS TABLAS'
\echo '-------------------------'

DO $$
DECLARE
    banners_count INTEGER := 0;
    images_count INTEGER := 0;
    homepage_exists BOOLEAN;
    images_exists BOOLEAN;
BEGIN
    -- Verificar existencia de tablas
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'homepage_banners'
    ) INTO homepage_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'banner_images'
    ) INTO images_exists;
    
    -- Contar registros solo si las tablas existen
    IF homepage_exists THEN
        EXECUTE 'SELECT COUNT(*) FROM public.homepage_banners' INTO banners_count;
        RAISE NOTICE '✓ Banners en homepage_banners: %', banners_count;
    ELSE
        RAISE WARNING '⚠️  Tabla homepage_banners no existe';
    END IF;
    
    IF images_exists THEN
        EXECUTE 'SELECT COUNT(*) FROM public.banner_images' INTO images_count;
        RAISE NOTICE '✓ Imágenes en banner_images: %', images_count;
    ELSE
        RAISE WARNING '⚠️  Tabla banner_images no existe';
    END IF;
END $$;

\echo ''

-- ============================================================================
-- SECCIÓN 8: Verificar función has_role (necesaria para RLS)
-- ============================================================================
\echo '8. FUNCIÓN has_role'
\echo '------------------'

DO $$
DECLARE
    function_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname = 'has_role'
    ) INTO function_exists;
    
    IF function_exists THEN
        RAISE NOTICE '✅ Función public.has_role() existe';
        RAISE NOTICE '→  Las políticas RLS pueden verificar roles de administrador';
    ELSE
        RAISE WARNING '❌ Función public.has_role() NO existe';
        RAISE WARNING '→  Las políticas RLS no funcionarán correctamente';
        RAISE WARNING '→  SOLUCIÓN: Verificar migración principal del sistema';
    END IF;
END $$;

\echo ''

-- ============================================================================
-- SECCIÓN 9: Resumen y Recomendaciones
-- ============================================================================
\echo '9. RESUMEN Y RECOMENDACIONES'
\echo '----------------------------'

DO $$
DECLARE
    banner_images_exists BOOLEAN;
    fk_correct BOOLEAN;
    rls_enabled BOOLEAN;
    policies_ok BOOLEAN;
    has_role_exists BOOLEAN;
    all_ok BOOLEAN := TRUE;
BEGIN
    -- Verificar cada aspecto
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'banner_images'
    ) INTO banner_images_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'banner_images'
          AND constraint_name = 'banner_images_banner_id_fkey'
    ) INTO fk_correct;
    
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'banner_images'
      AND relnamespace = 'public'::regnamespace;
    
    SELECT COUNT(*) >= 4 INTO policies_ok
    FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'banner_images';
    
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'has_role'
    ) INTO has_role_exists;
    
    -- Evaluar estado general
    all_ok := banner_images_exists AND fk_correct AND rls_enabled AND policies_ok AND has_role_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    IF all_ok THEN
        RAISE NOTICE '✅ ESTADO: SISTEMA CONFIGURADO CORRECTAMENTE';
        RAISE NOTICE '';
        RAISE NOTICE 'El sistema de banners con múltiples imágenes está listo para usar.';
        RAISE NOTICE '';
        RAISE NOTICE 'Próximos pasos:';
        RAISE NOTICE '1. Probar crear un banner con carrusel desde el panel admin';
        RAISE NOTICE '2. Si hay errores, ejecutar: NOTIFY pgrst, ''reload schema'';';
        RAISE NOTICE '3. Si persiste, reiniciar API desde Supabase Dashboard';
    ELSE
        RAISE WARNING '❌ ESTADO: CONFIGURACIÓN INCOMPLETA';
        RAISE WARNING '';
        RAISE WARNING 'Problemas detectados:';
        
        IF NOT banner_images_exists THEN
            RAISE WARNING '  ❌ Tabla banner_images no existe';
        END IF;
        
        IF NOT fk_correct THEN
            RAISE WARNING '  ❌ Foreign key constraint incorrecta o faltante';
        END IF;
        
        IF NOT rls_enabled THEN
            RAISE WARNING '  ❌ RLS no está habilitado';
        END IF;
        
        IF NOT policies_ok THEN
            RAISE WARNING '  ❌ Faltan políticas RLS';
        END IF;
        
        IF NOT has_role_exists THEN
            RAISE WARNING '  ❌ Función has_role no existe';
        END IF;
        
        RAISE WARNING '';
        RAISE WARNING '→  SOLUCIÓN RECOMENDADA:';
        RAISE WARNING '   Ejecutar migración completa:';
        RAISE WARNING '   supabase/migrations/20251123161800_ensure_banner_images_schema_cache.sql';
    END IF;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

\echo ''
\echo '============================================================================'
\echo 'FIN DEL DIAGNÓSTICO'
\echo '============================================================================'
\echo ''
\echo 'Para más información, consultar:'
\echo '  - GUIA_APLICACION_MIGRACION_BANNER_IMAGES.md'
\echo '  - INFORME_FINAL_SOLUCION_BANNERS.md'
\echo '  - AUDITORIA_SISTEMA_BANNERS_COMPLETA.md'
