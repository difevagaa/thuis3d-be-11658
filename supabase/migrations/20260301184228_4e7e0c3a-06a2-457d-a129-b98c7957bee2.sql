
-- =============================================
-- INVENTORY SYSTEM: Tables, RLS, Triggers, Realtime
-- =============================================

-- 1. inventory_items
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'filament',
  category text,
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  color_id uuid REFERENCES public.colors(id) ON DELETE SET NULL,
  sku text,
  brand text,
  quantity_in_stock numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'g',
  min_stock_alert numeric DEFAULT 0,
  cost_per_unit numeric DEFAULT 0,
  supplier text,
  location text,
  notes text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  weight_per_spool numeric,
  diameter numeric,
  print_temp_min int,
  print_temp_max int,
  bed_temp_min int,
  bed_temp_max int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. inventory_movements
CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type text NOT NULL DEFAULT 'adjustment',
  quantity numeric NOT NULL DEFAULT 0,
  previous_stock numeric NOT NULL DEFAULT 0,
  new_stock numeric NOT NULL DEFAULT 0,
  cost_per_unit numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. inventory_production_logs
CREATE TABLE public.inventory_production_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_item_id uuid,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  filament_used_g numeric DEFAULT 0,
  print_time_minutes numeric DEFAULT 0,
  energy_cost numeric DEFAULT 0,
  labor_cost numeric DEFAULT 0,
  other_costs numeric DEFAULT 0,
  sale_price numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  profit numeric DEFAULT 0,
  profit_margin_pct numeric DEFAULT 0,
  notes text,
  auto_calculated boolean DEFAULT false,
  manually_adjusted boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_production_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin/Superadmin only
CREATE POLICY "Admins can manage inventory_items" ON public.inventory_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage inventory_movements" ON public.inventory_movements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage inventory_production_logs" ON public.inventory_production_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger for inventory_items
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_production_logs;
