
-- 1. Clean duplicate invoice_items (keep only the first one per group)
DELETE FROM invoice_items
WHERE id NOT IN (
  SELECT MIN(id::text)::uuid FROM invoice_items
  GROUP BY invoice_id, product_name, quantity, unit_price, total_price
);

-- 2. Fix unit_price for invoice 5502ecdf (5 units, total=25, unit_price should be 5)
UPDATE invoice_items 
SET unit_price = total_price / NULLIF(quantity, 0)
WHERE invoice_id = '5502ecdf-0705-4a7a-92fe-8e93ed98c67e' AND quantity > 1;

-- 3. Drop the trigger that causes duplicate invoice generation
DROP TRIGGER IF EXISTS trigger_auto_generate_invoice ON orders;

-- 4. Create site_mascot_settings table
CREATE TABLE IF NOT EXISTS public.site_mascot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT false,
  mascot_type TEXT NOT NULL DEFAULT 'robot',
  primary_color TEXT NOT NULL DEFAULT '#FF6B35',
  secondary_color TEXT NOT NULL DEFAULT '#004E98',
  position TEXT NOT NULL DEFAULT 'bottom-right',
  animation_frequency TEXT NOT NULL DEFAULT 'normal',
  click_reactions BOOLEAN NOT NULL DEFAULT true,
  show_on_mobile BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_mascot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read mascot settings"
  ON public.site_mascot_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage mascot settings"
  ON public.site_mascot_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.site_mascot_settings (enabled, mascot_type) VALUES (false, 'robot');

CREATE UNIQUE INDEX IF NOT EXISTS site_mascot_settings_singleton ON public.site_mascot_settings ((true));
