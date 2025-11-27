/**
 * Utilidad para verificar el contraste de color según las pautas WCAG 2.1
 * 
 * WCAG 2.1 Niveles de Contraste:
 * - AA (texto normal): 4.5:1
 * - AA (texto grande): 3:1
 * - AAA (texto normal): 7:1
 * - AAA (texto grande): 4.5:1
 */

/**
 * Convierte un color HSL a RGB
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4))
  ];
}

/**
 * Parsea una cadena HSL a valores numéricos
 * Formato esperado: "210 100% 45%" o "hsl(210, 100%, 45%)"
 */
function parseHSL(hsl: string): [number, number, number] | null {
  // Remover "hsl(" y ")" si existen
  const cleaned = hsl.replace(/hsl\(|\)/g, '').trim();
  
  // Intentar parsear formato "H S% L%"
  const match = cleaned.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (match) {
    return [
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10)
    ];
  }
  
  // Intentar parsear formato "H, S%, L%"
  const match2 = cleaned.match(/(\d+),\s*(\d+)%,\s*(\d+)%/);
  if (match2) {
    return [
      parseInt(match2[1], 10),
      parseInt(match2[2], 10),
      parseInt(match2[3], 10)
    ];
  }
  
  return null;
}

/**
 * Convierte un color hex a RGB
 */
function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ]
    : null;
}

/**
 * Calcula la luminancia relativa de un color RGB
 * Según la fórmula WCAG: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calcula el ratio de contraste entre dos colores
 * Según la fórmula WCAG: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
export function getContrastRatio(
  color1: string,
  color2: string
): number | null {
  let rgb1: [number, number, number] | null = null;
  let rgb2: [number, number, number] | null = null;

  // Parsear color1
  if (color1.startsWith('#')) {
    rgb1 = hexToRgb(color1);
  } else if (color1.includes('hsl') || /\d+\s+\d+%\s+\d+%/.test(color1)) {
    const hsl = parseHSL(color1);
    if (hsl) {
      rgb1 = hslToRgb(hsl[0], hsl[1], hsl[2]);
    }
  }

  // Parsear color2
  if (color2.startsWith('#')) {
    rgb2 = hexToRgb(color2);
  } else if (color2.includes('hsl') || /\d+\s+\d+%\s+\d+%/.test(color2)) {
    const hsl = parseHSL(color2);
    if (hsl) {
      rgb2 = hslToRgb(hsl[0], hsl[1], hsl[2]);
    }
  }

  if (!rgb1 || !rgb2) {
    return null;
  }

  const lum1 = getRelativeLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = getRelativeLuminance(rgb2[0], rgb2[1], rgb2[2]);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Niveles de contraste WCAG
 */
export enum WCAGLevel {
  AAA_LARGE = 'AAA_LARGE', // 4.5:1 - Texto grande AAA
  AA_NORMAL = 'AA_NORMAL', // 4.5:1 - Texto normal AA
  AA_LARGE = 'AA_LARGE',   // 3:1 - Texto grande AA
  AAA_NORMAL = 'AAA_NORMAL', // 7:1 - Texto normal AAA
  FAIL = 'FAIL'             // No cumple
}

/**
 * Obtiene el nivel WCAG para un ratio de contraste dado
 */
export function getWCAGLevel(ratio: number, isLargeText: boolean = false): WCAGLevel {
  if (isLargeText) {
    if (ratio >= 4.5) return WCAGLevel.AAA_LARGE;
    if (ratio >= 3) return WCAGLevel.AA_LARGE;
    return WCAGLevel.FAIL;
  } else {
    if (ratio >= 7) return WCAGLevel.AAA_NORMAL;
    if (ratio >= 4.5) return WCAGLevel.AA_NORMAL;
    return WCAGLevel.FAIL;
  }
}

/**
 * Verifica si una combinación de colores cumple con un nivel WCAG específico
 */
export function meetsWCAG(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  if (ratio === null) return false;

  const minRatio = level === 'AAA' 
    ? (isLargeText ? 4.5 : 7)
    : (isLargeText ? 3 : 4.5);

  return ratio >= minRatio;
}

/**
 * Obtiene información completa sobre el contraste entre dos colores
 */
export interface ContrastInfo {
  ratio: number;
  levelNormal: WCAGLevel;
  levelLarge: WCAGLevel;
  passAA: boolean;
  passAAA: boolean;
  recommendation: string;
}

export function getContrastInfo(
  foreground: string,
  background: string
): ContrastInfo | null {
  const ratio = getContrastRatio(foreground, background);
  
  if (ratio === null) {
    return null;
  }

  const levelNormal = getWCAGLevel(ratio, false);
  const levelLarge = getWCAGLevel(ratio, true);
  const passAA = ratio >= 4.5;
  const passAAA = ratio >= 7;

  let recommendation = '';
  if (passAAA) {
    recommendation = '✅ Excelente contraste (AAA)';
  } else if (passAA) {
    recommendation = '✅ Buen contraste (AA)';
  } else if (ratio >= 3) {
    recommendation = '⚠️ Solo válido para texto grande';
  } else {
    recommendation = '❌ Contraste insuficiente';
  }

  return {
    ratio,
    levelNormal,
    levelLarge,
    passAA,
    passAAA,
    recommendation
  };
}
