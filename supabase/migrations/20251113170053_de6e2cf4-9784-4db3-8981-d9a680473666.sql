-- Crear tabla para secciones de personalización de productos
CREATE TABLE IF NOT EXISTS public.product_customization_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para búsquedas por producto
CREATE INDEX IF NOT EXISTS idx_customization_sections_product 
  ON public.product_customization_sections(product_id);

-- Índice para ordenar secciones
CREATE INDEX IF NOT EXISTS idx_customization_sections_order 
  ON public.product_customization_sections(product_id, display_order);

-- Crear tabla para colores disponibles por sección
CREATE TABLE IF NOT EXISTS public.product_section_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.product_customization_sections(id) ON DELETE CASCADE,
  color_id UUID NOT NULL REFERENCES public.colors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(section_id, color_id)
);

-- Índice para búsquedas por sección
CREATE INDEX IF NOT EXISTS idx_section_colors_section 
  ON public.product_section_colors(section_id);

-- Índice para búsquedas por color
CREATE INDEX IF NOT EXISTS idx_section_colors_color 
  ON public.product_section_colors(color_id);

-- Habilitar RLS
ALTER TABLE public.product_customization_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_section_colors ENABLE ROW LEVEL SECURITY;

-- Políticas para product_customization_sections
CREATE POLICY "Anyone can view customization sections"
  ON public.product_customization_sections
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage customization sections"
  ON public.product_customization_sections
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::text));

-- Políticas para product_section_colors
CREATE POLICY "Anyone can view section colors"
  ON public.product_section_colors
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage section colors"
  ON public.product_section_colors
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::text));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_customization_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customization_sections_timestamp
  BEFORE UPDATE ON public.product_customization_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_customization_sections_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE public.product_customization_sections IS 'Secciones personalizables de productos donde clientes pueden seleccionar colores específicos para diferentes partes';
COMMENT ON TABLE public.product_section_colors IS 'Colores disponibles para cada sección de personalización de producto';
COMMENT ON COLUMN public.product_customization_sections.section_name IS 'Nombre de la parte del producto (ej: "Cabeza", "Cuerpo")';
COMMENT ON COLUMN public.product_customization_sections.is_required IS 'Si el cliente debe obligatoriamente seleccionar un color para esta sección';
COMMENT ON COLUMN public.product_customization_sections.display_order IS 'Orden de visualización de las secciones en la página de producto';