-- ============================================
-- FASE 2: CORRECCIONES DE BASE DE DATOS
-- ============================================

-- 2.1 Agregar índices faltantes para rendimiento
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_session_id ON visitor_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_user_id ON visitor_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_is_active ON visitor_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_translation_queue_status ON translation_queue(status);
CREATE INDEX IF NOT EXISTS idx_translation_queue_entity ON translation_queue(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_session_id ON cart_items(session_id);

-- 2.2 Corregir trigger queue_translation para evitar errores
CREATE OR REPLACE FUNCTION public.queue_translation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_field_name TEXT;
  original_value TEXT;
  target_langs TEXT[] := ARRAY['en', 'nl'];
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    FOREACH v_field_name IN ARRAY 
      CASE TG_TABLE_NAME
        WHEN 'products' THEN ARRAY['name', 'description']
        WHEN 'categories' THEN ARRAY['name', 'description']
        WHEN 'materials' THEN ARRAY['name', 'description']
        WHEN 'colors' THEN ARRAY['name']
        WHEN 'blog_posts' THEN ARRAY['title', 'excerpt', 'content']
        WHEN 'pages' THEN ARRAY['title', 'content']
        WHEN 'legal_pages' THEN ARRAY['title', 'content']
        WHEN 'homepage_banners' THEN ARRAY['title', 'description']
        WHEN 'gallery_items' THEN ARRAY['title', 'description']
        WHEN 'footer_links' THEN ARRAY['title']
        WHEN 'reviews' THEN ARRAY['comment']
        WHEN 'homepage_sections' THEN ARRAY['title', 'subtitle']
        WHEN 'homepage_quick_access_cards' THEN ARRAY['title', 'description', 'button_text']
        WHEN 'homepage_features' THEN ARRAY['title', 'description']
        ELSE ARRAY[]::TEXT[]
      END
    LOOP
      BEGIN
        EXECUTE format('SELECT ($1).%I', v_field_name) INTO original_value USING NEW;
        
        IF original_value IS NOT NULL AND LENGTH(TRIM(original_value)) > 0 THEN
          INSERT INTO public.translation_queue (
            entity_type,
            entity_id,
            field_name,
            source_language,
            target_languages,
            status
          ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            v_field_name,
            'es',
            target_langs,
            'pending'
          )
          ON CONFLICT (entity_type, entity_id, field_name) 
          DO UPDATE SET 
            status = 'pending',
            source_language = 'es',
            target_languages = target_langs,
            updated_at = NOW();
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Silenciar errores para no bloquear operaciones
        RAISE WARNING 'Translation queue error for %: %', v_field_name, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2.3 Función para limpiar visitor_sessions antiguos
CREATE OR REPLACE FUNCTION public.cleanup_old_visitor_sessions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM visitor_sessions
  WHERE last_seen_at < NOW() - INTERVAL '24 hours'
  AND is_active = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- 2.4 Actualizar función award_loyalty_points con search_path
CREATE OR REPLACE FUNCTION public.award_loyalty_points(p_user_id uuid, p_order_amount numeric, p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points_per_dollar numeric;
  v_is_enabled boolean;
  v_points_to_add integer;
BEGIN
  SELECT points_per_dollar, is_enabled 
  INTO v_points_per_dollar, v_is_enabled
  FROM loyalty_settings
  LIMIT 1;
  
  IF NOT v_is_enabled THEN
    RETURN;
  END IF;
  
  v_points_to_add := FLOOR(p_order_amount * v_points_per_dollar);
  
  IF v_points_to_add <= 0 THEN
    RETURN;
  END IF;
  
  INSERT INTO loyalty_points (user_id, points_balance, lifetime_points)
  VALUES (p_user_id, v_points_to_add, v_points_to_add)
  ON CONFLICT (user_id) DO UPDATE SET
    points_balance = loyalty_points.points_balance + v_points_to_add,
    lifetime_points = loyalty_points.lifetime_points + v_points_to_add,
    updated_at = NOW();
END;
$$;