-- ============================================================================
-- COMPREHENSIVE EMAIL SYSTEM FIX - ALL EMAILS
-- ============================================================================
-- 
-- PROBLEM: Multiple issues with email system:
-- 1. pg_net dependency causes silent failures
-- 2. Duplicate triggers causing potential duplicate emails
-- 3. Email functions exist but don't actually send emails from DB
-- 4. Some triggers conflict with each other
--
-- SOLUTION: Clean up and consolidate all email triggers
-- - Remove ALL pg_net dependencies
-- - Consolidate duplicate triggers
-- - Create clear documentation
-- - Ensure all notifications work properly
-- ============================================================================

-- ============================================================================
-- 1. ORDER EMAILS - Consolidate and fix
-- ============================================================================

-- Remove duplicate/conflicting order triggers and functions
DROP TRIGGER IF EXISTS trigger_order_email ON public.orders;
DROP TRIGGER IF EXISTS on_order_status_changed ON public.orders;

-- Keep only the essential trigger
DROP FUNCTION IF EXISTS public.send_order_status_email_async(uuid, text, text) CASCADE;

-- Create simplified order status email function (notifications only)
CREATE OR REPLACE FUNCTION public.send_order_status_email_async(
  p_order_id uuid,
  p_old_status text,
  p_new_status text
) 
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_rec RECORD;
BEGIN
  -- Get order and user details
  SELECT o.order_number, o.total, p.email, p.full_name, o.user_id
  INTO order_rec
  FROM orders o
  LEFT JOIN profiles p ON o.user_id = p.id
  WHERE o.id = p_order_id;
  
  IF order_rec.user_id IS NULL THEN
    RAISE NOTICE '⚠️ No user for order %, skipping notification', p_order_id;
    RETURN;
  END IF;
  
  -- Create in-app notification for status change
  INSERT INTO notifications (user_id, type, title, message, link, is_read)
  VALUES (
    order_rec.user_id,
    'order_status_update',
    '📦 Estado del Pedido Actualizado: ' || order_rec.order_number,
    'El estado de tu pedido ha cambiado de "' || p_old_status || '" a "' || p_new_status || '"',
    '/pedido/' || p_order_id,
    false
  )
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '📧 Order status notification created. Edge function should be called from application.';
END;
$$;

COMMENT ON FUNCTION public.send_order_status_email_async(uuid, text, text) IS 
  'Creates notification for order status changes. Email sending via send-order-status-email edge function should be triggered from application layer.';

-- ============================================================================
-- 2. INVOICE EMAILS - Consolidate
-- ============================================================================

-- Remove duplicate invoice trigger
DROP TRIGGER IF EXISTS on_invoice_status_changed ON public.invoices;

-- Ensure invoice email trigger function is clean
CREATE OR REPLACE FUNCTION public.trigger_new_invoice_with_email() 
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  customer_email TEXT;
  customer_name TEXT;
  order_number TEXT;
