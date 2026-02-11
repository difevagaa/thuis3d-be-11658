import * as THREE from 'three';
import { supabase } from '@/integrations/supabase/client';
import { calculateSupportRisk, type SupportRiskFactors } from './supportRiskAnalyzer';
import { SUPPORT_CONSTANTS } from './calibrationConstants';
import { logger } from '@/lib/logger';

// ============================================================
// 🧠 CONSTANTES DE IA PARA ANÁLISIS INTELIGENTE
// ============================================================

/**
 * Configuración de la impresora (Bambu Lab X1C como referencia)
 */
const PRINTER_CONFIG = {
  BED_SIZE_MM: 256,                    // Tamaño de cama en mm
  BED_VOLUME_CM3: (256 * 256 * 256) / 1000,  // ~16.7L
  PACKING_EFFICIENCY_FACTOR: 0.70,     // 70% eficiencia de empaquetamiento
  SETUP_TIME_MINUTES: 5,               // Tiempo de preparación por trabajo
} as const;

/**
 * Factores de eficiencia de batch según tamaño de pieza
 */
const BATCH_EFFICIENCY_FACTORS = {
  VERY_SMALL: { threshold: 20, discount: 0.85 },  // 15% ahorro
  SMALL: { threshold: 10, discount: 0.88 },       // 12% ahorro
  MEDIUM: { threshold: 4, discount: 0.90 },       // 10% ahorro
  LARGE: { threshold: 2, discount: 0.93 },        // 7% ahorro
  VERY_LARGE: { threshold: 0, discount: 0.95 },   // 5% ahorro
  SUPPORT_PENALTY: 0.03,                          // +3% si requiere soportes
} as const;

/**
 * Configuración para detección de islas flotantes
 */
const ISLAND_DETECTION_CONFIG = {
  LAYER_TOLERANCE_MM: 0.2,             // Tolerancia para agrupar capas (altura de capa típica)
  SEARCH_RADIUS_MM: 2,                 // Radio de búsqueda de soporte debajo (±2mm)
  MIN_ISLAND_COUNT_THRESHOLD: 5,       // Umbral para agregar volumen de islas
  SUPPORT_HEIGHT_FACTOR: 0.5,          // 50% de altura para soportes de islas
} as const;

/**
 * Umbrales de ángulo para clasificación de voladizos
 */
const OVERHANG_SEVERITY = {
  SEVERE_ANGLE: 60,     // >60° = crítico, necesita soportes pesados
  STANDARD_ANGLE: 45,   // >45° = estándar, necesita soportes
  MILD_ANGLE: 35,       // >35° = leve, posiblemente necesita
  
  // Ponderaciones para cálculo de área
  SEVERE_WEIGHT: 1.5,   // Voladizos severos pesan 1.5x
  STANDARD_WEIGHT: 1.0, // Voladizos estándar pesan 1.0x
  MILD_WEIGHT: 0.5,     // Voladizos leves pesan 0.5x
} as const;

export interface AnalysisResult {
  volume: number;      // cm³
  weight: number;      // gramos
  dimensions: {
    x: number;  // cm
    y: number;  // cm
    z: number;  // cm
  };
  materialCost: number;
  electricityCost: number;
  machineCost: number;
  errorMarginCost: number;
  suppliesCost: number;
  subtotalWithoutSupplies: number;
  estimatedTime: number; // horas
  estimatedTotal: number;
  breakdown: {
    materialCost: number;
    electricityCost: number;
    machineCost: number;
    errorMarginCost: number;
    suppliesCost: number;
    subtotal: number;
    total: number;
  };
  preview: string;  // Base64 de imagen
  filePath: string;
  stlData?: ArrayBuffer; // ArrayBuffer del STL para visor 3D interactivo
}

/**
 * Clasificación geométrica de la pieza
 */
interface GeometryClassification {
  type: 'thin_tall' | 'wide_short' | 'large' | 'compact' | 'hollow' | 'complex';
  aspectRatio: {
    xy: number;  // ancho/alto
    xz: number;  // ancho/profundidad
    yz: number;  // alto/profundidad
  };
  surfaceComplexity: number; // 0-10 (simple a muy complejo)
  wallThicknessRatio: number; // volumen/superficie (detecta piezas huecas)
  layerDensity: number; // volumen por capa
  recommendation: string;
}

/**
 * Clasifica la geometría de la pieza automáticamente
 */
function classifyGeometry(
  dimensions: { x: number; y: number; z: number },
  volumeMm3: number,
  surfaceAreaMm2: number,
  geometry: THREE.BufferGeometry
): GeometryClassification {
  // Convertir dimensiones a mm
  const dimX = dimensions.x * 10;
  const dimY = dimensions.y * 10;
  const dimZ = dimensions.z * 10;
  
  // Calcular aspect ratios
  const aspectRatio = {
    xy: dimX / dimY,
    xz: dimX / dimZ,
    yz: dimY / dimZ
  };
  
  // Calcular complejidad superficial
  // Comparar superficie real vs superficie de un cubo equivalente
  const boundingVolume = dimX * dimY * dimZ;
  const equivalentCubeSide = Math.pow(boundingVolume, 1/3);
  const equivalentCubeSurface = 6 * equivalentCubeSide * equivalentCubeSide;
  const surfaceComplexity = Math.min(10, (surfaceAreaMm2 / equivalentCubeSurface) * 5);
  
  // Calcular ratio de grosor de pared (detecta piezas huecas)
  // Piezas sólidas: ratio alto, piezas huecas: ratio bajo
  const wallThicknessRatio = volumeMm3 / surfaceAreaMm2;
  
  // Densidad de volumen por capa
  const estimatedLayers = dimZ / 0.2; // asumiendo 0.2mm layer height
  const layerDensity = volumeMm3 / estimatedLayers;
  
  // Clasificar tipo
  let type: GeometryClassification['type'] = 'compact';
  let recommendation = '';
  
  // Detectar pieza delgada y alta (ej: pinzas, torres, varillas)
  if (aspectRatio.yz > 5 && wallThicknessRatio < 1.5) {
    type = 'thin_tall';
    recommendation = 'Pieza delgada y alta detectada. Ajustando cálculo de perímetros y reduciendo estimación de top/bottom.';
  }
  // Detectar pieza ancha y corta (ej: bases, placas, bandejas)
  else if (aspectRatio.yz < 0.3 && (aspectRatio.xy < 2 && aspectRatio.xy > 0.5)) {
    type = 'wide_short';
    recommendation = 'Pieza ancha y corta detectada. Priorizando cálculo de capas top/bottom.';
  }
  // Detectar pieza grande (ej: cajas grandes, estructuras)
  else if (dimX > 150 && dimY > 150 && dimZ > 100) {
    type = 'large';
    recommendation = 'Pieza grande detectada. Ajustando tiempos de travel y cambios de capa.';
  }
  // Detectar pieza hueca (ej: cajas, contenedores)
  else if (wallThicknessRatio < 0.8 && volumeMm3 < boundingVolume * 0.4) {
    type = 'hollow';
    recommendation = 'Pieza hueca detectada. Reduciendo estimación de infill y ajustando perímetros.';
  }
  // Detectar pieza compleja (muchas curvas, corrugaciones)
  else if (surfaceComplexity > 4) {
    type = 'complex';
    recommendation = 'Pieza compleja detectada. Aumentando tiempo de perímetros y retracciones.';
  }
  
  return {
    type,
    aspectRatio,
    surfaceComplexity,
    wallThicknessRatio,
    layerDensity,
    recommendation
  };
}

/**
 * Calcula la superficie externa del modelo (perímetros)
 */
function calculateSurfaceArea(geometry: THREE.BufferGeometry): number {
  const position = geometry.attributes.position;
  let totalSurface = 0;
  
  for (let i = 0; i < position.count; i += 3) {
    const p1 = new THREE.Vector3().fromBufferAttribute(position, i);
    const p2 = new THREE.Vector3().fromBufferAttribute(position, i + 1);
    const p3 = new THREE.Vector3().fromBufferAttribute(position, i + 2);
    
    const edge1 = p2.clone().sub(p1);
    const edge2 = p3.clone().sub(p1);
    const triangleArea = edge1.cross(edge2).length() / 2;
    totalSurface += triangleArea;
  }
  
  return totalSurface; // mm²
}

/**
 * Calcula el área horizontal promedio (para top/bottom layers)
 */
function calculateHorizontalArea(geometry: THREE.BufferGeometry): number {
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  
  // Aproximación: usar el área del bounding box en XY
  const width = bbox.max.x - bbox.min.x;
  const depth = bbox.max.y - bbox.min.y;
  
  return width * depth; // mm²
}

/**
 * Calcula perímetro real promedio basado en superficie y forma
 */
function calculateAveragePerimeter(
  geometry: THREE.BufferGeometry, 
  numberOfLayers: number,
  surfaceAreaMm2: number,
  horizontalAreaMm2: number
): number {
  // Método mejorado: usar superficie real y área horizontal
  // Aproximación más precisa que análisis capa por capa
  
  // Calcular perímetro promedio usando la superficie externa
  const averageSurfacePerLayer = surfaceAreaMm2 / numberOfLayers;
  
  // Estimar perímetro usando geometría: P ≈ 2 * sqrt(π * A)
  // donde A es el área horizontal promedio
  const estimatedPerimeter = 2 * Math.sqrt(Math.PI * horizontalAreaMm2);
  
  // Ajustar por complejidad: si la superficie es mucho mayor que el área,
  // significa que hay más contorno (más complejo)
  const complexityFactor = Math.sqrt(averageSurfacePerLayer / horizontalAreaMm2);
  const adjustedPerimeter = estimatedPerimeter * Math.min(complexityFactor, 2);
  
  return adjustedPerimeter; // mm
}

/**
 * Calcula tiempo considerando aceleración
 * Returns time in seconds for a movement
 */
