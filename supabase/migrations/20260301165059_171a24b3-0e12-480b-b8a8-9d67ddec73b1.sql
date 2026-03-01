
-- =====================================================
-- FASE 1: RLS + Estados + Sincronización Pago
-- =====================================================

-- A. POLITICAS RLS PARA quotes
-- =====================================================

-- Users can view their own quotes
CREATE POLICY "quotes_user_select" ON public.quotes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all quotes
CREATE POLICY "quotes_admin_select" ON public.quotes
  FOR SELECT TO authenticated
  USING (public.is_admin_or_superadmin(auth.uid()));

-- Users can create quotes with their own user_id
CREATE POLICY "quotes_user_insert" ON public.quotes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own quotes (for approve/reject)
CREATE POLICY "quotes_user_update" ON public.quotes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Admins can update any quote
CREATE POLICY "quotes_admin_update" ON public.quotes
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_superadmin(auth.uid()));

-- Admins can delete (soft) any quote
CREATE POLICY "quotes_admin_delete" ON public.quotes
  FOR DELETE TO authenticated
  USING (public.is_admin_or_superadmin(auth.uid()));

-- B. POLITICAS RLS PARA invoices
-- =====================================================

-- Users can view their own invoices
CREATE POLICY "invoices_user_select" ON public.invoices
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all invoices
CREATE POLICY "invoices_admin_select" ON public.invoices
  FOR SELECT TO authenticated
  USING (public.is_admin_or_superadmin(auth.uid()));

-- Users can create invoices with their own user_id (for automation)
CREATE POLICY "invoices_user_insert" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can insert any invoice
CREATE POLICY "invoices_admin_insert" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- Admins can update any invoice
CREATE POLICY "invoices_admin_update" ON public.invoices
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_superadmin(auth.uid()));

-- Admins can delete invoices
CREATE POLICY "invoices_admin_delete" ON public.invoices
  FOR DELETE TO authenticated
  USING (public.is_admin_or_superadmin(auth.uid()));

-- C. POLITICAS RLS PARA invoice_items
-- =====================================================

-- Users can view items of their own invoices
CREATE POLICY "invoice_items_user_select" ON public.invoice_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
        AND invoices.user_id = auth.uid()
    )
  );

-- Admins can view all invoice items
CREATE POLICY "invoice_items_admin_select" ON public.invoice_items
  FOR SELECT TO authenticated
  USING (public.is_admin_or_superadmin(auth.uid()));

-- Admins can insert invoice items
CREATE POLICY "invoice_items_admin_insert" ON public.invoice_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_superadmin(auth.uid()));

-- Users can insert invoice items for their own invoices (automation)
CREATE POLICY "invoice_items_user_insert" ON public.invoice_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
        AND invoices.user_id = auth.uid()
    )
  );

-- Admins can update invoice items
CREATE POLICY "invoice_items_admin_update" ON public.invoice_items
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_superadmin(auth.uid()));

-- D. LIMPIAR ESTADOS DUPLICADOS
-- =====================================================

-- Update the one we keep to have slug 'pending_client_approval'
UPDATE public.quote_statuses
SET slug = 'pending_client_approval', name = 'Pendiente Aprobación Cliente'
WHERE id = 'e8afe3a8-e990-40c5-8f20-f99db263e2a5';

-- Move any quotes using the duplicate to the one we keep
UPDATE public.quotes
SET status_id = 'e8afe3a8-e990-40c5-8f20-f99db263e2a5'
WHERE status_id = 'c4d3ada8-9898-44fd-af68-287b99f4b688';

-- Soft-delete the duplicate
UPDATE public.quote_statuses
SET deleted_at = now()
WHERE id = 'c4d3ada8-9898-44fd-af68-287b99f4b688';

-- E. TRIGGER DE SINCRONIZACIÓN FACTURA <-> PEDIDO
-- =====================================================

-- Function: when invoice payment_status changes, sync to linked order
CREATE OR REPLACE FUNCTION public.sync_invoice_payment_to_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    -- Sync via order_id if present
    IF NEW.order_id IS NOT NULL THEN
      UPDATE public.orders
      SET payment_status = NEW.payment_status, updated_at = now()
      WHERE id = NEW.order_id
        AND (payment_status IS DISTINCT FROM NEW.payment_status);
    END IF;
    -- Also sync via quote_id -> order admin_notes marker
    IF NEW.quote_id IS NOT NULL THEN
      UPDATE public.orders
      SET payment_status = NEW.payment_status, updated_at = now()
      WHERE admin_notes ILIKE '%quote_id:' || NEW.quote_id::text || '%'
        AND (payment_status IS DISTINCT FROM NEW.payment_status);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_invoice_payment_to_order
  AFTER UPDATE OF payment_status ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_invoice_payment_to_order();

-- Function: when order payment_status changes, sync to linked invoice
CREATE OR REPLACE FUNCTION public.sync_order_payment_to_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    -- Sync via order_id in invoices
    UPDATE public.invoices
    SET payment_status = NEW.payment_status, updated_at = now()
    WHERE order_id = NEW.id
      AND (payment_status IS DISTINCT FROM NEW.payment_status);
    -- Also sync via quote_id marker in admin_notes
    IF NEW.admin_notes IS NOT NULL AND NEW.admin_notes LIKE 'quote_id:%' THEN
      UPDATE public.invoices
      SET payment_status = NEW.payment_status, updated_at = now()
      WHERE quote_id = REPLACE(NEW.admin_notes, 'quote_id:', '')::uuid
        AND (payment_status IS DISTINCT FROM NEW.payment_status);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_order_payment_to_invoice
  AFTER UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_payment_to_invoice();
