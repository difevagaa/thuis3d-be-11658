-- Add bidirectional payment status synchronization between invoices and orders
-- This ensures that when an invoice is marked as paid, the related order is also updated
-- and vice versa (already handled by existing trigger)

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.sync_order_payment_status_from_invoice() CASCADE;

-- Create function to sync order payment status when invoice is updated
CREATE OR REPLACE FUNCTION public.sync_order_payment_status_from_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only proceed if payment_status actually changed
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    
    -- If order_id exists, update the order's payment status
    IF NEW.order_id IS NOT NULL THEN
      
      -- When invoice is marked as paid, mark order as paid
      IF NEW.payment_status = 'paid' THEN
        UPDATE orders
        SET payment_status = 'paid',
            updated_at = NOW()
        WHERE id = NEW.order_id
          AND payment_status != 'paid';
        
        IF FOUND THEN
          RAISE NOTICE '✅ [INVOICE→ORDER SYNC] Order % marked as paid from invoice %', 
            (SELECT order_number FROM orders WHERE id = NEW.order_id), 
            NEW.invoice_number;
        END IF;
      
      -- When invoice is marked as cancelled, mark order as cancelled
      ELSIF NEW.payment_status = 'cancelled' THEN
        UPDATE orders
        SET payment_status = 'cancelled',
            updated_at = NOW()
        WHERE id = NEW.order_id
          AND payment_status != 'cancelled';
        
        IF FOUND THEN
          RAISE NOTICE '❌ [INVOICE→ORDER SYNC] Order % marked as cancelled from invoice %', 
            (SELECT order_number FROM orders WHERE id = NEW.order_id), 
            NEW.invoice_number;
        END IF;
      
      -- When invoice is marked as pending, mark order as pending
      ELSIF NEW.payment_status = 'pending' THEN
        UPDATE orders
        SET payment_status = 'pending',
            updated_at = NOW()
        WHERE id = NEW.order_id
          AND payment_status NOT IN ('paid', 'cancelled'); -- Don't downgrade paid/cancelled to pending
        
        IF FOUND THEN
          RAISE NOTICE '⏳ [INVOICE→ORDER SYNC] Order % marked as pending from invoice %', 
            (SELECT order_number FROM orders WHERE id = NEW.order_id), 
            NEW.invoice_number;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync order payment status when invoice is updated
DROP TRIGGER IF EXISTS trigger_sync_order_payment_status_from_invoice ON public.invoices;

CREATE TRIGGER trigger_sync_order_payment_status_from_invoice
  AFTER UPDATE OF payment_status
  ON public.invoices
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
  EXECUTE FUNCTION public.sync_order_payment_status_from_invoice();

-- Add comment to document the bidirectional sync
COMMENT ON FUNCTION public.sync_order_payment_status_from_invoice() IS 
  'Synchronizes order payment status when invoice payment status changes. Works together with sync_invoice_payment_status() for bidirectional sync. Uses WHERE conditions to prevent infinite trigger loops.';

COMMENT ON TRIGGER trigger_sync_order_payment_status_from_invoice ON public.invoices IS 
  'Automatically updates order payment_status when invoice payment_status changes. Part of bidirectional sync system to keep invoices and orders in sync.';