function calculateTimeWithAcceleration(
  distance: number, // mm
  targetSpeed: number, // mm/s
  acceleration: number // mm/s²
): number {
  // Guard against invalid inputs - 0 is safe return as no movement = no time
  // This handles edge cases where geometry analysis may return zero values
  if (distance <= 0 || targetSpeed <= 0 || acceleration <= 0) {
    return 0;
  }
  
  // Distancia de aceleración hasta velocidad objetivo
  const accelDistance = (targetSpeed * targetSpeed) / (2 * acceleration);
  
  if (distance < 2 * accelDistance) {
    // Movimiento corto: no alcanza velocidad máxima
    const maxSpeed = Math.sqrt(acceleration * distance);
    return 2 * (maxSpeed / acceleration); // tiempo acelerando + desacelerando
  } else {
    // Movimiento largo: acelera, velocidad constante, desacelera
    const accelTime = targetSpeed / acceleration;
    const constantSpeedDistance = distance - 2 * accelDistance;
    const constantSpeedTime = constantSpeedDistance / targetSpeed;
    return 2 * accelTime + constantSpeedTime; // segundos
  }
}

/**
 * Ajusta cálculos basándose en la clasificación geométrica
 */
function applyGeometricAdjustments(
  classification: GeometryClassification,
  baseCalculations: {
    perimeterVolume: number;
    topBottomVolume: number;
    infillVolume: number;
    travelTime: number;
    retractionCount: number;
  }
): typeof baseCalculations {
  const adjustedCalcs = { ...baseCalculations };
  
  switch (classification.type) {
    case 'thin_tall':
      // Piezas delgadas: más perímetros, menos top/bottom
      adjustedCalcs.perimeterVolume *= 1.15;
      adjustedCalcs.topBottomVolume *= 0.7;
      adjustedCalcs.travelTime *= 0.9; // Menos viajes internos
      adjustedCalcs.retractionCount *= 0.85;
      break;
      
    case 'wide_short':
      // Piezas anchas: más top/bottom, menos perímetros relativos
      adjustedCalcs.topBottomVolume *= 1.1;
      adjustedCalcs.perimeterVolume *= 0.95;
      adjustedCalcs.travelTime *= 1.15; // Más distancia de travel
      break;
      
    case 'large':
      // Piezas grandes: más tiempo de travel
      adjustedCalcs.travelTime *= 1.3;
      adjustedCalcs.retractionCount *= 1.2;
      break;
      
    case 'hollow':
      // Piezas huecas: menos infill, más perímetros
      adjustedCalcs.infillVolume *= 0.6;
      adjustedCalcs.perimeterVolume *= 1.1;
      adjustedCalcs.travelTime *= 1.1; // Más movimientos internos
      adjustedCalcs.retractionCount *= 1.15;
      break;
      
    case 'complex':
      // Piezas complejas: todo aumenta
      adjustedCalcs.perimeterVolume *= 1.1;
      adjustedCalcs.travelTime *= 1.25;
      adjustedCalcs.retractionCount *= 1.4; // Muchas más retracciones
      break;
      
    case 'compact':
      // Piezas compactas: usar valores base
      break;
  }
  
  // Ajuste adicional por complejidad superficial
  const complexityFactor = 1 + (classification.surfaceComplexity / 20);
  adjustedCalcs.perimeterVolume *= complexityFactor;
  adjustedCalcs.travelTime *= complexityFactor;
  
  return adjustedCalcs;
}

/**
 * Analiza un archivo STL y calcula costos automáticamente
 */
