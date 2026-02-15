-- Fix order creation triggers to handle exceptions gracefully
-- This prevents order insertion from failing if email notifications fail

-- Replace trigger_new_order_email with exception handling
CREATE OR REPLACE FUNCTION public.trigger_new_order_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  cust_name TEXT;
  cust_email TEXT;
BEGIN
  -- Try to get customer info, but don't fail if it doesn't exist
  BEGIN
    SELECT full_name, email INTO cust_name, cust_email
    FROM profiles WHERE id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    cust_name := NULL;
    cust_email := NULL;
  END;
  
  -- Try to send order email, but don't fail the transaction
  BEGIN
    PERFORM send_order_email_async(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send order email for order %', NEW.id;
  END;
  
  -- Try to notify admins, but don't fail the transaction
  BEGIN
    PERFORM notify_admins_async(
      'order',
      'Nuevo Pedido: ' || NEW.order_number,
      'Pedido por €' || NEW.total || ' de ' || COALESCE(cust_name, cust_email, 'Cliente'),
      '/admin/pedidos',
      NEW.order_number,
      cust_name,
      cust_email
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to notify admins for order %', NEW.id;
  END;
  
  -- Try to create notification, but don't fail the transaction
  IF NEW.user_id IS NOT NULL THEN
    BEGIN
      INSERT INTO notifications (user_id, type, title, message, link, is_read)
      VALUES (
        NEW.user_id, 'order',
        'Pedido Confirmado: ' || NEW.order_number,
        'Tu pedido por €' || NEW.total || ' ha sido recibido',
        '/mi-cuenta', false
      )
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create notification for order %', NEW.id;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Replace handle_order_loyalty_points with exception handling
CREATE OR REPLACE FUNCTION public.handle_order_loyalty_points() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Solo procesar si hay un usuario asociado
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Wrap everything in exception handling
  BEGIN
    -- CASO 1: INSERT - Pedido nuevo marcado como pagado
    IF TG_OP = 'INSERT' AND NEW.payment_status = 'paid' THEN
      PERFORM award_loyalty_points(NEW.user_id, NEW.total, NEW.id);
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to handle loyalty points for order %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_new_order_email() IS 'Trigger function with exception handling to prevent order creation failures';
COMMENT ON FUNCTION public.handle_order_loyalty_points() IS 'Trigger function with exception handling to prevent order creation failures';
