-- ============================================================================
-- AUTO-CREATE INVOICES FOR ALL NEW ORDERS
-- ============================================================================
-- 
-- PROBLEM: Invoices are only created when payment_status changes to 'paid',
-- not when orders are initially created. This means orders with status 
-- 'pending' don't get invoices until payment is completed.
--
-- SOLUTION: Add a trigger on INSERT to automatically create invoices for
-- ALL new orders, regardless of payment status. This ensures every order
-- has a corresponding invoice from the moment it's created.
--
-- IMPORTANT: No new tables are created. Uses existing invoices and 
-- invoice_items tables.
-- ============================================================================

-- Drop existing trigger and function to recreate with INSERT support
DROP TRIGGER IF EXISTS trigger_auto_generate_invoice ON public.orders;
DROP FUNCTION IF EXISTS public.auto_generate_invoice_on_payment() CASCADE;

-- Create improved function to auto-generate invoices for new orders
CREATE OR REPLACE FUNCTION public.auto_create_invoice_for_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invoice_exists BOOLEAN;
  new_invoice_id UUID;
  invoice_num TEXT;
  order_item RECORD;
  v_payment_status TEXT;
BEGIN
  -- Check if this is an INSERT or UPDATE operation
  IF (TG_OP = 'INSERT') THEN
    -- For INSERT: Always create invoice for new orders
    v_payment_status := NEW.payment_status;
    
    RAISE NOTICE '[AUTO INVOICE] New order created: % with status: %', NEW.order_number, v_payment_status;
    
  ELSIF (TG_OP = 'UPDATE') THEN
    -- For UPDATE: Only proceed if payment status changed to 'paid'
    IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
      v_payment_status := 'paid';
      RAISE NOTICE '[AUTO INVOICE] Order % payment status changed to paid', NEW.order_number;
    ELSE
      -- No action needed for other updates
      RETURN NEW;
    END IF;
  ELSE
    -- Unknown operation, skip
    RETURN NEW;
  END IF;

  -- Check if invoice already exists for this order
  SELECT EXISTS(
    SELECT 1 FROM invoices WHERE order_id = NEW.id
  ) INTO invoice_exists;

  -- Only create invoice if it doesn't exist
  IF NOT invoice_exists THEN
    -- Use order number as invoice number for consistency
    -- If order_number is null, generate one
    invoice_num := COALESCE(NEW.order_number, 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'));
    
    RAISE NOTICE '[AUTO INVOICE] Creating invoice % for order %', invoice_num, NEW.order_number;

    -- Create invoice with same payment_status as order
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
      COALESCE(NEW.subtotal, 0),
      COALESCE(NEW.tax, 0),
      COALESCE(NEW.discount, 0),
      COALESCE(NEW.total, 0),
      NEW.payment_method,
      v_payment_status, -- Use the determined payment status
      NOW(),
      NOW() + INTERVAL '30 days',
      COALESCE(NEW.notes, 'Factura generada automáticamente para el pedido ' || COALESCE(NEW.order_number, 'N/A'))
    )
    RETURNING id INTO new_invoice_id;

    -- Copy order items to invoice items
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

    RAISE NOTICE '[AUTO INVOICE] ✅ Invoice % created successfully for order %', invoice_num, NEW.order_number;

    -- Send notification to user about new invoice
    IF NEW.user_id IS NOT NULL THEN
      BEGIN
        PERFORM send_notification(
          NEW.user_id,
          'invoice_created',
          '📄 Factura Generada',
          'Se ha generado la factura ' || invoice_num || ' para tu pedido. Total: €' || COALESCE(NEW.total, 0)::TEXT,
          '/mi-cuenta?tab=invoices'
        );
        RAISE NOTICE '[AUTO INVOICE] Notification sent to user %', NEW.user_id;
      EXCEPTION
        WHEN OTHERS THEN
          -- Log error but don't fail invoice creation
          RAISE WARNING '[AUTO INVOICE] Failed to send notification: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
      END;
    END IF;

  ELSE
    RAISE NOTICE '[AUTO INVOICE] Invoice already exists for order %', NEW.order_number;
  END IF;

  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the order creation
    RAISE WARNING '[AUTO INVOICE] ❌ Error creating invoice for order %: % (SQLSTATE: %)', NEW.order_number, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Create trigger for INSERT operations (new orders)
CREATE TRIGGER trigger_auto_create_invoice_on_insert
  AFTER INSERT
  ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_invoice_for_order();

-- Create trigger for UPDATE operations (when payment status changes)
CREATE TRIGGER trigger_auto_create_invoice_on_update
  AFTER UPDATE OF payment_status
  ON public.orders
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION public.auto_create_invoice_for_order();

-- Add documentation
COMMENT ON FUNCTION public.auto_create_invoice_for_order() IS 
  'Automatically creates invoices for new orders (INSERT) and when orders are paid (UPDATE). Ensures every order has a corresponding invoice with matching payment_status. Uses SECURITY DEFINER to bypass RLS policies during automatic creation.';

COMMENT ON TRIGGER trigger_auto_create_invoice_on_insert ON public.orders IS 
  'Automatically creates an invoice when a new order is inserted, regardless of payment status.';

COMMENT ON TRIGGER trigger_auto_create_invoice_on_update ON public.orders IS 
  'Automatically creates an invoice when an order payment status is updated (legacy support).';