export const analyzeSTLFile = async (
  fileURL: string,
  materialId: string,
  filePath: string,
  supportsRequired: boolean = false,
  layerHeightOverride?: number,
  quantity: number = 1,
  colorId?: string
): Promise<AnalysisResult> => {
  try {
    // Cargar el archivo STL como ArrayBuffer
    const response = await fetch(fileURL);
    const arrayBuffer = await response.arrayBuffer();
      
      // Parsear STL manualmente
      const geometry = parseSTL(arrayBuffer);
      
      // ✨ APLICAR ORIENTACIÓN ÓPTIMA AUTOMÁTICAMENTE
      const orientationResult = findOptimalOrientationAdvanced(geometry);
      geometry.applyMatrix4(orientationResult.matrix);
      
      // Guardar métricas de orientación
      logger.log('🎯 ORIENTACIÓN APLICADA:', {
        voladizosDetectados: orientationResult.evaluation.overhangPercentage.toFixed(1) + '%',
        soportesNecesarios: orientationResult.evaluation.overhangPercentage > 5 ? 'SÍ' : 'NO',
        volumenSoportes: orientationResult.evaluation.supportVolume.toFixed(2) + 'cm³',
        estabilidad: orientationResult.evaluation.baseStability.toFixed(0) + '%',
        alturaPieza: orientationResult.evaluation.printHeight.toFixed(1) + 'mm'
      });
      
      // Calcular volumen y superficies
      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox!;
      
      const volumeMm3 = calculateMeshVolume(geometry); // en mm³
      const volumeCm3 = volumeMm3 / 1000; // convertir a cm³
      
      const surfaceAreaMm2 = calculateSurfaceArea(geometry); // mm²
      const horizontalAreaMm2 = calculateHorizontalArea(geometry); // mm²
      
      // Dimensiones en cm
      const dimensions = {
        x: (bbox.max.x - bbox.min.x) / 10,
        y: (bbox.max.y - bbox.min.y) / 10,
        z: (bbox.max.z - bbox.min.z) / 10
      };
      
      // ============================================================
      // CLASIFICACIÓN GEOMÉTRICA AUTOMÁTICA
      // ============================================================
      const classification = classifyGeometry(dimensions, volumeMm3, surfaceAreaMm2, geometry);
      
      logger.log('🔍 CLASIFICACIÓN GEOMÉTRICA AUTOMÁTICA:', {
        tipo: classification.type,
        aspectRatios: {
          xy: classification.aspectRatio.xy.toFixed(2),
          xz: classification.aspectRatio.xz.toFixed(2),
          yz: classification.aspectRatio.yz.toFixed(2)
        },
        complejidadSuperficial: classification.surfaceComplexity.toFixed(1) + '/10',
        grosorPared: classification.wallThicknessRatio.toFixed(3) + 'mm',
        densidadCapa: classification.layerDensity.toFixed(2) + 'mm³/capa',
        recomendación: classification.recommendation
      });
      
      // Obtener configuración desde base de datos
      const { data: settings, error: settingsError } = await supabase
        .from('printing_calculator_settings')
        .select('*');
      
      if (settingsError || !settings || settings.length === 0) {
        throw new Error('No se encontró configuración de calculadora');
      }
      
      const densities = settings.find(s => s.setting_key === 'material_density')?.setting_value as Record<string, number> || {};
      const costs = settings.find(s => s.setting_key === 'filament_costs')?.setting_value as Record<string, number> || {};
      
      const electricityCostPerKwh = parseFloat(String(settings.find(s => s.setting_key === 'electricity_cost_per_kwh')?.setting_value || '0.15'));
      const printerPowerWatts = parseFloat(String(settings.find(s => s.setting_key === 'printer_power_consumption_watts')?.setting_value || '120'));
      const printerLifespanHours = parseFloat(String(settings.find(s => s.setting_key === 'printer_lifespan_hours')?.setting_value || '4320'));
      const replacementPartsCost = parseFloat(String(settings.find(s => s.setting_key === 'replacement_parts_cost')?.setting_value || '110'));
      const errorMarginPercentage = parseFloat(String(settings.find(s => s.setting_key === 'error_margin_percentage')?.setting_value || '29'));
      const profitMultiplier = parseFloat(String(settings.find(s => s.setting_key === 'profit_multiplier_retail')?.setting_value || '5'));
      const suppliesCost = parseFloat(String(settings.find(s => s.setting_key === 'additional_supplies_cost')?.setting_value || '0'));
      const configuredMinimumPrice = parseFloat(String(settings.find(s => s.setting_key === 'minimum_price')?.setting_value || '5.00'));
      
      // Parámetros de impresión
      const defaultLayerHeight = parseFloat(String(settings.find(s => s.setting_key === 'default_layer_height')?.setting_value || '0.2'));
      const defaultInfill = parseFloat(String(settings.find(s => s.setting_key === 'default_infill')?.setting_value || '20'));
      const layerHeight = layerHeightOverride || defaultLayerHeight;
      
      // Nuevos parámetros precisos
      const extrusionWidth = parseFloat(String(settings.find(s => s.setting_key === 'extrusion_width')?.setting_value || '0.45'));
      const topSolidLayers = parseFloat(String(settings.find(s => s.setting_key === 'top_solid_layers')?.setting_value || '4'));
      const bottomSolidLayers = parseFloat(String(settings.find(s => s.setting_key === 'bottom_solid_layers')?.setting_value || '4'));
      const numberOfPerimeters = parseFloat(String(settings.find(s => s.setting_key === 'number_of_perimeters')?.setting_value || '3'));
      const perimeterSpeed = parseFloat(String(settings.find(s => s.setting_key === 'perimeter_speed')?.setting_value || '40'));
      const infillSpeed = parseFloat(String(settings.find(s => s.setting_key === 'infill_speed')?.setting_value || '60'));
      const topBottomSpeed = parseFloat(String(settings.find(s => s.setting_key === 'top_bottom_speed')?.setting_value || '30'));
      const firstLayerSpeed = parseFloat(String(settings.find(s => s.setting_key === 'first_layer_speed')?.setting_value || '20'));
      const travelSpeed = parseFloat(String(settings.find(s => s.setting_key === 'travel_speed')?.setting_value || '120'));
      const acceleration = parseFloat(String(settings.find(s => s.setting_key === 'acceleration')?.setting_value || '1000'));
      const retractionCountPerLayer = parseFloat(String(settings.find(s => s.setting_key === 'retraction_count_per_layer')?.setting_value || '15'));
      
      const bedHeatingWatts = parseFloat(String(settings.find(s => s.setting_key === 'bed_heating_watts')?.setting_value || '150'));
      const heatingTimeMins = parseFloat(String(settings.find(s => s.setting_key === 'heating_time_minutes')?.setting_value || '5'));
      
      // Obtener nombre del material primero
      const { data: materialData } = await supabase
        .from('materials')
        .select('name')
        .eq('id', materialId)
        .single();
      
      const materialName = materialData?.name || 'PLA';
      const density = densities[materialName] || 1.24; // g/cm³
      
      // ============================================================
      // 🔍 BUSCAR CALIBRACIÓN REAL MÁS SIMILAR (PRIORIDAD MÁXIMA)
      // ============================================================
      
      const sizeCategory = volumeCm3 < 10 ? 'small' : volumeCm3 > 100 ? 'large' : 'medium';
      
      // PRIMERO: Buscar calibraciones reales que coincidan
      const { data: realCalibrations } = await supabase
        .from('calibration_materials')
        .select(`
          *,
          calibration_tests!inner(
            geometry_classification,
            size_category,
            supports_enabled
          )
        `)
        .eq('material_id', materialId)
        .eq('is_active', true);
      
      let useRealCalibration = false;
      let calibrationData: any = null;
      let volumeRatio = 1.0;
      
      if (realCalibrations && realCalibrations.length > 0) {
        // Filtrar por geometría, tamaño y soportes similares
        const matchingCalibrations = realCalibrations.filter((cal: any) => {
          const test = cal.calibration_tests;
          const geometryMatch = test.geometry_classification === classification.type;
          const sizeCategoryMatch = test.size_category === sizeCategory;
          const supportsMatch = test.supports_enabled === supportsRequired;
          
          // Calcular volumen de la calibración
          const calVolume = cal.calculated_volume ? cal.calculated_volume / 1000 : 0; // mm³ a cm³
          const volumeDiff = calVolume > 0 ? Math.abs(volumeCm3 - calVolume) / calVolume : 999;
          const volumeSimilar = volumeDiff < 0.3; // ±30%
          
          return geometryMatch && sizeCategoryMatch && supportsMatch && volumeSimilar;
        });
        
        if (matchingCalibrations.length > 0) {
          // Usar la calibración más cercana en volumen
          calibrationData = matchingCalibrations.sort((a: any, b: any) => {
            const volA = (a.calculated_volume || 0) / 1000;
            const volB = (b.calculated_volume || 0) / 1000;
            const diffA = Math.abs(volumeCm3 - volA);
            const diffB = Math.abs(volumeCm3 - volB);
            return diffA - diffB;
          })[0];
          
          const calVolume = (calibrationData.calculated_volume || 0) / 1000;
          volumeRatio = volumeCm3 / calVolume;
          useRealCalibration = true;
          
          logger.log('✅ CALIBRACIÓN REAL ENCONTRADA (Usaremos datos reales):', {
            material: materialName,
            geometría: classification.type,
            tamaño: sizeCategory,
            soportes: supportsRequired ? 'Sí' : 'No',
            volumenPieza: volumeCm3.toFixed(2) + 'cm³',
            volumenCalibracion: calVolume.toFixed(2) + 'cm³',
            ratioEscala: volumeRatio.toFixed(3) + 'x',
            tiempoReal: (calibrationData.actual_time_minutes / 60).toFixed(2) + 'h',
            materialReal: calibrationData.actual_material_grams + 'g',
            método: '🎯 DATOS REALES (no teóricos)'
          });
        }
      }
      
      // SEGUNDO: Si no hay calibración real, buscar perfil contextual
      let timeCalibrationFactor = 1.0;
      let materialCalibrationFactor = 1.0;
      let calibrationConfidence = 'NONE';
      
      if (!useRealCalibration) {
        const { data: profileData } = await supabase.rpc('find_best_calibration_profile', {
          p_material_id: materialId,
          p_geometry_class: classification.type,
          p_size_category: sizeCategory,
          p_supports_enabled: supportsRequired,
          p_layer_height: layerHeight
        });
        
        if (profileData && profileData.length > 0) {
          const profile = profileData[0];
          timeCalibrationFactor = profile.time_factor;
          materialCalibrationFactor = profile.material_factor;
          calibrationConfidence = profile.confidence;
          
          logger.log('🎯 Perfil de calibración encontrado (ajuste sobre teórico):', {
            confianza: calibrationConfidence,
            factorTiempo: timeCalibrationFactor.toFixed(3) + 'x',
            factorMaterial: materialCalibrationFactor.toFixed(3) + 'x',
            método: '📊 TEÓRICO + AJUSTES'
          });
        } else {
          logger.log('⚠️ Sin calibraciones - usando cálculo teórico puro');
        }
      }
      
      // ============================================================
      // CÁLCULO DE MATERIAL CON CLASIFICACIÓN GEOMÉTRICA
      // ============================================================
      
      const numberOfLayers = Math.ceil((dimensions.z * 10) / layerHeight);
      const volumePerLayerMm3 = volumeMm3 / numberOfLayers;
      
      // 1. PERÍMETROS - Calcular usando análisis mejorado
      const averagePerimeter = calculateAveragePerimeter(geometry, numberOfLayers, surfaceAreaMm2, horizontalAreaMm2);
      const wallThickness = numberOfPerimeters * extrusionWidth;
      const totalPerimeterLength = averagePerimeter * numberOfPerimeters * numberOfLayers;
      let perimeterVolumeMm3 = totalPerimeterLength * extrusionWidth * layerHeight;
      
      // 2. Volumen de capas sólidas top/bottom
      const totalSolidLayers = topSolidLayers + bottomSolidLayers;
      let topBottomVolumeMm3 = volumePerLayerMm3 * totalSolidLayers;
      
      // 3. INFILL - Volumen interno hueco menos partes sólidas
      const solidVolumeMm3 = perimeterVolumeMm3 + topBottomVolumeMm3;
      const internalHollowVolumeMm3 = Math.max(0, volumeMm3 - solidVolumeMm3);
      let infillVolumeMm3 = internalHollowVolumeMm3 * (defaultInfill / 100);
      
      // ============================================================
      // APLICAR AJUSTES GEOMÉTRICOS AUTOMÁTICOS
      // ============================================================
      
      // Calcular tiempo base de travel antes de ajustes
      const baseTravelPerLayer = averagePerimeter * 3.5;
      const baseTotalTravelDistance = baseTravelPerLayer * numberOfLayers;
      const baseTravelTime = calculateTimeWithAcceleration(baseTotalTravelDistance, travelSpeed, acceleration);
      const baseRetractionCount = numberOfLayers * retractionCountPerLayer;
      
      const adjustedCalculations = applyGeometricAdjustments(
        classification,
        {
          perimeterVolume: perimeterVolumeMm3,
          topBottomVolume: topBottomVolumeMm3,
          infillVolume: infillVolumeMm3,
          travelTime: baseTravelTime,
          retractionCount: baseRetractionCount
        }
      );
      
      perimeterVolumeMm3 = adjustedCalculations.perimeterVolume;
      topBottomVolumeMm3 = adjustedCalculations.topBottomVolume;
      infillVolumeMm3 = adjustedCalculations.infillVolume;
      
      // 4. Volumen total de material usado
      const materialVolumeMm3 = perimeterVolumeMm3 + topBottomVolumeMm3 + infillVolumeMm3;
      let materialVolumeCm3 = materialVolumeMm3 / 1000;
      
      logger.log('🔄 Cálculo de perímetros mejorado:', {
        perímetroPromedioPorCapa: averagePerimeter.toFixed(2) + 'mm',
        numeroDePerímetros: numberOfPerimeters,
        capas: numberOfLayers,
        longitudTotal: (totalPerimeterLength / 1000).toFixed(2) + 'm',
        volumen: (perimeterVolumeMm3 / 1000).toFixed(2) + 'cm³',
        volumenPorCapa: volumePerLayerMm3.toFixed(2) + 'mm³',
        método: 'Superficie real + área horizontal'
      });
      
      logger.log('📦 Desglose de material (con ajustes geométricos):', {
        volumenTotal: volumeCm3.toFixed(2) + 'cm³',
        capas: numberOfLayers,
        grosorPared: wallThickness.toFixed(2) + 'mm',
        perímetros: (perimeterVolumeMm3 / 1000).toFixed(2) + 'cm³ (ajustado)',
        topBottom: (topBottomVolumeMm3 / 1000).toFixed(2) + 'cm³ (ajustado)',
        infill: (infillVolumeMm3 / 1000).toFixed(2) + 'cm³ (ajustado)',
        materialUsado: materialVolumeCm3.toFixed(2) + 'cm³',
        porcentajeInfill: defaultInfill + '%'
      });
      
  // Ajustar si hay soportes
  if (supportsRequired) {
    const overhangAnalysis = analyzeOverhangs(geometry);
    
    if (overhangAnalysis.estimatedSupportVolume > 0) {
      // CLAMPING CRÍTICO: Soportes no pueden exceder el límite configurado
      const maxSupportVolume = volumeCm3 * SUPPORT_CONSTANTS.MAX_SUPPORT_VOLUME_PERCENTAGE;
      let supportVolume = overhangAnalysis.estimatedSupportVolume;
      
      if (supportVolume > maxSupportVolume) {
        logger.warn(
          `⚠️ Volumen de soportes ${supportVolume.toFixed(2)}cm³ excede el límite de ` +
          `${(SUPPORT_CONSTANTS.MAX_SUPPORT_VOLUME_PERCENTAGE * 100).toFixed(0)}% ` +
          `(${maxSupportVolume.toFixed(2)}cm³). Aplicando clamping.`
        );
        supportVolume = maxSupportVolume;
      }
      
      // Añadir volumen calculado de soportes (con clamping)
      materialVolumeCm3 += supportVolume;
      
      const supportPercentage = (supportVolume / volumeCm3) * 100;
      logger.log(
        `🛠️ Soportes añadidos: +${supportVolume.toFixed(2)}cm³ ` +
        `(+${supportPercentage.toFixed(1)}%, máx ${(SUPPORT_CONSTANTS.MAX_SUPPORT_VOLUME_PERCENTAGE * 100).toFixed(0)}%)`
      );
    } else {
      // Fallback conservador: 10% extra (no 15%)
      const supportVolume = materialVolumeCm3 * 0.10;
      materialVolumeCm3 += supportVolume;
      logger.log(`🛠️ Soportes estimados (fallback): +${supportVolume.toFixed(2)}cm³ (+10%)`);
    }
  }
      
      // ============================================================
      // 🎯 CALCULAR PESO: Priorizar datos reales
      // ============================================================
      let weight: number;
      
      if (useRealCalibration && calibrationData) {
        // MÉTODO 1: Escalar desde peso real de calibración
        const realWeight = calibrationData.actual_material_grams;
        weight = realWeight * volumeRatio;
        logger.log(`⚖️ Peso basado en calibración REAL: ${realWeight}g × ${volumeRatio.toFixed(3)} = ${weight.toFixed(1)}g`);
      } else {
        // MÉTODO 2: Cálculo teórico con ajuste de perfil
        weight = materialVolumeCm3 * density;
        
        if (calibrationConfidence !== 'NONE') {
          const originalWeight = weight;
          weight *= materialCalibrationFactor;
          logger.log(`⚖️ Peso teórico ajustado (${calibrationConfidence}): ${originalWeight.toFixed(1)}g → ${weight.toFixed(1)}g (factor: ${materialCalibrationFactor.toFixed(3)}x)`);
        } else {
          logger.log(`⚖️ Peso teórico puro: ${weight.toFixed(1)}g (sin calibración)`);
        }
      }
      
      // 1. COSTO DE MATERIAL
      const costPerKg = costs[materialName] || 20;
      const materialCost = (weight / 1000) * costPerKg;
      
      // ============================================================
      // CÁLCULO DE TIEMPO CON AJUSTES GEOMÉTRICOS
      // ============================================================
      
      // Calcular distancias reales de nozzle directamente desde geometría
      // Layer height más ALTO = MENOS capas = MENOS distancia total = MENOS tiempo
      // Layer height más BAJO = MÁS capas = MÁS distancia total = MÁS tiempo
      
      // Distancia de perímetros ya calculada correctamente
      const perimeterNozzleDistance = totalPerimeterLength; // mm
      
      // Distancia de top/bottom layers
      const topBottomArea = horizontalAreaMm2;
      const topBottomNozzleDistance = (topBottomArea * totalSolidLayers) / extrusionWidth; // mm
      
      // Distancia de infill
      const infillNozzleDistance = (infillVolumeMm3 / (extrusionWidth * layerHeight)); // mm
      
      logger.log('📏 Distancias de nozzle calculadas:', {
        perímetros: (perimeterNozzleDistance / 1000).toFixed(2) + 'm',
        topBottom: (topBottomNozzleDistance / 1000).toFixed(2) + 'm',
        infill: (infillNozzleDistance / 1000).toFixed(2) + 'm',
        alturaCapa: layerHeight + 'mm',
        capas: numberOfLayers
      });
      
      // Calcular tiempos por tipo de movimiento (con aceleración)
      const perimeterTimeSeconds = calculateTimeWithAcceleration(perimeterNozzleDistance, perimeterSpeed, acceleration);
      const topBottomTimeSeconds = calculateTimeWithAcceleration(topBottomNozzleDistance, topBottomSpeed, acceleration);
      const infillTimeSeconds = calculateTimeWithAcceleration(infillNozzleDistance, infillSpeed, acceleration);
      
      // CORRECCIÓN CRÍTICA: Travel time más realista
      // Bambu/Cura consideran más movimientos internos, z-hops, y cambios entre features
      const travelTimeSeconds = adjustedCalculations.travelTime * 2.0; // 2x más realista
      
      // CORRECCIÓN CRÍTICA: Retracciones más realistas
      // Cada retracción incluye: retract, travel, unretract, prime = ~1.5-2s total
      const totalRetractions = adjustedCalculations.retractionCount;
      const retractionTimeSeconds = totalRetractions * 1.5; // Aumentado de 0.5s a 1.5s
      
      // CORRECCIÓN: Tiempo de cambio de capa (Z-lift, movimiento, asentamiento)
      // Cada capa requiere: lift Z, travel, lower Z, pause = ~2-4s
      const layerChangeTimeSeconds = numberOfLayers * 3.0;
      
      // CORRECCIÓN: Primeras capas lentas (no solo la primera)
      // Las primeras 5 capas suelen ser más lentas para mejor adhesión
      const slowLayerCount = Math.min(5, numberOfLayers);
      const firstLayerNozzleDistance = (perimeterNozzleDistance + infillNozzleDistance) / numberOfLayers;
      const firstLayerNormalTime = calculateTimeWithAcceleration(firstLayerNozzleDistance, perimeterSpeed, acceleration);
      const firstLayerSlowTime = calculateTimeWithAcceleration(firstLayerNozzleDistance, firstLayerSpeed, acceleration);
      const firstLayerPenaltySeconds = (firstLayerSlowTime - firstLayerNormalTime) * slowLayerCount;
      
      // NUEVO: Tiempo de preparación (homing, purge line, calentamiento inicial)
      const preparationTimeSeconds = 180; // 3 minutos típicos
      
      // ============================================================
      // 🎯 CALCULAR TIEMPO: Priorizar datos reales
      // ============================================================
      let estimatedTime: number;
      
      if (useRealCalibration && calibrationData) {
        // MÉTODO 1: Escalar desde tiempo real de calibración
        const realTimeHours = calibrationData.actual_time_minutes / 60;
        estimatedTime = realTimeHours * volumeRatio;
        
        // Ajustar si hay diferencia en soportes
        if (supportsRequired && !calibrationData.calibration_tests?.supports_enabled) {
          estimatedTime *= 1.25; // +25% si ahora necesita soportes
          logger.log(`⏱️ Tiempo base (real): ${realTimeHours.toFixed(2)}h × ${volumeRatio.toFixed(3)} × 1.25 (soportes) = ${estimatedTime.toFixed(2)}h`);
        } else {
          logger.log(`⏱️ Tiempo basado en calibración REAL: ${realTimeHours.toFixed(2)}h × ${volumeRatio.toFixed(3)} = ${estimatedTime.toFixed(2)}h`);
        }
      } else {
        // MÉTODO 2: Cálculo teórico
        let totalTimeSeconds = 
          perimeterTimeSeconds + 
          topBottomTimeSeconds + 
          infillTimeSeconds + 
          travelTimeSeconds + 
          retractionTimeSeconds + 
          layerChangeTimeSeconds +
          firstLayerPenaltySeconds +
          preparationTimeSeconds;
        
        totalTimeSeconds *= 1.12; // Factor de seguridad
        estimatedTime = totalTimeSeconds / 3600;
        
        logger.log('⏱️ Tiempo teórico calculado:', (estimatedTime * 60).toFixed(1) + 'min');
      }
      
      logger.log('⏱️ Desglose de tiempo CORREGIDO (método Bambu Studio):', {
        perímetros: (perimeterTimeSeconds / 60).toFixed(2) + 'min',
        topBottom: (topBottomTimeSeconds / 60).toFixed(2) + 'min',
        infill: (infillTimeSeconds / 60).toFixed(2) + 'min',
        travel: (travelTimeSeconds / 60).toFixed(2) + 'min (2x más realista)',
        retracciones: (retractionTimeSeconds / 60).toFixed(2) + 'min (' + Math.round(totalRetractions) + ' x 1.5s/retract)',
        cambiosDeCapa: (layerChangeTimeSeconds / 60).toFixed(2) + 'min (' + numberOfLayers + ' capas x 3s)',
        primerasCapasLentas: (firstLayerPenaltySeconds / 60).toFixed(2) + 'min (primeras ' + slowLayerCount + ' capas)',
        preparación: (preparationTimeSeconds / 60).toFixed(2) + 'min (homing, purge, calentamiento)',
        factorSeguridad: '+12%',
        capas: numberOfLayers,
        totalMinutos: (estimatedTime * 60).toFixed(1) + 'min',
        totalHoras: estimatedTime.toFixed(2) + 'h'
      });
      
      // Ajustar tiempo si hay soportes (solo en método teórico, real ya considera)
      if (supportsRequired && !useRealCalibration) {
        const supportsFactor = 1.30;
        estimatedTime *= supportsFactor;
        logger.log(`🛠️ Tiempo con soportes (teórico): +${((supportsFactor - 1) * 100).toFixed(0)}%`);
      }
      
      // Aplicar ajuste de perfil solo si NO usamos calibración real
      if (!useRealCalibration && calibrationConfidence !== 'NONE') {
        const originalTime = estimatedTime;
        estimatedTime *= timeCalibrationFactor;
        logger.log(`⏱️ Tiempo ajustado por perfil (${calibrationConfidence}): ${originalTime.toFixed(2)}h → ${estimatedTime.toFixed(2)}h`);
      }
      
      // ============================================================
      // 🎯 SEPARAR COSTOS FIJOS DE COSTOS VARIABLES
      // ============================================================
      
      // 3. COSTO DE ELECTRICIDAD
      const powerConsumptionKw = printerPowerWatts / 1000;
      const printingElectricityCost = estimatedTime * powerConsumptionKw * electricityCostPerKwh;
      
      const heatingConsumptionKw = (printerPowerWatts + bedHeatingWatts) / 1000;
      const heatingTime = heatingTimeMins / 60;
      const heatingElectricityCost = heatingTime * heatingConsumptionKw * electricityCostPerKwh;
      
      // FIJO: Calentamiento solo una vez por trabajo
      // VARIABLE: Costo de impresión por hora
      const electricityCostFixed = heatingElectricityCost;
      const electricityCostPerUnit = printingElectricityCost;
      
      logger.log('⚡ Desglose eléctrico (fijo vs variable):', {
        calentamientoFijo: electricityCostFixed.toFixed(3) + '€ (una vez)',
        impresiónPorPieza: electricityCostPerUnit.toFixed(3) + '€/pieza'
      });
      
      // 4. DESGASTE DE MÁQUINA
      const machineCostPerHour = replacementPartsCost / printerLifespanHours;
      const machineCostPerUnit = estimatedTime * machineCostPerHour;
      
      // ============================================================
      // 💰 SISTEMA DE PRECIOS MEJORADO CON IA PARA MÚLTIPLES PIEZAS
      // ============================================================
      
      // 5. COSTOS FIJOS (se cobran una sola vez, no importa la cantidad)
      // MEJORA: Agregar tiempo de setup proporcional al trabajo
      const setupTimeHours = PRINTER_CONFIG.SETUP_TIME_MINUTES / 60;
      const setupCost = setupTimeHours * machineCostPerHour + setupTimeHours * powerConsumptionKw * electricityCostPerKwh;
      const fixedCostsPerJob = electricityCostFixed + setupCost;
      
      // 6. COSTOS VARIABLES POR PIEZA
      const variableCostPerUnit = materialCost + electricityCostPerUnit + machineCostPerUnit;
      
      // 7. APLICAR ECONOMÍAS DE ESCALA INTELIGENTES PARA MÚLTIPLES PIEZAS
      // MEJORA: Usar algoritmo de eficiencia de empaquetamiento basado en IA
      // - Material: 100% lineal (cada pieza usa su material completo)
      // - Tiempo: Reducción inteligente basada en análisis de empaquetamiento
      // - Setup: Compartido entre todas las piezas
      
      let totalVariableCost = 0;
      let batchEfficiencyFactor = 1.0;
      
      if (quantity === 1) {
        totalVariableCost = variableCostPerUnit;
      } else {
        // MEJORA IA: Calcular factor de eficiencia de batch basado en:
        // 1. Volumen de pieza vs volumen de cama
        // 2. Densidad de empaquetamiento estimada
        // 3. Complejidad geométrica
        
        const bedVolumeCm3 = PRINTER_CONFIG.BED_VOLUME_CM3;
        const pieceVolume = volumeCm3;
        const volumeRatioPerPiece = pieceVolume / bedVolumeCm3;
        
        // Calcular cuántas piezas caben teóricamente
        const theoreticalFitCount = Math.floor(PRINTER_CONFIG.PACKING_EFFICIENCY_FACTOR / Math.max(0.01, volumeRatioPerPiece));
        
        // Factor de eficiencia basado en empaquetamiento
        // Si caben muchas piezas: alta eficiencia (descuento mayor)
        // Si caben pocas piezas: baja eficiencia (descuento menor)
        if (theoreticalFitCount >= BATCH_EFFICIENCY_FACTORS.VERY_SMALL.threshold) {
          batchEfficiencyFactor = BATCH_EFFICIENCY_FACTORS.VERY_SMALL.discount;
        } else if (theoreticalFitCount >= BATCH_EFFICIENCY_FACTORS.SMALL.threshold) {
          batchEfficiencyFactor = BATCH_EFFICIENCY_FACTORS.SMALL.discount;
        } else if (theoreticalFitCount >= BATCH_EFFICIENCY_FACTORS.MEDIUM.threshold) {
          batchEfficiencyFactor = BATCH_EFFICIENCY_FACTORS.MEDIUM.discount;
        } else if (theoreticalFitCount >= BATCH_EFFICIENCY_FACTORS.LARGE.threshold) {
          batchEfficiencyFactor = BATCH_EFFICIENCY_FACTORS.LARGE.discount;
        } else {
          batchEfficiencyFactor = BATCH_EFFICIENCY_FACTORS.VERY_LARGE.discount;
        }
        
        // Ajuste adicional si la pieza requiere soportes (reduce eficiencia)
        if (supportsRequired) {
          batchEfficiencyFactor += BATCH_EFFICIENCY_FACTORS.SUPPORT_PENALTY;
          batchEfficiencyFactor = Math.min(1.0, batchEfficiencyFactor);
        }
        
        // Primera pieza: costo completo
        totalVariableCost = variableCostPerUnit;
        
        // Piezas adicionales: economía de escala inteligente
        const additionalUnitCost = variableCostPerUnit * batchEfficiencyFactor;
        totalVariableCost += additionalUnitCost * (quantity - 1);
        
        logger.log('🧠 IA: Economía de escala inteligente aplicada:', {
          primeraUnidad: variableCostPerUnit.toFixed(2) + '€',
          factorEficiencia: (batchEfficiencyFactor * 100).toFixed(1) + '%',
          ahorroPorPieza: ((1 - batchEfficiencyFactor) * 100).toFixed(1) + '%',
          piezasQueCaben: theoreticalFitCount + ' teóricas',
          ratioVolumen: (volumeRatioPerPiece * 100).toFixed(2) + '%',
          conSoportes: supportsRequired ? 'Sí (reduce eficiencia)' : 'No',
          unidadesAdicionales: `${quantity - 1} × ${additionalUnitCost.toFixed(2)}€`,
          totalVariable: totalVariableCost.toFixed(2) + '€',
          ahorroPorEscala: ((variableCostPerUnit * quantity - totalVariableCost)).toFixed(2) + '€'
        });
      }
      
      // 8. COSTO BASE TOTAL (fijo + variable)
      const baseCost = fixedCostsPerJob + totalVariableCost;
      
      // 9. MARGEN DE ERROR (29% - protección contra subcotización)
      const errorMarginCost = baseCost * (errorMarginPercentage / 100);
      
      // 10. SUBTOTAL CON MARGEN DE ERROR (costo seguro)
      const safeCost = baseCost + errorMarginCost;
      
      // 11. APLICAR MULTIPLICADOR DE GANANCIA
      const retailPrice = profitMultiplier > 0 ? safeCost * profitMultiplier : safeCost;
      
      // 12. AGREGAR INSUMOS (se cobra por cada pieza)
      const totalSuppliesCost = suppliesCost * quantity;
      const totalBeforeDiscounts = retailPrice + totalSuppliesCost;
      
      // ============================================================
      // 💳 APLICAR DESCUENTOS POR CANTIDAD
      // ============================================================
      let quantityDiscountAmount = 0;
      let quantityDiscountApplied: { tier_name: string; discount_type: string; discount_value: number } | null = null;
      
      if (quantity > 1) {
        try {
          const { data: discountTiers } = await supabase
            .from('quantity_discount_tiers')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true }); // Usar display_order para prioridad correcta
          
          if (discountTiers && discountTiers.length > 0) {
            // Buscar el descuento aplicable para esta cantidad
            const applicableTier = discountTiers.find((tier: any) => {
              const meetsMin = quantity >= tier.min_quantity;
              const meetsMax = tier.max_quantity === null || quantity <= tier.max_quantity;
              return meetsMin && meetsMax;
            });
            
            if (applicableTier) {
              if (applicableTier.discount_type === 'percentage') {
                quantityDiscountAmount = (totalBeforeDiscounts * applicableTier.discount_value) / 100;
              } else if (applicableTier.discount_type === 'fixed_amount') {
                quantityDiscountAmount = applicableTier.discount_value;
              }
              
              // Validar que el descuento no exceda el total
              quantityDiscountAmount = Math.min(quantityDiscountAmount, totalBeforeDiscounts * 0.95); // Máximo 95% de descuento
              
              quantityDiscountApplied = {
                tier_name: applicableTier.tier_name,
                discount_type: applicableTier.discount_type,
                discount_value: applicableTier.discount_value
              };
              
              logger.log('🎁 Descuento por cantidad aplicado:', {
                nivel: applicableTier.tier_name,
                cantidad: quantity,
                tipo: applicableTier.discount_type === 'percentage' ? 'Porcentaje' : 'Monto Fijo',
                descuento: applicableTier.discount_type === 'percentage' 
                  ? `${applicableTier.discount_value}%` 
                  : `€${applicableTier.discount_value}`,
                montoDescontado: quantityDiscountAmount.toFixed(2) + '€'
              });
            }
          }
        } catch (error) {
          logger.error('Error al obtener descuentos por cantidad:', error);
          // Continuar sin descuentos si hay error
        }
      }
      
      // 13. APLICAR DESCUENTO POR CANTIDAD
      const totalAfterQuantityDiscount = Math.max(0, totalBeforeDiscounts - quantityDiscountAmount);
      
      // 14. PROTECCIÓN: Precio mínimo (solo si el total está debajo del mínimo)
      let estimatedTotal = totalAfterQuantityDiscount;
      let minimumPriceApplied = false;
      
      if (totalAfterQuantityDiscount < configuredMinimumPrice) {
        estimatedTotal = configuredMinimumPrice;
        minimumPriceApplied = true;
      }
      
      // Calcular precio efectivo por unidad para display
      const effectivePerUnit = estimatedTotal / quantity;
      
      logger.log('💰 Cálculo de precio MEJORADO (con economías de escala):', {
        cantidad: quantity,
        '=== COSTOS ===': '',
        costosFijos: fixedCostsPerJob.toFixed(2) + '€ (una vez)',
        costosVariables: totalVariableCost.toFixed(2) + '€ (total ' + quantity + ' piezas)',
        costoBase: baseCost.toFixed(2) + '€',
        margenError: errorMarginCost.toFixed(2) + '€ (+' + errorMarginPercentage + '%)',
        costoSeguro: safeCost.toFixed(2) + '€',
        multiplicadorGanancia: profitMultiplier,
        '=== PRECIO ===': '',
        precioRetail: retailPrice.toFixed(2) + '€',
        insumos: totalSuppliesCost.toFixed(2) + '€ (' + quantity + ' × ' + suppliesCost.toFixed(2) + '€)',
        subtotalAntesDescuentos: totalBeforeDiscounts.toFixed(2) + '€',
        ...(quantityDiscountApplied ? {
          '🎁 DESCUENTO': quantityDiscountApplied.tier_name,
          tipoDescuento: quantityDiscountApplied.discount_type === 'percentage' ? 'Porcentaje' : 'Fijo',
          valorDescuento: quantityDiscountApplied.discount_type === 'percentage' 
            ? `${quantityDiscountApplied.discount_value}%` 
            : `€${quantityDiscountApplied.discount_value}`,
          montoDescontado: '-' + quantityDiscountAmount.toFixed(2) + '€',
          totalDespuésDescuento: totalAfterQuantityDiscount.toFixed(2) + '€'
        } : {}),
        precioMínimoConfig: configuredMinimumPrice.toFixed(2) + '€',
        precioFinalTotal: estimatedTotal.toFixed(2) + '€',
        precioEfectivoPorUnidad: effectivePerUnit.toFixed(2) + '€/unidad',
        aplicado: minimumPriceApplied 
          ? '🔒 PRECIO MÍNIMO APLICADO' 
          : quantityDiscountApplied 
          ? `🎁 DESCUENTO: ${quantityDiscountApplied.tier_name}` 
          : '📊 PRECIO CALCULADO'
      });
      
      // Obtener color seleccionado para la vista previa
      let previewColor = '#3b82f6'; // Azul por defecto
      if (colorId) {
        const { data: colorData } = await supabase
          .from('colors')
          .select('hex_code')
          .eq('id', colorId)
          .single();
        
        if (colorData?.hex_code) {
          previewColor = colorData.hex_code;
          logger.log('🎨 Color de vista previa:', previewColor);
        }
      }
      
      // Generar vista previa 3D con el color seleccionado
      const preview = generatePreviewImage(geometry, previewColor);
      
      logger.log('═══════════════════════════════════════════');
      logger.log('📊 RESUMEN FINAL DE CÁLCULOS');
      logger.log('═══════════════════════════════════════════');
      logger.log('Clasificación:', {
        tipo: classification.type,
        complejidad: classification.surfaceComplexity.toFixed(1) + '/10'
      });
      logger.log('Modelo:', {
        volumen: volumeCm3.toFixed(2) + 'cm³',
        dimensiones: `${dimensions.x.toFixed(1)}x${dimensions.y.toFixed(1)}x${dimensions.z.toFixed(1)}cm`,
        capas: numberOfLayers
      });
      logger.log('Material:', {
        perímetros: (perimeterVolumeMm3 / 1000).toFixed(2) + 'cm³',
        topBottom: (topBottomVolumeMm3 / 1000).toFixed(2) + 'cm³',
        infill: (infillVolumeMm3 / 1000).toFixed(2) + 'cm³',
        total: materialVolumeCm3.toFixed(2) + 'cm³',
        peso: weight.toFixed(2) + 'g'
      });
      logger.log('Tiempo:', {
        total: (estimatedTime * 60).toFixed(0) + 'min',
        horas: estimatedTime.toFixed(2) + 'h'
      });
      logger.log('═══════════════════════════════════════════');
      
      return {
        volume: volumeCm3,
        weight,
        dimensions,
        materialCost,
        electricityCost: electricityCostFixed + (electricityCostPerUnit * quantity),
        machineCost: machineCostPerUnit * quantity,
        errorMarginCost,
        suppliesCost: totalSuppliesCost,
        subtotalWithoutSupplies: baseCost,
        estimatedTime,
        estimatedTotal,
        breakdown: {
          materialCost,
          electricityCost: electricityCostFixed + (electricityCostPerUnit * quantity),
          machineCost: machineCostPerUnit * quantity,
          errorMarginCost,
          suppliesCost: totalSuppliesCost,
          subtotal: safeCost,
          total: estimatedTotal
        },
        preview,
        filePath,
        stlData: arrayBuffer // Incluir ArrayBuffer para visor 3D
      };
      
    } catch (error) {
      logger.error('Error en análisis:', error);
      throw error;
    }
};

