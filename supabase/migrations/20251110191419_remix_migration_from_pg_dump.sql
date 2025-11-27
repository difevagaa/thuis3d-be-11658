--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'client',
    'moderator'
);


--
-- Name: activate_gift_card_on_payment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.activate_gift_card_on_payment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  gift_card_code TEXT;
BEGIN
  -- Solo proceder si el pago cambió a 'paid' y las notas contienen 'Tarjeta Regalo:'
  IF NEW.payment_status = 'paid' 
     AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid')
     AND NEW.notes IS NOT NULL 
     AND NEW.notes LIKE '%Tarjeta Regalo:%' THEN
    
    -- Extraer el código de la tarjeta de las notas
    gift_card_code := substring(NEW.notes FROM 'Tarjeta Regalo: ([A-Z0-9-]+)');
    
    IF gift_card_code IS NOT NULL THEN
      -- Activar la tarjeta de regalo
      UPDATE gift_cards
      SET is_active = true
      WHERE code = gift_card_code AND is_active = false;
      
      -- Registrar en logs
      RAISE NOTICE 'Gift card % activated for order %', gift_card_code, NEW.order_number;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: adjust_loyalty_points_manual(uuid, integer, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.adjust_loyalty_points_manual(p_user_id uuid, p_points_change integer, p_reason text, p_admin_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_current_balance integer;
BEGIN
  -- Obtener balance actual
  SELECT COALESCE(points_balance, 0) INTO v_current_balance
  FROM loyalty_points WHERE user_id = p_user_id;
  
  -- No permitir que el balance sea negativo
  IF v_current_balance + p_points_change < 0 THEN
    RAISE EXCEPTION 'No se puede restar más puntos de los disponibles';
  END IF;
  
  -- Actualizar puntos
  INSERT INTO loyalty_points (user_id, points_balance, lifetime_points)
  VALUES (p_user_id, p_points_change, GREATEST(0, p_points_change))
  ON CONFLICT (user_id) DO UPDATE SET
    points_balance = loyalty_points.points_balance + p_points_change,
    lifetime_points = CASE 
      WHEN p_points_change > 0 THEN loyalty_points.lifetime_points + p_points_change
      ELSE loyalty_points.lifetime_points
    END,
    updated_at = NOW();
  
  -- Registrar ajuste para auditoría
  INSERT INTO loyalty_adjustments (user_id, points_change, reason, admin_id)
  VALUES (p_user_id, p_points_change, p_reason, p_admin_id);
  
  RAISE NOTICE '✏️ [LOYALTY] Ajuste manual: % puntos para usuario %', p_points_change, p_user_id;
END;
$$;


--
-- Name: auto_generate_invoice_from_quote(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_generate_invoice_from_quote() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_status_name TEXT;
  v_invoice_number TEXT;
  v_tax_rate NUMERIC := 0;
  v_tax_enabled BOOLEAN := false;
  v_subtotal NUMERIC;
  v_tax NUMERIC;
  v_shipping NUMERIC := 0;
  v_total NUMERIC;
  v_invoice_id UUID;
  v_stl_file_name TEXT := 'Archivo STL';
BEGIN
  -- Solo ejecutar en UPDATE y si el status_id cambió
  IF TG_OP = 'UPDATE' AND OLD.status_id IS DISTINCT FROM NEW.status_id THEN
    
    -- Obtener el nombre del nuevo estado
    SELECT name INTO v_status_name
    FROM quote_statuses
    WHERE id = NEW.status_id;
    
    RAISE NOTICE '🔍 [AUTO INVOICE] Cambio de estado detectado: "%"', v_status_name;
    
    -- ✅ CORREGIDO: Usar "Aprobada" (con 'a') y "Completada" que son los estados reales
    IF v_status_name IN ('Aprobada', 'Completada', 'Approved', 'Completed') THEN
      
      RAISE NOTICE '🔔 [AUTO INVOICE] Estado "%"  - Iniciando generación de factura...', v_status_name;
      
      -- Verificar si ya existe una factura para esta cotización
      IF EXISTS (SELECT 1 FROM invoices WHERE quote_id = NEW.id) THEN
        RAISE NOTICE '⚠️ [AUTO INVOICE] Ya existe una factura para la cotización %', NEW.id;
        RETURN NEW;
      END IF;
      
      -- Verificar que hay un precio estimado válido
      IF NEW.estimated_price IS NULL OR NEW.estimated_price <= 0 THEN
        RAISE WARNING '⚠️ [AUTO INVOICE] No se puede generar factura: precio estimado no válido (%.2f)', COALESCE(NEW.estimated_price, 0);
        RETURN NEW;
      END IF;
      
      -- ✅ CORREGIDO: Obtener configuración de IVA de la tabla que ahora existe
      SELECT tax_rate, is_enabled INTO v_tax_rate, v_tax_enabled
      FROM tax_settings
      LIMIT 1;
      
      -- Si no hay configuración, usar valores por defecto
      IF NOT FOUND THEN
        v_tax_rate := 21.0;
        v_tax_enabled := true;
        RAISE NOTICE '⚠️ [AUTO INVOICE] No se encontró configuración de IVA, usando valores por defecto (21%%)';
      END IF;
      
      -- Calcular valores
      v_subtotal := NEW.estimated_price;
      v_tax := CASE WHEN v_tax_enabled THEN ROUND((v_subtotal * v_tax_rate) / 100, 2) ELSE 0 END;
      
      -- ✅ MEJORADO: Manejar shipping_cost NULL correctamente
      v_shipping := COALESCE(NEW.shipping_cost, 0);
      
      v_total := ROUND(v_subtotal + v_tax + v_shipping, 2);
      
      RAISE NOTICE '💰 [AUTO INVOICE] Cálculos: Subtotal=%.2f, IVA=%.2f (%%%), Envío=%.2f, Total=%.2f',
        v_subtotal, v_tax, v_tax_rate, v_shipping, v_total;
      
      -- Generar número de factura
      SELECT generate_next_invoice_number() INTO v_invoice_number;
      
      -- Extraer nombre del archivo STL si existe
      IF NEW.file_storage_path IS NOT NULL AND NEW.file_storage_path != '' THEN
        -- Eliminar timestamp del inicio del nombre del archivo
        v_stl_file_name := regexp_replace(NEW.file_storage_path, '^[0-9]+_', '');
        RAISE NOTICE '📄 [AUTO INVOICE] Nombre del archivo: %', v_stl_file_name;
      END IF;
      
      -- Crear factura
      INSERT INTO invoices (
        invoice_number,
        quote_id,
        user_id,
        issue_date,
        due_date,
        payment_status,
        subtotal,
        tax,
        shipping,
        discount,
        total,
        notes
      ) VALUES (
        v_invoice_number,
        NEW.id,
        NEW.user_id,
        NOW(),
        NOW() + INTERVAL '30 days',
        'pending',
        v_subtotal,
        v_tax,
        v_shipping,
        0,
        v_total,
        'Factura generada automáticamente para cotización ' || NEW.quote_type || 
        CASE WHEN NEW.description IS NOT NULL THEN ' - ' || NEW.description ELSE '' END
      )
      RETURNING id INTO v_invoice_id;
      
      RAISE NOTICE '✅ [AUTO INVOICE] Factura creada: % (ID: %)', v_invoice_number, v_invoice_id;
      
      -- Crear item de factura con el nombre del archivo STL
      INSERT INTO invoice_items (
        invoice_id,
        product_name,
        description,
        quantity,
        unit_price,
        total_price,
        tax_enabled
      ) VALUES (
        v_invoice_id,
        v_stl_file_name,
        COALESCE(NEW.description, 'Servicio de impresión 3D') || 
        CASE 
          WHEN NEW.material_id IS NOT NULL THEN 
            ' - Material: ' || (SELECT name FROM materials WHERE id = NEW.material_id LIMIT 1)
          ELSE ''
        END,
        COALESCE(NEW.quantity, 1),
        v_subtotal,
        v_subtotal,
        v_tax_enabled
      );
      
      RAISE NOTICE '✅ [AUTO INVOICE] Item agregado: % (cantidad: %)', v_stl_file_name, COALESCE(NEW.quantity, 1);
      
      -- Crear notificación para el cliente
      IF NEW.user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, link, is_read)
        VALUES (
          NEW.user_id,
          'invoice',
          '📄 Nueva Factura Generada',
          'Tu cotización ha sido ' || LOWER(v_status_name) || '. Se ha generado la factura ' || 
          v_invoice_number || ' por €' || ROUND(v_total, 2) || '. Puedes proceder con el pago desde tu panel.',
          '/mi-cuenta',
          false
        );
        
        RAISE NOTICE '🔔 [AUTO INVOICE] Notificación creada para usuario %', NEW.user_id;
      END IF;
      
      RAISE NOTICE '✨ [AUTO INVOICE] Proceso completado exitosamente para cotización %', NEW.id;
      
    ELSE
      RAISE NOTICE '⏭️ [AUTO INVOICE] Estado "%" no requiere generación de factura', v_status_name;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ [AUTO INVOICE] Error inesperado: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;


--
-- Name: auto_generate_invoice_on_payment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_generate_invoice_on_payment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  invoice_exists BOOLEAN;
  new_invoice_id UUID;
  invoice_num TEXT;
  order_item RECORD;
BEGIN
  -- Solo proceder si el estado cambió a 'paid' y antes no lo era
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    
    -- Verificar si ya existe una factura para este pedido
    SELECT EXISTS(
      SELECT 1 FROM invoices WHERE order_id = NEW.id
    ) INTO invoice_exists;
    
    -- Si no existe factura, crearla
    IF NOT invoice_exists THEN
      -- Generar número de factura
      invoice_num := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
      
      -- Crear factura
      INSERT INTO invoices (
        invoice_number,
        user_id,
        order_id,
        subtotal,
        tax,
        discount,
        total,
        payment_method,
        payment_status,
        issue_date,
        due_date,
        notes
      ) VALUES (
        invoice_num,
        NEW.user_id,
        NEW.id,
        NEW.subtotal,
        NEW.tax,
        NEW.discount,
        NEW.total,
        NEW.payment_method,
        'paid',
        NOW(),
        NOW() + INTERVAL '30 days',
        'Factura generada automáticamente para el pedido ' || NEW.order_number
      )
      RETURNING id INTO new_invoice_id;
      
      -- Copiar items del pedido a la factura
      FOR order_item IN 
        SELECT * FROM order_items WHERE order_id = NEW.id
      LOOP
        INSERT INTO invoice_items (
          invoice_id,
          product_id,
          product_name,
          description,
          quantity,
          unit_price,
          total_price,
          tax_enabled
        ) VALUES (
          new_invoice_id,
          order_item.product_id,
          order_item.product_name,
          NULL,
          order_item.quantity,
          order_item.unit_price,
          order_item.total_price,
          TRUE
        );
      END LOOP;
      
      -- Notificar al cliente sobre la nueva factura
      IF NEW.user_id IS NOT NULL THEN
        PERFORM send_notification(
          NEW.user_id,
          'invoice',
          'Nueva Factura Disponible: ' || invoice_num,
          'Tu factura del pedido ' || NEW.order_number || ' ya está disponible',
          '/mi-cuenta?tab=invoices'
        );
      END IF;
      
      RAISE NOTICE 'Factura % generada automáticamente para pedido %', invoice_num, NEW.order_number;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: award_loyalty_points(uuid, numeric, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.award_loyalty_points(p_user_id uuid, p_order_amount numeric, p_order_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_points_per_dollar numeric;
  v_is_enabled boolean;
  v_points_to_add integer;
BEGIN
  -- Verificar si el sistema de lealtad está habilitado
  SELECT points_per_dollar, is_enabled 
  INTO v_points_per_dollar, v_is_enabled
  FROM loyalty_settings
  LIMIT 1;
  
  -- Si no está habilitado, salir
  IF NOT v_is_enabled THEN
    RETURN;
  END IF;
  
  -- Calcular puntos a otorgar
  v_points_to_add := FLOOR(p_order_amount * v_points_per_dollar);
  
  IF v_points_to_add <= 0 THEN
    RETURN;
  END IF;
  
  -- Insertar o actualizar puntos del usuario
  INSERT INTO loyalty_points (user_id, points_balance, lifetime_points)
  VALUES (p_user_id, v_points_to_add, v_points_to_add)
  ON CONFLICT (user_id) DO UPDATE SET
    points_balance = loyalty_points.points_balance + v_points_to_add,
    lifetime_points = loyalty_points.lifetime_points + v_points_to_add,
    updated_at = NOW();
  
  RAISE NOTICE '✅ [LOYALTY] Otorgados % puntos a usuario % por pedido %', 
    v_points_to_add, p_user_id, p_order_id;
END;
$$;


--
-- Name: calculate_backup_expiration(text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_backup_expiration(p_table_name text, p_estimated_size_mb numeric DEFAULT 0) RETURNS timestamp with time zone
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_retention_days INTEGER;
  v_large_file_days INTEGER;
  v_threshold_mb NUMERIC;
BEGIN
  SELECT 
    retention_days, 
    large_file_retention_days, 
    size_threshold_mb
  INTO 
    v_retention_days, 
    v_large_file_days, 
    v_threshold_mb
  FROM public.backup_retention_settings
  WHERE table_name = p_table_name;
  
  -- Si no hay configuración, usar valores por defecto
  IF NOT FOUND THEN
    v_retention_days := 180;
    v_large_file_days := 8;
    v_threshold_mb := 20;
  END IF;
  
  -- Si es archivo grande, usar retención corta
  IF p_estimated_size_mb > v_threshold_mb THEN
    RETURN NOW() + (v_large_file_days || ' days')::INTERVAL;
  ELSE
    RETURN NOW() + (v_retention_days || ' days')::INTERVAL;
  END IF;
END;
$$;


--
-- Name: check_rate_limit(uuid, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_rate_limit(p_user_id uuid, p_endpoint text, p_max_requests integer, p_window_minutes integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Lock and fetch rate limit record
  SELECT request_count, window_start INTO v_count, v_window_start
  FROM api_rate_limits
  WHERE user_id = p_user_id AND endpoint = p_endpoint
  FOR UPDATE;
  
  -- Reset if window expired or not found
  IF NOT FOUND OR v_window_start < NOW() - (p_window_minutes || ' minutes')::INTERVAL THEN
    INSERT INTO api_rate_limits (user_id, endpoint, request_count, window_start)
    VALUES (p_user_id, p_endpoint, 1, NOW())
    ON CONFLICT (user_id, endpoint) 
    DO UPDATE SET request_count = 1, window_start = NOW();
    RETURN TRUE;
  END IF;
  
  -- Check limit
  IF v_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  UPDATE api_rate_limits
  SET request_count = request_count + 1
  WHERE user_id = p_user_id AND endpoint = p_endpoint;
  
  RETURN TRUE;
END;
$$;


--
-- Name: cleanup_expired_backups(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_backups() RETURNS TABLE(deleted_count integer, table_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_record RECORD;
  v_deleted INTEGER := 0;
  v_total_deleted INTEGER := 0;
BEGIN
  -- Marcar metadatos como permanentemente eliminados
  UPDATE public.backup_metadata
  SET permanently_deleted_at = NOW()
  WHERE expiration_date < NOW() 
    AND permanently_deleted_at IS NULL
    AND restored_at IS NULL;
    
  GET DIAGNOSTICS v_total_deleted = ROW_COUNT;
  
  -- Para cada tabla, eliminar registros expirados
  FOR v_record IN 
    SELECT DISTINCT bm.table_name
    FROM public.backup_metadata bm
    WHERE bm.permanently_deleted_at = NOW()
  LOOP
    -- Ejecutar eliminación según la tabla
    EXECUTE format(
      'DELETE FROM %I WHERE id IN (
        SELECT record_id FROM public.backup_metadata 
        WHERE table_name = %L 
          AND permanently_deleted_at = NOW()
      )',
      v_record.table_name,
      v_record.table_name
    );
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    table_name := v_record.table_name;
    deleted_count := v_deleted;
    RETURN NEXT;
  END LOOP;
  
  RAISE NOTICE 'Limpieza automática completada: % registros marcados, % tablas procesadas', v_total_deleted, deleted_count;
END;
$$;


--
-- Name: cleanup_expired_checkout_sessions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_checkout_sessions() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.checkout_sessions
  WHERE expires_at < now();
END;
$$;


--
-- Name: cleanup_inactive_sessions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_inactive_sessions() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.visitor_sessions
  SET is_active = false
  WHERE last_seen_at < NOW() - INTERVAL '15 minutes'
    AND is_active = true;
END;
$$;


--
-- Name: cleanup_inactive_visitor_sessions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_inactive_visitor_sessions() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Marcar como inactivas las sesiones que no han tenido actividad en 15 minutos
  UPDATE public.visitor_sessions
  SET is_active = false
  WHERE is_active = true
    AND last_seen_at < NOW() - INTERVAL '15 minutes';
  
  -- Soft delete de sesiones muy antiguas (más de 90 días)
  UPDATE public.visitor_sessions
  SET deleted_at = NOW()
  WHERE deleted_at IS NULL
    AND created_at < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE '✅ [CLEANUP] Sesiones inactivas marcadas correctamente';
END;
$$;


--
-- Name: create_backup_metadata(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_backup_metadata() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_size_mb NUMERIC := 0;
  v_expiration TIMESTAMPTZ;
BEGIN
  -- Solo crear metadata si se está eliminando (deleted_at pasa de NULL a valor)
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    
    -- Estimar tamaño (puedes personalizar por tabla)
    -- Por ahora usamos 0, pero podrías calcular basado en campos específicos
    v_size_mb := 0;
    
    -- Calcular fecha de expiración
    v_expiration := public.calculate_backup_expiration(TG_TABLE_NAME, v_size_mb);
    
    -- Insertar metadata
    INSERT INTO public.backup_metadata (
      table_name,
      record_id,
      deleted_at,
      deleted_by,
      original_data,
      estimated_size_mb,
      expiration_date
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      NEW.deleted_at,
      auth.uid(),
      row_to_json(OLD)::JSONB,
      v_size_mb,
      v_expiration
    );
    
    RAISE NOTICE 'Backup metadata creado para %.% (expira: %)', TG_TABLE_NAME, NEW.id, v_expiration;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: detect_device_type(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.detect_device_type(user_agent text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  IF user_agent IS NULL THEN
    RETURN 'unknown';
  END IF;
  
  -- Móviles
  IF user_agent ~* 'Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini' THEN
    IF user_agent ~* 'iPad|Tablet' THEN
      RETURN 'tablet';
    ELSE
      RETURN 'mobile';
    END IF;
  END IF;
  
  -- Desktop por defecto
  RETURN 'desktop';
END;
$$;


--
-- Name: find_best_calibration_profile(uuid, text, text, boolean, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_best_calibration_profile(p_material_id uuid, p_geometry_class text, p_size_category text, p_supports_enabled boolean, p_layer_height numeric) RETURNS TABLE(profile_id uuid, time_factor numeric, material_factor numeric, confidence text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Intentar coincidencia exacta
  RETURN QUERY
  SELECT 
    id,
    time_adjustment_factor,
    material_adjustment_factor,
    'HIGH' AS confidence
  FROM public.calibration_profiles
  WHERE is_active = true
    AND material_id = p_material_id
    AND geometry_classification = p_geometry_class
    AND size_category = p_size_category
    AND supports_enabled = p_supports_enabled
    AND ABS(layer_height - p_layer_height) < 0.05
  ORDER BY sample_count DESC
  LIMIT 1;
  
  -- Si no hay coincidencia exacta, buscar sin altura de capa
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      id,
      time_adjustment_factor,
      material_adjustment_factor,
      'MEDIUM' AS confidence
    FROM public.calibration_profiles
    WHERE is_active = true
      AND material_id = p_material_id
      AND geometry_classification = p_geometry_class
      AND size_category = p_size_category
      AND supports_enabled = p_supports_enabled
    ORDER BY sample_count DESC
    LIMIT 1;
  END IF;
  
  -- Si aún no hay, buscar solo por material y geometría
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      id,
      time_adjustment_factor,
      material_adjustment_factor,
      'LOW' AS confidence
    FROM public.calibration_profiles
    WHERE is_active = true
      AND material_id = p_material_id
      AND geometry_classification = p_geometry_class
    ORDER BY sample_count DESC
    LIMIT 1;
  END IF;
  
  -- Fallback: perfil global del material
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      id,
      time_adjustment_factor,
      material_adjustment_factor,
      'FALLBACK' AS confidence
    FROM public.calibration_profiles
    WHERE is_active = true
      AND material_id = p_material_id
      AND geometry_classification IS NULL
      AND size_category IS NULL
    ORDER BY sample_count DESC
    LIMIT 1;
  END IF;
END;
$$;


--
-- Name: generate_gift_card_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_gift_card_code() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := CONCAT(
      substring(md5(random()::text) from 1 for 4), '-',
      substring(md5(random()::text) from 1 for 4), '-',
      substring(md5(random()::text) from 1 for 4), '-',
      substring(md5(random()::text) from 1 for 4)
    );
    
    SELECT EXISTS(SELECT 1 FROM gift_cards WHERE gift_cards.code = code) INTO exists_check;
    
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN UPPER(code);
END;
$$;


--
-- Name: generate_invoice_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_invoice_number() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_number TEXT;
BEGIN
  new_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN new_number;
END;
$$;


--
-- Name: generate_next_invoice_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_next_invoice_number() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  next_number integer;
  new_invoice_number text;
BEGIN
  -- Obtener el último número de factura
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 
    0
  ) + 1 INTO next_number
  FROM invoices
  WHERE invoice_number ~ '^INV-[0-9]+$';
  
  -- Formatear el número de factura con ceros a la izquierda
  new_invoice_number := 'INV-' || LPAD(next_number::text, 6, '0');
  
  RETURN new_invoice_number;
END;
$_$;


--
-- Name: generate_order_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_order_number() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_number TEXT;
  letter1 CHAR(1);
  letter2 CHAR(1);
  letter3 CHAR(1);
  num1 INT;
  num2 INT;
  num3 INT;
  num4 INT;
BEGIN
  -- Generar 3 letras aleatorias (A-Z)
  letter1 := chr(65 + floor(random() * 26)::int);
  letter2 := chr(65 + floor(random() * 26)::int);
  letter3 := chr(65 + floor(random() * 26)::int);
  
  -- Generar 4 números aleatorios (0-9)
  num1 := floor(random() * 10)::int;
  num2 := floor(random() * 10)::int;
  num3 := floor(random() * 10)::int;
  num4 := floor(random() * 10)::int;
  
  -- Formato entremezclado: L1-N1N2-L2N3-L3N4
  -- Ejemplo: A-12-B3-C4
  new_number := letter1 || num1 || num2 || letter2 || num3 || letter3 || num4;
  
  RETURN new_number;
END;
$$;


--
-- Name: handle_invoice_loyalty_points(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_invoice_loyalty_points() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Solo procesar si hay un usuario asociado y NO está vinculada a un pedido
  -- (para evitar duplicar puntos de pedidos que ya tienen factura)
  IF NEW.user_id IS NULL OR NEW.order_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- CASO 1: INSERT - Factura nueva marcada como pagada
  IF TG_OP = 'INSERT' AND NEW.payment_status = 'paid' THEN
    PERFORM award_loyalty_points(NEW.user_id, NEW.total, NEW.id);
    RETURN NEW;
  END IF;
  
  -- CASO 2: UPDATE - Cambio de estado de pago
  IF TG_OP = 'UPDATE' THEN
    -- Si cambió de NO pagado a PAGADO -> otorgar puntos
    IF OLD.payment_status IS DISTINCT FROM 'paid' 
       AND NEW.payment_status = 'paid' 
       AND NEW.deleted_at IS NULL THEN
      PERFORM award_loyalty_points(NEW.user_id, NEW.total, NEW.id);
    END IF;
    
    -- Si cambió de PAGADO a NO pagado -> restar puntos
    IF OLD.payment_status = 'paid' 
       AND NEW.payment_status IS DISTINCT FROM 'paid' THEN
      PERFORM remove_loyalty_points(NEW.user_id, NEW.total, NEW.id);
    END IF;
    
    -- Si se eliminó una factura que estaba pagada -> restar puntos
    IF OLD.deleted_at IS NULL 
       AND NEW.deleted_at IS NOT NULL 
       AND OLD.payment_status = 'paid' THEN
      PERFORM remove_loyalty_points(NEW.user_id, NEW.total, NEW.id);
    END IF;
    
    -- Si se restauró una factura que estaba pagada -> devolver puntos
    IF OLD.deleted_at IS NOT NULL 
       AND NEW.deleted_at IS NULL 
       AND NEW.payment_status = 'paid' THEN
      PERFORM award_loyalty_points(NEW.user_id, NEW.total, NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Crear perfil
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  
  -- Asignar rol 'client' automáticamente
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Enviar email de bienvenida
  PERFORM send_welcome_email_http(
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)
  );
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_order_loyalty_points(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_order_loyalty_points() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Solo procesar si hay un usuario asociado
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- CASO 1: INSERT - Pedido nuevo marcado como pagado
  IF TG_OP = 'INSERT' AND NEW.payment_status = 'paid' THEN
    PERFORM award_loyalty_points(NEW.user_id, NEW.total, NEW.id);
    RETURN NEW;
  END IF;
  
  -- CASO 2: UPDATE - Cambio de estado de pago
  IF TG_OP = 'UPDATE' THEN
    -- Si cambió de NO pagado a PAGADO -> otorgar puntos
    IF OLD.payment_status IS DISTINCT FROM 'paid' 
       AND NEW.payment_status = 'paid' 
       AND NEW.deleted_at IS NULL THEN
      PERFORM award_loyalty_points(NEW.user_id, NEW.total, NEW.id);
    END IF;
    
    -- Si cambió de PAGADO a NO pagado -> restar puntos
    IF OLD.payment_status = 'paid' 
       AND NEW.payment_status IS DISTINCT FROM 'paid' THEN
      PERFORM remove_loyalty_points(NEW.user_id, NEW.total, NEW.id);
    END IF;
    
    -- Si se eliminó un pedido que estaba pagado -> restar puntos
    IF OLD.deleted_at IS NULL 
       AND NEW.deleted_at IS NOT NULL 
       AND OLD.payment_status = 'paid' THEN
      PERFORM remove_loyalty_points(NEW.user_id, NEW.total, NEW.id);
    END IF;
    
    -- Si se restauró un pedido que estaba pagado -> devolver puntos
    IF OLD.deleted_at IS NOT NULL 
       AND NEW.deleted_at IS NULL 
       AND NEW.payment_status = 'paid' THEN
      PERFORM award_loyalty_points(NEW.user_id, NEW.total, NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: hash_admin_pin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.hash_admin_pin() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $_$
BEGIN
  -- Only hash if PIN is not null and not already hashed (bcrypt hashes start with $2)
  IF NEW.admin_pin IS NOT NULL AND NOT (NEW.admin_pin ~ '^\$2[aby]\$') THEN
    NEW.admin_pin := extensions.crypt(NEW.admin_pin, extensions.gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$_$;


--
-- Name: initialize_loyalty_points(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.initialize_loyalty_points() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Verificar si la configuración de lealtad está habilitada
  IF EXISTS (SELECT 1 FROM loyalty_settings WHERE is_enabled = true) THEN
    -- Insertar registro de puntos para el nuevo usuario si no existe
    IF NOT EXISTS (SELECT 1 FROM loyalty_points WHERE user_id = NEW.id) THEN
      INSERT INTO loyalty_points (user_id, points_balance, lifetime_points)
      VALUES (NEW.id, 0, 0);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_admins_async(text, text, text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_admins_async(p_type text, p_subject text, p_message text, p_link text DEFAULT '/admin/pedidos'::text, p_order_number text DEFAULT NULL::text, p_customer_name text DEFAULT NULL::text, p_customer_email text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  admin_rec RECORD;
  req_id bigint;
BEGIN
  FOR admin_rec IN 
    SELECT DISTINCT p.id, p.email
    FROM profiles p
    INNER JOIN user_roles ur ON p.id = ur.user_id
    WHERE ur.role = 'admin'
  LOOP
    -- Crear notificación in-app
    INSERT INTO notifications (user_id, type, title, message, link, is_read)
    VALUES (admin_rec.id, p_type, p_subject, p_message, p_link, false)
    ON CONFLICT DO NOTHING;
    
    -- Enviar email al admin
    IF admin_rec.email IS NOT NULL THEN
      SELECT net.http_post(
        url := 'https://wcnkdrepxlmndkmikxul.supabase.co/functions/v1/send-admin-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbmtkcmVweGxtbmRrbWlreHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODI4NDcsImV4cCI6MjA3Nzc1ODg0N30.3u2TJOoTyJ4xqQMA6x5rlZc1OXd65dc2OCHzOTsqbCg"}'::jsonb,
        body := jsonb_build_object(
          'to', admin_rec.email,
          'type', p_type,
          'subject', p_subject,
          'message', p_message,
          'link', p_link,
          'order_number', p_order_number,
          'customer_name', p_customer_name,
          'customer_email', p_customer_email
        )
      ) INTO req_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE '📧 Admin notifications queued';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '⚠️ Admin notify error: %', SQLERRM;
END;
$$;


--
-- Name: notify_all_admins(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_all_admins(p_type text, p_title text, p_message text, p_link text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  admin_record RECORD;
  notification_exists BOOLEAN;
BEGIN
  -- Obtener admins únicos
  FOR admin_record IN 
    SELECT DISTINCT p.id
    FROM profiles p
    INNER JOIN user_roles ur ON p.id = ur.user_id
    WHERE ur.role = 'admin'
  LOOP
    -- Verificar si ya existe notificación similar en los últimos 30 segundos
    SELECT EXISTS(
      SELECT 1 FROM notifications
      WHERE user_id = admin_record.id
        AND type = p_type
        AND title = p_title
        AND created_at > NOW() - INTERVAL '30 seconds'
    ) INTO notification_exists;
    
    -- Solo insertar si no existe
    IF NOT notification_exists THEN
      INSERT INTO notifications (user_id, type, title, message, link, is_read)
      VALUES (admin_record.id, p_type, p_title, p_message, p_link, false)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;


--
-- Name: notify_available_loyalty_coupons(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_available_loyalty_coupons() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_coupon RECORD;
  v_notification_exists boolean;
  v_coupons_count integer := 0;
BEGIN
  -- Solo procesar si aumentaron los puntos
  IF NEW.points_balance <= OLD.points_balance THEN
    RETURN NEW;
  END IF;
  
  -- Buscar cupones recién desbloqueados
  FOR v_coupon IN 
    SELECT c.id, c.code, c.points_required, c.discount_type, c.discount_value, p.name as product_name
    FROM coupons c
    LEFT JOIN products p ON c.product_id = p.id
    WHERE c.is_loyalty_reward = true
      AND c.is_active = true
      AND c.deleted_at IS NULL
      AND c.points_required IS NOT NULL
      AND c.points_required <= NEW.points_balance
      AND c.points_required > COALESCE(OLD.points_balance, 0)
    ORDER BY c.points_required ASC
    LIMIT 3
  LOOP
    v_coupons_count := v_coupons_count + 1;
    
    -- Verificar si ya se notificó sobre este cupón
    SELECT EXISTS(
      SELECT 1 FROM notifications
      WHERE user_id = NEW.user_id
        AND type = 'loyalty_coupon_available'
        AND message LIKE '%' || v_coupon.code || '%'
        AND created_at > NOW() - INTERVAL '30 days'
    ) INTO v_notification_exists;
    
    IF NOT v_notification_exists THEN
      -- Construir mensaje
      DECLARE
        v_discount_text text;
        v_product_text text;
      BEGIN
        v_discount_text := CASE 
          WHEN v_coupon.discount_type = 'percentage' THEN v_coupon.discount_value || '% de descuento'
          WHEN v_coupon.discount_type = 'fixed' THEN '€' || v_coupon.discount_value || ' de descuento'
          ELSE 'envío gratis'
        END;
        
        v_product_text := CASE 
          WHEN v_coupon.product_name IS NOT NULL THEN ' en ' || v_coupon.product_name
          ELSE ''
        END;
        
        -- Crear notificación
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (
          NEW.user_id,
          'loyalty_coupon_available',
          '🎁 ¡Nuevo cupón disponible!',
          'Tienes ' || NEW.points_balance || ' puntos. Puedes canjear el cupón "' || 
          v_coupon.code || '" (' || v_coupon.points_required || ' pts) para obtener ' || 
          v_discount_text || v_product_text || '. ¿Deseas canjearlo o seguir acumulando?',
          '/cuenta?tab=points'
        );
        
        RAISE NOTICE '🔔 [LOYALTY] Notificación de cupón disponible enviada a usuario %: %', 
          NEW.user_id, v_coupon.code;
      END;
    END IF;
  END LOOP;
  
  -- Si se desbloqueó al menos un cupón, mencionar otros disponibles
  IF v_coupons_count > 0 THEN
    DECLARE
      v_next_coupon RECORD;
    BEGIN
      -- Buscar el siguiente cupón más alto
      SELECT c.code, c.points_required
      INTO v_next_coupon
      FROM coupons c
      WHERE c.is_loyalty_reward = true
        AND c.is_active = true
        AND c.deleted_at IS NULL
        AND c.points_required IS NOT NULL
        AND c.points_required > NEW.points_balance
      ORDER BY c.points_required ASC
      LIMIT 1;
      
      IF FOUND THEN
        -- Notificar sobre próxima meta
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (
          NEW.user_id,
          'loyalty_next_goal',
          '🎯 Próxima meta',
          'Necesitas ' || (v_next_coupon.points_required - NEW.points_balance) || 
          ' puntos más para desbloquear "' || v_next_coupon.code || '"',
          '/cuenta?tab=points'
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_available_rewards(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_available_rewards() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_reward RECORD;
  v_notification_exists boolean;
BEGIN
  -- Solo procesar si aumentaron los puntos
  IF NEW.points_balance <= OLD.points_balance THEN
    RETURN NEW;
  END IF;
  
  -- Buscar recompensas alcanzables
  FOR v_reward IN 
    SELECT * FROM loyalty_rewards
    WHERE is_active = true 
      AND deleted_at IS NULL
      AND points_required <= NEW.points_balance
      AND points_required > COALESCE(OLD.points_balance, 0)
    ORDER BY points_required ASC
    LIMIT 1
  LOOP
    -- Verificar si ya se notificó sobre esta recompensa
    SELECT EXISTS(
      SELECT 1 FROM notifications
      WHERE user_id = NEW.user_id
        AND type = 'loyalty_milestone'
        AND message LIKE '%' || v_reward.name || '%'
        AND created_at > NOW() - INTERVAL '7 days'
    ) INTO v_notification_exists;
    
    IF NOT v_notification_exists THEN
      -- Crear notificación
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (
        NEW.user_id,
        'loyalty_milestone',
        '🎉 ¡Nueva Recompensa Disponible!',
        format('Tienes %s puntos. Puedes canjear: %s (%s puntos) o seguir acumulando para recompensas mayores.',
          NEW.points_balance, v_reward.name, v_reward.points_required),
        '/mi-cuenta?tab=loyalty'
      );
      
      RAISE NOTICE '🔔 [LOYALTY] Notificación enviada a usuario % por alcanzar %', 
        NEW.user_id, v_reward.name;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_invoice_payment_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_invoice_payment_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  status_text TEXT;
BEGIN
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    -- Determine status text
    status_text := CASE NEW.payment_status
      WHEN 'paid' THEN 'pagada'
      WHEN 'pending' THEN 'pendiente'
      WHEN 'failed' THEN 'fallida'
      ELSE NEW.payment_status
    END;
    
    -- Notify customer
    IF NEW.user_id IS NOT NULL THEN
      PERFORM send_notification(
        NEW.user_id,
        'invoice_update',
        'Estado de Factura Actualizado: ' || NEW.invoice_number,
        'Tu factura ahora está: ' || status_text,
        '/mi-cuenta'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_message_received(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_message_received() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
DECLARE
  admin_user_id UUID;
  recipient_email TEXT;
  sender_display_name TEXT;
BEGIN
  -- Si es un mensaje de cliente al admin
  IF NEW.is_admin_message = false THEN
    -- Obtener el primer admin desde user_roles
    SELECT user_id INTO admin_user_id
    FROM user_roles
    WHERE role = 'admin'
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL THEN
      -- Verificar que el user_id exista en auth.users antes de insertar
      IF EXISTS (SELECT 1 FROM auth.users WHERE id = admin_user_id) THEN
        -- Crear notificación para el admin
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          link
        ) VALUES (
          admin_user_id,
          'new_message',
          '💬 Nuevo mensaje de cliente',
          'De: ' || NEW.sender_name || ' - ' || SUBSTRING(NEW.message, 1, 100),
          '/admin/messages'
        );
      END IF;
      
      -- Obtener email del admin para enviar correo
      SELECT email INTO recipient_email
      FROM auth.users
      WHERE id = admin_user_id;
      
      IF recipient_email IS NOT NULL THEN
        -- Llamar edge function para enviar email (URL hardcoded)
        PERFORM net.http_post(
          url := 'https://wcnkdrepxlmndkmikxul.supabase.co/functions/v1/send-chat-notification-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbmtkcmVweGxtbmRrbWlreHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODI4NDcsImV4cCI6MjA3Nzc1ODg0N30.3u2TJOoTyJ4xqQMA6x5rlZc1OXd65dc2OCHzOTsqbCg'
          ),
          body := jsonb_build_object(
            'to_email', recipient_email,
            'sender_name', NEW.sender_name,
            'message_preview', NEW.message,
            'is_admin', false,
            'has_attachments', (NEW.attachments IS NOT NULL AND jsonb_array_length(NEW.attachments) > 0)
          )
        );
      END IF;
    END IF;
  
  -- Si es un mensaje del admin al cliente
  ELSE
    IF NEW.user_id IS NOT NULL THEN
      -- Verificar que el user_id exista en auth.users antes de insertar
      IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
        -- Crear notificación para el usuario
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          link
        ) VALUES (
          NEW.user_id,
          'admin_reply',
          '💬 Respuesta del equipo de soporte',
          SUBSTRING(NEW.message, 1, 100),
          '/mis-mensajes'
        );
      END IF;
      
      -- Obtener email del usuario
      SELECT email INTO recipient_email
      FROM auth.users
      WHERE id = NEW.user_id;
      
      IF recipient_email IS NOT NULL THEN
        -- Llamar edge function para enviar email (URL hardcoded)
        PERFORM net.http_post(
          url := 'https://wcnkdrepxlmndkmikxul.supabase.co/functions/v1/send-chat-notification-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbmtkcmVweGxtbmRrbWlreHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODI4NDcsImV4cCI6MjA3Nzc1ODg0N30.3u2TJOoTyJ4xqQMA6x5rlZc1OXd65dc2OCHzOTsqbCg'
          ),
          body := jsonb_build_object(
            'to_email', recipient_email,
            'sender_name', 'Equipo de Soporte',
            'message_preview', NEW.message,
            'is_admin', true,
            'has_attachments', (NEW.attachments IS NOT NULL AND jsonb_array_length(NEW.attachments) > 0)
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_new_invoice(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_invoice() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Notify customer about new invoice
  IF NEW.user_id IS NOT NULL THEN
    PERFORM send_notification(
      NEW.user_id,
      'invoice',
      'Nueva Factura: ' || NEW.invoice_number,
      'Se ha generado una nueva factura por €' || NEW.total,
      '/mi-cuenta'
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_new_invoice_single(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_invoice_single() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Notificar al cliente sobre nueva factura
  IF NEW.user_id IS NOT NULL THEN
    PERFORM send_notification(
      NEW.user_id,
      'invoice',
      'Nueva Factura: ' || NEW.invoice_number,
      'Se ha generado una nueva factura por €' || NEW.total,
      '/mi-cuenta'
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_new_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  customer_name TEXT;
  customer_email TEXT;
BEGIN
  -- Obtener info del cliente
  SELECT full_name, email INTO customer_name, customer_email
  FROM profiles WHERE id = NEW.user_id;
  
  -- Notificar a admins
  PERFORM notify_all_admins(
    'order',
    'Nuevo Pedido: ' || NEW.order_number,
    'Pedido por €' || NEW.total || ' de ' || COALESCE(customer_name, customer_email),
    '/admin/pedidos'
  );
  
  -- Notificar al cliente
  IF NEW.user_id IS NOT NULL THEN
    PERFORM send_notification(
      NEW.user_id,
      'order',
      'Pedido Confirmado: ' || NEW.order_number,
      'Tu pedido por €' || NEW.total || ' ha sido recibido',
      '/mi-cuenta'
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_new_order_once(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_order_once() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  customer_name TEXT;
  customer_email TEXT;
BEGIN
  -- Obtener info del cliente
  SELECT full_name, email INTO customer_name, customer_email
  FROM profiles WHERE id = NEW.user_id;
  
  -- Notificar a admins UNA SOLA VEZ
  PERFORM notify_all_admins(
    'order',
    'Nuevo Pedido: ' || NEW.order_number,
    'Pedido por €' || NEW.total || ' de ' || COALESCE(customer_name, customer_email),
    '/admin/pedidos'
  );
  
  -- Notificar al cliente UNA SOLA VEZ
  IF NEW.user_id IS NOT NULL THEN
    PERFORM send_notification(
      NEW.user_id,
      'order',
      'Pedido Confirmado: ' || NEW.order_number,
      'Tu pedido por €' || NEW.total || ' ha sido recibido',
      '/mi-cuenta'
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_new_order_single(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_order_single() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  customer_name TEXT;
  customer_email TEXT;
BEGIN
  -- Obtener info del cliente
  SELECT full_name, email INTO customer_name, customer_email
  FROM profiles WHERE id = NEW.user_id;
  
  -- Notificar a admins UNA SOLA VEZ
  PERFORM notify_all_admins(
    'order',
    'Nuevo Pedido: ' || NEW.order_number,
    'Pedido por €' || NEW.total || ' de ' || COALESCE(customer_name, customer_email),
    '/admin/pedidos'
  );
  
  -- Notificar al cliente UNA SOLA VEZ
  IF NEW.user_id IS NOT NULL THEN
    PERFORM send_notification(
      NEW.user_id,
      'order',
      'Pedido Confirmado: ' || NEW.order_number,
      'Tu pedido por €' || NEW.total || ' ha sido recibido',
      '/mi-cuenta'
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_new_quote(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_quote() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Notificar a admins con la ruta CORRECTA
  PERFORM notify_all_admins(
    'quote',
    'Nueva Cotización',
    'Cotización de ' || NEW.customer_name || ' (' || NEW.customer_email || ')',
    '/admin/cotizaciones'
  );
  
  -- Notificar al cliente si está registrado
  IF NEW.user_id IS NOT NULL THEN
    PERFORM send_notification(
      NEW.user_id,
      'quote',
      'Cotización Recibida',
      'Hemos recibido tu solicitud de cotización. Te responderemos pronto.',
      '/mi-cuenta'
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_order_changes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_order_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  status_name TEXT;
  customer_email TEXT;
BEGIN
  -- Solo notificar si el estado cambió
  IF OLD.status_id IS DISTINCT FROM NEW.status_id AND NEW.user_id IS NOT NULL THEN
    SELECT name INTO status_name FROM order_statuses WHERE id = NEW.status_id;
    SELECT email INTO customer_email FROM profiles WHERE id = NEW.user_id;
    
    PERFORM send_notification(
      NEW.user_id,
      'order_update',
      'Actualización de Pedido: ' || NEW.order_number,
      'Tu pedido ahora está: ' || COALESCE(status_name, 'Actualizado'),
      '/mi-cuenta'
    );
  END IF;

  -- Solo notificar cambios de estado de pago a 'paid'
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status 
     AND NEW.payment_status = 'paid' 
     AND NEW.user_id IS NOT NULL THEN
    PERFORM send_notification(
      NEW.user_id,
      'order_paid',
      'Pago Confirmado: ' || NEW.order_number,
      'Tu pago de €' || NEW.total || ' ha sido confirmado',
      '/mi-cuenta'
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: notify_order_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_order_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  status_name TEXT;
  customer_email TEXT;
  customer_name TEXT;
BEGIN
  -- Get status name
  SELECT name INTO status_name FROM order_statuses WHERE id = NEW.status_id;
  
  -- Get customer info
  SELECT email, full_name INTO customer_email, customer_name
  FROM profiles WHERE id = NEW.user_id;

  -- Notify customer of status change
  IF OLD.status_id IS DISTINCT FROM NEW.status_id AND NEW.user_id IS NOT NULL THEN
    PERFORM send_notification(
      NEW.user_id,
      'order_update',
      'Actualización de Pedido: ' || NEW.order_number,
      'Tu pedido ahora está: ' || COALESCE(status_name, 'Actualizado'),
      '/mi-cuenta'
    );
    
    -- Send email notification
    IF customer_email IS NOT NULL THEN
      PERFORM pg_notify('send_notification_email', json_build_object(
        'to', customer_email,
        'type', 'order_update',
        'subject', 'Actualización de Pedido: ' || NEW.order_number,
        'message', 'Tu pedido ' || NEW.order_number || ' ahora está: ' || COALESCE(status_name, 'Actualizado'),
        'link', '/mi-cuenta'
      )::text);
    END IF;
  END IF;

  -- Handle payment status changes
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status AND NEW.user_id IS NOT NULL THEN
    IF NEW.payment_status = 'paid' THEN
      PERFORM send_notification(
        NEW.user_id,
        'order_paid',
        'Pago Confirmado: ' || NEW.order_number,
        'Tu pago de €' || NEW.total || ' ha sido confirmado',
        '/mi-cuenta'
      );
      
      IF customer_email IS NOT NULL THEN
        PERFORM pg_notify('send_notification_email', json_build_object(
          'to', customer_email,
          'type', 'order_paid',
          'subject', 'Pago Confirmado: ' || NEW.order_number,
          'message', 'Tu pago de €' || NEW.total || ' ha sido confirmado para el pedido ' || NEW.order_number,
          'link', '/mi-cuenta'
        )::text);
      END IF;
    ELSIF NEW.payment_status = 'cancelled' THEN
      PERFORM send_notification(
        NEW.user_id,
        'order_cancelled',
        'Pedido Cancelado: ' || NEW.order_number,
        'Tu pedido ha sido cancelado',
        '/mi-cuenta'
      );
      
      IF customer_email IS NOT NULL THEN
        PERFORM pg_notify('send_notification_email', json_build_object(
          'to', customer_email,
          'type', 'order_cancelled',
          'subject', 'Pedido Cancelado: ' || NEW.order_number,
          'message', 'Tu pedido ' || NEW.order_number || ' ha sido cancelado',
          'link', '/mi-cuenta'
        )::text);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: notify_order_status_change_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_order_status_change_only() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  status_name TEXT;
  customer_email TEXT;
BEGIN
  -- Solo notificar si el estado cambió
  IF OLD.status_id IS DISTINCT FROM NEW.status_id AND NEW.user_id IS NOT NULL THEN
    SELECT name INTO status_name FROM order_statuses WHERE id = NEW.status_id;
    SELECT email INTO customer_email FROM profiles WHERE id = NEW.user_id;
    
    PERFORM send_notification(
      NEW.user_id,
      'order_update',
      'Actualización de Pedido: ' || NEW.order_number,
      'Tu pedido ahora está: ' || COALESCE(status_name, 'Actualizado'),
      '/mi-cuenta'
    );
  END IF;

  -- Solo notificar cambios de estado de pago a 'paid'
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status 
     AND NEW.payment_status = 'paid' 
     AND NEW.user_id IS NOT NULL THEN
    PERFORM send_notification(
      NEW.user_id,
      'order_paid',
      'Pago Confirmado: ' || NEW.order_number,
      'Tu pago de €' || NEW.total || ' ha sido confirmado',
      '/mi-cuenta'
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: notify_points_change_with_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_points_change_with_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_email text;
  v_user_name text;
  v_points_change integer;
  v_available_coupons jsonb;
BEGIN
  -- Solo procesar si aumentaron los puntos
  IF NEW.points_balance <= OLD.points_balance THEN
    RETURN NEW;
  END IF;
  
  v_points_change := NEW.points_balance - OLD.points_balance;
  
  -- Obtener info del usuario
  SELECT email, full_name INTO v_user_email, v_user_name
  FROM profiles WHERE id = NEW.user_id;
  
  -- Obtener cupones canjeables (3-4 opciones)
  SELECT jsonb_agg(jsonb_build_object(
    'code', code,
    'points_required', points_required,
    'discount_type', discount_type,
    'discount_value', discount_value
  ))
  INTO v_available_coupons
  FROM (
    SELECT code, points_required, discount_type, discount_value
    FROM coupons
    WHERE is_loyalty_reward = true
      AND is_active = true
      AND deleted_at IS NULL
      AND points_required IS NOT NULL
      AND points_required <= NEW.points_balance
    ORDER BY points_required DESC
    LIMIT 4
  ) AS available;
  
  -- Crear notificación in-app
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    NEW.user_id,
    'loyalty_points',
    '🎉 ¡Has ganado ' || v_points_change || ' puntos!',
    'Ahora tienes ' || NEW.points_balance || ' puntos. Revisa los cupones disponibles.',
    '/cuenta?tab=points'
  );
  
  -- Enviar email si hay email configurado
  IF v_user_email IS NOT NULL THEN
    PERFORM send_loyalty_points_email_async(
      NEW.user_id,
      v_user_email,
      v_user_name,
      v_points_change,
      NEW.points_balance,
      v_available_coupons
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: notify_quote_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_quote_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  status_name TEXT;
BEGIN
  IF OLD.estimated_price IS NULL AND NEW.estimated_price IS NOT NULL THEN
    -- Se añadió precio a la cotización
    SELECT name INTO status_name FROM quote_statuses WHERE id = NEW.status_id;
    
    IF NEW.user_id IS NOT NULL THEN
      PERFORM send_notification(
        NEW.user_id,
        'quote_update',
        'Cotización Actualizada',
        'Tu cotización ha sido evaluada. Precio estimado: €' || NEW.estimated_price,
        '/mi-cuenta'
      );
      
      -- Send email
      PERFORM pg_notify('send_notification_email', json_build_object(
        'to', NEW.customer_email,
        'type', 'quote_update',
        'subject', 'Cotización Actualizada',
        'message', 'Tu cotización ha sido evaluada. Precio estimado: €' || NEW.estimated_price,
        'link', '/mi-cuenta'
      )::text);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: redeem_loyalty_reward(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.redeem_loyalty_reward(p_user_id uuid, p_reward_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_reward RECORD;
  v_user_points integer;
  v_coupon_code text;
  v_expiration_date timestamptz;
BEGIN
  -- Obtener detalles de la recompensa
  SELECT * INTO v_reward
  FROM loyalty_rewards
  WHERE id = p_reward_id AND is_active = true AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recompensa no encontrada o inactiva';
  END IF;
  
  -- Verificar puntos del usuario
  SELECT points_balance INTO v_user_points
  FROM loyalty_points WHERE user_id = p_user_id;
  
  IF v_user_points < v_reward.points_required THEN
    RAISE EXCEPTION 'Puntos insuficientes. Requiere % puntos, tiene %', 
      v_reward.points_required, v_user_points;
  END IF;
  
  -- Generar código de cupón único
  v_coupon_code := 'LOYALTY-' || UPPER(substring(md5(random()::text) from 1 for 8));
  
  -- Calcular fecha de expiración (30 días)
  v_expiration_date := NOW() + INTERVAL '30 days';
  
  -- Crear cupón
  INSERT INTO coupons (
    code,
    discount_type,
    discount_value,
    min_purchase,
    max_uses,
    times_used,
    expires_at,
    is_active
  ) VALUES (
    v_coupon_code,
    v_reward.reward_type,
    v_reward.reward_value,
    0,
    1, -- Un solo uso
    0,
    v_expiration_date,
    true
  );
  
  -- Restar puntos
  UPDATE loyalty_points
  SET points_balance = points_balance - v_reward.points_required,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Registrar canje
  INSERT INTO loyalty_redemptions (
    user_id,
    reward_id,
    points_spent,
    coupon_code,
    status,
    expires_at
  ) VALUES (
    p_user_id,
    p_reward_id,
    v_reward.points_required,
    v_coupon_code,
    'active',
    v_expiration_date
  );
  
  -- Crear notificación
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    p_user_id,
    'loyalty_reward',
    '🎁 Recompensa Canjeada',
    format('Has canjeado %s puntos por: %s. Tu cupón es: %s (expira en 30 días)', 
      v_reward.points_required, v_reward.name, v_coupon_code),
    '/mi-cuenta?tab=loyalty'
  );
  
  RAISE NOTICE '🎁 [LOYALTY] Usuario % canjeó % por cupón %', 
    p_user_id, v_reward.name, v_coupon_code;
  
  RETURN v_coupon_code;
END;
$$;


--
-- Name: remove_loyalty_points(uuid, numeric, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remove_loyalty_points(p_user_id uuid, p_order_amount numeric, p_order_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_points_per_dollar numeric;
  v_points_to_remove integer;
BEGIN
  -- Obtener configuración
  SELECT points_per_dollar INTO v_points_per_dollar
  FROM loyalty_settings
  LIMIT 1;
  
  -- Calcular puntos a restar
  v_points_to_remove := FLOOR(p_order_amount * v_points_per_dollar);
  
  IF v_points_to_remove <= 0 THEN
    RETURN;
  END IF;
  
  -- Restar puntos (no permitir balance negativo)
  UPDATE loyalty_points
  SET 
    points_balance = GREATEST(0, points_balance - v_points_to_remove),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RAISE NOTICE '❌ [LOYALTY] Restados % puntos a usuario % por cambio en pedido %', 
    v_points_to_remove, p_user_id, p_order_id;
END;
$$;


--
-- Name: restore_with_metadata(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.restore_with_metadata(p_table_name text, p_record_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Actualizar metadata
  UPDATE public.backup_metadata
  SET restored_at = NOW()
  WHERE table_name = p_table_name
    AND record_id = p_record_id
    AND permanently_deleted_at IS NULL;
  
  -- Restaurar registro (quitar deleted_at)
  EXECUTE format(
    'UPDATE %I SET deleted_at = NULL WHERE id = %L',
    p_table_name,
    p_record_id
  );
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error restaurando: %', SQLERRM;
  RETURN false;
END;
$$;


--
-- Name: send_invoice_email_async(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_invoice_email_async(p_invoice_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  request_id bigint;
  invoice_data RECORD;
BEGIN
  SELECT i.invoice_number, i.total, p.email, p.full_name
  INTO invoice_data
  FROM invoices i
  JOIN profiles p ON i.user_id = p.id
  WHERE i.id = p_invoice_id;
  
  IF invoice_data.email IS NULL THEN
    RETURN;
  END IF;

  SELECT INTO request_id extensions.http_post(
    url := 'https://wcnkdrepxlmndkmikxul.supabase.co/functions/v1/send-invoice-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbmtkcmVweGxtbmRrbWlreHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODI4NDcsImV4cCI6MjA3Nzc1ODg0N30.3u2TJOoTyJ4xqQMA6x5rlZc1OXd65dc2OCHzOTsqbCg'
    ),
    body := jsonb_build_object(
      'invoice_id', p_invoice_id,
      'email', invoice_data.email,
      'invoice_number', invoice_data.invoice_number,
      'total', invoice_data.total,
      'customer_name', invoice_data.full_name
    )
  );
  
  RAISE NOTICE '📧 Invoice email queued (request_id: %)', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '⚠️ Failed to queue invoice email: %', SQLERRM;
END;
$$;


--
-- Name: send_loyalty_points_email_async(uuid, text, text, integer, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_loyalty_points_email_async(p_user_id uuid, p_email text, p_name text, p_points_earned integer, p_total_points integer, p_available_coupons jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  request_id bigint;
BEGIN
  SELECT INTO request_id extensions.http_post(
    url := 'https://wcnkdrepxlmndkmikxul.supabase.co/functions/v1/send-loyalty-points-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbmtkcmVweGxtbmRrbWlreHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODI4NDcsImV4cCI6MjA3Nzc1ODg0N30.3u2TJOoTyJ4xqQMA6x5rlZc1OXd65dc2OCHzOTsqbCg'
    ),
    body := jsonb_build_object(
      'user_id', p_user_id,
      'email', p_email,
      'name', p_name,
      'points_earned', p_points_earned,
      'total_points', p_total_points,
      'available_coupons', p_available_coupons
    )
  );
  
  RAISE NOTICE '📧 Loyalty points email queued (request_id: %)', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '⚠️ Failed to queue loyalty email: %', SQLERRM;
END;
$$;


--
-- Name: send_notification(uuid, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_link text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  notification_id UUID;
  notification_exists BOOLEAN;
BEGIN
  -- Verificar si ya existe notificación similar en los últimos 30 segundos
  SELECT EXISTS(
    SELECT 1 FROM notifications
    WHERE user_id = p_user_id
      AND type = p_type
      AND title = p_title
      AND created_at > NOW() - INTERVAL '30 seconds'
  ) INTO notification_exists;
  
  -- Solo insertar si no existe
  IF NOT notification_exists THEN
    INSERT INTO notifications (user_id, type, title, message, link, is_read)
    VALUES (p_user_id, p_type, p_title, p_message, p_link, false)
    RETURNING id INTO notification_id;
  END IF;
  
  RETURN notification_id;
END;
$$;


--
-- Name: send_notification_email_http(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_notification_email_http(p_to text, p_subject text, p_message text, p_link text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  request_id bigint;
BEGIN
  SELECT INTO request_id extensions.http_post(
    url := 'https://kvmgikqyjqtmdkscqdcc.supabase.co/functions/v1/send-notification-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bWdpa3F5anF0bWRrc2NxZGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjczOTEsImV4cCI6MjA3NzQwMzM5MX0.mDnPt5wSRtduvcGKQlrX1cXGBmFn_ZCx2YFbpST0ckc'
    ),
    body := jsonb_build_object(
      'to', p_to,
      'subject', p_subject,
      'message', p_message,
      'link', p_link
    )
  );
  
  RAISE NOTICE '📧 Notification email queued (request_id: %)', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '⚠️ Failed to queue notification email: %', SQLERRM;
END;
$$;


--
-- Name: send_order_email_async(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_order_email_async(p_order_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  order_rec RECORD;
  items_json JSONB;
  req_id bigint;
BEGIN
  SELECT o.order_number, o.subtotal, o.tax, o.shipping, o.discount, o.total, p.email, p.full_name
  INTO order_rec
  FROM orders o
  LEFT JOIN profiles p ON o.user_id = p.id
  WHERE o.id = p_order_id;
  
  IF order_rec.email IS NULL THEN
    RAISE WARNING '⚠️ No email for order %', p_order_id;
    RETURN;
  END IF;
  
  SELECT jsonb_agg(jsonb_build_object(
    'product_name', product_name,
    'quantity', quantity,
    'unit_price', unit_price
  ))
  INTO items_json
  FROM order_items WHERE order_id = p_order_id;

  SELECT net.http_post(
    url := 'https://wcnkdrepxlmndkmikxul.supabase.co/functions/v1/send-order-confirmation',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbmtkcmVweGxtbmRrbWlreHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODI4NDcsImV4cCI6MjA3Nzc1ODg0N30.3u2TJOoTyJ4xqQMA6x5rlZc1OXd65dc2OCHzOTsqbCg"}'::jsonb,
    body := jsonb_build_object(
      'to', order_rec.email,
      'order_number', order_rec.order_number,
      'subtotal', order_rec.subtotal,
      'tax', order_rec.tax,
      'shipping', order_rec.shipping,
      'discount', order_rec.discount,
      'total', order_rec.total,
      'items', COALESCE(items_json, '[]'::jsonb),
      'customer_name', order_rec.full_name
    )
  ) INTO req_id;
  
  RAISE NOTICE '📧 Order email queued (req: %)', req_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '⚠️ Order email error: %', SQLERRM;
END;
$$;


--
-- Name: send_order_status_email_async(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_order_status_email_async(p_order_id uuid, p_old_status text, p_new_status text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  order_rec RECORD;
  req_id bigint;
BEGIN
  SELECT o.order_number, p.email, p.full_name
  INTO order_rec
  FROM orders o
  LEFT JOIN profiles p ON o.user_id = p.id
  WHERE o.id = p_order_id;
  
  IF order_rec.email IS NULL THEN
    RAISE WARNING '⚠️ No email for order %', p_order_id;
    RETURN;
  END IF;

  SELECT net.http_post(
    url := 'https://wcnkdrepxlmndkmikxul.supabase.co/functions/v1/send-order-status-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbmtkcmVweGxtbmRrbWlreHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODI4NDcsImV4cCI6MjA3Nzc1ODg0N30.3u2TJOoTyJ4xqQMA6x5rlZc1OXd65dc2OCHzOTsqbCg"}'::jsonb,
    body := jsonb_build_object(
      'to', order_rec.email,
      'order_number', order_rec.order_number,
      'old_status', p_old_status,
      'new_status', p_new_status,
      'customer_name', order_rec.full_name
    )
  ) INTO req_id;
  
  RAISE NOTICE '📧 Order status email queued (req: %)', req_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '⚠️ Order status email error: %', SQLERRM;
END;
$$;


--
-- Name: send_quote_confirmation_http(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_quote_confirmation_http(p_quote_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  request_id bigint;
  quote_data RECORD;
BEGIN
  SELECT customer_email, customer_name, quote_type, description
  INTO quote_data
  FROM quotes
  WHERE id = p_quote_id;
  
  IF quote_data.customer_email IS NULL THEN
    RETURN;
  END IF;

  SELECT INTO request_id extensions.http_post(
    url := 'https://kvmgikqyjqtmdkscqdcc.supabase.co/functions/v1/send-quote-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bWdpa3F5anF0bWRrc2NxZGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjczOTEsImV4cCI6MjA3NzQwMzM5MX0.mDnPt5wSRtduvcGKQlrX1cXGBmFn_ZCx2YFbpST0ckc'
    ),
    body := jsonb_build_object(
      'to', quote_data.customer_email,
      'customer_name', quote_data.customer_name,
      'quote_type', quote_data.quote_type,
      'description', quote_data.description
    )
  );
  
  RAISE NOTICE '📧 Quote email queued (request_id: %)', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '⚠️ Failed to queue quote email: %', SQLERRM;
END;
$$;


--
-- Name: send_quote_update_email_async(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_quote_update_email_async(p_quote_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  request_id bigint;
  quote_data RECORD;
BEGIN
  SELECT customer_email, customer_name, estimated_price, quote_type
  INTO quote_data
  FROM quotes
  WHERE id = p_quote_id;
  
  IF quote_data.customer_email IS NULL THEN
    RETURN;
  END IF;

  SELECT INTO request_id extensions.http_post(
    url := 'https://wcnkdrepxlmndkmikxul.supabase.co/functions/v1/send-quote-update-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjbmtkcmVweGxtbmRrbWlreHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODI4NDcsImV4cCI6MjA3Nzc1ODg0N30.3u2TJOoTyJ4xqQMA6x5rlZc1OXd65dc2OCHzOTsqbCg'
    ),
    body := jsonb_build_object(
      'quote_id', p_quote_id,
      'email', quote_data.customer_email,
      'customer_name', quote_data.customer_name,
      'estimated_price', quote_data.estimated_price,
      'quote_type', quote_data.quote_type
    )
  );
  
  RAISE NOTICE '📧 Quote update email queued (request_id: %)', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '⚠️ Failed to queue quote update email: %', SQLERRM;
END;
$$;


--
-- Name: send_welcome_email_http(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_welcome_email_http(user_email text, user_name text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  request_id bigint;
BEGIN
  SELECT INTO request_id extensions.http_post(
    url := 'https://kvmgikqyjqtmdkscqdcc.supabase.co/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bWdpa3F5anF0bWRrc2NxZGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MjczOTEsImV4cCI6MjA3NzQwMzM5MX0.mDnPt5wSRtduvcGKQlrX1cXGBmFn_ZCx2YFbpST0ckc'
    ),
    body := jsonb_build_object(
      'to', user_email,
      'name', COALESCE(user_name, 'Cliente')
    )
  );
  
  RAISE NOTICE '📧 Welcome email queued (request_id: %)', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '⚠️ Failed to queue welcome email: %', SQLERRM;
END;
$$;


--
-- Name: set_visitor_device_type(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_visitor_device_type() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Auto-detectar device_type si no se especificó
  IF NEW.device_type IS NULL AND NEW.user_agent IS NOT NULL THEN
    NEW.device_type := detect_device_type(NEW.user_agent);
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: soft_delete_item(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.soft_delete_item() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- En lugar de eliminar, marcar como eliminado
  NEW.deleted_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: soft_delete_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.soft_delete_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Marcar como eliminado en lugar de eliminar
  UPDATE public.orders
  SET deleted_at = NOW()
  WHERE id = OLD.id AND deleted_at IS NULL;
  RETURN NULL; -- Evitar eliminación real
END;
$$;


--
-- Name: sync_invoice_payment_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_invoice_payment_status() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Cuando un pedido se marca como pagado, actualizar su factura
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    UPDATE invoices
    SET payment_status = 'paid',
        updated_at = NOW()
    WHERE order_id = NEW.id
      AND payment_status != 'paid';
    
    RAISE NOTICE '✅ Factura actualizada a pagada para pedido %', NEW.order_number;
  END IF;
  
  -- Cuando un pedido se marca como cancelado, actualizar su factura
  IF NEW.payment_status = 'cancelled' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'cancelled') THEN
    UPDATE invoices
    SET payment_status = 'cancelled',
        updated_at = NOW()
    WHERE order_id = NEW.id
      AND payment_status != 'cancelled';
    
    RAISE NOTICE '❌ Factura actualizada a cancelada para pedido %', NEW.order_number;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: trigger_message_received_with_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_message_received_with_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  recipient_email TEXT;
BEGIN
  IF NEW.is_admin_message = true AND NEW.user_id IS NOT NULL THEN
    PERFORM send_notification(
      NEW.user_id,
      'message_received',
      'Nuevo Mensaje',
      'Tienes un nuevo mensaje del equipo',
      '/mi-cuenta'
    );
    
    SELECT email INTO recipient_email FROM profiles WHERE id = NEW.user_id;
    IF recipient_email IS NOT NULL THEN
      PERFORM send_notification_email_http(
        recipient_email,
        'Nuevo Mensaje',
        'Tienes un nuevo mensaje del equipo. Asunto: ' || COALESCE(NEW.subject, 'Sin asunto'),
        '/mi-cuenta'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: trigger_new_invoice_with_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_new_invoice_with_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM send_notification(
      NEW.user_id,
      'invoice',
      'Nueva Factura: ' || NEW.invoice_number,
      'Se ha generado una nueva factura por €' || NEW.total,
      '/mi-cuenta?tab=invoices'
    );
    
    PERFORM send_invoice_email_async(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: trigger_new_order_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_new_order_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  cust_name TEXT;
  cust_email TEXT;
BEGIN
  SELECT full_name, email INTO cust_name, cust_email
  FROM profiles WHERE id = NEW.user_id;
  
  PERFORM send_order_email_async(NEW.id);
  
  PERFORM notify_admins_async(
    'order',
    'Nuevo Pedido: ' || NEW.order_number,
    'Pedido por €' || NEW.total || ' de ' || COALESCE(cust_name, cust_email),
    '/admin/pedidos',
    NEW.order_number,
    cust_name,
    cust_email
  );
  
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, is_read)
    VALUES (
      NEW.user_id, 'order',
      'Pedido Confirmado: ' || NEW.order_number,
      'Tu pedido por €' || NEW.total || ' ha sido recibido',
      '/mi-cuenta', false
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: trigger_new_quote_with_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_new_quote_with_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Notificar a admins con la ruta CORRECTA
  PERFORM notify_all_admins(
    'quote',
    'Nueva Cotización',
    'Cotización de ' || NEW.customer_name || ' (' || NEW.customer_email || ')',
    '/admin/cotizaciones'
  );
  
  -- Notificar al cliente in-app si está registrado
  IF NEW.user_id IS NOT NULL THEN
    PERFORM send_notification(
      NEW.user_id,
      'quote',
      'Cotización Recibida',
      'Hemos recibido tu solicitud de cotización. Te responderemos pronto.',
      '/mi-cuenta'
    );
  END IF;
  
  -- Enviar email al cliente
  PERFORM send_quote_confirmation_http(NEW.id);
  
  RETURN NEW;
END;
$$;


--
-- Name: trigger_order_changes_with_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_order_changes_with_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  status_name TEXT;
  old_status_name TEXT;
  customer_email TEXT;
BEGIN
  -- Cambio de estado
  IF OLD.status_id IS DISTINCT FROM NEW.status_id AND NEW.user_id IS NOT NULL THEN
    SELECT name INTO status_name FROM order_statuses WHERE id = NEW.status_id;
    SELECT name INTO old_status_name FROM order_statuses WHERE id = OLD.status_id;
    SELECT email INTO customer_email FROM profiles WHERE id = NEW.user_id;
    
    PERFORM send_notification(
      NEW.user_id,
      'order_update',
      'Actualización de Pedido: ' || NEW.order_number,
      'Tu pedido ahora está: ' || COALESCE(status_name, 'Actualizado'),
      '/mi-cuenta'
    );
    
    IF customer_email IS NOT NULL THEN
      PERFORM send_order_status_email_async(
        NEW.id,
        COALESCE(old_status_name, 'Pendiente'),
        COALESCE(status_name, 'Actualizado')
      );
    END IF;
  END IF;

  -- Pago confirmado
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status 
     AND NEW.payment_status = 'paid' 
     AND NEW.user_id IS NOT NULL THEN
    SELECT email INTO customer_email FROM profiles WHERE id = NEW.user_id;
    
    PERFORM send_notification(
      NEW.user_id,
      'order_paid',
      'Pago Confirmado: ' || NEW.order_number,
      'Tu pago de €' || NEW.total || ' ha sido confirmado',
      '/mi-cuenta'
    );
    
    IF customer_email IS NOT NULL THEN
      PERFORM send_notification_email_http(
        customer_email,
        'Pago Confirmado: ' || NEW.order_number,
        'Tu pago de €' || NEW.total || ' ha sido confirmado',
        '/mi-cuenta'
      );
    END IF;
  END IF;
  
  -- Cancelación
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status 
     AND NEW.payment_status = 'cancelled' 
     AND NEW.user_id IS NOT NULL THEN
    SELECT email INTO customer_email FROM profiles WHERE id = NEW.user_id;
    
    PERFORM send_notification(
      NEW.user_id,
      'order_cancelled',
      'Pedido Cancelado: ' || NEW.order_number,
      'Tu pedido ha sido cancelado',
      '/mi-cuenta'
    );
    
    IF customer_email IS NOT NULL THEN
      PERFORM send_notification_email_http(
        customer_email,
        'Pedido Cancelado: ' || NEW.order_number,
        'Tu pedido ha sido cancelado',
        '/mi-cuenta'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: trigger_quote_update_with_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_quote_update_with_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.estimated_price IS NULL AND NEW.estimated_price IS NOT NULL THEN
    IF NEW.user_id IS NOT NULL THEN
      PERFORM send_notification(
        NEW.user_id,
        'quote_update',
        'Cotización Actualizada',
        'Tu cotización ha sido evaluada. Precio estimado: €' || NEW.estimated_price,
        '/mi-cuenta'
      );
    END IF;
    
    PERFORM send_quote_update_email_async(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_calculator_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_calculator_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_calibration_profile_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_calibration_profile_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_invoice_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_invoice_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_shipping_zone_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_shipping_zone_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_site_customization_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_site_customization_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_support_detection_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_support_detection_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: verify_admin_pin(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_admin_pin(pin_input text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND admin_pin IS NOT NULL
    AND admin_pin = extensions.crypt(pin_input, admin_pin)
  );
END;
$$;


SET default_table_access_method = heap;

--
-- Name: api_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_rate_limits (
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    request_count integer DEFAULT 0,
    window_start timestamp with time zone DEFAULT now()
);


--
-- Name: backup_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_metadata (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    record_id uuid NOT NULL,
    deleted_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_by uuid,
    original_data jsonb NOT NULL,
    estimated_size_mb numeric DEFAULT 0,
    expiration_date timestamp with time zone,
    deletion_reason text,
    related_files text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    restored_at timestamp with time zone,
    permanently_deleted_at timestamp with time zone
);


--
-- Name: backup_retention_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_retention_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    retention_days integer DEFAULT 180 NOT NULL,
    size_threshold_mb numeric DEFAULT 20,
    large_file_retention_days integer DEFAULT 8,
    auto_cleanup_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: blog_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: blog_post_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_post_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    content text NOT NULL,
    excerpt text,
    featured_image text,
    category_id uuid,
    author_id uuid,
    is_published boolean DEFAULT false,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: calculator_calibrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calculator_calibrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    calibration_name text NOT NULL,
    test_type text NOT NULL,
    stl_file_path text NOT NULL,
    material_id uuid,
    supports_enabled boolean,
    layer_height numeric,
    infill_percentage integer,
    print_speed integer,
    calculated_volume numeric,
    calculated_weight numeric,
    calculated_time numeric,
    calculated_material_cost numeric,
    calculated_total_cost numeric,
    actual_time numeric NOT NULL,
    actual_material_used numeric NOT NULL,
    actual_energy_used numeric,
    time_adjustment_factor numeric DEFAULT 1.0,
    material_adjustment_factor numeric DEFAULT 1.0,
    cost_adjustment_factor numeric DEFAULT 1.0,
    notes text,
    is_active boolean DEFAULT true,
    CONSTRAINT calculator_calibrations_test_type_check CHECK ((test_type = ANY (ARRAY['with_supports'::text, 'without_supports'::text, 'custom_config'::text])))
);


--
-- Name: calibration_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calibration_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    calibration_test_id uuid NOT NULL,
    material_id uuid,
    layer_height numeric NOT NULL,
    infill_percentage integer DEFAULT 20 NOT NULL,
    print_speed integer DEFAULT 50 NOT NULL,
    calculated_volume numeric,
    calculated_weight numeric,
    calculated_time numeric,
    actual_time_minutes integer NOT NULL,
    actual_material_grams numeric NOT NULL,
    actual_energy_kwh numeric,
    time_adjustment_factor numeric,
    material_adjustment_factor numeric,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calibration_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calibration_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_name text NOT NULL,
    material_id uuid,
    geometry_classification text,
    size_category text,
    supports_enabled boolean,
    layer_height numeric,
    time_adjustment_factor numeric DEFAULT 1.0 NOT NULL,
    material_adjustment_factor numeric DEFAULT 1.0 NOT NULL,
    sample_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT calibration_profiles_geometry_classification_check CHECK ((geometry_classification = ANY (ARRAY['thin_tall'::text, 'wide_short'::text, 'large'::text, 'hollow'::text, 'complex'::text, 'compact'::text]))),
    CONSTRAINT calibration_profiles_size_category_check CHECK ((size_category = ANY (ARRAY['small'::text, 'medium'::text, 'large'::text])))
);


--
-- Name: calibration_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calibration_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_name text NOT NULL,
    stl_file_path text NOT NULL,
    geometry_classification text,
    size_category text,
    supports_enabled boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT calibration_tests_geometry_classification_check CHECK ((geometry_classification = ANY (ARRAY['thin_tall'::text, 'wide_short'::text, 'large'::text, 'hollow'::text, 'complex'::text, 'compact'::text]))),
    CONSTRAINT calibration_tests_size_category_check CHECK ((size_category = ANY (ARRAY['small'::text, 'medium'::text, 'large'::text])))
);


--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id text,
    product_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    selected_color uuid,
    selected_material uuid,
    custom_text text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: checkout_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checkout_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    shipping_info jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL
);


--
-- Name: colors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.colors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    hex_code text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    discount_type text NOT NULL,
    discount_value numeric NOT NULL,
    min_purchase numeric DEFAULT 0,
    max_uses integer,
    times_used integer DEFAULT 0,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    points_required integer,
    product_id uuid,
    is_loyalty_reward boolean DEFAULT false,
    CONSTRAINT coupons_discount_type_check CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'free_shipping'::text])))
);


--
-- Name: custom_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    display_name text NOT NULL,
    description text,
    allowed_pages text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    concept text NOT NULL,
    amount numeric NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: footer_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.footer_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    section text DEFAULT 'help'::text NOT NULL,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: gift_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    initial_amount numeric NOT NULL,
    current_balance numeric NOT NULL,
    recipient_email text NOT NULL,
    sender_name text,
    message text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    deleted_at timestamp with time zone,
    tax_enabled boolean DEFAULT false
);

ALTER TABLE ONLY public.gift_cards REPLICA IDENTITY FULL;


--
-- Name: homepage_banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homepage_banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    image_url text NOT NULL,
    title text NOT NULL,
    description text,
    link_url text,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    video_url text
);


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    product_id uuid,
    product_name text NOT NULL,
    description text,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    tax_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_number text NOT NULL,
    order_id uuid,
    user_id uuid,
    issue_date timestamp with time zone DEFAULT now(),
    due_date timestamp with time zone,
    payment_method text,
    payment_status text DEFAULT 'pending'::text,
    subtotal numeric NOT NULL,
    tax numeric DEFAULT 0,
    total numeric NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    discount numeric(10,2) DEFAULT 0,
    gift_card_code text,
    gift_card_amount numeric(10,2) DEFAULT 0,
    coupon_code text,
    coupon_discount numeric(10,2) DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    shipping numeric DEFAULT 0,
    quote_id uuid
);


--
-- Name: legal_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_type text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    is_published boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT legal_pages_page_type_check CHECK ((page_type = ANY (ARRAY['privacy'::text, 'cookies'::text, 'terms'::text, 'legal_notice'::text])))
);


--
-- Name: loyalty_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    points_change integer NOT NULL,
    reason text NOT NULL,
    admin_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: loyalty_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    points_balance integer DEFAULT 0 NOT NULL,
    lifetime_points integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: loyalty_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    reward_id uuid NOT NULL,
    points_spent integer NOT NULL,
    coupon_code text,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    used_at timestamp with time zone,
    expires_at timestamp with time zone
);


--
-- Name: loyalty_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_rewards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    points_required integer NOT NULL,
    reward_value numeric NOT NULL,
    reward_type text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT loyalty_rewards_reward_type_check CHECK ((reward_type = ANY (ARRAY['discount'::text, 'coupon'::text, 'free_shipping'::text])))
);


--
-- Name: loyalty_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    points_per_dollar numeric DEFAULT 1 NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: material_colors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.material_colors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    material_id uuid NOT NULL,
    color_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    cost numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    sender_name text NOT NULL,
    sender_email text NOT NULL,
    subject text,
    message text NOT NULL,
    is_admin_message boolean DEFAULT false,
    is_read boolean DEFAULT false,
    parent_message_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    attachments jsonb DEFAULT '[]'::jsonb
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    product_name text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric NOT NULL,
    total_price numeric NOT NULL,
    selected_color uuid,
    selected_material uuid,
    custom_text text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_items_must_have_product CHECK (((product_id IS NOT NULL) OR (product_name IS NOT NULL)))
);


--
-- Name: order_statuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_statuses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#3b82f6'::text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number text DEFAULT public.generate_order_number() NOT NULL,
    user_id uuid,
    status_id uuid,
    subtotal numeric NOT NULL,
    tax numeric DEFAULT 0,
    shipping numeric DEFAULT 0,
    discount numeric DEFAULT 0,
    total numeric NOT NULL,
    shipping_address text,
    billing_address text,
    payment_method text,
    payment_status text DEFAULT 'pending'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    content text NOT NULL,
    is_published boolean DEFAULT true,
    meta_description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: printing_calculator_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.printing_calculator_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_colors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_colors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    color_id uuid NOT NULL
);


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    image_url text NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    material_id uuid NOT NULL
);


--
-- Name: product_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_shipping_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_shipping_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    country_code text,
    shipping_cost numeric NOT NULL,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2),
    stock integer DEFAULT 0,
    category_id uuid,
    allow_direct_purchase boolean DEFAULT true,
    enable_material_selection boolean DEFAULT false,
    enable_color_selection boolean DEFAULT false,
    enable_custom_text boolean DEFAULT false,
    visible_to_all boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    tax_enabled boolean DEFAULT true,
    weight numeric(10,2),
    length numeric(10,2),
    width numeric(10,2),
    height numeric(10,2),
    video_url text,
    shipping_type text DEFAULT 'standard'::text,
    custom_shipping_cost numeric,
    CONSTRAINT products_shipping_type_check CHECK ((shipping_type = ANY (ARRAY['standard'::text, 'free'::text, 'custom'::text, 'disabled'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    email text,
    phone text,
    address text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    admin_pin text,
    is_blocked boolean DEFAULT false,
    blocked_reason text,
    blocked_at timestamp with time zone,
    reviews_blocked boolean DEFAULT false,
    city text,
    postal_code text,
    country text DEFAULT 'Bélgica'::text
);


--
-- Name: quote_statuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_statuses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#3b82f6'::text,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    customer_name text NOT NULL,
    customer_email text NOT NULL,
    quote_type text NOT NULL,
    status_id uuid DEFAULT '71f18d33-e0fb-4033-9cbb-eef8bbb02791'::uuid,
    description text,
    file_url text,
    material_id uuid,
    color_id uuid,
    product_id uuid,
    custom_text text,
    estimated_price numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    file_storage_path text,
    calculated_volume numeric,
    calculated_weight numeric,
    calculated_material_cost numeric,
    calculated_time_estimate numeric,
    calculation_details jsonb,
    supports_required boolean,
    layer_height numeric,
    let_team_decide_supports boolean DEFAULT false,
    let_team_decide_layer boolean DEFAULT false,
    country text DEFAULT 'Bélgica'::text,
    postal_code text,
    phone text,
    shipping_cost numeric,
    shipping_zone text,
    quantity integer DEFAULT 1,
    CONSTRAINT quotes_quote_type_check CHECK ((quote_type = ANY (ARRAY['file_upload'::text, 'service'::text, 'product'::text])))
);


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    title text,
    comment text,
    is_approved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: shipping_countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_countries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_code text NOT NULL,
    country_name text NOT NULL,
    shipping_cost numeric DEFAULT 0,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: shipping_postal_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_postal_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_code text NOT NULL,
    postal_code text NOT NULL,
    shipping_cost numeric NOT NULL,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: shipping_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    free_shipping_threshold numeric DEFAULT 0,
    default_shipping_cost numeric DEFAULT 5,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: shipping_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zone_name text NOT NULL,
    country text DEFAULT 'Bélgica'::text NOT NULL,
    postal_code_prefix text NOT NULL,
    base_cost numeric DEFAULT 5.00 NOT NULL,
    cost_per_kg numeric DEFAULT 2.00 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    minimum_cost numeric DEFAULT 5.00,
    is_default boolean DEFAULT false
);


--
-- Name: site_customization; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_customization (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    primary_color text DEFAULT '#3b82f6'::text NOT NULL,
    secondary_color text DEFAULT '#8b5cf6'::text NOT NULL,
    text_color_light text DEFAULT '#000000'::text NOT NULL,
    text_color_dark text DEFAULT '#ffffff'::text NOT NULL,
    logo_url text,
    logo_dark_url text,
    favicon_url text,
    site_name text DEFAULT '3DThuis.be'::text NOT NULL,
    copyright_text text DEFAULT '© 2024 3DThuis.be. Todos los derechos reservados.'::text NOT NULL,
    company_name text DEFAULT '3DThuis.be'::text NOT NULL,
    company_address text,
    legal_email text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    social_facebook text,
    social_instagram text,
    social_twitter text,
    social_linkedin text,
    social_tiktok text,
    social_youtube text,
    company_phone text,
    company_tax_id text,
    company_website text,
    navbar_color text DEFAULT '#ffffff'::text NOT NULL,
    background_color text DEFAULT '#ffffff'::text,
    home_hero_bg_color text DEFAULT '#fef2f2'::text,
    card_bg_color text DEFAULT '#ffffff'::text,
    font_heading text DEFAULT 'Playfair Display'::text,
    font_body text DEFAULT 'Inter'::text,
    theme_preset text DEFAULT 'modern-bold'::text,
    border_radius text DEFAULT '0.75rem'::text,
    button_style text DEFAULT 'rounded'::text,
    base_font_size text DEFAULT '16'::text,
    heading_size_h1 text DEFAULT '36'::text,
    heading_size_h2 text DEFAULT '30'::text,
    heading_size_h3 text DEFAULT '24'::text,
    sidebar_text_color text DEFAULT '#FFFFFF'::text,
    sidebar_label_size text DEFAULT '11'::text,
    admin_sidebar_active_bg text DEFAULT '#3B82F6'::text,
    admin_sidebar_bg text DEFAULT '#1E293B'::text
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value text NOT NULL,
    setting_group text DEFAULT 'general'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: support_detection_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_detection_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    overhang_angle_threshold integer DEFAULT 45 NOT NULL,
    min_support_area_percent numeric DEFAULT 15.0 NOT NULL,
    material_risk_pla numeric DEFAULT 1.0 NOT NULL,
    material_risk_petg numeric DEFAULT 1.3 NOT NULL,
    material_risk_abs numeric DEFAULT 1.5 NOT NULL,
    detection_mode text DEFAULT 'balanced'::text NOT NULL,
    enable_bridging_detection boolean DEFAULT true NOT NULL,
    max_bridging_distance integer DEFAULT 35 NOT NULL,
    high_confidence_threshold integer DEFAULT 75 NOT NULL,
    medium_confidence_threshold integer DEFAULT 40 NOT NULL,
    enable_length_analysis boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT detection_mode_check CHECK ((detection_mode = ANY (ARRAY['conservative'::text, 'balanced'::text, 'aggressive'::text])))
);


--
-- Name: tax_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    tax_rate numeric DEFAULT 21.0 NOT NULL,
    tax_name text DEFAULT 'IVA'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'client'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: visitor_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visitor_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id text NOT NULL,
    ip_address text,
    user_agent text,
    page_path text,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true,
    device_type text,
    deleted_at timestamp with time zone,
    country text,
    city text,
    browser text,
    os text
);


--
-- Name: api_rate_limits api_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_rate_limits
    ADD CONSTRAINT api_rate_limits_pkey PRIMARY KEY (user_id, endpoint);


--
-- Name: backup_metadata backup_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_metadata
    ADD CONSTRAINT backup_metadata_pkey PRIMARY KEY (id);


--
-- Name: backup_retention_settings backup_retention_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_retention_settings
    ADD CONSTRAINT backup_retention_settings_pkey PRIMARY KEY (id);


--
-- Name: backup_retention_settings backup_retention_settings_table_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_retention_settings
    ADD CONSTRAINT backup_retention_settings_table_name_key UNIQUE (table_name);


--
-- Name: blog_categories blog_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT blog_categories_name_key UNIQUE (name);


--
-- Name: blog_categories blog_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT blog_categories_pkey PRIMARY KEY (id);


--
-- Name: blog_categories blog_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_categories
    ADD CONSTRAINT blog_categories_slug_key UNIQUE (slug);


--
-- Name: blog_post_roles blog_post_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_post_roles
    ADD CONSTRAINT blog_post_roles_pkey PRIMARY KEY (id);


--
-- Name: blog_post_roles blog_post_roles_post_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_post_roles
    ADD CONSTRAINT blog_post_roles_post_id_role_key UNIQUE (post_id, role);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);


--
-- Name: calculator_calibrations calculator_calibrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculator_calibrations
    ADD CONSTRAINT calculator_calibrations_pkey PRIMARY KEY (id);


--
-- Name: calibration_materials calibration_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibration_materials
    ADD CONSTRAINT calibration_materials_pkey PRIMARY KEY (id);


--
-- Name: calibration_profiles calibration_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibration_profiles
    ADD CONSTRAINT calibration_profiles_pkey PRIMARY KEY (id);


--
-- Name: calibration_tests calibration_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibration_tests
    ADD CONSTRAINT calibration_tests_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: checkout_sessions checkout_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_sessions
    ADD CONSTRAINT checkout_sessions_pkey PRIMARY KEY (id);


--
-- Name: colors colors_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colors
    ADD CONSTRAINT colors_name_key UNIQUE (name);


--
-- Name: colors colors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colors
    ADD CONSTRAINT colors_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: custom_roles custom_roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_roles
    ADD CONSTRAINT custom_roles_name_key UNIQUE (name);


--
-- Name: custom_roles custom_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_roles
    ADD CONSTRAINT custom_roles_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: footer_links footer_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.footer_links
    ADD CONSTRAINT footer_links_pkey PRIMARY KEY (id);


--
-- Name: gift_cards gift_cards_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_code_key UNIQUE (code);


--
-- Name: gift_cards gift_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_pkey PRIMARY KEY (id);


--
-- Name: homepage_banners homepage_banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homepage_banners
    ADD CONSTRAINT homepage_banners_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: legal_pages legal_pages_page_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_pages
    ADD CONSTRAINT legal_pages_page_type_key UNIQUE (page_type);


--
-- Name: legal_pages legal_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_pages
    ADD CONSTRAINT legal_pages_pkey PRIMARY KEY (id);


--
-- Name: loyalty_adjustments loyalty_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_adjustments
    ADD CONSTRAINT loyalty_adjustments_pkey PRIMARY KEY (id);


--
-- Name: loyalty_points loyalty_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_points
    ADD CONSTRAINT loyalty_points_pkey PRIMARY KEY (id);


--
-- Name: loyalty_points loyalty_points_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_points
    ADD CONSTRAINT loyalty_points_user_id_unique UNIQUE (user_id);


--
-- Name: loyalty_redemptions loyalty_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_redemptions
    ADD CONSTRAINT loyalty_redemptions_pkey PRIMARY KEY (id);


--
-- Name: loyalty_rewards loyalty_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_rewards
    ADD CONSTRAINT loyalty_rewards_pkey PRIMARY KEY (id);


--
-- Name: loyalty_settings loyalty_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_settings
    ADD CONSTRAINT loyalty_settings_pkey PRIMARY KEY (id);


--
-- Name: material_colors material_colors_material_id_color_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_colors
    ADD CONSTRAINT material_colors_material_id_color_id_key UNIQUE (material_id, color_id);


--
-- Name: material_colors material_colors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_colors
    ADD CONSTRAINT material_colors_pkey PRIMARY KEY (id);


--
-- Name: materials materials_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_name_key UNIQUE (name);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_statuses order_statuses_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_statuses
    ADD CONSTRAINT order_statuses_name_key UNIQUE (name);


--
-- Name: order_statuses order_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_statuses
    ADD CONSTRAINT order_statuses_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: pages pages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_slug_key UNIQUE (slug);


--
-- Name: printing_calculator_settings printing_calculator_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.printing_calculator_settings
    ADD CONSTRAINT printing_calculator_settings_pkey PRIMARY KEY (id);


--
-- Name: printing_calculator_settings printing_calculator_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.printing_calculator_settings
    ADD CONSTRAINT printing_calculator_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: product_colors product_colors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_colors
    ADD CONSTRAINT product_colors_pkey PRIMARY KEY (id);


--
-- Name: product_colors product_colors_product_id_color_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_colors
    ADD CONSTRAINT product_colors_product_id_color_id_key UNIQUE (product_id, color_id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: product_materials product_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_materials
    ADD CONSTRAINT product_materials_pkey PRIMARY KEY (id);


--
-- Name: product_materials product_materials_product_id_material_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_materials
    ADD CONSTRAINT product_materials_product_id_material_id_key UNIQUE (product_id, material_id);


--
-- Name: product_roles product_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_roles
    ADD CONSTRAINT product_roles_pkey PRIMARY KEY (id);


--
-- Name: product_roles product_roles_product_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_roles
    ADD CONSTRAINT product_roles_product_id_role_key UNIQUE (product_id, role);


--
-- Name: product_shipping_rates product_shipping_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_shipping_rates
    ADD CONSTRAINT product_shipping_rates_pkey PRIMARY KEY (id);


--
-- Name: product_shipping_rates product_shipping_rates_product_id_country_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_shipping_rates
    ADD CONSTRAINT product_shipping_rates_product_id_country_code_key UNIQUE (product_id, country_code);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: quote_statuses quote_statuses_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_statuses
    ADD CONSTRAINT quote_statuses_name_key UNIQUE (name);


--
-- Name: quote_statuses quote_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_statuses
    ADD CONSTRAINT quote_statuses_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: shipping_countries shipping_countries_country_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_countries
    ADD CONSTRAINT shipping_countries_country_code_key UNIQUE (country_code);


--
-- Name: shipping_countries shipping_countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_countries
    ADD CONSTRAINT shipping_countries_pkey PRIMARY KEY (id);


--
-- Name: shipping_postal_codes shipping_postal_codes_country_code_postal_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_postal_codes
    ADD CONSTRAINT shipping_postal_codes_country_code_postal_code_key UNIQUE (country_code, postal_code);


--
-- Name: shipping_postal_codes shipping_postal_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_postal_codes
    ADD CONSTRAINT shipping_postal_codes_pkey PRIMARY KEY (id);


--
-- Name: shipping_settings shipping_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_settings
    ADD CONSTRAINT shipping_settings_pkey PRIMARY KEY (id);


--
-- Name: shipping_zones shipping_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_zones
    ADD CONSTRAINT shipping_zones_pkey PRIMARY KEY (id);


--
-- Name: site_customization site_customization_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_customization
    ADD CONSTRAINT site_customization_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: support_detection_settings support_detection_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_detection_settings
    ADD CONSTRAINT support_detection_settings_pkey PRIMARY KEY (id);


--
-- Name: tax_settings tax_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_settings
    ADD CONSTRAINT tax_settings_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: visitor_sessions visitor_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_sessions
    ADD CONSTRAINT visitor_sessions_pkey PRIMARY KEY (id);


--
-- Name: visitor_sessions visitor_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_sessions
    ADD CONSTRAINT visitor_sessions_session_id_key UNIQUE (session_id);


--
-- Name: idx_adjustments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_adjustments_user ON public.loyalty_adjustments USING btree (user_id, created_at DESC);


--
-- Name: idx_backup_metadata_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_metadata_deleted_at ON public.backup_metadata USING btree (deleted_at);


--
-- Name: idx_backup_metadata_expiration; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_metadata_expiration ON public.backup_metadata USING btree (expiration_date) WHERE (permanently_deleted_at IS NULL);


--
-- Name: idx_backup_metadata_table_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_backup_metadata_table_record ON public.backup_metadata USING btree (table_name, record_id);


--
-- Name: idx_blog_post_roles_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_post_roles_post_id ON public.blog_post_roles USING btree (post_id);


--
-- Name: idx_blog_post_roles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_post_roles_role ON public.blog_post_roles USING btree (role);


--
-- Name: idx_blog_posts_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_deleted_at ON public.blog_posts USING btree (deleted_at);


--
-- Name: idx_calculator_calibrations_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calculator_calibrations_is_active ON public.calculator_calibrations USING btree (is_active);


--
-- Name: idx_calculator_calibrations_test_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calculator_calibrations_test_type ON public.calculator_calibrations USING btree (test_type);


--
-- Name: idx_calibration_materials_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calibration_materials_active ON public.calibration_materials USING btree (is_active);


--
-- Name: idx_calibration_materials_material; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calibration_materials_material ON public.calibration_materials USING btree (material_id);


--
-- Name: idx_calibration_materials_test; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calibration_materials_test ON public.calibration_materials USING btree (calibration_test_id);


--
-- Name: idx_calibration_profiles_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calibration_profiles_active ON public.calibration_profiles USING btree (is_active);


--
-- Name: idx_calibration_profiles_material; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calibration_profiles_material ON public.calibration_profiles USING btree (material_id);


--
-- Name: idx_cart_items_user_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_user_session ON public.cart_items USING btree (user_id, session_id);


--
-- Name: idx_categories_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_deleted_at ON public.categories USING btree (deleted_at);


--
-- Name: idx_checkout_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checkout_sessions_expires_at ON public.checkout_sessions USING btree (expires_at);


--
-- Name: idx_colors_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colors_deleted_at ON public.colors USING btree (deleted_at);


--
-- Name: idx_coupons_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupons_deleted_at ON public.coupons USING btree (deleted_at);


--
-- Name: idx_coupons_loyalty_reward; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupons_loyalty_reward ON public.coupons USING btree (is_loyalty_reward) WHERE (is_loyalty_reward = true);


--
-- Name: idx_coupons_points_required; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupons_points_required ON public.coupons USING btree (points_required) WHERE (points_required IS NOT NULL);


--
-- Name: idx_coupons_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupons_product_id ON public.coupons USING btree (product_id) WHERE (product_id IS NOT NULL);


--
-- Name: idx_gift_cards_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_cards_deleted_at ON public.gift_cards USING btree (deleted_at);


--
-- Name: idx_invoice_items_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id);


--
-- Name: idx_invoice_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_items_product_id ON public.invoice_items USING btree (product_id);


--
-- Name: idx_invoices_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_deleted_at ON public.invoices USING btree (deleted_at);


--
-- Name: idx_invoices_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_payment_status ON public.invoices USING btree (payment_status);


--
-- Name: idx_invoices_payment_status_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_payment_status_user ON public.invoices USING btree (payment_status, user_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_invoices_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_quote_id ON public.invoices USING btree (quote_id);


--
-- Name: idx_invoices_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_updated_at ON public.invoices USING btree (updated_at);


--
-- Name: idx_loyalty_points_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_points_user_id ON public.loyalty_points USING btree (user_id);


--
-- Name: idx_material_colors_color_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_material_colors_color_id ON public.material_colors USING btree (color_id);


--
-- Name: idx_material_colors_material_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_material_colors_material_id ON public.material_colors USING btree (material_id);


--
-- Name: idx_materials_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_materials_deleted_at ON public.materials USING btree (deleted_at);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_messages_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_user_id ON public.messages USING btree (user_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_unique_recent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unique_recent ON public.notifications USING btree (user_id, type, title, created_at DESC);


--
-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id) WHERE (product_id IS NOT NULL);


--
-- Name: idx_order_statuses_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_statuses_deleted_at ON public.order_statuses USING btree (deleted_at);


--
-- Name: idx_orders_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_deleted_at ON public.orders USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_orders_payment_status_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_payment_status_user ON public.orders USING btree (payment_status, user_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_orders_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_status ON public.orders USING btree (user_id, status_id) WHERE (payment_status <> 'cancelled'::text);


--
-- Name: idx_pages_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pages_deleted_at ON public.pages USING btree (deleted_at);


--
-- Name: idx_product_images_product_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_images_product_order ON public.product_images USING btree (product_id, display_order);


--
-- Name: idx_product_roles_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_roles_product_id ON public.product_roles USING btree (product_id);


--
-- Name: idx_product_roles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_roles_role ON public.product_roles USING btree (role);


--
-- Name: idx_products_category_visible; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_category_visible ON public.products USING btree (category_id, visible_to_all) WHERE (deleted_at IS NULL);


--
-- Name: idx_products_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_deleted_at ON public.products USING btree (deleted_at);


--
-- Name: idx_profiles_is_blocked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_is_blocked ON public.profiles USING btree (is_blocked);


--
-- Name: idx_profiles_reviews_blocked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_reviews_blocked ON public.profiles USING btree (reviews_blocked);


--
-- Name: idx_quote_statuses_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_statuses_deleted_at ON public.quote_statuses USING btree (deleted_at);


--
-- Name: idx_quotes_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_deleted_at ON public.quotes USING btree (deleted_at);


--
-- Name: idx_quotes_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_status_created ON public.quotes USING btree (status_id, created_at DESC);


--
-- Name: idx_redemptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_redemptions_status ON public.loyalty_redemptions USING btree (status);


--
-- Name: idx_redemptions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_redemptions_user ON public.loyalty_redemptions USING btree (user_id, created_at DESC);


--
-- Name: idx_support_detection_settings_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_detection_settings_mode ON public.support_detection_settings USING btree (detection_mode);


--
-- Name: idx_user_roles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: idx_visitor_sessions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitor_sessions_active ON public.visitor_sessions USING btree (is_active);


--
-- Name: idx_visitor_sessions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitor_sessions_created ON public.visitor_sessions USING btree (created_at DESC);


--
-- Name: idx_visitor_sessions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitor_sessions_created_at ON public.visitor_sessions USING btree (created_at DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_visitor_sessions_device_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitor_sessions_device_type ON public.visitor_sessions USING btree (device_type) WHERE (deleted_at IS NULL);


--
-- Name: idx_visitor_sessions_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitor_sessions_is_active ON public.visitor_sessions USING btree (is_active) WHERE (deleted_at IS NULL);


--
-- Name: idx_visitor_sessions_last_seen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitor_sessions_last_seen ON public.visitor_sessions USING btree (last_seen_at);


--
-- Name: idx_visitor_sessions_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitor_sessions_session_id ON public.visitor_sessions USING btree (session_id);


--
-- Name: idx_visitor_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_visitor_sessions_user_id ON public.visitor_sessions USING btree (user_id);


--
-- Name: orders activate_gift_card_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER activate_gift_card_trigger AFTER UPDATE OF payment_status ON public.orders FOR EACH ROW WHEN (((new.payment_status = 'paid'::text) AND ((old.payment_status IS NULL) OR (old.payment_status <> 'paid'::text)))) EXECUTE FUNCTION public.activate_gift_card_on_payment();


--
-- Name: blog_posts backup_metadata_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER backup_metadata_trigger AFTER UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.create_backup_metadata();


--
-- Name: categories backup_metadata_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER backup_metadata_trigger AFTER UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.create_backup_metadata();


--
-- Name: colors backup_metadata_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER backup_metadata_trigger AFTER UPDATE ON public.colors FOR EACH ROW EXECUTE FUNCTION public.create_backup_metadata();


--
-- Name: coupons backup_metadata_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER backup_metadata_trigger AFTER UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.create_backup_metadata();


--
-- Name: gift_cards backup_metadata_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER backup_metadata_trigger AFTER UPDATE ON public.gift_cards FOR EACH ROW EXECUTE FUNCTION public.create_backup_metadata();


--
-- Name: invoices backup_metadata_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER backup_metadata_trigger AFTER UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.create_backup_metadata();


--
-- Name: legal_pages backup_metadata_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER backup_metadata_trigger AFTER UPDATE ON public.legal_pages FOR EACH ROW EXECUTE FUNCTION public.create_backup_metadata();


--
-- Name: materials backup_metadata_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER backup_metadata_trigger AFTER UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.create_backup_metadata();


--
-- Name: notifications backup_metadata_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER backup_metadata_trigger AFTER UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.create_backup_metadata();


--
-- Name: order_statuses backup_metadata_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER backup_metadata_trigger AFTER UPDATE ON public.order_statuses FOR EACH ROW EXECUTE FUNCTION public.create_backup_metadata();


--
-- Name: orders backup_metadata_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER backup_metadata_trigger AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.create_backup_metadata();


--
-- Name: pages backup_metadata_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER backup_metadata_trigger AFTER UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.create_backup_metadata();


--
-- Name: products backup_metadata_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER backup_metadata_trigger AFTER UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.create_backup_metadata();


--
-- Name: quote_statuses backup_metadata_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER backup_metadata_trigger AFTER UPDATE ON public.quote_statuses FOR EACH ROW EXECUTE FUNCTION public.create_backup_metadata();


--
-- Name: quotes backup_metadata_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER backup_metadata_trigger AFTER UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.create_backup_metadata();


--
-- Name: profiles hash_pin_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER hash_pin_trigger BEFORE INSERT OR UPDATE OF admin_pin ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.hash_admin_pin();


--
-- Name: invoices notify_invoice_payment_status_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_invoice_payment_status_trigger AFTER UPDATE OF payment_status ON public.invoices FOR EACH ROW WHEN ((old.payment_status IS DISTINCT FROM new.payment_status)) EXECUTE FUNCTION public.notify_invoice_payment_status_change();


--
-- Name: invoices on_invoice_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_invoice_created AFTER INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.notify_new_invoice();


--
-- Name: invoices on_invoice_payment_status_changed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_invoice_payment_status_changed AFTER UPDATE OF payment_status ON public.invoices FOR EACH ROW WHEN ((old.payment_status IS DISTINCT FROM new.payment_status)) EXECUTE FUNCTION public.notify_invoice_payment_status_change();


--
-- Name: messages on_message_received; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_message_received AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_message_received();


--
-- Name: orders on_order_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_order_created AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.trigger_new_order_email();


--
-- Name: orders on_order_payment_status_changed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_order_payment_status_changed AFTER UPDATE OF payment_status ON public.orders FOR EACH ROW WHEN ((old.payment_status IS DISTINCT FROM new.payment_status)) EXECUTE FUNCTION public.activate_gift_card_on_payment();


--
-- Name: orders on_order_status_changed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_order_status_changed AFTER UPDATE OF status_id ON public.orders FOR EACH ROW WHEN ((old.status_id IS DISTINCT FROM new.status_id)) EXECUTE FUNCTION public.notify_order_status_change();


--
-- Name: quotes on_quote_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_quote_created AFTER INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.notify_new_quote();


--
-- Name: quotes on_quote_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_quote_updated AFTER UPDATE OF estimated_price ON public.quotes FOR EACH ROW WHEN (((old.estimated_price IS NULL) AND (new.estimated_price IS NOT NULL))) EXECUTE FUNCTION public.notify_quote_update();


--
-- Name: orders trigger_activate_gift_card; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_activate_gift_card AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.activate_gift_card_on_payment();


--
-- Name: orders trigger_activate_gift_card_on_payment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_activate_gift_card_on_payment AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.activate_gift_card_on_payment();


--
-- Name: orders trigger_auto_generate_invoice; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_generate_invoice AFTER UPDATE OF payment_status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.auto_generate_invoice_on_payment();


--
-- Name: quotes trigger_auto_generate_invoice_from_quote; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_generate_invoice_from_quote AFTER UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.auto_generate_invoice_from_quote();


--
-- Name: profiles trigger_initialize_loyalty_points; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_initialize_loyalty_points AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.initialize_loyalty_points();


--
-- Name: invoices trigger_invoice_loyalty_points; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_invoice_loyalty_points AFTER INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.handle_invoice_loyalty_points();


--
-- Name: invoices trigger_new_invoice_with_email; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_new_invoice_with_email AFTER INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.trigger_new_invoice_with_email();


--
-- Name: quotes trigger_new_quote_with_email; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_new_quote_with_email AFTER INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.trigger_new_quote_with_email();


--
-- Name: loyalty_points trigger_notify_available_coupons; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_available_coupons AFTER UPDATE ON public.loyalty_points FOR EACH ROW EXECUTE FUNCTION public.notify_available_loyalty_coupons();


--
-- Name: loyalty_points trigger_notify_points_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_points_change AFTER UPDATE ON public.loyalty_points FOR EACH ROW EXECUTE FUNCTION public.notify_points_change_with_email();


--
-- Name: loyalty_points trigger_notify_rewards; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_rewards AFTER UPDATE ON public.loyalty_points FOR EACH ROW EXECUTE FUNCTION public.notify_available_rewards();


--
-- Name: orders trigger_order_changes_with_email; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_order_changes_with_email AFTER UPDATE ON public.orders FOR EACH ROW WHEN (((old.status_id IS DISTINCT FROM new.status_id) OR (old.payment_status IS DISTINCT FROM new.payment_status))) EXECUTE FUNCTION public.trigger_order_changes_with_email();


--
-- Name: orders trigger_order_loyalty_points; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_order_loyalty_points AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_order_loyalty_points();


--
-- Name: quotes trigger_quote_update_with_email; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_quote_update_with_email AFTER UPDATE OF estimated_price ON public.quotes FOR EACH ROW WHEN (((old.estimated_price IS NULL) AND (new.estimated_price IS NOT NULL))) EXECUTE FUNCTION public.trigger_quote_update_with_email();


--
-- Name: visitor_sessions trigger_set_visitor_device_type; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_visitor_device_type BEFORE INSERT OR UPDATE ON public.visitor_sessions FOR EACH ROW EXECUTE FUNCTION public.set_visitor_device_type();


--
-- Name: orders trigger_sync_invoice_payment_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_invoice_payment_status AFTER UPDATE OF payment_status ON public.orders FOR EACH ROW WHEN ((old.payment_status IS DISTINCT FROM new.payment_status)) EXECUTE FUNCTION public.sync_invoice_payment_status();


--
-- Name: calibration_profiles trigger_update_calibration_profile_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_calibration_profile_updated_at BEFORE UPDATE ON public.calibration_profiles FOR EACH ROW EXECUTE FUNCTION public.update_calibration_profile_updated_at();


--
-- Name: invoices trigger_update_invoice_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_invoice_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_invoice_updated_at();


--
-- Name: support_detection_settings trigger_update_support_detection_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_support_detection_settings_updated_at BEFORE UPDATE ON public.support_detection_settings FOR EACH ROW EXECUTE FUNCTION public.update_support_detection_settings_updated_at();


--
-- Name: backup_retention_settings update_backup_retention_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_backup_retention_settings_updated_at BEFORE UPDATE ON public.backup_retention_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_posts update_blog_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: calculator_calibrations update_calculator_calibrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_calculator_calibrations_updated_at BEFORE UPDATE ON public.calculator_calibrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: printing_calculator_settings update_calculator_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_calculator_settings_updated_at BEFORE UPDATE ON public.printing_calculator_settings FOR EACH ROW EXECUTE FUNCTION public.update_calculator_settings_updated_at();


--
-- Name: cart_items update_cart_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: custom_roles update_custom_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_custom_roles_updated_at BEFORE UPDATE ON public.custom_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: homepage_banners update_homepage_banners_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_homepage_banners_updated_at BEFORE UPDATE ON public.homepage_banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices update_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: legal_pages update_legal_pages_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_legal_pages_timestamp BEFORE UPDATE ON public.legal_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: loyalty_points update_loyalty_points_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_loyalty_points_updated_at BEFORE UPDATE ON public.loyalty_points FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: loyalty_settings update_loyalty_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_loyalty_settings_updated_at BEFORE UPDATE ON public.loyalty_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: messages update_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pages update_pages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quotes update_quotes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reviews update_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shipping_settings update_shipping_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shipping_settings_updated_at BEFORE UPDATE ON public.shipping_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shipping_zones update_shipping_zones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shipping_zones_updated_at BEFORE UPDATE ON public.shipping_zones FOR EACH ROW EXECUTE FUNCTION public.update_shipping_zone_updated_at();


--
-- Name: site_customization update_site_customization_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_site_customization_timestamp BEFORE UPDATE ON public.site_customization FOR EACH ROW EXECUTE FUNCTION public.update_site_customization_updated_at();


--
-- Name: site_settings update_site_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: api_rate_limits api_rate_limits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_rate_limits
    ADD CONSTRAINT api_rate_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: backup_metadata backup_metadata_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_metadata
    ADD CONSTRAINT backup_metadata_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id);


--
-- Name: blog_post_roles blog_post_roles_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_post_roles
    ADD CONSTRAINT blog_post_roles_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.blog_posts(id) ON DELETE CASCADE;


--
-- Name: blog_posts blog_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id);


--
-- Name: blog_posts blog_posts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.blog_categories(id);


--
-- Name: calculator_calibrations calculator_calibrations_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculator_calibrations
    ADD CONSTRAINT calculator_calibrations_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id);


--
-- Name: calibration_materials calibration_materials_calibration_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibration_materials
    ADD CONSTRAINT calibration_materials_calibration_test_id_fkey FOREIGN KEY (calibration_test_id) REFERENCES public.calibration_tests(id) ON DELETE CASCADE;


--
-- Name: calibration_materials calibration_materials_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibration_materials
    ADD CONSTRAINT calibration_materials_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;


--
-- Name: calibration_profiles calibration_profiles_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibration_profiles
    ADD CONSTRAINT calibration_profiles_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_selected_color_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_selected_color_fkey FOREIGN KEY (selected_color) REFERENCES public.colors(id);


--
-- Name: cart_items cart_items_selected_material_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_selected_material_fkey FOREIGN KEY (selected_material) REFERENCES public.materials(id);


--
-- Name: cart_items cart_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: checkout_sessions checkout_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checkout_sessions
    ADD CONSTRAINT checkout_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: coupons coupons_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_items invoice_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id);


--
-- Name: invoices invoices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: loyalty_adjustments loyalty_adjustments_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_adjustments
    ADD CONSTRAINT loyalty_adjustments_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id);


--
-- Name: loyalty_adjustments loyalty_adjustments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_adjustments
    ADD CONSTRAINT loyalty_adjustments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: loyalty_points loyalty_points_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_points
    ADD CONSTRAINT loyalty_points_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: loyalty_redemptions loyalty_redemptions_reward_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_redemptions
    ADD CONSTRAINT loyalty_redemptions_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES public.loyalty_rewards(id);


--
-- Name: loyalty_redemptions loyalty_redemptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_redemptions
    ADD CONSTRAINT loyalty_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: material_colors material_colors_color_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_colors
    ADD CONSTRAINT material_colors_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id) ON DELETE CASCADE;


--
-- Name: material_colors material_colors_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_colors
    ADD CONSTRAINT material_colors_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;


--
-- Name: messages messages_parent_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_parent_message_id_fkey FOREIGN KEY (parent_message_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: messages messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_selected_color_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_selected_color_fkey FOREIGN KEY (selected_color) REFERENCES public.colors(id);


--
-- Name: order_items order_items_selected_material_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_selected_material_fkey FOREIGN KEY (selected_material) REFERENCES public.materials(id);


--
-- Name: orders orders_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.order_statuses(id);


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: product_colors product_colors_color_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_colors
    ADD CONSTRAINT product_colors_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id) ON DELETE CASCADE;


--
-- Name: product_colors product_colors_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_colors
    ADD CONSTRAINT product_colors_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_materials product_materials_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_materials
    ADD CONSTRAINT product_materials_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE;


--
-- Name: product_materials product_materials_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_materials
    ADD CONSTRAINT product_materials_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_roles product_roles_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_roles
    ADD CONSTRAINT product_roles_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_shipping_rates product_shipping_rates_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_shipping_rates
    ADD CONSTRAINT product_shipping_rates_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_color_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id);


--
-- Name: quotes quotes_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id);


--
-- Name: quotes quotes_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: quotes quotes_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.quote_statuses(id);


--
-- Name: quotes quotes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: visitor_sessions visitor_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visitor_sessions
    ADD CONSTRAINT visitor_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: loyalty_adjustments Admins can create adjustments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create adjustments" ON public.loyalty_adjustments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: notifications Admins can create notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: invoice_items Admins can manage all invoice items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all invoice items" ON public.invoice_items TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: invoices Admins can manage all invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all invoices" ON public.invoices TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: order_items Admins can manage all order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all order items" ON public.order_items TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: orders Admins can manage all orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all orders" ON public.orders TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text)))));


--
-- Name: loyalty_points Admins can manage all points; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all points" ON public.loyalty_points TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: products Admins can manage all products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all products" ON public.products TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: quotes Admins can manage all quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all quotes" ON public.quotes TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: reviews Admins can manage all reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all reviews" ON public.reviews TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: homepage_banners Admins can manage banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage banners" ON public.homepage_banners TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: blog_categories Admins can manage blog categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage blog categories" ON public.blog_categories TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: blog_posts Admins can manage blog posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage blog posts" ON public.blog_posts TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: printing_calculator_settings Admins can manage calculator settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage calculator settings" ON public.printing_calculator_settings USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: calibration_materials Admins can manage calibration materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage calibration materials" ON public.calibration_materials USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: calibration_profiles Admins can manage calibration profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage calibration profiles" ON public.calibration_profiles USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: calibration_tests Admins can manage calibration tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage calibration tests" ON public.calibration_tests USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: calculator_calibrations Admins can manage calibrations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage calibrations" ON public.calculator_calibrations USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: categories Admins can manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage categories" ON public.categories TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: colors Admins can manage colors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage colors" ON public.colors TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: coupons Admins can manage coupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage coupons" ON public.coupons TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: custom_roles Admins can manage custom roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage custom roles" ON public.custom_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: expenses Admins can manage expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage expenses" ON public.expenses TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: footer_links Admins can manage footer links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage footer links" ON public.footer_links TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: gift_cards Admins can manage gift cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage gift cards" ON public.gift_cards TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: legal_pages Admins can manage legal pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage legal pages" ON public.legal_pages TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: loyalty_rewards Admins can manage loyalty rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage loyalty rewards" ON public.loyalty_rewards TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: loyalty_settings Admins can manage loyalty settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage loyalty settings" ON public.loyalty_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: material_colors Admins can manage material colors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage material colors" ON public.material_colors TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: materials Admins can manage materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage materials" ON public.materials TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: order_statuses Admins can manage order statuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage order statuses" ON public.order_statuses TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: pages Admins can manage pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage pages" ON public.pages TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: shipping_postal_codes Admins can manage postal codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage postal codes" ON public.shipping_postal_codes USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: product_colors Admins can manage product colors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage product colors" ON public.product_colors TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: product_images Admins can manage product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage product images" ON public.product_images TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: product_materials Admins can manage product materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage product materials" ON public.product_materials TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: product_roles Admins can manage product roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage product roles" ON public.product_roles TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text)))));


--
-- Name: product_shipping_rates Admins can manage product shipping rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage product shipping rates" ON public.product_shipping_rates USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: quote_statuses Admins can manage quote statuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage quote statuses" ON public.quote_statuses TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: loyalty_redemptions Admins can manage redemptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage redemptions" ON public.loyalty_redemptions TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: backup_retention_settings Admins can manage retention settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage retention settings" ON public.backup_retention_settings USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: shipping_countries Admins can manage shipping countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shipping countries" ON public.shipping_countries USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: shipping_settings Admins can manage shipping settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shipping settings" ON public.shipping_settings USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: shipping_zones Admins can manage shipping zones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shipping zones" ON public.shipping_zones TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: site_customization Admins can manage site customization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage site customization" ON public.site_customization TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: site_settings Admins can manage site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage site settings" ON public.site_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: support_detection_settings Admins can manage support detection settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage support detection settings" ON public.support_detection_settings USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: tax_settings Admins can manage tax settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage tax settings" ON public.tax_settings USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text)))));


--
-- Name: profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: backup_metadata Admins can update backup metadata; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update backup metadata" ON public.backup_metadata FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: messages Admins can update messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update messages" ON public.messages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: loyalty_adjustments Admins can view adjustments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view adjustments" ON public.loyalty_adjustments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: backup_metadata Admins can view all backup metadata; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all backup metadata" ON public.backup_metadata FOR SELECT USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: messages Admins can view all messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all messages" ON public.messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::text));


--
-- Name: visitor_sessions Admins can view all sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all sessions" ON public.visitor_sessions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::text)))));


--
-- Name: messages Anyone can create messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create messages" ON public.messages FOR INSERT WITH CHECK (true);


--
-- Name: order_items Anyone can create order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);


--
-- Name: visitor_sessions Anyone can create visitor session; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create visitor session" ON public.visitor_sessions FOR INSERT WITH CHECK (true);


--
-- Name: checkout_sessions Anyone can manage checkout sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can manage checkout sessions" ON public.checkout_sessions USING (((auth.uid() = user_id) OR (user_id IS NULL))) WITH CHECK (((auth.uid() = user_id) OR (user_id IS NULL)));


--
-- Name: visitor_sessions Anyone can update by session_id; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update by session_id" ON public.visitor_sessions FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: homepage_banners Anyone can view active banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active banners" ON public.homepage_banners FOR SELECT USING ((is_active = true));


--
-- Name: calibration_profiles Anyone can view active calibration profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active calibration profiles" ON public.calibration_profiles FOR SELECT USING ((is_active = true));


--
-- Name: coupons Anyone can view active coupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active coupons" ON public.coupons FOR SELECT USING ((is_active = true));


--
-- Name: footer_links Anyone can view active footer links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active footer links" ON public.footer_links FOR SELECT USING ((is_active = true));


--
-- Name: loyalty_rewards Anyone can view active rewards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active rewards" ON public.loyalty_rewards FOR SELECT USING ((is_active = true));


--
-- Name: shipping_zones Anyone can view active shipping zones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active shipping zones" ON public.shipping_zones FOR SELECT USING ((is_active = true));


--
-- Name: blog_categories Anyone can view blog categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view blog categories" ON public.blog_categories FOR SELECT USING (true);


--
-- Name: blog_post_roles Anyone can view blog post roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view blog post roles" ON public.blog_post_roles FOR SELECT USING (true);


--
-- Name: printing_calculator_settings Anyone can view calculator settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view calculator settings" ON public.printing_calculator_settings FOR SELECT USING (true);


--
-- Name: categories Anyone can view categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);


--
-- Name: colors Anyone can view colors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view colors" ON public.colors FOR SELECT USING (true);


--
-- Name: custom_roles Anyone can view custom roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view custom roles" ON public.custom_roles FOR SELECT TO authenticated USING (true);


--
-- Name: shipping_postal_codes Anyone can view enabled postal codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view enabled postal codes" ON public.shipping_postal_codes FOR SELECT USING ((is_enabled = true));


--
-- Name: shipping_countries Anyone can view enabled shipping countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view enabled shipping countries" ON public.shipping_countries FOR SELECT USING ((is_enabled = true));


--
-- Name: invoices Anyone can view invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view invoices" ON public.invoices FOR SELECT USING (((auth.uid() = user_id) OR (user_id IS NULL)));


--
-- Name: loyalty_settings Anyone can view loyalty settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view loyalty settings" ON public.loyalty_settings FOR SELECT USING (true);


--
-- Name: material_colors Anyone can view material colors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view material colors" ON public.material_colors FOR SELECT USING (true);


--
-- Name: materials Anyone can view materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view materials" ON public.materials FOR SELECT USING (true);


--
-- Name: order_statuses Anyone can view order statuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view order statuses" ON public.order_statuses FOR SELECT USING (true);


--
-- Name: product_colors Anyone can view product colors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view product colors" ON public.product_colors FOR SELECT USING (true);


--
-- Name: product_images Anyone can view product images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view product images" ON public.product_images FOR SELECT USING (true);


--
-- Name: product_materials Anyone can view product materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view product materials" ON public.product_materials FOR SELECT USING (true);


--
-- Name: product_roles Anyone can view product roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view product roles" ON public.product_roles FOR SELECT USING (true);


--
-- Name: product_shipping_rates Anyone can view product shipping rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view product shipping rates" ON public.product_shipping_rates FOR SELECT USING ((is_enabled = true));


--
-- Name: legal_pages Anyone can view published legal pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view published legal pages" ON public.legal_pages FOR SELECT USING ((is_published = true));


--
-- Name: pages Anyone can view published pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view published pages" ON public.pages FOR SELECT USING (((is_published = true) AND (deleted_at IS NULL)));


--
-- Name: blog_posts Anyone can view published posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view published posts" ON public.blog_posts FOR SELECT USING (((is_published = true) AND (deleted_at IS NULL)));


--
-- Name: quote_statuses Anyone can view quote statuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view quote statuses" ON public.quote_statuses FOR SELECT USING (true);


--
-- Name: backup_retention_settings Anyone can view retention settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view retention settings" ON public.backup_retention_settings FOR SELECT USING (true);


--
-- Name: shipping_settings Anyone can view shipping settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view shipping settings" ON public.shipping_settings FOR SELECT USING (true);


--
-- Name: site_customization Anyone can view site customization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view site customization" ON public.site_customization FOR SELECT USING (true);


--
-- Name: site_settings Anyone can view site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view site settings" ON public.site_settings FOR SELECT USING (true);


--
-- Name: support_detection_settings Anyone can view support detection settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view support detection settings" ON public.support_detection_settings FOR SELECT USING (true);


--
-- Name: tax_settings Anyone can view tax settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view tax settings" ON public.tax_settings FOR SELECT USING (true);


--
-- Name: orders Users and guests can create orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users and guests can create orders" ON public.orders FOR INSERT WITH CHECK (((auth.uid() = user_id) OR ((auth.uid() IS NULL) AND (user_id IS NULL))));


--
-- Name: cart_items Users and guests can manage cart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users and guests can manage cart" ON public.cart_items USING (((auth.uid() = user_id) OR (user_id IS NULL))) WITH CHECK (((auth.uid() = user_id) OR (user_id IS NULL)));


--
-- Name: quotes Users can create quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create quotes" ON public.quotes FOR INSERT WITH CHECK (true);


--
-- Name: reviews Users can create their own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own reviews" ON public.reviews FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notifications Users can delete their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: reviews Users can update their own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: reviews Users can view approved reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view approved reviews" ON public.reviews FOR SELECT USING ((is_approved = true));


--
-- Name: loyalty_redemptions Users can view own redemptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own redemptions" ON public.loyalty_redemptions FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: visitor_sessions Users can view own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own sessions" ON public.visitor_sessions FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: products Users can view products based on roles or visibility; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view products based on roles or visibility" ON public.products FOR SELECT TO authenticated, anon USING (((NOT (EXISTS ( SELECT 1
   FROM public.product_roles
  WHERE (product_roles.product_id = products.id)))) OR (EXISTS ( SELECT 1
   FROM (public.product_roles pr
     LEFT JOIN public.user_roles ur ON (((ur.role = pr.role) AND (ur.user_id = auth.uid()))))
  WHERE ((pr.product_id = products.id) AND ((ur.user_id IS NOT NULL) OR (auth.uid() IS NULL))))) OR public.has_role(auth.uid(), 'admin'::text)));


--
-- Name: invoice_items Users can view their own invoice items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own invoice items" ON public.invoice_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.invoices
  WHERE ((invoices.id = invoice_items.invoice_id) AND ((invoices.user_id = auth.uid()) OR (invoices.user_id IS NULL))))));


--
-- Name: messages Users can view their own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (((user_id = auth.uid()) OR (sender_email = auth.email())));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: order_items Users can view their own order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own order items" ON public.order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid())))));


--
-- Name: orders Users can view their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (((auth.uid() = user_id) OR (user_id IS NULL)));


--
-- Name: loyalty_points Users can view their own points; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own points" ON public.loyalty_points FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: quotes Users can view their own quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own quotes" ON public.quotes FOR SELECT USING (((auth.uid() = user_id) OR (customer_email = auth.email())));


--
-- Name: api_rate_limits Users can view their own rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own rate limits" ON public.api_rate_limits FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: gift_cards Users can view their received gift cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their received gift cards" ON public.gift_cards FOR SELECT USING ((recipient_email = auth.email()));


--
-- Name: api_rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: backup_metadata; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.backup_metadata ENABLE ROW LEVEL SECURITY;

--
-- Name: backup_retention_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.backup_retention_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_post_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_post_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: calculator_calibrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calculator_calibrations ENABLE ROW LEVEL SECURITY;

--
-- Name: calibration_materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calibration_materials ENABLE ROW LEVEL SECURITY;

--
-- Name: calibration_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calibration_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: calibration_tests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calibration_tests ENABLE ROW LEVEL SECURITY;

--
-- Name: cart_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: checkout_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: colors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;

--
-- Name: coupons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: footer_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.footer_links ENABLE ROW LEVEL SECURITY;

--
-- Name: gift_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: homepage_banners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.homepage_banners ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: legal_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_adjustments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_adjustments ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_points; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_redemptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_rewards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: material_colors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.material_colors ENABLE ROW LEVEL SECURITY;

--
-- Name: materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: order_statuses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_statuses ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

--
-- Name: printing_calculator_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.printing_calculator_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: product_colors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;

--
-- Name: product_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

--
-- Name: product_materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_materials ENABLE ROW LEVEL SECURITY;

--
-- Name: product_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: product_shipping_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_shipping_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_statuses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_statuses ENABLE ROW LEVEL SECURITY;

--
-- Name: quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: shipping_countries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipping_countries ENABLE ROW LEVEL SECURITY;

--
-- Name: shipping_postal_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipping_postal_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: shipping_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: shipping_zones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;

--
-- Name: site_customization; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_customization ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: support_detection_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_detection_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: tax_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: visitor_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


