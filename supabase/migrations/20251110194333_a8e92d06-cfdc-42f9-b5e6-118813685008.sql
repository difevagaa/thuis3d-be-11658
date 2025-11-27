-- =========================================
-- SEED BÁSICO + FIX CONFIGURACIÓN CALCULADORA
-- =========================================

-- 1) Upsert de configuración con CLAVES EXACTAS que usa stlAnalyzer
INSERT INTO printing_calculator_settings (setting_key, setting_value) VALUES
  ('electricity_cost_per_kwh', to_jsonb(0.15)),
  ('printer_power_consumption_watts', to_jsonb(120)),
  ('printer_lifespan_hours', to_jsonb(4320)),
  ('replacement_parts_cost', to_jsonb(110)),
  ('error_margin_percentage', to_jsonb(15)),
  ('profit_multiplier_retail', to_jsonb(2.2)),
  ('additional_supplies_cost', to_jsonb(0)),
  ('minimum_price', to_jsonb(5.00)),
  ('default_layer_height', to_jsonb(0.2)),
  ('default_infill', to_jsonb(20)),
  ('extrusion_width', to_jsonb(0.45)),
  ('top_solid_layers', to_jsonb(5)),
  ('bottom_solid_layers', to_jsonb(5)),
  ('number_of_perimeters', to_jsonb(3)),
  ('perimeter_speed', to_jsonb(40)),
  ('infill_speed', to_jsonb(60)),
  ('top_bottom_speed', to_jsonb(40)),
  ('first_layer_speed', to_jsonb(20)),
  ('travel_speed', to_jsonb(150)),
  ('acceleration', to_jsonb(1000)),
  ('retraction_count_per_layer', to_jsonb(15)),
  ('bed_heating_watts', to_jsonb(150)),
  ('heating_time_minutes', to_jsonb(5)),
  (
    'material_density', 
    jsonb_build_object(
      'PLA', 1.24,
      'ABS', 1.04,
      'PETG', 1.27,
      'TPU', 1.20,
      'Nylon', 1.14,
      'ASA', 1.07
    )
  ),
  (
    'filament_costs', 
    jsonb_build_object(
      'PLA', 20,
      'ABS', 18,
      'PETG', 22,
      'TPU', 35,
      'Nylon', 45,
      'ASA', 28
    )
  )
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- 2) Materiales base (ajustado al esquema real: name, description, cost)
INSERT INTO materials (name, description, cost)
SELECT * FROM (
  VALUES
    ('ABS', 'Material resistente para piezas funcionales', 18.00::numeric),
    ('PETG', 'Resistente y flexible, ideal para uso exterior', 22.00::numeric),
    ('TPU', 'Flexible y elástico, ideal para fundas', 35.00::numeric),
    ('Nylon', 'Alta resistencia mecánica y al desgaste', 45.00::numeric),
    ('ASA', 'Resistente a UV y condiciones exteriores', 28.00::numeric)
) v(name, description, cost)
WHERE NOT EXISTS (SELECT 1 FROM materials m WHERE m.name = v.name);

-- 3) Colores básicos (ajustado al esquema real)
INSERT INTO colors (name, hex_code)
SELECT * FROM (
  VALUES
    ('Blanco', '#FFFFFF'),
    ('Rojo', '#FF0000'),
    ('Azul', '#0000FF'),
    ('Verde', '#00FF00'),
    ('Amarillo', '#FFFF00'),
    ('Naranja', '#FFA500'),
    ('Morado', '#800080'),
    ('Gris', '#808080'),
    ('Rosa', '#FFC0CB'),
    ('Transparente', '#FFFFFF')
) v(name, hex)
WHERE NOT EXISTS (SELECT 1 FROM colors c WHERE c.name = v.name);

-- 4) Categorías
INSERT INTO categories (name, description)
SELECT * FROM (
  VALUES
    ('Prototipos', 'Piezas de prueba y prototipos funcionales'),
    ('Decoración', 'Artículos decorativos y ornamentales'),
    ('Repuestos', 'Piezas de repuesto para maquinaria'),
    ('Juguetes', 'Juguetes y artículos recreativos'),
    ('Herramientas', 'Herramientas y accesorios útiles'),
    ('Arte', 'Esculturas y piezas artísticas'),
    ('Hogar', 'Artículos para el hogar y organización'),
    ('Tecnología', 'Carcasas y soportes para dispositivos')
) v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM categories cat WHERE cat.name = v.name);