/**
 * Interfaz para evaluación de orientación
 */
interface OrientationEvaluation {
  matrix: THREE.Matrix4;
  overhangPercentage: number;
  supportVolume: number;
  printHeight: number;
  baseStability: number;
  score: number;
}

/**
 * Analiza las caras del modelo y encuentra la más plana y ancha
 */
function findLargestFlatFace(geometry: THREE.BufferGeometry): THREE.Vector3 | null {
  const positionAttribute = geometry.attributes.position;
  if (!positionAttribute) return null;

  // Agrupar triángulos por su normal (caras paralelas)
  const faceGroups = new Map<string, { normal: THREE.Vector3; area: number; count: number }>();
  
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();
  const normal = new THREE.Vector3();

  // Analizar cada triángulo
  for (let i = 0; i < positionAttribute.count; i += 3) {
    v0.fromBufferAttribute(positionAttribute, i);
    v1.fromBufferAttribute(positionAttribute, i + 1);
    v2.fromBufferAttribute(positionAttribute, i + 2);

    edge1.subVectors(v1, v0);
    edge2.subVectors(v2, v0);
    normal.crossVectors(edge1, edge2).normalize();

    // Calcular área del triángulo
    const area = edge1.cross(edge2).length() / 2;

    // Agrupar normales similares (tolerancia de 15 grados)
    const normalKey = `${Math.round(normal.x * 4)},${Math.round(normal.y * 4)},${Math.round(normal.z * 4)}`;
    
    if (faceGroups.has(normalKey)) {
      const group = faceGroups.get(normalKey)!;
      group.area += area;
      group.count++;
      // Promediar la normal
      group.normal.add(normal).normalize();
    } else {
      faceGroups.set(normalKey, {
        normal: normal.clone(),
        area,
        count: 1
      });
    }
  }

  // Encontrar la cara con mayor área (más plana y ancha)
  let largestFace: { normal: THREE.Vector3; area: number } | null = null;
  
  for (const group of faceGroups.values()) {
    // Solo considerar caras con área significativa y múltiples triángulos
    if (group.count >= 3 && (!largestFace || group.area > largestFace.area)) {
      largestFace = { normal: group.normal, area: group.area };
    }
  }

  logger.log('🔍 Análisis de caras planas:', {
    carasEncontradas: faceGroups.size,
    caraSeleccionada: largestFace ? {
      área: largestFace.area.toFixed(2) + 'mm²',
      normal: `(${largestFace.normal.x.toFixed(2)}, ${largestFace.normal.y.toFixed(2)}, ${largestFace.normal.z.toFixed(2)})`
    } : 'ninguna'
  });

  return largestFace ? largestFace.normal : null;
}

