/**
 * Utility functions for color customization persistence
 */

import { logger } from '@/lib/logger';

// Default color values for LIGHT mode
export const DEFAULT_COLORS = {
  HEADER_BG: '#FFFFFF',
  HEADER_TEXT: '#1A1A1A',
  SIDEBAR_BG: '#1E293B',
  SIDEBAR_ACTIVE_BG: '#3B82F6',
  SIDEBAR_TEXT: '#FFFFFF',
  HOME_MENU_BG: '#FFFFFF',
  HOME_MENU_TEXT: '#1A1A1A',
  HOME_MENU_HOVER_BG: '#F3F4F6',
} as const;

// Default color values for DARK mode
export const DEFAULT_COLORS_DARK = {
  HEADER_BG: '#1E293B',
  HEADER_TEXT: '#F1F5F9',
  SIDEBAR_BG: '#1E293B',
  SIDEBAR_ACTIVE_BG: '#3B82F6',
  SIDEBAR_TEXT: '#FFFFFF',
  HOME_MENU_BG: '#1E293B',
  HOME_MENU_TEXT: '#F1F5F9',
  HOME_MENU_HOVER_BG: '#334155',
} as const;

/**
 * Check if the current theme is dark mode
 */
export const isDarkMode = (): boolean => {
  return document.documentElement.classList.contains('dark');
};

/**
 * Get the appropriate default colors based on current theme
 */
export const getDefaultColors = () => {
  return isDarkMode() ? DEFAULT_COLORS_DARK : DEFAULT_COLORS;
};

export interface AdvancedColorData {
  header_bg_color?: string;
  header_text_color?: string;
  sidebar_bg_color?: string;
  sidebar_active_bg_color?: string;
  sidebar_text_color?: string;
  home_menu_bg_color?: string;
  home_menu_text_color?: string;
  home_menu_hover_bg_color?: string;
}

// Extended interface to track which colors are explicitly customized
export interface AdvancedColorDataWithMeta extends AdvancedColorData {
  // Track if colors have been explicitly customized (not just defaults)
  header_customized?: boolean;
  sidebar_customized?: boolean;
  home_menu_customized?: boolean;
}

export interface CachedAdvancedColors extends AdvancedColorDataWithMeta {
  cached_at: string;
}

/**
 * Convert hex color to HSL format string
 * @param hex - Hex color string (e.g., '#FFFFFF' or 'FFFFFF')
 * @returns HSL string in format "H S% L%" or null if invalid
 */
export const hexToHSL = (hex: string): string | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
};

/**
 * Helper to check if a color differs from both light and dark defaults
 * Returns true only if the color is explicitly customized
 */
const isColorCustomized = (
  color: string | undefined, 
  lightDefault: string, 
  darkDefault: string
): boolean => {
  if (!color) return false;
  const normalizedColor = color.toUpperCase();
  const normalizedLight = lightDefault.toUpperCase();
  const normalizedDark = darkDefault.toUpperCase();
  return normalizedColor !== normalizedLight && normalizedColor !== normalizedDark;
};

/**
 * Creates a standardized advanced color data object for localStorage persistence
 * Only stores colors that differ from defaults, and tracks if sections are customized
 * @param data - Advanced color customization data from the database or state
 * @returns Formatted color data ready for localStorage
 */
