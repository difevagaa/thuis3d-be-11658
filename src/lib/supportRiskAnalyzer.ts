import * as THREE from 'three';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Factores de riesgo para detección de soportes
 */
export interface SupportRiskFactors {
  overhangPercentage: number;
  overhangAngle: number;
  material: string;
  layerHeight: number;
  maxOverhangLength: number;
  pieceHeight: number;
  bridgingDistance: number;
  geometryComplexity: number;
}

/**
 * Configuración de detección desde base de datos
 */
export interface SupportDetectionConfig {
  overhang_angle_threshold: number;
  min_support_area_percent: number;
  material_risk_pla: number;
  material_risk_petg: number;
  material_risk_abs: number;
  detection_mode: 'conservative' | 'balanced' | 'aggressive';
  enable_bridging_detection: boolean;
  max_bridging_distance: number;
  high_confidence_threshold: number;
  medium_confidence_threshold: number;
  enable_length_analysis: boolean;
}

/**
 * Resultado del análisis de riesgo
 */
export interface SupportRiskResult {
  riskScore: number;
  needsSupports: boolean;
  confidence: 'low' | 'medium' | 'high';
  reason: string;
  recommendations: string[];
  detailedAnalysis: {
    baseRiskScore: number;
    materialAdjustment: number;
    lengthAdjustment: number;
    bridgingBonus: number;
    layerHeightAdjustment: number;
    modeAdjustment: number;
    finalScore: number;
  };
}

/**
 * Obtener configuración de detección desde base de datos
 */
export async function getSupportDetectionConfig(): Promise<SupportDetectionConfig> {
  try {
    const { data, error } = await supabase
      .from('support_detection_settings')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      logger.warn('⚠️ No se pudo cargar configuración de soportes, usando valores por defecto');
      return getDefaultConfig();
    }

    return data as SupportDetectionConfig;
  } catch (error) {
    logger.error('Error cargando configuración:', error);
    return getDefaultConfig();
  }
}

/**
 * Configuración por defecto si no se puede cargar de BD
 */
function getDefaultConfig(): SupportDetectionConfig {
  return {
    overhang_angle_threshold: 45,
    min_support_area_percent: 15.0,
    material_risk_pla: 1.0,
    material_risk_petg: 1.3,
    material_risk_abs: 1.5,
    detection_mode: 'balanced',
    enable_bridging_detection: true,
    max_bridging_distance: 35,
    high_confidence_threshold: 75,
    medium_confidence_threshold: 40,
    enable_length_analysis: true,
  };
}

/**
 * Calcular factor de riesgo por material
 */
function getMaterialRiskFactor(material: string, config: SupportDetectionConfig): number {
  const materialLower = material.toLowerCase();
  
  if (materialLower.includes('pla')) return config.material_risk_pla;
  if (materialLower.includes('petg')) return config.material_risk_petg;
  if (materialLower.includes('abs')) return config.material_risk_abs;
  
  // Material desconocido: usar PLA como baseline
  return config.material_risk_pla;
}

/**
 * Calcular factor de ajuste por altura de capa
 */
function getLayerHeightFactor(layerHeight: number): number {
  if (layerHeight <= 0.08) return 0.8;  // Capas ultra finas: mejor calidad
  if (layerHeight <= 0.12) return 0.9;  // Capas finas: buena calidad
  if (layerHeight <= 0.16) return 1.0;  // Estándar
  if (layerHeight <= 0.20) return 1.1;  // Capas gruesas
  return 1.3;  // Capas muy gruesas: peor para voladizos
}

/**
 * Analizar geometría para detectar puentes (bridging)
 */
function analyzeBridging(
  geometry: THREE.BufferGeometry,
  maxBridgingDistance: number
): { hasBridging: boolean; bridgingDistance: number } {
  const position = geometry.attributes.position;
  let maxGap = 0;
  let hasBridging = false;

  // Análisis simplificado: buscar gaps horizontales
  const vertices: THREE.Vector3[] = [];
  for (let i = 0; i < position.count; i++) {
    vertices.push(new THREE.Vector3().fromBufferAttribute(position, i));
  }

  // Agrupar por altura (layers)
  const layerMap = new Map<number, THREE.Vector3[]>();
  const layerTolerance = 0.5; // mm

  vertices.forEach(v => {
    const layerKey = Math.round(v.z / layerTolerance) * layerTolerance;
    if (!layerMap.has(layerKey)) {
      layerMap.set(layerKey, []);
    }
    layerMap.get(layerKey)!.push(v);
  });

  // Analizar gaps en cada capa
  layerMap.forEach((layerVertices) => {
    if (layerVertices.length < 2) return;

    // Ordenar por X
    layerVertices.sort((a, b) => a.x - b.x);

    // Buscar gaps
    for (let i = 1; i < layerVertices.length; i++) {
      const gap = layerVertices[i].x - layerVertices[i - 1].x;
      if (gap > maxGap) {
        maxGap = gap;
      }
    }
  });

  hasBridging = maxGap > 5 && maxGap <= maxBridgingDistance;

  return {
    hasBridging,
    bridgingDistance: maxGap,
  };
}