/**
 * Genera orientaciones candidatas para evaluar
 * Prioriza la cara más plana y ancha como base
 */
function generateCandidateOrientations(geometry: THREE.BufferGeometry): THREE.Matrix4[] {
  const matrices: THREE.Matrix4[] = [];
  
  // PRIORIDAD 1: Encontrar la cara más plana y ancha
  const largestFaceNormal = findLargestFlatFace(geometry);
  
  if (largestFaceNormal) {
    // Orientar para que la cara más grande apunte hacia abajo (contacto con cama)
    const targetDown = new THREE.Vector3(0, 0, -1);
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    
    // La normal debe apuntar hacia abajo (hacia la cama Z-)
    quaternion.setFromUnitVectors(largestFaceNormal, targetDown);
    matrix.makeRotationFromQuaternion(quaternion);
    matrices.push(matrix);
    
    logger.log('✅ Orientación basada en cara más plana y ancha añadida como PRIORIDAD');
  }
  
  // PRIORIDAD 2: 6 orientaciones principales de respaldo
  const mainAxes = [
    new THREE.Vector3(0, 0, 1),   // Z arriba (original)
    new THREE.Vector3(0, 0, -1),  // Z abajo
    new THREE.Vector3(1, 0, 0),   // X
    new THREE.Vector3(-1, 0, 0),  // -X
    new THREE.Vector3(0, 1, 0),   // Y
    new THREE.Vector3(0, -1, 0),  // -Y
  ];
  
  const targetZ = new THREE.Vector3(0, 0, 1);
  
  for (const axis of mainAxes) {
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(axis, targetZ);
    matrix.makeRotationFromQuaternion(quaternion);
    matrices.push(matrix);
  }
  
  logger.log(`📐 Total de orientaciones candidatas: ${matrices.length}`);
  
  return matrices;
}

