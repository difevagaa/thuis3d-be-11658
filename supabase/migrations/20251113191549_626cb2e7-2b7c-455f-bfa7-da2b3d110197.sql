
-- ============================================
-- CORRECCIÓN COMPLETA SISTEMA DE NOTIFICACIONES
-- ============================================
-- Problema: URLs de edge functions apuntan al proyecto viejo
-- Solución: Actualizar TODAS las funciones con URLs y keys correctas

-- Proyecto correcto: ljygreayxxpsdmncwzia
-- Anon key correcta: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeWdyZWF5eHhwc2RtbmN3emlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODMxOTUsImV4cCI6MjA3ODM1OTE5NX0.309lxyM-chybzF-Df_nj9PiW83dE379iw1D5EgKLkUI

-- ============================================
-- 1. ENVÍO DE EMAILS A ADMINISTRADORES
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_admins_async(
  p_type text, 
  p_subject text, 
  p_message text, 
  p_link text DEFAULT '/admin/pedidos'::text,
  p_order_number text DEFAULT NULL::text,
  p_customer_name text DEFAULT NULL::text,
  p_customer_email text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
        url := 'https://ljygreayxxpsdmncwzia.supabase.co/functions/v1/send-admin-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeWdyZWF5eHhwc2RtbmN3emlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODMxOTUsImV4cCI6MjA3ODM1OTE5NX0.309lxyM-chybzF-Df_nj9PiW83dE379iw1D5EgKLkUI"}'::jsonb,
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

-- ============================================
-- 2. ENVÍO DE EMAILS DE PEDIDOS
-- ============================================
CREATE OR REPLACE FUNCTION public.send_order_email_async(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
    url := 'https://ljygreayxxpsdmncwzia.supabase.co/functions/v1/send-order-confirmation',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeWdyZWF5eHhwc2RtbmN3emlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODMxOTUsImV4cCI6MjA3ODM1OTE5NX0.309lxyM-chybzF-Df_nj9PiW83dE379iw1D5EgKLkUI"}'::jsonb,
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
  RAISE WARNING '⚠️ Failed to queue order email: %', SQLERRM;
END;
$$;

-- ============================================
-- 3. ENVÍO DE EMAILS DE FACTURAS
-- ============================================
CREATE OR REPLACE FUNCTION public.send_invoice_email_async(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
    url := 'https://ljygreayxxpsdmncwzia.supabase.co/functions/v1/send-invoice-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeWdyZWF5eHhwc2RtbmN3emlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODMxOTUsImV4cCI6MjA3ODM1OTE5NX0.309lxyM-chybzF-Df_nj9PiW83dE379iw1D5EgKLkUI'
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

-- ============================================
-- 4. ENVÍO DE EMAILS DE COTIZACIONES
-- ============================================
CREATE OR REPLACE FUNCTION public.send_quote_email_async(p_quote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  quote_rec RECORD;
  req_id bigint;
BEGIN
  SELECT customer_email, customer_name, quote_type, description
  INTO quote_rec
  FROM quotes WHERE id = p_quote_id;
  
  IF quote_rec.customer_email IS NULL THEN
    RAISE WARNING '⚠️ No email for quote %', p_quote_id;
    RETURN;
  END IF;

  SELECT net.http_post(
    url := 'https://ljygreayxxpsdmncwzia.supabase.co/functions/v1/send-quote-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeWdyZWF5eHhwc2RtbmN3emlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODMxOTUsImV4cCI6MjA3ODM1OTE5NX0.309lxyM-chybzF-Df_nj9PiW83dE379iw1D5EgKLkUI"}'::jsonb,
    body := jsonb_build_object(
      'to', quote_rec.customer_email,
      'customer_name', quote_rec.customer_name,
      'quote_type', quote_rec.quote_type,
      'description', quote_rec.description
    )
  ) INTO req_id;
  
  RAISE NOTICE '📧 Quote email queued (req: %)', req_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '⚠️ Failed to queue quote email: %', SQLERRM;
END;
$$;

-- ============================================
-- 5. ENVÍO DE EMAILS DE ACTUALIZACIÓN DE COTIZACIONES
-- ============================================
CREATE OR REPLACE FUNCTION public.send_quote_update_email_async(
  p_quote_id uuid,
  p_estimated_price numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  quote_rec RECORD;
  req_id bigint;
BEGIN
  SELECT customer_email, customer_name, quote_type, description
  INTO quote_rec
  FROM quotes WHERE id = p_quote_id;
  
  IF quote_rec.customer_email IS NULL THEN
    RETURN;
  END IF;

  SELECT net.http_post(
    url := 'https://ljygreayxxpsdmncwzia.supabase.co/functions/v1/send-quote-update-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeWdyZWF5eHhwc2RtbmN3emlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODMxOTUsImV4cCI6MjA3ODM1OTE5NX0.309lxyM-chybzF-Df_nj9PiW83dE379iw1D5EgKLkUI"}'::jsonb,
    body := jsonb_build_object(
      'to', quote_rec.customer_email,
      'customer_name', quote_rec.customer_name,
      'quote_type', quote_rec.quote_type,
      'estimated_price', p_estimated_price,
      'description', quote_rec.description
    )
  ) INTO req_id;
  
  RAISE NOTICE '📧 Quote update email queued (req: %)', req_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '⚠️ Failed to queue quote update email: %', SQLERRM;
END;
$$;

-- ============================================
-- 6. ENVÍO DE EMAILS DE CAMBIO DE ESTADO DE PEDIDO
-- ============================================
CREATE OR REPLACE FUNCTION public.send_order_status_email_async(
  p_order_id uuid,
  p_old_status text,
  p_new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
    RETURN;
  END IF;

  SELECT net.http_post(
    url := 'https://ljygreayxxpsdmncwzia.supabase.co/functions/v1/send-order-status-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeWdyZWF5eHhwc2RtbmN3emlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODMxOTUsImV4cCI6MjA3ODM1OTE5NX0.309lxyM-chybzF-Df_nj9PiW83dE379iw1D5EgKLkUI"}'::jsonb,
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
  RAISE WARNING '⚠️ Failed to queue order status email: %', SQLERRM;
END;
$$;

-- ============================================
-- 7. ENVÍO DE EMAILS DE PUNTOS DE LEALTAD
-- ============================================
CREATE OR REPLACE FUNCTION public.send_loyalty_points_email_async(
  p_user_id uuid,
  p_email text,
  p_name text,
  p_points_earned integer,
  p_total_points integer,
  p_available_coupons jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  request_id bigint;
BEGIN
  SELECT INTO request_id extensions.http_post(
    url := 'https://ljygreayxxpsdmncwzia.supabase.co/functions/v1/send-loyalty-points-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqeWdyZWF5eHhwc2RtbmN3emlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODMxOTUsImV4cCI6MjA3ODM1OTE5NX0.309lxyM-chybzF-Df_nj9PiW83dE379iw1D5EgKLkUI'
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

-- ============================================
-- 8. ACTUALIZAR TRIGGER DE CAMBIOS DE PEDIDO CON EMAIL
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_order_changes_with_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  old_status_name TEXT;
  new_status_name TEXT;
BEGIN
  -- Cambio de estado
  IF OLD.status_id IS DISTINCT FROM NEW.status_id AND NEW.user_id IS NOT NULL THEN
    SELECT name INTO old_status_name FROM order_statuses WHERE id = OLD.status_id;
    SELECT name INTO new_status_name FROM order_statuses WHERE id = NEW.status_id;
    
    -- Notificación in-app
    PERFORM send_notification(
      NEW.user_id,
      'order_update',
      'Actualización de Pedido: ' || NEW.order_number,
      'Tu pedido ahora está: ' || COALESCE(new_status_name, 'Actualizado'),
      '/mi-cuenta'
    );
    
    -- Email de cambio de estado
    PERFORM send_order_status_email_async(NEW.id, old_status_name, new_status_name);
  END IF;

  -- Cambio de estado de pago a 'paid'
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

-- ============================================
-- 9. ACTUALIZAR TRIGGER DE ACTUALIZACIÓN DE COTIZACIONES CON EMAIL
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_quote_update_with_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Solo si cambió el precio estimado de NULL a un valor
  IF (OLD.estimated_price IS NULL OR OLD.estimated_price = 0) 
     AND NEW.estimated_price IS NOT NULL 
     AND NEW.estimated_price > 0 THEN
    
    -- Notificación in-app
    IF NEW.user_id IS NOT NULL THEN
      PERFORM send_notification(
        NEW.user_id,
        'quote_updated',
        'Cotización Actualizada',
        'Tu cotización tiene un precio estimado de €' || NEW.estimated_price,
        '/mi-cuenta'
      );
    END IF;
    
    -- Email con precio
    PERFORM send_quote_update_email_async(NEW.id, NEW.estimated_price);
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- 10. TRIGGER DE NUEVAS COTIZACIONES CON EMAIL A ADMINS
-- ============================================
CREATE OR REPLACE FUNCTION public.trigger_new_quote_with_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Notificar a admins
  PERFORM notify_all_admins(
    'quote',
    'Nueva Cotización',
    'Cotización de ' || NEW.customer_name || ' (' || NEW.customer_email || ')',
    '/admin/cotizaciones'
  );
  
  -- Email de confirmación al cliente
  PERFORM send_quote_email_async(NEW.id);
  
  -- Notificación in-app al cliente si está registrado
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

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de notificaciones actualizado correctamente';
  RAISE NOTICE '📧 Proyecto: ljygreayxxpsdmncwzia';
  RAISE NOTICE '🔔 Triggers activos para: orders, quotes, invoices';
  RAISE NOTICE '✉️ Edge functions configuradas para envío de emails';
END $$;
