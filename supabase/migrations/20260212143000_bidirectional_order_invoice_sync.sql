-- Bidirectional sync between orders and invoices payment status
-- When invoice is marked as paid, update the corresponding order
-- When order is marked as paid, update the corresponding invoice

-- Function to sync invoice paid status to order
CREATE OR REPLACE FUNCTION public.sync_invoice_to_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- When invoice payment_status changes to 'paid', update the order
  IF NEW.payment_status = 'paid' 
     AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid')
     AND NEW.order_id IS NOT NULL THEN
    
    UPDATE orders
    SET payment_status = 'paid',
        updated_at = NOW()
    WHERE id = NEW.order_id
      AND (payment_status IS NULL OR payment_status != 'paid');
    
    RAISE NOTICE 'Order % synced to paid from invoice %', NEW.order_id, NEW.invoice_number;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to sync order paid status to invoice
CREATE OR REPLACE FUNCTION public.sync_order_to_invoice() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- When order payment_status changes to 'paid', update the invoice
  IF NEW.payment_status = 'paid' 
     AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    
    UPDATE invoices
    SET payment_status = 'paid',
        updated_at = NOW()
    WHERE order_id = NEW.id
      AND (payment_status IS NULL OR payment_status != 'paid');
    
    RAISE NOTICE 'Invoice for order % synced to paid', NEW.order_number;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_sync_invoice_to_order ON invoices;
DROP TRIGGER IF EXISTS trigger_sync_order_to_invoice ON orders;

-- Create trigger for invoice → order sync
CREATE TRIGGER trigger_sync_invoice_to_order
  AFTER UPDATE OF payment_status ON invoices
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid')
  EXECUTE FUNCTION sync_invoice_to_order();

-- Create trigger for order → invoice sync
CREATE TRIGGER trigger_sync_order_to_invoice
  AFTER UPDATE OF payment_status ON orders
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid')
  EXECUTE FUNCTION sync_order_to_invoice();

-- Add comment for documentation
COMMENT ON FUNCTION sync_invoice_to_order() IS 'Synchronizes invoice payment status to corresponding order';
COMMENT ON FUNCTION sync_order_to_invoice() IS 'Synchronizes order payment status to corresponding invoice';