/**
 * Calcula estabilidad de la base basándose en el área de contacto real
 */
function calculateBaseStability(geometry: THREE.BufferGeometry): number {
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  
  const positionAttribute = geometry.attributes.position;
  if (!positionAttribute) return 50;

  // Altura de la pieza
  const height = bbox.max.z - bbox.min.z;
  if (height <= 0) return 50;

  // Encontrar triángulos en contacto con la base (Z mínimo)
  const baseThreshold = bbox.min.z + 0.1; // 0.1mm de tolerancia
  let baseContactArea = 0;

  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const edge1 = new THREE.Vector3();
  const edge2 = new THREE.Vector3();

  for (let i = 0; i < positionAttribute.count; i += 3) {
    v0.fromBufferAttribute(positionAttribute, i);
    v1.fromBufferAttribute(positionAttribute, i + 1);
    v2.fromBufferAttribute(positionAttribute, i + 2);

    // Si el triángulo está en contacto con la base
    const avgZ = (v0.z + v1.z + v2.z) / 3;
    if (avgZ <= baseThreshold) {
      edge1.subVectors(v1, v0);
      edge2.subVectors(v2, v0);
      const area = edge1.cross(edge2).length() / 2;
      baseContactArea += area;
    }
  }

  // Área del bounding box en XY
  const bboxArea = (bbox.max.x - bbox.min.x) * (bbox.max.y - bbox.min.y);
  
  // Ratio de contacto: área real de base / área de bounding box
  const contactRatio = bboxArea > 0 ? Math.min(1, baseContactArea / bboxArea) : 0;
  
  // Ratio base/altura (valores altos = más estable)
  const dimensionRatio = bboxArea / (height * height);
  
  // Combinar ambos factores
  const stabilityScore = (contactRatio * 60 + Math.min(40, dimensionRatio * 20));
  
  // Penalizar si el centro de masa está muy alto
  const centerOfMassZ = (bbox.max.z + bbox.min.z) / 2;
  const comPenalty = (centerOfMassZ / height) > 0.6 ? 0.85 : 1.0;
  
  const finalStability = Math.min(100, stabilityScore * comPenalty);

  logger.log('🏗️ Estabilidad de base:', {
    áreaContacto: baseContactArea.toFixed(2) + 'mm²',
    áreaBoundingBox: bboxArea.toFixed(2) + 'mm²',
    ratioContacto: (contactRatio * 100).toFixed(1) + '%',
    altura: height.toFixed(2) + 'mm',
    estabilidadFinal: finalStability.toFixed(1) + '/100'
  });
  
  return finalStability;
}

/**
 * Calcula puntuación de una orientación
 */
function calculateOrientationScore(metrics: {
  overhangPercentage: number;
  supportVolume: number;
  printHeight: number;
  baseStability: number;
}): number {
  // Pesos (totalizan 100)
  const WEIGHT_SUPPORTS = 60;      // Lo MÁS importante
  const WEIGHT_STABILITY = 25;     // Muy importante
  const WEIGHT_HEIGHT = 10;        // Menos importante
  const WEIGHT_VOLUME = 5;         // Mínimamente importante
  
  // Normalizar métricas (0-100, donde 100 = mejor)
  const scoreSupports = Math.max(0, 100 - metrics.overhangPercentage * 2);
  const scoreStability = metrics.baseStability;
  const scoreHeight = Math.max(0, 100 - (metrics.printHeight / 3));
  const scoreVolume = Math.max(0, 100 - metrics.supportVolume * 10);
  
  // Calcular puntuación ponderada
  const totalScore = (
    scoreSupports * WEIGHT_SUPPORTS +
    scoreStability * WEIGHT_STABILITY +
    scoreHeight * WEIGHT_HEIGHT +
    scoreVolume * WEIGHT_VOLUME
  ) / 100;
  
  return totalScore;
}