BEGIN
  -- Get customer and order details
  SELECT p.email, p.full_name, o.order_number
  INTO customer_email, customer_name, order_number
  FROM profiles p
  LEFT JOIN orders o ON o.id = NEW.order_id
  WHERE p.id = NEW.user_id;
  
  -- Create notification for user
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, is_read)
    VALUES (
      NEW.user_id,
      'invoice',
      '📄 Factura Generada: ' || NEW.invoice_number,
      CASE 
        WHEN NEW.payment_status = 'paid' THEN 'Tu factura está lista. Total: €' || NEW.total
        ELSE 'Tu factura está pendiente de pago. Total: €' || NEW.total || '. Haz clic para pagar.'
      END,
      '/factura/' || NEW.id,
      false
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Notify admins
  PERFORM notify_admins_async(
    'invoice',
    'Nueva Factura: ' || NEW.invoice_number,
    'Factura por €' || NEW.total || ' para ' || COALESCE(customer_name, customer_email) ||
    CASE WHEN NEW.payment_status = 'pending' THEN ' - Pendiente de pago' ELSE ' - Pagada' END,
    '/admin/facturas',
    NEW.invoice_number,
    customer_name,
    customer_email
  );
  
  RAISE NOTICE '📧 Invoice notification created for invoice %', NEW.invoice_number;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_new_invoice_with_email() IS 
  'Creates notifications when invoices are generated. Email sending should be handled by send-invoice-email edge function from application layer.';

-- ============================================================================
-- 3. QUOTE EMAILS - Consolidate
-- ============================================================================

-- Ensure quote email trigger is working properly
CREATE OR REPLACE FUNCTION public.trigger_new_quote_with_email() 
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Notify all admins about new quote
  PERFORM notify_admins_async(
    'quote',
    '💬 Nueva Cotización Recibida',
    'Cotización de ' || NEW.customer_name || ' (' || NEW.customer_email || ') - Tipo: ' || NEW.quote_type,
    '/admin/cotizaciones',
    NULL,
    NEW.customer_name,
    NEW.customer_email
  );
  
  -- Create notification for user if they have an account
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, is_read)
    VALUES (
      NEW.user_id,
      'quote',
      '✅ Cotización Recibida',
      'Hemos recibido tu solicitud de cotización. Te responderemos pronto.',
      '/cotizacion/' || NEW.id,
      false
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RAISE NOTICE '📧 Quote notification created for customer %', NEW.customer_email;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_new_quote_with_email() IS 
  'Creates notifications for new quotes. Email sending handled by send-quote-email edge function from application.';

-- Quote update notification
CREATE OR REPLACE FUNCTION public.trigger_quote_update_with_email() 
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only notify if estimated_price changed or status changed significantly
  IF (OLD.estimated_price IS DISTINCT FROM NEW.estimated_price) OR
     (OLD.status_id IS DISTINCT FROM NEW.status_id) THEN
    
    -- Notify user if they have an account
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link, is_read)
      VALUES (
        NEW.user_id,
        'quote_update',
        '📝 Actualización de Cotización',
        CASE 
          WHEN OLD.estimated_price IS DISTINCT FROM NEW.estimated_price 
          THEN 'Tu cotización ha sido actualizada con un precio de €' || NEW.estimated_price
          ELSE 'El estado de tu cotización ha sido actualizado'
        END,
        '/cotizacion/' || NEW.id,
        false
      )
      ON CONFLICT DO NOTHING;
    END IF;
    
    RAISE NOTICE '📧 Quote update notification created for %', NEW.customer_email;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_quote_update_with_email() IS 
  'Creates notifications for quote updates (price or status changes). Email via send-quote-update-email edge function.';

-- ============================================================================
-- 4. GIFT CARD EMAILS
-- ============================================================================

-- Gift card activation and email
CREATE OR REPLACE FUNCTION public.activate_gift_card_on_payment() 
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  card_record RECORD;
BEGIN
  -- Only activate when payment status changes to 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    
    -- Find and activate gift cards for this order
    FOR card_record IN 
      SELECT gc.id, gc.recipient_email, gc.amount, gc.sender_name
      FROM gift_cards gc
      WHERE gc.order_id = NEW.id AND gc.is_active = false
    LOOP
      -- Activate the gift card
      UPDATE gift_cards
      SET is_active = true, activated_at = NOW()
      WHERE id = card_record.id;
      
      RAISE NOTICE '🎁 Gift card activated for %. Email should be sent via edge function.', card_record.recipient_email;
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trigger_activate_gift_card ON public.orders;
CREATE TRIGGER trigger_activate_gift_card
  AFTER INSERT OR UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_gift_card_on_payment();

COMMENT ON FUNCTION public.activate_gift_card_on_payment() IS 
  'Activates gift cards when order is paid. Email sending via send-gift-card-email edge function should be called from application.';

