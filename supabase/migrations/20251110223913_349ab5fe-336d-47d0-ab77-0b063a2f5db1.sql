-- ============================================
-- SISTEMA DE DESCUENTOS POR CANTIDAD
-- ============================================

-- Crear tabla para reglas de descuento por cantidad
CREATE TABLE IF NOT EXISTS public.quantity_discount_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL,
  min_quantity INTEGER NOT NULL,
  max_quantity INTEGER,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC NOT NULL CHECK (discount_value >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_quantity_range CHECK (
    max_quantity IS NULL OR max_quantity >= min_quantity
  ),
  CONSTRAINT unique_tier_name UNIQUE (tier_name)
);

-- Habilitar RLS
ALTER TABLE public.quantity_discount_tiers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can view active discount tiers"
  ON public.quantity_discount_tiers
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage discount tiers"
  ON public.quantity_discount_tiers
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Insertar configuraciones por defecto
INSERT INTO public.quantity_discount_tiers (
  tier_name,
  min_quantity,
  max_quantity,
  discount_type,
  discount_value,
  display_order
) VALUES
  ('Precio Individual', 1, 1, 'percentage', 0, 1),
  ('Pequeña Cantidad', 2, 5, 'percentage', 5, 2),
  ('Cantidad Media', 6, 10, 'percentage', 10, 3),
  ('Mayorista', 11, 50, 'percentage', 15, 4),
  ('Gran Volumen', 51, NULL, 'percentage', 20, 5)
ON CONFLICT (tier_name) DO NOTHING;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_quantity_discount_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quantity_discount_tiers_updated_at
  BEFORE UPDATE ON public.quantity_discount_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_quantity_discount_tiers_updated_at();

COMMENT ON TABLE public.quantity_discount_tiers IS 'Configuración de descuentos escalonados por cantidad de piezas';
COMMENT ON COLUMN public.quantity_discount_tiers.min_quantity IS 'Cantidad mínima para aplicar este descuento';
COMMENT ON COLUMN public.quantity_discount_tiers.max_quantity IS 'Cantidad máxima (NULL = sin límite)';
COMMENT ON COLUMN public.quantity_discount_tiers.discount_type IS 'Tipo: percentage (porcentaje) o fixed_amount (monto fijo)';
COMMENT ON COLUMN public.quantity_discount_tiers.discount_value IS 'Valor del descuento (5 = 5% si es percentage, o €5 si es fixed_amount)';