/**
 * Evalúa calidad de una orientación
 */
function evaluateOrientationQuality(
  geometry: THREE.BufferGeometry,
  matrix: THREE.Matrix4
): OrientationEvaluation {
  // Aplicar orientación temporal
  const testGeometry = geometry.clone();
  testGeometry.applyMatrix4(matrix);
  testGeometry.computeVertexNormals();
  
  // Calcular voladizos
  const overhangAnalysis = analyzeOverhangs(testGeometry);
  
  // Calcular estabilidad de la base
  const baseStability = calculateBaseStability(testGeometry);
  
  // Calcular altura de impresión
  testGeometry.computeBoundingBox();
  const printHeight = testGeometry.boundingBox!.max.z - testGeometry.boundingBox!.min.z;
  
  // Calcular puntuación compuesta
  const score = calculateOrientationScore({
    overhangPercentage: overhangAnalysis.overhangPercentage,
    supportVolume: overhangAnalysis.estimatedSupportVolume,
    printHeight,
    baseStability
  });
  
  // Limpiar geometría temporal
  testGeometry.dispose();
  
  return {
    matrix,
    overhangPercentage: overhangAnalysis.overhangPercentage,
    supportVolume: overhangAnalysis.estimatedSupportVolume,
    printHeight,
    baseStability,
    score
  };
}

/**
 * Encuentra la orientación óptima del modelo para impresión
 * Evalúa múltiples orientaciones y elige la que minimiza soportes
 */
function findOptimalOrientationAdvanced(geometry: THREE.BufferGeometry): {
  matrix: THREE.Matrix4;
  evaluation: OrientationEvaluation;
  allCandidates: OrientationEvaluation[];
} {
  logger.log('🔍 Analizando orientaciones óptimas (detección de cara más plana y ancha)...');
  
  // Generar todas las orientaciones candidatas (incluye cara más plana)
  const candidateMatrices = generateCandidateOrientations(geometry);
  
  // Evaluar cada orientación
  const evaluations: OrientationEvaluation[] = [];
  
  for (const matrix of candidateMatrices) {
    const evaluation = evaluateOrientationQuality(geometry, matrix);
    evaluations.push(evaluation);
  }
  
  // Ordenar por puntuación (mayor = mejor)
  evaluations.sort((a, b) => b.score - a.score);
  
  // Seleccionar la mejor
  const best = evaluations[0];
  
  logger.log('✅ Mejor orientación encontrada:', {
    voladizos: best.overhangPercentage.toFixed(1) + '%',
    volumenSoportes: best.supportVolume.toFixed(2) + 'cm³',
    alturaPieza: best.printHeight.toFixed(1) + 'mm',
    estabilidad: best.baseStability.toFixed(0) + '%',
    puntuación: best.score.toFixed(1) + '/100'
  });
  
  // Mostrar alternativas (top 3)
  logger.log('📊 Top 3 orientaciones alternativas:');
  for (let i = 0; i < Math.min(3, evaluations.length); i++) {
    const candidate = evaluations[i];
    logger.log(`  ${i + 1}. Voladizos: ${candidate.overhangPercentage.toFixed(1)}%, Score: ${candidate.score.toFixed(1)}`);
  }
  
  return {
    matrix: best.matrix,
    evaluation: best,
    allCandidates: evaluations
  };
}

/**
 * Parser STL manual (funciona con binario y ASCII)
 */
function parseSTL(arrayBuffer: ArrayBuffer): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  
  // Validar tamaño mínimo del buffer
  if (arrayBuffer.byteLength < 84) {
    throw new Error('Archivo STL demasiado pequeño o corrupto');
  }
  
  const view = new DataView(arrayBuffer);
  
  // Detectar si es binario verificando el header y tamaño
  const isBinary = arrayBuffer.byteLength >= 84;
  
  if (isBinary) {
    try {
      const faces = view.getUint32(80, true);
      
      // Validar que el tamaño del archivo sea correcto para el número de caras
      const expectedSize = 84 + (faces * 50); // Header (84) + faces * (12 normal + 36 vertices + 2 attr)
      
      if (arrayBuffer.byteLength < expectedSize) {
        logger.warn('Tamaño de archivo inconsistente, intentando parsear como ASCII...');
        return parseSTLAscii(arrayBuffer);
      }
      
      const vertices: number[] = [];
      let offset = 84;
      
      for (let i = 0; i < faces; i++) {
        // Verificar que no nos salgamos del buffer
        if (offset + 50 > arrayBuffer.byteLength) {
          logger.warn(`Llegamos al final del archivo en cara ${i}/${faces}`);
          break;
        }
        
        offset += 12; // saltar normal
        
        for (let j = 0; j < 3; j++) {
          if (offset + 12 > arrayBuffer.byteLength) break;
          
          vertices.push(view.getFloat32(offset, true));
          vertices.push(view.getFloat32(offset + 4, true));
          vertices.push(view.getFloat32(offset + 8, true));
          offset += 12;
        }
        
        offset += 2; // saltar attribute byte count
      }
      
      if (vertices.length === 0) {
        throw new Error('No se pudieron leer vértices del archivo STL');
      }
      
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    } catch (error) {
      logger.error('Error parseando STL binario:', error);
      // Intentar parsear como ASCII
      return parseSTLAscii(arrayBuffer);
    }
  } else {
    return parseSTLAscii(arrayBuffer);
  }
  
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Parser específico para archivos STL en formato ASCII
 */
