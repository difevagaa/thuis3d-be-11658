/**
 * Utility functions for font customization persistence
 */

import { logger } from '@/lib/logger';

// Default font values
export const DEFAULT_FONTS = {
  HEADING: 'Playfair Display',
  BODY: 'Inter',
  BASE_SIZE: '16',
  H1_SIZE: '36',
  H2_SIZE: '30',
  H3_SIZE: '24',
  SIDEBAR_LABEL_SIZE: '11'
} as const;

export interface FontCustomizationData {
  font_heading?: string;
  font_body?: string;
  base_font_size?: string | number;
  heading_size_h1?: string | number;
  heading_size_h2?: string | number;
  heading_size_h3?: string | number;
  sidebar_label_size?: string | number;
}

export interface CachedFontData extends FontCustomizationData {
  cached_at: string;
}

/**
 * Creates a standardized font data object for localStorage persistence
 * @param customization - Font customization data from the database or state
 * @returns Formatted font data ready for localStorage
 */
export const createFontDataForCache = (customization: FontCustomizationData): CachedFontData => {
  return {
    font_heading: customization.font_heading || DEFAULT_FONTS.HEADING,
    font_body: customization.font_body || DEFAULT_FONTS.BODY,
    base_font_size: customization.base_font_size || DEFAULT_FONTS.BASE_SIZE,
    heading_size_h1: customization.heading_size_h1 || DEFAULT_FONTS.H1_SIZE,
    heading_size_h2: customization.heading_size_h2 || DEFAULT_FONTS.H2_SIZE,
    heading_size_h3: customization.heading_size_h3 || DEFAULT_FONTS.H3_SIZE,
    sidebar_label_size: customization.sidebar_label_size || DEFAULT_FONTS.SIDEBAR_LABEL_SIZE,
    cached_at: new Date().toISOString()
  };
};

/**
 * Saves font customization to localStorage
 * @param customization - Font customization data to save
 */
export const saveFontsToCache = (customization: FontCustomizationData): void => {
  const fontData = createFontDataForCache(customization);
  localStorage.setItem('font_customization', JSON.stringify(fontData));
};

/**
 * Loads font customization from localStorage
 * @returns Cached font data or null if not found
 */
export const loadFontsFromCache = (): CachedFontData | null => {
  try {
    const cached = localStorage.getItem('font_customization');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    logger.warn('⚠️ Error loading fonts from cache:', e);
  }
  return null;
};