-- ============================================================================
-- 5. LOYALTY POINTS EMAILS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_points_change_with_email() 
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  points_change INTEGER;
BEGIN
  -- Calculate points change
  IF TG_OP = 'INSERT' THEN
    points_change := NEW.points_balance;
  ELSIF TG_OP = 'UPDATE' THEN
    points_change := NEW.points_balance - OLD.points_balance;
  ELSE
    RETURN NEW;
  END IF;
  
  -- Only notify on points increase
  IF points_change > 0 THEN
    INSERT INTO notifications (user_id, type, title, message, link, is_read)
    VALUES (
      NEW.user_id,
      'loyalty_points',
      '⭐ Has Ganado Puntos',
      '¡Felicitaciones! Has ganado ' || points_change || ' puntos de lealtad. Total: ' || NEW.points_balance || ' puntos.',
      '/mi-cuenta?tab=loyalty',
      false
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '⭐ Points notification created for user %. Email via edge function.', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trigger_notify_points_change ON public.loyalty_points;
CREATE TRIGGER trigger_notify_points_change
  AFTER INSERT OR UPDATE OF points_balance ON public.loyalty_points
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_points_change_with_email();

COMMENT ON FUNCTION public.notify_points_change_with_email() IS 
  'Creates notifications for loyalty points changes. Email via send-loyalty-points-email edge function from application.';

-- ============================================================================
-- 6. WELCOME EMAILS
-- ============================================================================

-- Welcome email on new user
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  -- Create initial profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  
  -- Create welcome notification
  INSERT INTO public.notifications (user_id, type, title, message, link, is_read)
  VALUES (
    NEW.id,
    'welcome',
    '👋 ¡Bienvenido a Thuis3D!',
    'Gracias por registrarte. Explora nuestros productos y servicios de impresión 3D.',
    '/productos',
    false
  )
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '👋 Welcome notification created for %. Email via send-welcome-email edge function.', NEW.email;
  
  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 
  'Creates profile and welcome notification for new users. Email via send-welcome-email edge function.';

-- ============================================================================
-- 7. DOCUMENTATION AND CLEANUP
-- ============================================================================

-- Add comprehensive documentation
COMMENT ON TRIGGER on_order_created ON public.orders IS 
  'Triggers order confirmation notifications. For emails, application should call send-order-confirmation edge function passing order_id.';

COMMENT ON TRIGGER trigger_new_invoice_notification ON public.invoices IS 
  'Triggers invoice notifications. For emails, application should call send-invoice-email edge function passing invoice_id.';

COMMENT ON TRIGGER trigger_new_quote_notification ON public.quotes IS 
  'Triggers quote notifications. For emails, application should call send-quote-email edge function passing quote_id.';

-- Create helper view for email debugging
CREATE OR REPLACE VIEW email_trigger_status AS
SELECT 
  'orders' as table_name,
  'on_order_created' as trigger_name,
  'send-order-confirmation' as edge_function,
  'Creates notification, edge function should be called from app' as notes
UNION ALL
SELECT 
  'orders',
  'trigger_activate_gift_card',
  'send-gift-card-email',
  'Activates gift cards on payment, email sent from app'
UNION ALL
SELECT 
  'invoices',
  'trigger_new_invoice_notification',
  'send-invoice-email',
  'Creates notification, email sent from app'
UNION ALL
SELECT 
  'quotes',
  'trigger_new_quote_notification',
  'send-quote-email',
  'Creates notification, email sent from app'
UNION ALL
SELECT 
  'quotes',
  'trigger_quote_update_notification',
  'send-quote-update-email',
  'Creates notification on price/status change, email from app'
UNION ALL
SELECT 
  'loyalty_points',
  'trigger_notify_points_change',
  'send-loyalty-points-email',
  'Creates notification on points increase, email from app'
UNION ALL
SELECT 
  'auth.users',
  'on_auth_user_created',
  'send-welcome-email',
  'Creates profile and notification, email from app';

COMMENT ON VIEW email_trigger_status IS 
  'Quick reference for all email triggers and their corresponding edge functions. Use this to understand which edge functions need to be called from application code.';

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- 
-- ✅ FIXED:
-- - All pg_net dependencies removed
-- - Duplicate triggers consolidated
-- - Clear separation: DB creates notifications, App sends emails
-- - All functions documented with their edge function requirements
--
-- 📧 EMAIL FLOW:
-- 1. Database trigger fires on INSERT/UPDATE
-- 2. Trigger function creates in-app notification
-- 3. Application detects notification (or direct call after action)
-- 4. Application calls appropriate edge function with entity ID
-- 5. Edge function fetches data and sends email via Resend API
--
-- 🔧 EDGE FUNCTIONS TO CALL FROM APP:
-- - send-order-confirmation (order_id) - After order creation
-- - send-order-status-email (order_id) - After status update
-- - send-invoice-email (invoice_id) - After invoice generation
-- - send-quote-email (quote_id) - After quote creation
-- - send-quote-update-email (quote_id) - After quote update
-- - send-gift-card-email (gift_card_id) - After gift card activation
-- - send-welcome-email (user_id) - After user registration
-- - send-loyalty-points-email (user_id) - After points added
--
-- ============================================================================