/**
 * Calcular complejidad geométrica
 */
function calculateGeometryComplexity(geometry: THREE.BufferGeometry): number {
  const position = geometry.attributes.position;
  const faceCount = position.count / 3;
  
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  const volume = (bbox.max.x - bbox.min.x) * 
                 (bbox.max.y - bbox.min.y) * 
                 (bbox.max.z - bbox.min.z);
  
  // Complejidad = caras por unidad de volumen (normalizado)
  const complexity = Math.min(100, (faceCount / Math.max(1, volume)) * 100);
  
  return complexity;
}

/**
 * Sistema de scoring multi-factor para detección de soportes
 */
export async function calculateSupportRisk(
  factors: SupportRiskFactors,
  geometry: THREE.BufferGeometry,
  config?: SupportDetectionConfig
): Promise<SupportRiskResult> {
  
  // Cargar configuración si no se proporciona
  if (!config) {
    config = await getSupportDetectionConfig();
  }

  logger.log('🔬 Iniciando análisis multi-factor de soportes:', {
    material: factors.material,
    overhangPercentage: factors.overhangPercentage.toFixed(1) + '%',
    layerHeight: factors.layerHeight + 'mm',
    detectionMode: config.detection_mode,
  });

  // ========== PASO 1: Score Base (Porcentaje de Voladizos) ==========
  let baseRiskScore = 0;
  
  if (factors.overhangPercentage > 40) {
    baseRiskScore = 90;
  } else if (factors.overhangPercentage > 25) {
    baseRiskScore = 70;
  } else if (factors.overhangPercentage > 15) {
    baseRiskScore = 50;
  } else if (factors.overhangPercentage > 8) {
    baseRiskScore = 30;
  } else {
    baseRiskScore = 10;
  }

  // ========== PASO 2: Ajuste por Material ==========
  const materialFactor = getMaterialRiskFactor(factors.material, config);
  const materialAdjustment = (materialFactor - 1.0) * 30; // Max +/-30 puntos
  
  // ========== PASO 3: Ajuste por Longitud de Voladizo ==========
  let lengthAdjustment = 0;
  if (config.enable_length_analysis) {
    if (factors.maxOverhangLength < 3) {
      lengthAdjustment = -20; // Voladizo muy corto: muy seguro
    } else if (factors.maxOverhangLength > 15) {
      lengthAdjustment = +25; // Voladizo muy largo: muy riesgoso
    } else if (factors.maxOverhangLength > 10) {
      lengthAdjustment = +15;
    } else if (factors.maxOverhangLength > 5) {
      lengthAdjustment = +5;
    }
  }

  // ========== PASO 4: Análisis de Puentes (Bridging) ==========
  let bridgingBonus = 0;
  if (config.enable_bridging_detection) {
    const bridgingAnalysis = analyzeBridging(geometry, config.max_bridging_distance);
    
    if (bridgingAnalysis.hasBridging && bridgingAnalysis.bridgingDistance <= config.max_bridging_distance) {
      bridgingBonus = -15; // Puente detectado: reducir riesgo
      logger.log('🌉 Puente detectado:', {
        distancia: bridgingAnalysis.bridgingDistance.toFixed(1) + 'mm',
        bonificacion: bridgingBonus
      });
    }
  }

  // ========== PASO 5: Ajuste por Altura de Capa ==========
  const layerHeightFactor = getLayerHeightFactor(factors.layerHeight);
  const layerHeightAdjustment = (layerHeightFactor - 1.0) * 20; // Max +/-20 puntos

  // ========== PASO 6: Ajuste por Modo de Detección ==========
  let modeAdjustment = 0;
  if (config.detection_mode === 'conservative') {
    modeAdjustment = +15; // Más conservador: marca más soportes
  } else if (config.detection_mode === 'aggressive') {
    modeAdjustment = -15; // Más agresivo: menos soportes
  }

  // ========== PASO 7 (NUEVO IA): Análisis de Complejidad Geométrica ==========
  const geometryComplexity = calculateGeometryComplexity(geometry);
  let complexityAdjustment = 0;
  
  // Geometrías complejas tienden a tener más voladizos difíciles de predecir
  if (geometryComplexity > 80) {
    complexityAdjustment = +10; // Muy complejo: ser más conservador
  } else if (geometryComplexity > 60) {
    complexityAdjustment = +5; // Moderadamente complejo
  } else if (geometryComplexity < 20) {
    complexityAdjustment = -5; // Muy simple: menos preocupación
  }
  
  logger.log('🧠 IA: Análisis de complejidad geométrica:', {
    complejidad: geometryComplexity.toFixed(1) + '/100',
    ajuste: complexityAdjustment > 0 ? `+${complexityAdjustment}` : complexityAdjustment
  });

  // ========== CÁLCULO FINAL ==========
  const finalScore = Math.max(0, Math.min(100, 
    baseRiskScore + 
    materialAdjustment + 
    lengthAdjustment + 
    bridgingBonus + 
    layerHeightAdjustment + 
    modeAdjustment + 
    complexityAdjustment
  ));

  // ========== DETERMINAR DECISIÓN ==========
  let needsSupports = false;
  let confidence: 'low' | 'medium' | 'high' = 'low';
  
  if (finalScore >= config.high_confidence_threshold) {
    needsSupports = true;
    confidence = 'high';
  } else if (finalScore >= config.medium_confidence_threshold) {
    needsSupports = true;
    confidence = 'medium';
  } else if (finalScore >= 25) {
    needsSupports = false;
    confidence = 'low';
  } else {
    needsSupports = false;
    confidence = 'high';
  }

  // ========== GENERAR RAZÓN Y RECOMENDACIONES ==========
  let reason = '';
  const recommendations: string[] = [];

  if (needsSupports) {
    if (finalScore >= 80) {
      reason = `Área crítica de voladizos detectada (${factors.overhangPercentage.toFixed(1)}%). Soportes altamente necesarios para impresión exitosa.`;
      recommendations.push('Activa soportes en el slicer');
      recommendations.push('Considera aumentar la densidad de soportes');
    } else if (finalScore >= 60) {
      reason = `Voladizos significativos detectados (${factors.overhangPercentage.toFixed(1)}%). Soportes recomendados.`;
      recommendations.push('Activa soportes en el slicer');
      recommendations.push('Revisa la orientación de la pieza para minimizar voladizos');
    } else {
      reason = `Voladizos moderados (${factors.overhangPercentage.toFixed(1)}%). Soportes probablemente necesarios según análisis multi-factor.`;
      recommendations.push('Considera activar soportes para mayor seguridad');
      recommendations.push('Intenta optimizar la orientación de la pieza');
    }
  } else {
    if (finalScore < 15) {
      reason = `Voladizos mínimos (${factors.overhangPercentage.toFixed(1)}%). No requiere soportes.`;
      recommendations.push('La pieza debería imprimir sin soportes sin problemas');
    } else {
      reason = `Voladizos controlados (${factors.overhangPercentage.toFixed(1)}%). Posiblemente imprimible sin soportes.`;
      recommendations.push('Monitorea la primera capa y los voladizos durante la impresión');
      recommendations.push('Si falla, prueba con soportes activados');
    }
  }

  // Agregar recomendaciones específicas
  if (factors.material.toLowerCase().includes('pla')) {
    recommendations.push('PLA tiene excelente capacidad de voladizo');
  } else if (factors.material.toLowerCase().includes('petg')) {
    recommendations.push('PETG puede requerir más ventilación para voladizos');
  } else if (factors.material.toLowerCase().includes('abs')) {
    recommendations.push('ABS necesita cama caliente y control de temperatura para voladizos');
  }

  if (factors.layerHeight > 0.2) {
    recommendations.push('Considera reducir la altura de capa para mejores voladizos');
  }
  
  // NUEVO IA: Recomendaciones basadas en complejidad
  if (geometryComplexity > 70) {
    recommendations.push('🧠 IA: Geometría compleja detectada - considera hacer prueba de impresión pequeña');
    recommendations.push('🧠 IA: Revisa el modelo en tu slicer antes de imprimir');
  }
  
  // NUEVO IA: Sugerencias de orientación inteligente
  if (needsSupports && factors.overhangPercentage > 20) {
    recommendations.push('💡 IA: Intenta rotar la pieza 180° para minimizar voladizos');
    if (factors.pieceHeight > factors.maxOverhangLength * 2) {
      recommendations.push('💡 IA: Pieza alta detectada - considera imprimir de lado');
    }
  }

  // Log detallado
  logger.log('📊 Análisis de Riesgo Completo con IA:', {
    baseScore: baseRiskScore,
    materialAdj: materialAdjustment.toFixed(1),
    lengthAdj: lengthAdjustment,
    bridgingBonus: bridgingBonus,
    layerHeightAdj: layerHeightAdjustment.toFixed(1),
    modeAdj: modeAdjustment,
    complexityAdj: complexityAdjustment,
    geometryComplexity: geometryComplexity.toFixed(1),
    finalScore: finalScore.toFixed(1),
    decision: needsSupports ? '✅ SOPORTES NECESARIOS' : '❌ NO NECESITA SOPORTES',
    confidence: confidence.toUpperCase(),
  });

  return {
    riskScore: finalScore,
    needsSupports,
    confidence,
    reason,
    recommendations,
    detailedAnalysis: {
      baseRiskScore,
      materialAdjustment,
      lengthAdjustment,
      bridgingBonus,
      layerHeightAdjustment,
      modeAdjustment,
      finalScore,
    },
  };
}