export const createAdvancedColorsForCache = (data: AdvancedColorData): CachedAdvancedColors => {
  // Check if header colors are explicitly customized
  const headerBgCustomized = isColorCustomized(
    data.header_bg_color, 
    DEFAULT_COLORS.HEADER_BG, 
    DEFAULT_COLORS_DARK.HEADER_BG
  );
  const headerTextCustomized = isColorCustomized(
    data.header_text_color, 
    DEFAULT_COLORS.HEADER_TEXT, 
    DEFAULT_COLORS_DARK.HEADER_TEXT
  );
  const headerCustomized = headerBgCustomized || headerTextCustomized;

  // Check if sidebar colors are explicitly customized
  const sidebarBgCustomized = isColorCustomized(
    data.sidebar_bg_color, 
    DEFAULT_COLORS.SIDEBAR_BG, 
    DEFAULT_COLORS_DARK.SIDEBAR_BG
  );
  const sidebarActiveCustomized = isColorCustomized(
    data.sidebar_active_bg_color, 
    DEFAULT_COLORS.SIDEBAR_ACTIVE_BG, 
    DEFAULT_COLORS_DARK.SIDEBAR_ACTIVE_BG
  );
  const sidebarTextCustomized = isColorCustomized(
    data.sidebar_text_color, 
    DEFAULT_COLORS.SIDEBAR_TEXT, 
    DEFAULT_COLORS_DARK.SIDEBAR_TEXT
  );
  const sidebarCustomized = sidebarBgCustomized || sidebarActiveCustomized || sidebarTextCustomized;

  // Check if home menu colors are explicitly customized
  const homeMenuBgCustomized = isColorCustomized(
    data.home_menu_bg_color, 
    DEFAULT_COLORS.HOME_MENU_BG, 
    DEFAULT_COLORS_DARK.HOME_MENU_BG
  );
  const homeMenuTextCustomized = isColorCustomized(
    data.home_menu_text_color, 
    DEFAULT_COLORS.HOME_MENU_TEXT, 
    DEFAULT_COLORS_DARK.HOME_MENU_TEXT
  );
  const homeMenuHoverCustomized = isColorCustomized(
    data.home_menu_hover_bg_color, 
    DEFAULT_COLORS.HOME_MENU_HOVER_BG, 
    DEFAULT_COLORS_DARK.HOME_MENU_HOVER_BG
  );
  const homeMenuCustomized = homeMenuBgCustomized || homeMenuTextCustomized || homeMenuHoverCustomized;

  return {
    // Only store colors that are actually set, not defaults
    header_bg_color: data.header_bg_color,
    header_text_color: data.header_text_color,
    sidebar_bg_color: data.sidebar_bg_color,
    sidebar_active_bg_color: data.sidebar_active_bg_color,
    sidebar_text_color: data.sidebar_text_color,
    home_menu_bg_color: data.home_menu_bg_color,
    home_menu_text_color: data.home_menu_text_color,
    home_menu_hover_bg_color: data.home_menu_hover_bg_color,
    // Track which sections are explicitly customized
    header_customized: headerCustomized,
    sidebar_customized: sidebarCustomized,
    home_menu_customized: homeMenuCustomized,
    cached_at: new Date().toISOString()
  };
};

/**
 * Saves advanced color customization to localStorage and applies them immediately
 * @param data - Advanced color customization data to save
 */
export const saveAdvancedColorsToCache = (data: AdvancedColorData): void => {
  const colorData = createAdvancedColorsForCache(data);
  localStorage.setItem('advanced_colors', JSON.stringify(colorData));
  logger.log('💾 [colorPersistence] Advanced colors saved to cache');
  
  // Apply colors immediately after saving
  applyAdvancedColors(colorData);
};

/**
 * Applies advanced colors from data object to CSS variables
 * Only applies colors for sections that are explicitly customized
 * Backwards compatible with old cache format without metadata
 * @param colors - Advanced color data to apply (with optional customization metadata)
 */
