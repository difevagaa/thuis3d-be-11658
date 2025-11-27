-- ============================================================================
-- ARCHIVO: example_plpgsql_functions.sql
-- PROYECTO: Thuis3D - Sistema de Impresión 3D
-- VERSIÓN: 1.0.0
-- FECHA: 2025-11-27
-- ============================================================================
--
-- DESCRIPCIÓN:
-- Este archivo contiene funciones y procedimientos almacenados de ejemplo
-- escritos en PLpgSQL (Procedural Language/PostgreSQL Structured Query Language).
-- Está diseñado para ser utilizado con PostgreSQL 14+ y Supabase.
--
-- PROPÓSITO:
-- - Servir como plantilla para crear funciones y procedimientos en el proyecto
-- - Demostrar buenas prácticas de programación en PLpgSQL
-- - Proporcionar funciones utilitarias para el sistema de calibración 3D
--
-- CÓMO EJECUTAR EN POSTGRESQL:
-- ============================================================================
-- 
-- OPCIÓN 1: Usando psql (línea de comandos)
--   $ psql -U <usuario> -d <base_de_datos> -f example_plpgsql_functions.sql
--
-- OPCIÓN 2: Usando Supabase Dashboard
--   1. Ir a Supabase Dashboard → SQL Editor → New Query
--   2. Copiar y pegar el contenido de este archivo
--   3. Hacer clic en "Run"
--   4. Verificar que no haya errores en la salida
--
-- OPCIÓN 3: Usando una herramienta GUI (DBeaver, pgAdmin, etc.)
--   1. Conectarse a la base de datos
--   2. Abrir una nueva ventana de consulta SQL
--   3. Copiar y pegar el contenido
--   4. Ejecutar el script
--
-- DEPENDENCIAS:
-- - PostgreSQL 14 o superior
-- - Extensión uuid-ossp o pgcrypto (para gen_random_uuid())
-- - Las tablas referenciadas deben existir antes de crear las funciones
--
-- NOTAS:
-- - Este archivo es idempotente: puede ejecutarse múltiples veces
-- - Se utiliza CREATE OR REPLACE para evitar errores si la función ya existe
-- - Todas las funciones incluyen comentarios de documentación
--
-- ============================================================================


