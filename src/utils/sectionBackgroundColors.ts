/**
 * Utility functions for handling section background colors with dark/light mode support
 * 
 * This module provides functions to:
 * - Store separate background colors for light and dark modes in a single database field
 * - Automatically apply the correct color based on the current theme mode
 */

import { logger } from '@/lib/logger';

/**
 * Interface for dual-mode background color storage
 */
export interface DualModeBackgroundColor {
  light: string;
  dark: string;
}

/**
 * Default background colors for sections
 */
export const DEFAULT_SECTION_BACKGROUNDS = {
  light: '#FFFFFF',
  dark: '#1E293B'
} as const;

/**
 * Check if the current theme is dark mode
 * @returns true if dark mode is active
 */
export const isDarkMode = (): boolean => {
  return document.documentElement.classList.contains('dark');
};

/**
 * Parse a background color value that may be either:
 * - A JSON string with light/dark values: '{"light":"#FFFFFF","dark":"#1E293B"}'
 * - A simple hex color string: '#FFFFFF'
 * 
 * @param colorValue - The stored color value from the database
 * @returns Parsed dual-mode color object
 */
export const parseDualModeColor = (colorValue: string | null | undefined): DualModeBackgroundColor | null => {
  if (!colorValue) return null;
  
  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(colorValue);
    if (parsed && typeof parsed === 'object' && ('light' in parsed || 'dark' in parsed)) {
      return {
        light: parsed.light || DEFAULT_SECTION_BACKGROUNDS.light,
        dark: parsed.dark || DEFAULT_SECTION_BACKGROUNDS.dark
      };
    }
  } catch {
    // Not JSON, continue with legacy format
  }
  
  // Legacy format: single color value
  // For backwards compatibility, use the same color for both modes
  if (colorValue.startsWith('#') || colorValue.startsWith('rgb')) {
    return {
      light: colorValue,
      dark: colorValue
    };
  }
  
  return null;
};

/**
 * Serialize dual-mode colors to a JSON string for database storage
 * 
 * @param colors - The dual-mode color object
 * @returns JSON string for storage
 */
export const serializeDualModeColor = (colors: DualModeBackgroundColor): string => {
  return JSON.stringify({
    light: colors.light,
    dark: colors.dark
  });
};

/**
 * Get the appropriate background color based on the current theme mode
 * 
 * @param colorValue - The stored color value from the database
 * @returns The hex color appropriate for the current mode, or null if no color is set
 */
export const getBackgroundColorForCurrentMode = (colorValue: string | null | undefined): string | null => {
  const colors = parseDualModeColor(colorValue);
  if (!colors) return null;
  
  const currentColor = isDarkMode() ? colors.dark : colors.light;
  logger.log(`🎨 [sectionBackgroundColors] Mode: ${isDarkMode() ? 'dark' : 'light'}, Color: ${currentColor}`);
  return currentColor;
};

/**
 * Check if a color value is in dual-mode format
 * 
 * @param colorValue - The stored color value
 * @returns true if the value is in JSON dual-mode format
 */
export const isDualModeFormat = (colorValue: string | null | undefined): boolean => {
  if (!colorValue) return false;
  
  try {
    const parsed = JSON.parse(colorValue);
    return parsed && typeof parsed === 'object' && ('light' in parsed || 'dark' in parsed);
  } catch {
    return false;
  }
};

/**
 * Extract light and dark colors from a stored value, with defaults
 * 
 * @param colorValue - The stored color value
 * @returns Object with light and dark color values
 */
export const extractDualModeColors = (colorValue: string | null | undefined): { light: string; dark: string } => {
  const parsed = parseDualModeColor(colorValue);
  
  if (parsed) {
    return parsed;
  }
  
  // Return defaults if no valid color is set
  return {
    light: '',
    dark: ''
  };
};

/**
 * Create a dual-mode color value from separate light and dark values
 * Only creates JSON format if at least one color is set
 * 
 * @param lightColor - Color for light mode
 * @param darkColor - Color for dark mode  
 * @returns Serialized dual-mode color or empty string if neither is set
 */
export const createDualModeColorValue = (lightColor: string, darkColor: string): string => {
  // If neither color is set, return empty
  if (!lightColor && !darkColor) {
    return '';
  }
  
  // Create the dual-mode color object
  return serializeDualModeColor({
    light: lightColor || DEFAULT_SECTION_BACKGROUNDS.light,
    dark: darkColor || DEFAULT_SECTION_BACKGROUNDS.dark
  });
};
