-- ============================================================================
-- FIX: RLS policy to allow authenticated users to create invoices
-- ============================================================================
-- 
-- PROBLEM: The invoices table only has admin-level policies for INSERT.
-- When a regular user places an order, the frontend tries to create an
-- invoice via createInvoiceForOrder(), but it fails silently due to RLS.
-- This causes the "messages.errorCreatingInvoice" error shown to the user.
--
-- SOLUTION: Add an INSERT policy that allows authenticated users to create
-- invoices for their own orders, similar to the orders table policy.
-- ============================================================================

-- 1. Add INSERT policy for regular authenticated users
DROP POLICY IF EXISTS "Users can create their own invoices" ON public.invoices;

CREATE POLICY "Users can create their own invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can create invoice for themselves
  (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- 2. Ensure users can also view their own invoices (may already exist, but ensure it's correct)
DROP POLICY IF EXISTS "Anyone can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;

CREATE POLICY "Users can view their own invoices"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  -- Users see their own invoices
  user_id = auth.uid()
  OR
  -- Admins see all invoices (handled by admin full access policy, but included as fallback)
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'superadmin')
  )
);

-- 3. Add index for invoice lookups by user_id and order_id
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id)
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON public.invoices(order_id)
WHERE order_id IS NOT NULL;

-- 4. Documentation
COMMENT ON POLICY "Users can create their own invoices" ON public.invoices IS 
  'Allows authenticated users to create invoices for their own orders during the payment flow.';