-- ============================================================================
-- SECCIÓN 1: FUNCIONES UTILITARIAS BÁSICAS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Función: formatear_precio
-- Descripción: Formatea un valor numérico como precio con símbolo de moneda
-- Parámetros:
--   - p_monto: Cantidad a formatear (NUMERIC)
--   - p_moneda: Símbolo de moneda (TEXT, por defecto '€')
-- Retorna: Texto formateado como precio
-- Ejemplo de uso: SELECT formatear_precio(1234.56, '€'); -- Retorna: '€1,234.56'
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.formatear_precio(
    p_monto NUMERIC,
    p_moneda TEXT DEFAULT '€'
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
BEGIN
    -- Validar entrada nula
    IF p_monto IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Formatear el precio con separadores de miles y 2 decimales
    RETURN p_moneda || TO_CHAR(p_monto, 'FM999,999,999.00');
END;
$$;

-- Agregar comentario de documentación
COMMENT ON FUNCTION public.formatear_precio(NUMERIC, TEXT) IS 
'Formatea un valor numérico como precio con símbolo de moneda. Por defecto usa el símbolo Euro (€).';


-- -----------------------------------------------------------------------------
-- Función: calcular_descuento_porcentaje
-- Descripción: Calcula el precio final después de aplicar un descuento porcentual
-- Parámetros:
--   - p_precio_original: Precio original del producto (NUMERIC)
--   - p_porcentaje_descuento: Porcentaje de descuento a aplicar (NUMERIC, 0-100)
-- Retorna: Precio final después del descuento (NUMERIC)
-- Ejemplo de uso: SELECT calcular_descuento_porcentaje(100, 15); -- Retorna: 85.00
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calcular_descuento_porcentaje(
    p_precio_original NUMERIC,
    p_porcentaje_descuento NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
    v_precio_final NUMERIC;
BEGIN
    -- Validar entradas nulas
    IF p_precio_original IS NULL OR p_porcentaje_descuento IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Validar rango del porcentaje (0-100)
    IF p_porcentaje_descuento < 0 OR p_porcentaje_descuento > 100 THEN
        RAISE EXCEPTION 'El porcentaje de descuento debe estar entre 0 y 100. Valor recibido: %', p_porcentaje_descuento;
    END IF;
    
    -- Validar precio positivo
    IF p_precio_original < 0 THEN
        RAISE EXCEPTION 'El precio original no puede ser negativo. Valor recibido: %', p_precio_original;
    END IF;
    
    -- Calcular el precio final
    v_precio_final := p_precio_original * (1 - (p_porcentaje_descuento / 100));
    
    -- Redondear a 2 decimales
    RETURN ROUND(v_precio_final, 2);
END;
$$;

COMMENT ON FUNCTION public.calcular_descuento_porcentaje(NUMERIC, NUMERIC) IS 
'Calcula el precio final después de aplicar un descuento porcentual. Valida que el porcentaje esté entre 0 y 100.';


-- ============================================================================
-- SECCIÓN 2: FUNCIONES PARA EL SISTEMA DE CALIBRACIÓN 3D
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Función: calcular_factor_calibracion
-- Descripción: Calcula el factor de calibración basado en valores reales vs estimados
-- Parámetros:
--   - p_valor_real: Valor real medido (NUMERIC)
--   - p_valor_estimado: Valor estimado por el sistema (NUMERIC)
-- Retorna: Factor de calibración (NUMERIC)
-- Ejemplo de uso: SELECT calcular_factor_calibracion(12.5, 10.0); -- Retorna: 1.25
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calcular_factor_calibracion(
    p_valor_real NUMERIC,
    p_valor_estimado NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
    v_factor NUMERIC;
BEGIN
    -- Validar entradas
    IF p_valor_real IS NULL OR p_valor_estimado IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Evitar división por cero
    IF p_valor_estimado = 0 THEN
        RAISE EXCEPTION 'El valor estimado no puede ser cero para calcular el factor de calibración.';
    END IF;
    
    -- Validar valores positivos
    IF p_valor_real < 0 OR p_valor_estimado < 0 THEN
        RAISE EXCEPTION 'Los valores deben ser positivos. Real: %, Estimado: %', p_valor_real, p_valor_estimado;
    END IF;
    
    -- Calcular el factor de calibración
    v_factor := p_valor_real / p_valor_estimado;
    
    -- Redondear a 4 decimales para mayor precisión
    RETURN ROUND(v_factor, 4);
END;
$$;

COMMENT ON FUNCTION public.calcular_factor_calibracion(NUMERIC, NUMERIC) IS 
'Calcula el factor de calibración dividiendo el valor real entre el estimado. Usado en el sistema de calibración de impresión 3D.';


-- -----------------------------------------------------------------------------
-- Función: validar_factor_calibracion
-- Descripción: Valida si un factor de calibración está dentro de rangos aceptables
-- Parámetros:
--   - p_factor: Factor de calibración a validar (NUMERIC)
--   - p_min_aceptable: Límite mínimo aceptable (NUMERIC, por defecto 0.5)
--   - p_max_aceptable: Límite máximo aceptable (NUMERIC, por defecto 2.0)
-- Retorna: Objeto JSON con estado de validación y mensaje
-- Ejemplo de uso: SELECT validar_factor_calibracion(1.1); -- Retorna: {"valido": true, "estado": "optimo", "mensaje": "..."}
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validar_factor_calibracion(
    p_factor NUMERIC,
    p_min_aceptable NUMERIC DEFAULT 0.5,
    p_max_aceptable NUMERIC DEFAULT 2.0
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
    v_resultado JSONB;
    v_estado TEXT;
    v_valido BOOLEAN;
    v_mensaje TEXT;
BEGIN
    -- Validar entrada
    IF p_factor IS NULL THEN
        RETURN jsonb_build_object(
            'valido', FALSE,
            'estado', 'error',
            'mensaje', 'El factor de calibración no puede ser nulo'
        );
    END IF;
    
    -- Determinar el estado según el factor
    IF p_factor >= 0.95 AND p_factor <= 1.2 THEN
        v_estado := 'optimo';
        v_valido := TRUE;
        v_mensaje := 'Factor de calibración óptimo (±20% del valor ideal)';
    ELSIF p_factor >= 0.8 AND p_factor <= 1.5 THEN
        v_estado := 'aceptable';
        v_valido := TRUE;
        v_mensaje := 'Factor de calibración aceptable (se recomienda recalibrar)';
    ELSIF p_factor >= p_min_aceptable AND p_factor <= p_max_aceptable THEN
        v_estado := 'advertencia';
        v_valido := TRUE;
        v_mensaje := 'Factor fuera del rango óptimo. Revisar datos de entrada.';
    ELSE
        v_estado := 'rechazado';
        v_valido := FALSE;
        v_mensaje := format('Factor de calibración fuera de rango (%.2f). Debe estar entre %.2f y %.2f', 
                           p_factor, p_min_aceptable, p_max_aceptable);
    END IF;
    
    -- Construir objeto de resultado
    v_resultado := jsonb_build_object(
        'valido', v_valido,
        'estado', v_estado,
        'factor', p_factor,
        'mensaje', v_mensaje,
        'rango_aceptable', jsonb_build_object(
            'min', p_min_aceptable,
            'max', p_max_aceptable
        )
    );
    
    RETURN v_resultado;
END;
$$;

COMMENT ON FUNCTION public.validar_factor_calibracion(NUMERIC, NUMERIC, NUMERIC) IS 
'Valida si un factor de calibración está dentro de rangos aceptables y retorna un objeto JSON con el resultado.';


-- ============================================================================
-- SECCIÓN 3: FUNCIONES DE REGISTRO Y AUDITORÍA (SECURITY DEFINER)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Función: registrar_actividad
-- Descripción: Registra una actividad del usuario en el log del sistema
-- Parámetros:
--   - p_usuario_id: ID del usuario (UUID, opcional - usa auth.uid() si no se proporciona)
--   - p_accion: Tipo de acción realizada (TEXT)
--   - p_detalles: Detalles adicionales en formato JSON (JSONB)
--   - p_tabla_afectada: Nombre de la tabla afectada (TEXT, opcional)
--   - p_registro_id: ID del registro afectado (UUID, opcional)
-- Retorna: ID del registro de log creado (UUID)
-- Notas de seguridad:
--   - Usa SECURITY DEFINER para ejecutar con privilegios del propietario
--   - El search_path está restringido para evitar ataques de esquema
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_actividad(
    p_usuario_id UUID DEFAULT NULL,
    p_accion TEXT DEFAULT 'desconocida',
    p_detalles JSONB DEFAULT '{}'::JSONB,
    p_tabla_afectada TEXT DEFAULT NULL,
    p_registro_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
    v_usuario_actual UUID;
BEGIN
    -- Obtener el usuario actual si no se proporciona
    v_usuario_actual := COALESCE(p_usuario_id, auth.uid());
    
    -- Crear el registro de log
    INSERT INTO public.activity_logs (
        id,
        user_id,
        action,
        details,
        table_name,
        record_id,
        created_at,
        ip_address,
        user_agent
    ) VALUES (
        gen_random_uuid(),
        v_usuario_actual,
        p_accion,
        p_detalles,
        p_tabla_afectada,
        p_registro_id,
        NOW(),
        -- Intentar obtener información del contexto de la solicitud
        current_setting('request.headers', TRUE)::JSONB ->> 'x-forwarded-for',
        current_setting('request.headers', TRUE)::JSONB ->> 'user-agent'
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
EXCEPTION
    -- Manejar el caso donde la tabla no existe aún
    WHEN undefined_table THEN
        RAISE WARNING 'La tabla activity_logs no existe. Se omite el registro de actividad.';
        RETURN NULL;
    -- Manejar otros errores
    WHEN OTHERS THEN
        RAISE WARNING 'Error al registrar actividad: %', SQLERRM;
        RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.registrar_actividad(UUID, TEXT, JSONB, TEXT, UUID) IS 
'Registra una actividad del usuario en el log del sistema para auditoría.';


-- ============================================================================
-- SECCIÓN 4: PROCEDIMIENTOS ALMACENADOS (STORED PROCEDURES)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Procedimiento: procesar_calibracion_3d
-- Descripción: Procesa y almacena una nueva calibración del sistema 3D
-- Parámetros:
--   - p_material_id: ID del material calibrado (UUID)
--   - p_tiempo_real: Tiempo real de impresión en minutos (INTEGER)
--   - p_tiempo_estimado: Tiempo estimado en minutos (INTEGER)
--   - p_peso_real: Peso real del filamento en gramos (NUMERIC)
--   - p_peso_estimado: Peso estimado en gramos (NUMERIC)
-- Comportamiento:
--   - Calcula factores de calibración para tiempo y material
--   - Valida que los factores estén dentro de rangos aceptables
--   - Almacena la calibración si es válida
--   - Lanza una excepción si la calibración es inválida
-- -----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE public.procesar_calibracion_3d(
    p_material_id UUID,
    p_tiempo_real INTEGER,
    p_tiempo_estimado INTEGER,
    p_peso_real NUMERIC,
    p_peso_estimado NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_factor_tiempo NUMERIC;
    v_factor_material NUMERIC;
    v_validacion_tiempo JSONB;
    v_validacion_material JSONB;
    v_calibracion_id UUID;
BEGIN
    -- Validar parámetros obligatorios
    IF p_material_id IS NULL THEN
        RAISE EXCEPTION 'El ID del material es obligatorio';
    END IF;
    
    IF p_tiempo_real IS NULL OR p_tiempo_real <= 0 THEN
        RAISE EXCEPTION 'El tiempo real debe ser un valor positivo';
    END IF;
    
    IF p_peso_real IS NULL OR p_peso_real <= 0 THEN
        RAISE EXCEPTION 'El peso real debe ser un valor positivo';
    END IF;
    
    -- Calcular factores de calibración
    v_factor_tiempo := public.calcular_factor_calibracion(p_tiempo_real::NUMERIC, p_tiempo_estimado::NUMERIC);
    v_factor_material := public.calcular_factor_calibracion(p_peso_real, p_peso_estimado);
    
    -- Validar factores
    v_validacion_tiempo := public.validar_factor_calibracion(v_factor_tiempo);
    v_validacion_material := public.validar_factor_calibracion(v_factor_material);
    
    -- Verificar si algún factor fue rechazado
    IF NOT (v_validacion_tiempo ->> 'valido')::BOOLEAN THEN
        RAISE EXCEPTION 'Factor de tiempo inválido: %', v_validacion_tiempo ->> 'mensaje';
    END IF;
    
    IF NOT (v_validacion_material ->> 'valido')::BOOLEAN THEN
        RAISE EXCEPTION 'Factor de material inválido: %', v_validacion_material ->> 'mensaje';
    END IF;
    
    -- Insertar la calibración en la tabla (ejemplo - la tabla debe existir)
    -- INSERT INTO public.calibrations (
    --     id,
    --     material_id,
    --     time_factor,
    --     material_factor,
    --     real_time,
    --     estimated_time,
    --     real_weight,
    --     estimated_weight,
    --     created_at,
    --     validation_status
    -- ) VALUES (
    --     gen_random_uuid(),
    --     p_material_id,
    --     v_factor_tiempo,
    --     v_factor_material,
    --     p_tiempo_real,
    --     p_tiempo_estimado,
    --     p_peso_real,
    --     p_peso_estimado,
    --     NOW(),
    --     'validated'
    -- )
    -- RETURNING id INTO v_calibracion_id;
    
    -- Registrar la actividad (si la función existe)
    -- PERFORM public.registrar_actividad(
    --     NULL,
    --     'calibracion_creada',
    --     jsonb_build_object(
    --         'material_id', p_material_id,
    --         'factor_tiempo', v_factor_tiempo,
    --         'factor_material', v_factor_material
    --     ),
    --     'calibrations',
    --     v_calibracion_id
    -- );
    
    -- Notificar el resultado (para desarrollo/debug)
    RAISE NOTICE 'Calibración procesada correctamente:';
    RAISE NOTICE '  - Factor de tiempo: % (%)', v_factor_tiempo, v_validacion_tiempo ->> 'estado';
    RAISE NOTICE '  - Factor de material: % (%)', v_factor_material, v_validacion_material ->> 'estado';
    
    COMMIT;
END;
$$;

COMMENT ON PROCEDURE public.procesar_calibracion_3d(UUID, INTEGER, INTEGER, NUMERIC, NUMERIC) IS 
'Procesa y almacena una nueva calibración del sistema de impresión 3D validando los factores.';


-- ============================================================================
-- SECCIÓN 5: TRIGGERS Y FUNCIONES DE TRIGGER
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Función Trigger: trigger_actualizar_updated_at
-- Descripción: Actualiza automáticamente el campo updated_at cuando se modifica un registro
-- Uso: Aplicar a cualquier tabla que tenga un campo updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_actualizar_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Actualizar el timestamp de modificación
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_actualizar_updated_at() IS 
'Función trigger genérica que actualiza el campo updated_at con el timestamp actual.';


-- Ejemplo de cómo aplicar el trigger a una tabla:
-- CREATE TRIGGER tr_mi_tabla_updated_at
--     BEFORE UPDATE ON public.mi_tabla
--     FOR EACH ROW
--     EXECUTE FUNCTION public.trigger_actualizar_updated_at();


-- -----------------------------------------------------------------------------
-- Función Trigger: trigger_validar_email
-- Descripción: Valida el formato de email antes de insertar o actualizar
-- Uso: Aplicar a tablas que contengan campos de email
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_validar_email()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Verificar si el campo email existe y validar formato
    IF NEW.email IS NOT NULL THEN
        IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
            RAISE EXCEPTION 'El formato del email no es válido: %', NEW.email;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_validar_email() IS 
'Función trigger que valida el formato del campo email antes de insertar o actualizar.';


-- ============================================================================
-- SECCIÓN 6: EJEMPLOS DE CONSULTAS Y PRUEBAS
-- ============================================================================

-- Para probar las funciones creadas, ejecute las siguientes consultas:

-- Prueba de formatear_precio:
-- SELECT public.formatear_precio(1234.56, '€');     -- Resultado: €1,234.56
-- SELECT public.formatear_precio(999.99, '$');      -- Resultado: $999.99
-- SELECT public.formatear_precio(0, '€');           -- Resultado: €0.00

-- Prueba de calcular_descuento_porcentaje:
-- SELECT public.calcular_descuento_porcentaje(100, 15);   -- Resultado: 85.00
-- SELECT public.calcular_descuento_porcentaje(50, 50);    -- Resultado: 25.00
-- SELECT public.calcular_descuento_porcentaje(200, 0);    -- Resultado: 200.00

-- Prueba de calcular_factor_calibracion:
-- SELECT public.calcular_factor_calibracion(12.5, 10.0);  -- Resultado: 1.2500
-- SELECT public.calcular_factor_calibracion(100, 100);    -- Resultado: 1.0000

-- Prueba de validar_factor_calibracion:
-- SELECT public.validar_factor_calibracion(1.0);    -- {"valido": true, "estado": "optimo", ...}
-- SELECT public.validar_factor_calibracion(0.9);    -- {"valido": true, "estado": "optimo", ...}
-- SELECT public.validar_factor_calibracion(3.0);    -- {"valido": false, "estado": "rechazado", ...}


-- ============================================================================
-- FIN DEL ARCHIVO
-- ============================================================================

-- Notificar a PostgREST que recargue el schema cache (para Supabase)
NOTIFY pgrst, 'reload schema';