export const applyAdvancedColors = (colors: CachedAdvancedColors | AdvancedColorData): void => {
  const root = document.documentElement;
  
  // Check if this is old format without metadata (backwards compatibility)
  const hasMetadata = 'header_customized' in colors || 'sidebar_customized' in colors || 'home_menu_customized' in colors;
  
  // If no metadata, check if colors differ from defaults to determine if customized
  // This handles old cache format gracefully
  const colorsWithMeta = colors as CachedAdvancedColors;
  
  // Determine if header is customized (from metadata or by checking values)
  const headerCustomized = hasMetadata 
    ? colorsWithMeta.header_customized 
    : Boolean(colors.header_bg_color && colors.header_bg_color !== DEFAULT_COLORS.HEADER_BG && colors.header_bg_color !== DEFAULT_COLORS_DARK.HEADER_BG) ||
      Boolean(colors.header_text_color && colors.header_text_color !== DEFAULT_COLORS.HEADER_TEXT && colors.header_text_color !== DEFAULT_COLORS_DARK.HEADER_TEXT);
  
  // Determine if sidebar is customized
  const sidebarCustomized = hasMetadata
    ? colorsWithMeta.sidebar_customized
    : Boolean(colors.sidebar_bg_color && colors.sidebar_bg_color !== DEFAULT_COLORS.SIDEBAR_BG && colors.sidebar_bg_color !== DEFAULT_COLORS_DARK.SIDEBAR_BG) ||
      Boolean(colors.sidebar_active_bg_color && colors.sidebar_active_bg_color !== DEFAULT_COLORS.SIDEBAR_ACTIVE_BG && colors.sidebar_active_bg_color !== DEFAULT_COLORS_DARK.SIDEBAR_ACTIVE_BG) ||
      Boolean(colors.sidebar_text_color && colors.sidebar_text_color !== DEFAULT_COLORS.SIDEBAR_TEXT && colors.sidebar_text_color !== DEFAULT_COLORS_DARK.SIDEBAR_TEXT);
  
  // Determine if home menu is customized
  const homeMenuCustomized = hasMetadata
    ? colorsWithMeta.home_menu_customized
    : Boolean(colors.home_menu_bg_color && colors.home_menu_bg_color !== DEFAULT_COLORS.HOME_MENU_BG && colors.home_menu_bg_color !== DEFAULT_COLORS_DARK.HOME_MENU_BG) ||
      Boolean(colors.home_menu_text_color && colors.home_menu_text_color !== DEFAULT_COLORS.HOME_MENU_TEXT && colors.home_menu_text_color !== DEFAULT_COLORS_DARK.HOME_MENU_TEXT) ||
      Boolean(colors.home_menu_hover_bg_color && colors.home_menu_hover_bg_color !== DEFAULT_COLORS.HOME_MENU_HOVER_BG && colors.home_menu_hover_bg_color !== DEFAULT_COLORS_DARK.HOME_MENU_HOVER_BG);
  
  // Only apply header colors if explicitly customized
  if (headerCustomized) {
    if (colors.header_bg_color) {
      root.style.setProperty('--header-bg', colors.header_bg_color);
    }
    if (colors.header_text_color) {
      root.style.setProperty('--header-text', colors.header_text_color);
    }
    logger.log('🎨 [colorPersistence] Header colors applied (customized)');
  }
  
  // Only apply sidebar colors if explicitly customized
  if (sidebarCustomized) {
    if (colors.sidebar_bg_color) {
      const sidebarBgHSL = hexToHSL(colors.sidebar_bg_color);
      if (sidebarBgHSL) {
        root.style.setProperty('--sidebar-background', sidebarBgHSL);
      }
    }
    if (colors.sidebar_active_bg_color) {
      const sidebarActiveHSL = hexToHSL(colors.sidebar_active_bg_color);
      if (sidebarActiveHSL) {
        root.style.setProperty('--sidebar-accent', sidebarActiveHSL);
      }
    }
    if (colors.sidebar_text_color) {
      const sidebarTextHSL = hexToHSL(colors.sidebar_text_color);
      if (sidebarTextHSL) {
        root.style.setProperty('--sidebar-foreground', sidebarTextHSL);
      }
    }
    logger.log('🎨 [colorPersistence] Sidebar colors applied (customized)');
  }
  
  // Only apply home menu colors if explicitly customized
  if (homeMenuCustomized) {
    if (colors.home_menu_bg_color) {
      root.style.setProperty('--home-menu-bg', colors.home_menu_bg_color);
    }
    if (colors.home_menu_text_color) {
      root.style.setProperty('--home-menu-text', colors.home_menu_text_color);
    }
    if (colors.home_menu_hover_bg_color) {
      root.style.setProperty('--home-menu-hover-bg', colors.home_menu_hover_bg_color);
    }
    logger.log('🎨 [colorPersistence] Home menu colors applied (customized)');
  }
  
  logger.log('🎨 [colorPersistence] Advanced colors processing complete');
};

/**
 * Loads advanced color customization from localStorage
 * @returns Cached advanced color data or null if not found
 */
export const loadAdvancedColorsFromCache = (): CachedAdvancedColors | null => {
  try {
    const cached = localStorage.getItem('advanced_colors');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    logger.warn('⚠️ [colorPersistence] Error loading advanced colors from cache:', e);
  }
  return null;
};

/**
 * Applies advanced colors from cache to CSS variables
 * @returns true if colors were applied, false otherwise
 */
export const applyAdvancedColorsFromCache = (): boolean => {
  const colors = loadAdvancedColorsFromCache();
  if (!colors) return false;
  
  applyAdvancedColors(colors);
  logger.log('🎨 [colorPersistence] Advanced colors applied from cache');
  return true;
};

/**
 * Clears all inline CSS variables for advanced colors
 * This allows the CSS defaults (for light/dark mode) to take effect
 */
export const clearAdvancedColorOverrides = (): void => {
  const root = document.documentElement;
  
  // Clear header colors
  root.style.removeProperty('--header-bg');
  root.style.removeProperty('--header-text');
  
  // Clear sidebar colors
  root.style.removeProperty('--sidebar-background');
  root.style.removeProperty('--sidebar-foreground');
  root.style.removeProperty('--sidebar-accent');
  
  // Clear home menu colors
  root.style.removeProperty('--home-menu-bg');
  root.style.removeProperty('--home-menu-text');
  root.style.removeProperty('--home-menu-hover-bg');
  
  logger.log('🧹 [colorPersistence] Advanced color overrides cleared');
};

/**
 * Re-applies advanced colors from cache after theme change
 * Only applies colors for sections that are explicitly customized
 */
export const reapplyAdvancedColorsAfterThemeChange = (): void => {
  const colors = loadAdvancedColorsFromCache();
  if (!colors) {
    // No customization, clear any existing overrides
    clearAdvancedColorOverrides();
    return;
  }
  
  // Clear existing overrides first to ensure CSS defaults apply for non-customized sections
  clearAdvancedColorOverrides();
  
  // Re-apply only customized sections
  applyAdvancedColors(colors);
  
  logger.log('🔄 [colorPersistence] Advanced colors reapplied after theme change');
};
