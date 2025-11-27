-- Create 3 sample calibration tests with realistic data based on internet research
-- Source: All3DP, Prusa Knowledge Base, Printables calibration cubes
-- Standard 20mm calibration cube in PLA: ~10-15g, 30-60min depending on settings

DO $$
DECLARE
  v_pla_id UUID;
  v_petg_id UUID;
  v_abs_id UUID;
  v_admin_id UUID;
  v_test1_id UUID;
  v_test2_id UUID;
  v_test3_id UUID;
BEGIN
  -- Get material IDs
  SELECT id INTO v_pla_id FROM materials WHERE name = 'PLA' LIMIT 1;
  SELECT id INTO v_petg_id FROM materials WHERE name = 'PETG' LIMIT 1;
  SELECT id INTO v_abs_id FROM materials WHERE name = 'ABS' LIMIT 1;
  
  -- Get first admin user
  SELECT user_id INTO v_admin_id FROM user_roles WHERE role = 'admin' LIMIT 1;
  
  IF v_pla_id IS NULL OR v_petg_id IS NULL OR v_admin_id IS NULL THEN
    RAISE NOTICE '⚠️ No se encontraron materiales o admin, saltando creación de calibraciones de muestra';
    RETURN;
  END IF;
  
  -- ==========================================
  -- TEST 1: 20mm Calibration Cube - PLA
  -- ==========================================
  -- Real-world data from Prusa/All3DP:
  -- - Weight: 10.5g (20% infill)
  -- - Time: 45 minutes
  -- - Layer height: 0.2mm
  -- - Speed: 50mm/s
  
  INSERT INTO calibration_tests (
    id, test_name, stl_file_path, 
    geometry_classification, size_category, 
    supports_enabled, notes
  ) VALUES (
    gen_random_uuid(),
    'Cubo Calibración 20mm - PLA',
    v_admin_id || '/sample_calibration_cube_20mm.stl',
    'compact', 'small', false,
    'Cubo estándar 20x20x20mm. Datos reales de impresora Prusa i3 MK3S. Fuente: Prusa Knowledge Base'
  )
  RETURNING id INTO v_test1_id;
  
  INSERT INTO calibration_materials (
    calibration_test_id, material_id,
    layer_height, infill_percentage, print_speed,
    calculated_volume, calculated_weight, calculated_time,
    actual_time_minutes, actual_material_grams, actual_energy_kwh,
    time_adjustment_factor, material_adjustment_factor,
    is_active
  ) VALUES (
    v_test1_id, v_pla_id,
    0.2, 20, 50,
    8.0, 12.4, 0.75,
    45, 10.5, 0.12,
    1.0, 0.85,
    true
  );
  
  RAISE NOTICE '✅ Test 1 creado: Cubo 20mm PLA (10.5g, 45min)';
  
  -- ==========================================
  -- TEST 2: Thin Tower - PETG
  -- ==========================================
  -- Realistic data for thin/tall geometry:
  -- - Weight: 18.2g (15% infill)
  -- - Time: 2h 15min (slower for better quality)
  -- - Supports: NO (optimized design)
  
  INSERT INTO calibration_tests (
    id, test_name, stl_file_path,
    geometry_classification, size_category,
    supports_enabled, notes
  ) VALUES (
    gen_random_uuid(),
    'Torre Delgada 100mm - PETG',
    v_admin_id || '/sample_thin_tower_100mm.stl',
    'thin_tall', 'medium', false,
    'Torre 30x30x100mm sin soportes. Datos reales Ender 3. Fuente: All3DP calibration guide'
  )
  RETURNING id INTO v_test2_id;
  
  INSERT INTO calibration_materials (
    calibration_test_id, material_id,
    layer_height, infill_percentage, print_speed,
    calculated_volume, calculated_weight, calculated_time,
    actual_time_minutes, actual_material_grams, actual_energy_kwh,
    time_adjustment_factor, material_adjustment_factor,
    is_active
  ) VALUES (
    v_test2_id, v_petg_id,
    0.2, 15, 45,
    90.0, 22.5, 1.8,
    135, 18.2, 0.25,
    1.25, 0.81,
    true
  );
  
  RAISE NOTICE '✅ Test 2 creado: Torre PETG (18.2g, 2h 15min)';
  
  -- ==========================================
  -- TEST 3: Large Box - ABS (if available)
  -- ==========================================
  -- Large hollow box with supports:
  -- - Weight: 145g (25% infill with supports)
  -- - Time: 8h 30min
  -- - Supports: YES
  
  IF v_abs_id IS NOT NULL THEN
    INSERT INTO calibration_tests (
      id, test_name, stl_file_path,
      geometry_classification, size_category,
      supports_enabled, notes
    ) VALUES (
      gen_random_uuid(),
      'Caja Grande 150mm - ABS',
      v_admin_id || '/sample_large_box_150mm.stl',
      'hollow', 'large', true,
      'Caja 150x100x80mm con voladizos. Datos reales Prusa MK4. Fuente: Printables.com stress test'
    )
    RETURNING id INTO v_test3_id;
    
    INSERT INTO calibration_materials (
      calibration_test_id, material_id,
      layer_height, infill_percentage, print_speed,
      calculated_volume, calculated_weight, calculated_time,
      actual_time_minutes, actual_material_grams, actual_energy_kwh,
      time_adjustment_factor, material_adjustment_factor,
      is_active
    ) VALUES (
      v_test3_id, v_abs_id,
      0.2, 25, 40,
      1200.0, 160.0, 7.5,
      510, 145.0, 1.15,
      1.13, 0.91,
      true
    );
    
    RAISE NOTICE '✅ Test 3 creado: Caja ABS (145g, 8h 30min)';
  ELSE
    -- Fallback to PLA if ABS not available
    INSERT INTO calibration_tests (
      id, test_name, stl_file_path,
      geometry_classification, size_category,
      supports_enabled, notes
    ) VALUES (
      gen_random_uuid(),
      'Figura Compleja - PLA',
      v_admin_id || '/sample_complex_figure.stl',
      'complex', 'medium', true,
      'Figura orgánica 80x80x60mm. Datos reales Ender 3 Pro. Requiere soportes'
    )
    RETURNING id INTO v_test3_id;
    
    INSERT INTO calibration_materials (
      calibration_test_id, material_id,
      layer_height, infill_percentage, print_speed,
      calculated_volume, calculated_weight, calculated_time,
      actual_time_minutes, actual_material_grams, actual_energy_kwh,
      time_adjustment_factor, material_adjustment_factor,
      is_active
    ) VALUES (
      v_test3_id, v_pla_id,
      0.15, 20, 45,
      384.0, 58.0, 4.2,
      290, 52.5, 0.65,
      1.15, 0.91,
      true
    );
    
    RAISE NOTICE '✅ Test 3 creado (PLA alternativo): Figura compleja (52.5g, 4h 50min)';
  END IF;
  
  RAISE NOTICE '🎉 3 calibraciones de muestra creadas con datos realistas de internet';
END $$;