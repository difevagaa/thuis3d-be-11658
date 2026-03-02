
-- Fix notify_new_invoice: round total value
CREATE OR REPLACE FUNCTION notify_new_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM send_notification(
      NEW.user_id,
      'invoice',
      'Nueva Factura: ' || NEW.invoice_number,
      'Se ha generado una nueva factura por €' || ROUND(NEW.total::numeric, 2),
      '/mi-cuenta'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix trigger_order_changes_with_email: round total value
CREATE OR REPLACE FUNCTION trigger_order_changes_with_email()
RETURNS TRIGGER AS $$
DECLARE
  old_status_name TEXT;
  new_status_name TEXT;
BEGIN
  -- Status change
  IF OLD.status_id IS DISTINCT FROM NEW.status_id AND NEW.user_id IS NOT NULL THEN
    SELECT name INTO old_status_name FROM order_statuses WHERE id = OLD.status_id;
    SELECT name INTO new_status_name FROM order_statuses WHERE id = NEW.status_id;
    
    PERFORM send_notification(
      NEW.user_id,
      'order_update',
      'Actualización de Pedido: ' || NEW.order_number,
      'Tu pedido ahora está: ' || COALESCE(new_status_name, 'Actualizado'),
      '/mi-cuenta'
    );
    
    PERFORM send_order_status_email_async(NEW.id, old_status_name, new_status_name);
  END IF;

  -- Payment status changed to paid
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status 
     AND NEW.payment_status = 'paid' 
     AND NEW.user_id IS NOT NULL THEN
    PERFORM send_notification(
      NEW.user_id,
      'order_paid',
      'Pago Confirmado: ' || NEW.order_number,
      'Tu pago de €' || ROUND(NEW.total::numeric, 2) || ' ha sido confirmado',
      '/mi-cuenta'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix trigger_quote_update_with_email: round estimated_price
CREATE OR REPLACE FUNCTION trigger_quote_update_with_email()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.estimated_price IS NULL OR OLD.estimated_price = 0) 
     AND NEW.estimated_price IS NOT NULL 
     AND NEW.estimated_price > 0 THEN
    
    IF NEW.user_id IS NOT NULL THEN
      PERFORM send_notification(
        NEW.user_id,
        'quote_updated',
        'Cotización Actualizada',
        'Tu cotización tiene un precio estimado de €' || ROUND(NEW.estimated_price::numeric, 2),
        '/mi-cuenta'
      );
    END IF;
    
    PERFORM send_quote_update_email_async(NEW.id, NEW.estimated_price);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix auto_generate_invoice_on_payment: use 6-char format and round values
CREATE OR REPLACE FUNCTION auto_generate_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  invoice_exists BOOLEAN;
  new_invoice_id UUID;
  invoice_num TEXT;
  order_item RECORD;
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    
    SELECT EXISTS(
      SELECT 1 FROM invoices WHERE order_id = NEW.id
    ) INTO invoice_exists;
    
    IF NOT invoice_exists THEN
      -- Use order_number as invoice_number for consistency
      invoice_num := NEW.order_number;
      
      INSERT INTO invoices (
        invoice_number, user_id, order_id,
        subtotal, tax, discount, total,
        payment_method, payment_status,
        issue_date, due_date, notes
      ) VALUES (
        invoice_num, NEW.user_id, NEW.id,
        ROUND(NEW.subtotal::numeric, 2),
        ROUND(NEW.tax::numeric, 2),
        ROUND(COALESCE(NEW.discount, 0)::numeric, 2),
        ROUND(NEW.total::numeric, 2),
        NEW.payment_method, 'paid',
        NOW(), NOW() + INTERVAL '30 days',
        'Factura generada automáticamente para el pedido ' || NEW.order_number
      )
      RETURNING id INTO new_invoice_id;
      
      FOR order_item IN 
        SELECT * FROM order_items WHERE order_id = NEW.id
      LOOP
        INSERT INTO invoice_items (
          invoice_id, product_id, product_name, description,
          quantity, unit_price, total_price, tax_enabled
        ) VALUES (
          new_invoice_id, order_item.product_id, order_item.product_name, NULL,
          order_item.quantity,
          ROUND(order_item.unit_price::numeric, 2),
          ROUND(order_item.total_price::numeric, 2),
          TRUE
        );
      END LOOP;
      
      IF NEW.user_id IS NOT NULL THEN
        PERFORM send_notification(
          NEW.user_id,
          'invoice',
          'Nueva Factura Disponible: ' || invoice_num,
          'Tu factura del pedido ' || NEW.order_number || ' ya está disponible',
          '/mi-cuenta?tab=invoices'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix notify_invoice_payment_status_change (already fine but ensure consistency)
CREATE OR REPLACE FUNCTION notify_invoice_payment_status_change()
RETURNS TRIGGER AS $$
DECLARE
  status_text TEXT;
BEGIN
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    status_text := CASE NEW.payment_status
      WHEN 'paid' THEN 'pagada'
      WHEN 'pending' THEN 'pendiente'
      WHEN 'failed' THEN 'fallida'
      ELSE NEW.payment_status
    END;
    
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
