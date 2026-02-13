-- ============================================================================
-- FIX ORDER AND INVOICE EMAIL NOTIFICATIONS
-- ============================================================================
-- 
-- PROBLEM: Email notifications for orders are not working because:
-- 1. Functions use net.http_post() which requires pg_net extension (not available)
-- 2. Email sending fails silently, leaving customers without confirmations
--
-- SOLUTION: Replace pg_net dependency with proper edge function invocations
-- The edge functions will be called directly from application code instead
-- of trying to invoke them from database triggers
--
-- APPROACH:
-- 1. Keep in-app notifications working (these work fine)
-- 2. Remove broken email sending code from triggers
-- 3. Document that emails should be sent from application layer
-- ============================================================================

-- Fix send_order_email_async to only create notifications, not send emails via pg_net
CREATE OR REPLACE FUNCTION public.send_order_email_async(p_order_id uuid) 
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  order_rec RECORD;
BEGIN
  -- Get order details
  SELECT o.order_number, o.total, p.email, p.full_name, o.user_id
  INTO order_rec
  FROM orders o
  LEFT JOIN profiles p ON o.user_id = p.id
  WHERE o.id = p_order_id;
  
  IF order_rec.email IS NULL THEN
    RAISE WARNING '⚠️ No email for order %, skipping email notification', p_order_id;
    RETURN;
  END IF;
  
  -- Create in-app notification for the user (this works reliably)
  IF order_rec.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, is_read)
    VALUES (
      order_rec.user_id,
      'order_confirmation',
      '✅ Pedido Confirmado: ' || order_rec.order_number,
      'Tu pedido por €' || order_rec.total || ' ha sido recibido. Puedes ver los detalles y realizar el pago desde tu cuenta.',
      '/pedido/' || p_order_id,
      false
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Note: Email sending via pg_net has been removed since the extension is not available.
  -- Emails should be sent from the application layer (frontend/edge functions) after order creation.
  -- The edge function 'send-order-confirmation' is available for this purpose.
  
  RAISE NOTICE '📧 Order notification created for order %. Email should be sent from application layer.', order_rec.order_number;
  
END;
$$;

-- Update comment
COMMENT ON FUNCTION public.send_order_email_async(uuid) IS 
  'Creates in-app notification for new orders. Email sending should be done from application layer using send-order-confirmation edge function.';

-- Fix notify_admins_async to only create notifications
CREATE OR REPLACE FUNCTION public.notify_admins_async(
  p_type text,
  p_title text,
  p_message text,
  p_link text,
  p_order_number text DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_customer_email text DEFAULT NULL
) 
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Create notifications for all admins
  FOR admin_record IN 
    SELECT DISTINCT ur.user_id
    FROM user_roles ur
    WHERE ur.role = 'admin'
  LOOP
    -- Verify user exists before inserting notification
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = admin_record.user_id) THEN
      INSERT INTO notifications (user_id, type, title, message, link, is_read)
      VALUES (
        admin_record.user_id,
        p_type,
        p_title,
        p_message,
        p_link,
        false
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  -- Note: Email notifications via pg_net have been removed.
  -- Admin email notifications should be sent from the application layer if needed.
  
  RAISE NOTICE '🔔 Admin notifications created for: %', p_title;
  
END;
$$;

-- Update comment
COMMENT ON FUNCTION public.notify_admins_async(text, text, text, text, text, text, text) IS 
  'Creates in-app notifications for admin users. Email sending should be done from application layer if needed.';

-- Ensure trigger_new_order_email works properly
CREATE OR REPLACE FUNCTION public.trigger_new_order_email() 
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cust_name TEXT;
  cust_email TEXT;
BEGIN
  -- Get customer info
  SELECT full_name, email INTO cust_name, cust_email
  FROM profiles WHERE id = NEW.user_id;
  
  -- Create user notification
  PERFORM send_order_email_async(NEW.id);
  
  -- Notify admins
  PERFORM notify_admins_async(
    'order',
    'Nuevo Pedido: ' || NEW.order_number,
    'Pedido por €' || NEW.total || ' de ' || COALESCE(cust_name, cust_email) || 
    CASE WHEN NEW.payment_status = 'pending' THEN ' - Pendiente de pago' ELSE '' END,
    '/admin/pedidos',
    NEW.order_number,
    cust_name,
    cust_email
  );
  
  RETURN NEW;
END;
$$;

-- Update comment
COMMENT ON FUNCTION public.trigger_new_order_email() IS 
  'Trigger function for new orders. Creates in-app notifications for users and admins. For email notifications, the application should call send-order-confirmation edge function.';

-- Add helpful documentation
COMMENT ON TRIGGER on_order_created ON public.orders IS 
  'Automatically notifies users and admins when a new order is created. In-app notifications work automatically. For email notifications, the application layer should call the send-order-confirmation edge function with the order_id.';