-- 5) Estados de pedidos y cotizaciones (tablas reales)
INSERT INTO order_statuses (name, color)
SELECT * FROM (
  VALUES
    ('Recibido', '#64748b'),
    ('En impresión', '#3b82f6'),
    ('Enviado', '#06b6d4'),
    ('Entregado', '#10b981'),
    ('Cancelado', '#ef4444')
) v(name, color)
WHERE NOT EXISTS (SELECT 1 FROM order_statuses s WHERE s.name = v.name);

INSERT INTO quote_statuses (name, color)
SELECT * FROM (
  VALUES
    ('Pendiente', '#64748b'),
    ('En revisión', '#f59e0b'),
    ('Aprobada', '#10b981'),
    ('Rechazada', '#ef4444'),
    ('Completada', '#3b82f6')
) v(name, color)
WHERE NOT EXISTS (SELECT 1 FROM quote_statuses s WHERE s.name = v.name);

-- 6) Productos de muestra (ajustados al esquema real)
DO $$
DECLARE
  v_cat_proto uuid;
  v_cat_deco uuid;
  v_cat_hogar uuid;
BEGIN
  SELECT id INTO v_cat_proto FROM categories WHERE name = 'Prototipos' LIMIT 1;
  SELECT id INTO v_cat_deco FROM categories WHERE name = 'Decoración' LIMIT 1;
  SELECT id INTO v_cat_hogar FROM categories WHERE name = 'Hogar' LIMIT 1;

  IF v_cat_proto IS NOT NULL THEN
    INSERT INTO products (name, description, price, stock, category_id, allow_direct_purchase, enable_material_selection, enable_color_selection, enable_custom_text, visible_to_all, tax_enabled, shipping_type)
    SELECT * FROM (
      VALUES
        ('Cubo de Calibración', 'Cubo estándar de 20mm para calibración de impresora', 5.00::numeric, 10, v_cat_proto, true, true, true, false, true, true, 'standard')
    ) v(name, description, price, stock, category_id, allow_direct_purchase, enable_material_selection, enable_color_selection, enable_custom_text, visible_to_all, tax_enabled, shipping_type)
    WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = v.name);
  END IF;

  IF v_cat_deco IS NOT NULL THEN
    INSERT INTO products (name, description, price, stock, category_id, allow_direct_purchase, enable_material_selection, enable_color_selection, enable_custom_text, visible_to_all, tax_enabled, shipping_type)
    SELECT * FROM (
      VALUES
        ('Maceta Pequeña', 'Maceta decorativa de 8cm de diámetro', 12.00::numeric, 5, v_cat_deco, true, true, true, false, true, true, 'standard')
    ) v(name, description, price, stock, category_id, allow_direct_purchase, enable_material_selection, enable_color_selection, enable_custom_text, visible_to_all, tax_enabled, shipping_type)
    WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = v.name);
  END IF;

  IF v_cat_hogar IS NOT NULL THEN
    INSERT INTO products (name, description, price, stock, category_id, allow_direct_purchase, enable_material_selection, enable_color_selection, enable_custom_text, visible_to_all, tax_enabled, shipping_type)
    SELECT * FROM (
      VALUES
        ('Organizador Escritorio', 'Organizador de bolígrafos y clips', 18.00::numeric, 3, v_cat_hogar, true, true, true, false, true, true, 'standard')
    ) v(name, description, price, stock, category_id, allow_direct_purchase, enable_material_selection, enable_color_selection, enable_custom_text, visible_to_all, tax_enabled, shipping_type)
    WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = v.name);
  END IF;
END $$;

-- 7) Políticas de lectura (solo si no existen)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'printing_calculator_settings' AND policyname = 'Allow read all'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow read all" ON public.printing_calculator_settings FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'materials' AND policyname = 'Allow read all'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow read all" ON public.materials FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'colors' AND policyname = 'Allow read all'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow read all" ON public.colors FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'Allow read all'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow read all" ON public.categories FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'Allow read all'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow read all" ON public.products FOR SELECT USING (true)';
  END IF;
END $$;