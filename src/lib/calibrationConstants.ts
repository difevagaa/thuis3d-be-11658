/**
 * Constantes de validación para el sistema de calibración 3D
 * 
 * Estos valores definen los rangos aceptables para factores de calibración
 * que comparan estimaciones del sistema con datos reales del laminador.
 * 
 * Un factor de 1.0x significa que el cálculo del sistema coincide exactamente
 * con el valor real del laminador.
 */

export const CALIBRATION_RANGES = {
  /**
   * Rango ideal: ±5-20% de diferencia
   * Factores en este rango indican excelente precisión
   */
  IDEAL_MIN: 0.95,
  IDEAL_MAX: 1.2,
  
  /**
   * Rango aceptable: ±20-50% de diferencia
   * Se acepta pero se muestra advertencia
   */
  ACCEPTABLE_MIN: 0.8,
  ACCEPTABLE_MAX: 1.5,
  
  /**
   * Límites absolutos: ±50-100% de diferencia
   * Fuera de estos rangos se rechaza la calibración
   */
  LIMIT_MIN: 0.5,
  LIMIT_MAX: 2.0
} as const;

/**
 * Constantes para cálculo de soportes
 */
export const SUPPORT_CONSTANTS = {
  /**
   * Ángulo máximo de voladizo sin soportes (en grados)
   * 45° es el estándar de la industria FDM
   */
  MAX_OVERHANG_ANGLE: 45,
  
  /**
   * Altura promedio de soportes como porcentaje de altura de pieza
   * Los soportes normalmente van desde un punto medio, no desde la base
   */
  AVERAGE_SUPPORT_HEIGHT_RATIO: 0.4,
  
  /**
   * Densidad de estructura de soportes (grid o tree)
   * 10% es típico para estructuras ligeras de soporte
   */
  SUPPORT_DENSITY: 0.10,
  
  /**
   * Volumen máximo de soportes como porcentaje del volumen de pieza
   * Límite de seguridad para evitar estimaciones extremas
   */
  MAX_SUPPORT_VOLUME_PERCENTAGE: 0.35
} as const;

/**
 * Tipo helper para asegurar que los valores no cambien en runtime
 */
export type CalibrationRanges = typeof CALIBRATION_RANGES;
export type SupportConstants = typeof SUPPORT_CONSTANTS;
