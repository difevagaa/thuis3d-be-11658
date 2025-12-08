/**
 * Standard color palette for consistent design across the site
 * Helps avoid having too many color variants and maintains visual coherence
 */

export interface ColorOption {
  name: string;
  value: string;
  category: 'white' | 'gray' | 'primary' | 'accent' | 'dark';
}

export const STANDARD_COLORS: ColorOption[] = [
  // Whites and very light grays
  { name: 'Blanco', value: '#FFFFFF', category: 'white' },
  { name: 'Blanco Hueso', value: '#FAFAFA', category: 'white' },
  { name: 'Gris Claro', value: '#F5F5F5', category: 'white' },
  
  // Grays
  { name: 'Gris 100', value: '#F3F4F6', category: 'gray' },
  { name: 'Gris 200', value: '#E5E7EB', category: 'gray' },
  { name: 'Gris 300', value: '#D1D5DB', category: 'gray' },
  { name: 'Gris 400', value: '#9CA3AF', category: 'gray' },
  { name: 'Gris 500', value: '#6B7280', category: 'gray' },
  
  // Primary colors (reds based on brand)
  { name: 'Rojo Claro', value: '#FEF2F2', category: 'primary' },
  { name: 'Rojo 100', value: '#FEE2E2', category: 'primary' },
  { name: 'Rojo Principal', value: '#E02C2C', category: 'primary' },
  { name: 'Rojo Oscuro', value: '#B91C1C', category: 'primary' },
  
  // Accent colors (blues)
  { name: 'Azul Claro', value: '#EFF6FF', category: 'accent' },
  { name: 'Azul 100', value: '#DBEAFE', category: 'accent' },
  { name: 'Azul Principal', value: '#3B82F6', category: 'accent' },
  { name: 'Azul Oscuro', value: '#1E40AF', category: 'accent' },
  
  // Dark colors
  { name: 'Gris 700', value: '#374151', category: 'dark' },
  { name: 'Gris 800', value: '#1F2937', category: 'dark' },
  { name: 'Gris 900', value: '#111827', category: 'dark' },
  { name: 'Navy', value: '#1E293B', category: 'dark' },
  { name: 'Negro', value: '#000000', category: 'dark' },
];

export const COLOR_CATEGORIES = {
  white: 'Blancos',
  gray: 'Grises',
  primary: 'Primarios',
  accent: 'Acentos',
  dark: 'Oscuros',
} as const;

/**
 * Get color name from value, or return the value if not found
 */
export function getColorName(value: string): string {
  if (!value) return '';
  const normalized = value.toUpperCase();
  const color = STANDARD_COLORS.find(c => c.value.toUpperCase() === normalized);
  return color ? color.name : value;
}

/**
 * Check if a color is in the standard palette
 */
export function isStandardColor(value: string): boolean {
  if (!value) return false;
  const normalized = value.toUpperCase();
  return STANDARD_COLORS.some(c => c.value.toUpperCase() === normalized);
}