function parseSTLAscii(arrayBuffer: ArrayBuffer): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const text = new TextDecoder().decode(arrayBuffer);
  const vertices: number[] = [];
  
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('vertex')) {
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 4) {
        vertices.push(parseFloat(parts[1]));
        vertices.push(parseFloat(parts[2]));
        vertices.push(parseFloat(parts[3]));
      }
    }
  }
  
  if (vertices.length === 0) {
    throw new Error('No se encontraron vértices en el archivo STL ASCII');
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Calcula el volumen de un mesh usando el método de tetraedros
 */
function calculateMeshVolume(geometry: THREE.BufferGeometry): number {
  const position = geometry.attributes.position;
  let volume = 0;
  
  for (let i = 0; i < position.count; i += 3) {
    const p1 = new THREE.Vector3().fromBufferAttribute(position, i);
    const p2 = new THREE.Vector3().fromBufferAttribute(position, i + 1);
    const p3 = new THREE.Vector3().fromBufferAttribute(position, i + 2);
    
    volume += signedVolumeOfTriangle(p1, p2, p3);
  }
  
  return Math.abs(volume);
}

/**
 * Detecta si un archivo STL necesita soportes usando sistema multi-factor inteligente
 */
export async function detectSupportsNeeded(
  fileURL: string,
  material: string = 'PLA',
  layerHeight: number = 0.2
): Promise<{
  needsSupports: boolean;
  confidence: 'high' | 'medium' | 'low';
  overhangPercentage: number;
  reason: string;
  recommendations?: string[];
}> {
  try {
    const response = await fetch(fileURL);
    const arrayBuffer = await response.arrayBuffer();
    const geometry = parseSTL(arrayBuffer);
    
    if (!geometry) {
      return {
        needsSupports: false,
        confidence: 'low',
        overhangPercentage: 0,
        reason: 'No se pudo analizar la geometría'
      };
    }
    
    // Aplicar orientación óptima antes de analizar soportes
    const orientationResult = findOptimalOrientationAdvanced(geometry);
    geometry.applyMatrix4(orientationResult.matrix);
    
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    
    const overhangAnalysis = analyzeOverhangs(geometry);
    const bbox = geometry.boundingBox!;
    
    logger.log('🎯 Orientación óptima aplicada para detección de soportes:', {
      voladizos: orientationResult.evaluation.overhangPercentage.toFixed(1) + '%',
      puntuación: orientationResult.evaluation.score.toFixed(1) + '/100'
    });
    
    // Calcular longitud máxima de voladizo (aproximación)
    const pieceHeight = bbox.max.z - bbox.min.z;
    const maxOverhangLength = Math.min(
      bbox.max.x - bbox.min.x,
      bbox.max.y - bbox.min.y
    ) * 0.3; // Estimación: 30% de la dimensión más pequeña
    
    // Preparar factores para análisis multi-factor
    const riskFactors: SupportRiskFactors = {
      overhangPercentage: overhangAnalysis.overhangPercentage,
      overhangAngle: 45, // Umbral estándar
      material: material,
      layerHeight: layerHeight,
      maxOverhangLength: maxOverhangLength,
      pieceHeight: pieceHeight,
      bridgingDistance: 0, // Se calcula internamente
      geometryComplexity: 50, // Neutral por defecto
    };
    
    // Usar sistema de scoring multi-factor
    const riskResult = await calculateSupportRisk(riskFactors, geometry);
    
    logger.log('🔬 Resultado del análisis multi-factor:', {
      riskScore: riskResult.riskScore.toFixed(1) + '/100',
      needsSupports: riskResult.needsSupports ? '✅ SÍ' : '❌ NO',
      confidence: riskResult.confidence.toUpperCase(),
      reason: riskResult.reason,
    });
    
    return {
      needsSupports: riskResult.needsSupports,
      confidence: riskResult.confidence,
      overhangPercentage: overhangAnalysis.overhangPercentage,
      reason: riskResult.reason,
      recommendations: riskResult.recommendations,
    };
  } catch (error) {
    logger.error('Error detecting supports:', error);
    return {
      needsSupports: false,
      confidence: 'low',
      overhangPercentage: 0,
      reason: 'Error al analizar el archivo'
    };
  }
}

/**
 * MEJORADO CON IA: Analiza voladizos con algoritmo multi-capa inteligente
 */
function analyzeOverhangs(geometry: THREE.BufferGeometry): {
  hasOverhangs: boolean;
  overhangPercentage: number;
  estimatedSupportVolume: number;
} {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  
  if (!normal) {
    geometry.computeVertexNormals();
  }
  
  let overhangAreaMm2 = 0;
  let totalAreaMm2 = 0;
  let minZ = Infinity;
  let maxZ = -Infinity;
  
  // MEJORA IA: Sistema de umbrales adaptativos basados en geometría tensorial
  // Ángulos críticos múltiples para mejor detección
  const criticalAngles = {
    severe: Math.cos(OVERHANG_SEVERITY.SEVERE_ANGLE * Math.PI / 180),
    standard: Math.cos(OVERHANG_SEVERITY.STANDARD_ANGLE * Math.PI / 180),
    mild: Math.cos(OVERHANG_SEVERITY.MILD_ANGLE * Math.PI / 180),
  };
  
  // Contadores por severidad para análisis inteligente
  let severeOverhangArea = 0;
  let standardOverhangArea = 0;
  let mildOverhangArea = 0;
  
  // MEJORA: Detección de islas (regiones sin soporte debajo)
  const layerMap = new Map<number, Set<string>>();
  const layerTolerance = ISLAND_DETECTION_CONFIG.LAYER_TOLERANCE_MM;
  
  // Analizar ÁREA con ponderación por severidad
  for (let i = 0; i < position.count; i += 3) {
    const p1 = new THREE.Vector3().fromBufferAttribute(position, i);
    const p2 = new THREE.Vector3().fromBufferAttribute(position, i + 1);
    const p3 = new THREE.Vector3().fromBufferAttribute(position, i + 2);
    
    // Calcular área del triángulo
    const edge1 = new THREE.Vector3().subVectors(p2, p1);
    const edge2 = new THREE.Vector3().subVectors(p3, p1);
    const cross = new THREE.Vector3().crossVectors(edge1, edge2);
    const triangleArea = cross.length() / 2;
    totalAreaMm2 += triangleArea;
    
    // Registrar presencia en capa para detección de islas
    const avgZ = (p1.z + p2.z + p3.z) / 3;
    const layerKey = Math.round(avgZ / layerTolerance);
    if (!layerMap.has(layerKey)) {
      layerMap.set(layerKey, new Set());
    }
    const centerX = (p1.x + p2.x + p3.x) / 3;
    const centerY = (p1.y + p2.y + p3.y) / 3;
    layerMap.get(layerKey)!.add(`${Math.round(centerX)},${Math.round(centerY)}`);
    
    // Actualizar bounds
    minZ = Math.min(minZ, p1.z, p2.z, p3.z);
    maxZ = Math.max(maxZ, p1.z, p2.z, p3.z);
    
    // Obtener normal del triángulo
    const n = cross.normalize();
    
    // MEJORA IA: Clasificación por severidad de voladizo
    // n.z < threshold significa ángulo crítico respecto a horizontal
    // n.z > -0.1 evita contar caras del fondo
    if (n.z > -0.1) {
      if (n.z < criticalAngles.severe) {
        // Voladizo severo: peso máximo
        severeOverhangArea += triangleArea;
        overhangAreaMm2 += triangleArea * OVERHANG_SEVERITY.SEVERE_WEIGHT;
      } else if (n.z < criticalAngles.standard) {
        // Voladizo estándar: peso normal
        standardOverhangArea += triangleArea;
        overhangAreaMm2 += triangleArea * OVERHANG_SEVERITY.STANDARD_WEIGHT;
      } else if (n.z < criticalAngles.mild) {
        // Voladizo leve: peso reducido
        mildOverhangArea += triangleArea;
        overhangAreaMm2 += triangleArea * OVERHANG_SEVERITY.MILD_WEIGHT;
      }
    }
  }
  
  // MEJORA IA: Detección de islas flotantes
  // Comparar cada capa con la anterior para encontrar regiones sin soporte
  const sortedLayers = Array.from(layerMap.keys()).sort((a, b) => a - b);
  let islandCount = 0;
  let islandArea = 0;
  
  for (let i = 1; i < sortedLayers.length; i++) {
    const currentLayer = layerMap.get(sortedLayers[i])!;
    const previousLayer = layerMap.get(sortedLayers[i - 1])!;
    
    // Buscar puntos en capa actual que no tienen soporte en capa anterior
    currentLayer.forEach(point => {
      const [x, y] = point.split(',').map(Number);
      let hasSupport = false;
      const searchRadius = ISLAND_DETECTION_CONFIG.SEARCH_RADIUS_MM;
      
      for (let dx = -searchRadius; dx <= searchRadius && !hasSupport; dx++) {
        for (let dy = -searchRadius; dy <= searchRadius && !hasSupport; dy++) {
          if (previousLayer.has(`${x + dx},${y + dy}`)) {
            hasSupport = true;
          }
        }
      }
      
      if (!hasSupport) {
        islandCount++;
        islandArea += 1; // Área aproximada por punto
      }
    });
  }
  
  // Calcular altura promedio de soportes
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  const pieceHeight = bbox.max.z - bbox.min.z;
  
  // MEJORA IA: Altura de soporte adaptativa basada en análisis de capas
  // Soportes más altos para piezas con voladizos en la parte superior
  const layerCount = sortedLayers.length;
  const avgOverhangLayer = layerCount > 0 ? 
    sortedLayers.reduce((sum, key) => sum + key, 0) / layerCount : 0;
  const overhangHeightRatio = layerCount > 0 ? avgOverhangLayer / sortedLayers[sortedLayers.length - 1] : 0.4;
  
  // Altura promedio de soporte: ajustada por posición de voladizos
  const baseHeightRatio = SUPPORT_CONSTANTS.AVERAGE_SUPPORT_HEIGHT_RATIO;
  const adaptiveHeightRatio = baseHeightRatio + (overhangHeightRatio * 0.2); // +0-20% basado en altura
  const averageSupportHeight = pieceHeight * adaptiveHeightRatio;
  
  // MEJORA IA: Densidad de soporte variable según severidad
  // Voladizos severos necesitan soportes más densos
  const baseDensity = SUPPORT_CONSTANTS.SUPPORT_DENSITY;
  const severeAreaRatio = totalAreaMm2 > 0 ? severeOverhangArea / totalAreaMm2 : 0;
  const adaptiveDensity = baseDensity * (1.0 + severeAreaRatio * 0.5); // +0-50% densidad
  
  // Volumen de soporte = área ponderada × altura adaptativa × densidad variable
  let estimatedSupportVolume = (overhangAreaMm2 * averageSupportHeight * adaptiveDensity) / 1000;
  
  // Agregar volumen adicional para islas flotantes
  if (islandCount > ISLAND_DETECTION_CONFIG.MIN_ISLAND_COUNT_THRESHOLD) {
    const islandVolume = (islandArea * pieceHeight * ISLAND_DETECTION_CONFIG.SUPPORT_HEIGHT_FACTOR * baseDensity) / 1000;
    estimatedSupportVolume += islandVolume;
    logger.log('🏝️ Islas flotantes detectadas:', {
      cantidad: islandCount,
      volumenAdicional: islandVolume.toFixed(2) + 'cm³'
    });
  }
  
  const overhangPercentage = totalAreaMm2 > 0 ? (overhangAreaMm2 / totalAreaMm2) * 100 : 0;
  const hasOverhangs = overhangPercentage > 5; // Umbral: 5% del área
  
  logger.log('🧠 IA: ANÁLISIS DE SOPORTES MEJORADO:', {
    areaTotal: totalAreaMm2.toFixed(0) + 'mm²',
    '=== SEVERIDAD ===': '',
    voladizosSeveros: severeOverhangArea.toFixed(0) + 'mm² (>60°)',
    voladizosEstándar: standardOverhangArea.toFixed(0) + 'mm² (45-60°)',
    voladizosLeves: mildOverhangArea.toFixed(0) + 'mm² (35-45°)',
    '=== TOTALES ===': '',
    areaPonderada: overhangAreaMm2.toFixed(0) + 'mm² (con ponderación)',
    porcentajeVoladizo: overhangPercentage.toFixed(1) + '%',
    '=== GEOMETRÍA ===': '',
    alturaPieza: pieceHeight.toFixed(1) + 'mm',
    ratioAlturaVoladizos: (overhangHeightRatio * 100).toFixed(0) + '%',
    alturaAdaptativaSoportes: averageSupportHeight.toFixed(1) + 'mm',
    densidadAdaptativa: (adaptiveDensity * 100).toFixed(1) + '%',
    '=== RESULTADO ===': '',
    volumenSoportes: estimatedSupportVolume.toFixed(2) + 'cm³',
    islasDetectadas: islandCount > 5 ? islandCount + ' islas' : 'Ninguna',
    método: '🧠 IA Multi-capa con análisis tensorial'
  });
  
  return {
    hasOverhangs,
    overhangPercentage,
    estimatedSupportVolume: Math.max(0, estimatedSupportVolume)
  };
}

/**
 * Calcula el volumen firmado de un triángulo
 */
function signedVolumeOfTriangle(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): number {
  return p1.dot(p2.clone().cross(p3)) / 6.0;
}

/**
 * Genera una imagen de vista previa del modelo 3D
 */
function generatePreviewImage(geometry: THREE.BufferGeometry, hexColor: string = '#3b82f6'): string {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);
  
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
  
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(400, 400);
  
  // Convertir color hexadecimal a THREE.Color
  const color = new THREE.Color(hexColor);
  
  const material = new THREE.MeshPhongMaterial({
    color: color,
    specular: 0x111111,
    shininess: 200
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  const center = new THREE.Vector3();
  bbox.getCenter(center);
  
  mesh.position.sub(center);
  scene.add(mesh);
  
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  
  camera.position.set(maxDim * 1.2, maxDim * 0.8, maxDim * 1.2);
  camera.lookAt(0, 0, 0);
  
  const ambientLight = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(1, 1, 1);
  scene.add(directionalLight);
  
  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight2.position.set(-1, -1, -1);
  scene.add(directionalLight2);
  
  renderer.render(scene, camera);
  
  const dataURL = renderer.domElement.toDataURL('image/png');
  
  renderer.dispose();
  material.dispose();
  geometry.dispose();
  
  return dataURL;
}
