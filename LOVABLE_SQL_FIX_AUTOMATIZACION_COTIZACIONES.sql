-- Script Lovable: asegurar automatización al aprobar cotizaciones
-- Ejecutar en SQL editor de Supabase/Lovable

-- 1) Asegurar que exista al menos un estado de pedido utilizable
INSERT INTO public.order_statuses (name, color)
SELECT 'Recibido', '#3b82f6'
WHERE NOT EXISTS (
  SELECT 1 FROM public.order_statuses WHERE name = 'Recibido'
);

-- 2) Evitar que fallos de notificaciones rompan la creación de pedidos
CREATE OR REPLACE FUNCTION public.trigger_new_order_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
  cust_name TEXT;
  cust_email TEXT;
BEGIN
  BEGIN
    SELECT full_name, email INTO cust_name, cust_email
    FROM profiles WHERE id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    cust_name := NULL;
    cust_email := NULL;
  END;

  BEGIN
    PERFORM send_order_email_async(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send order email for order %', NEW.id;
  END;

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

-- 3) Evitar que errores en puntos de lealtad cancelen el INSERT/UPDATE de pedidos
CREATE OR REPLACE FUNCTION public.handle_order_loyalty_points() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    IF TG_OP = 'INSERT' AND NEW.payment_status = 'paid' THEN
      PERFORM award_loyalty_points(NEW.user_id, NEW.total, NEW.id);
    END IF;

    IF TG_OP = 'UPDATE' THEN
      IF OLD.payment_status IS DISTINCT FROM 'paid'
         AND NEW.payment_status = 'paid'
         AND NEW.deleted_at IS NULL THEN
        PERFORM award_loyalty_points(NEW.user_id, NEW.total, NEW.id);
      END IF;

      IF OLD.payment_status = 'paid'
         AND NEW.payment_status IS DISTINCT FROM 'paid' THEN
        PERFORM remove_loyalty_points(NEW.user_id, NEW.total, NEW.id);
      END IF;

      IF OLD.deleted_at IS NULL
         AND NEW.deleted_at IS NOT NULL
         AND OLD.payment_status = 'paid' THEN
        PERFORM remove_loyalty_points(NEW.user_id, NEW.total, NEW.id);
      END IF;

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
