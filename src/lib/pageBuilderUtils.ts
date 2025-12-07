/**
 * Page Builder Utility Functions
 * 50 functional utilities for the page builder without creating new tables
 */

// Define SectionData locally to avoid circular dependency
export interface SectionData {
  id: string;
  page_id: string;
  section_type: string;
  section_name: string;
  display_order: number;
  is_visible: boolean;
  settings: any;
  content: any;
  styles: any;
}

// ============================================
// 1-15: Editor and Section Manipulation
// ============================================

/**
 * 1. Duplicate a section with a new ID
 */
export function duplicateSection(section: any): any {
  return {
    ...section,
    id: `duplicate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    section_name: `${section.section_name} (copia)`,
    display_order: section.display_order + 1
  };
}

/**
 * 2. Copy section to clipboard as JSON
 */
export async function copySectionToClipboard(section: any): Promise<boolean> {
  try {
    const sectionData = {
      section_type: section.section_type,
      section_name: section.section_name,
      settings: section.settings,
      content: section.content,
      styles: section.styles,
      is_visible: section.is_visible
    };
    await navigator.clipboard.writeText(JSON.stringify(sectionData, null, 2));
    return true;
  } catch (error) {
    console.error('Error copying section:', error);
    return false;
  }
}

/**
 * 3. Paste section from clipboard
 */
export async function pasteSectionFromClipboard(): Promise<any | null> {
  try {
    const text = await navigator.clipboard.readText();
    const sectionData = JSON.parse(text);
    return {
      ...sectionData,
      id: `pasted-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      display_order: 0
    };
  } catch (error) {
    console.error('Error pasting section:', error);
    return null;
  }
}

/**
 * 4. Export section as JSON file
 */
export function exportSectionAsJSON(section: any, filename?: string): void {
  const sectionData = {
    section_type: section.section_type,
    section_name: section.section_name,
    settings: section.settings,
    content: section.content,
    styles: section.styles
  };
  
  const blob = new Blob([JSON.stringify(sectionData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `section-${section.section_name.replace(/\s+/g, '-').toLowerCase()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 5. Import section from JSON file
 */
export async function importSectionFromJSON(file: File): Promise<any | null> {
  try {
    const text = await file.text();
    const sectionData = JSON.parse(text);
    return {
      ...sectionData,
      id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      display_order: 0
    };
  } catch (error) {
    console.error('Error importing section:', error);
    return null;
  }
}

/**
 * 6. Search sections by name or type
 */
export function searchSections(sections: any[], query: string): any[] {
  const lowerQuery = query.toLowerCase();
  return sections.filter(section => 
    section.section_name.toLowerCase().includes(lowerQuery) ||
    section.section_type.toLowerCase().includes(lowerQuery)
  );
}

/**
 * 7. Filter sections by type
 */
export function filterSectionsByType(sections: any[], type: string): any[] {
  if (!type || type === 'all') return sections;
  return sections.filter(section => section.section_type === type);
}

/**
 * 8. Filter sections by visibility
 */
export function filterSectionsByVisibility(sections: any[], visible: boolean | 'all'): any[] {
  if (visible === 'all') return sections;
  return sections.filter(section => section.is_visible === visible);
}

/**
 * 9. Reorder sections (move up)
 */
export function moveSectionUp(sections: any[], sectionId: string): any[] {
  const index = sections.findIndex(s => s.id === sectionId);
  if (index <= 0) return sections;
  
  const newSections = [...sections];
  [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
  
  return newSections.map((section, i) => ({
    ...section,
    display_order: i
  }));
}

/**
 * 10. Reorder sections (move down)
 */
export function moveSectionDown(sections: any[], sectionId: string): any[] {
  const index = sections.findIndex(s => s.id === sectionId);
  if (index < 0 || index >= sections.length - 1) return sections;
  
  const newSections = [...sections];
  [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
  
  return newSections.map((section, i) => ({
    ...section,
    display_order: i
  }));
}

/**
 * 11. Move section to specific position
 */
export function moveSectionToPosition(sections: any[], sectionId: string, newPosition: number): any[] {
  const section = sections.find(s => s.id === sectionId);
  if (!section || newPosition < 0 || newPosition >= sections.length) return sections;
  
  const filtered = sections.filter(s => s.id !== sectionId);
  filtered.splice(newPosition, 0, section);
  
  return filtered.map((section, i) => ({
    ...section,
    display_order: i
  }));
}

/**
 * 12. Bulk toggle visibility
 */
export function bulkToggleVisibility(sections: any[], sectionIds: string[], visible: boolean): any[] {
  return sections.map(section => 
    sectionIds.includes(section.id) 
      ? { ...section, is_visible: visible }
      : section
  );
}

/**
 * 13. Bulk delete sections
 */
export function bulkDeleteSections(sections: any[], sectionIds: string[]): any[] {
  return sections
    .filter(section => !sectionIds.includes(section.id))
    .map((section, i) => ({ ...section, display_order: i }));
}

/**
 * 14. Get section count by type
 */
export function getSectionCountByType(sections: any[]): Record<string, number> {
  return sections.reduce((acc, section) => {
    acc[section.section_type] = (acc[section.section_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * 15. Get unique section types
 */
export function getUniqueSectionTypes(sections: any[]): string[] {
  return Array.from(new Set(sections.map(s => s.section_type)));
}

// ============================================
// 16-30: Styles and Design
// ============================================

/**
 * 16. Generate CSS gradient
 */
export function generateGradient(
  type: 'linear' | 'radial',
  colors: string[],
  angle?: number
): string {
  if (type === 'linear') {
    const deg = angle !== undefined ? `${angle}deg` : '135deg';
    return `linear-gradient(${deg}, ${colors.join(', ')})`;
  }
  return `radial-gradient(circle, ${colors.join(', ')})`;
}

/**
 * 17. Generate box shadow
 */
export function generateBoxShadow(
  x: number = 0,
  y: number = 4,
  blur: number = 6,
  spread: number = 0,
  color: string = 'rgba(0, 0, 0, 0.1)'
): string {
  return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
}

/**
 * 18. Generate text shadow
 */
export function generateTextShadow(
  x: number = 1,
  y: number = 1,
  blur: number = 2,
  color: string = 'rgba(0, 0, 0, 0.3)'
): string {
  return `${x}px ${y}px ${blur}px ${color}`;
}

/**
 * 19. Convert hex to rgba
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 20. Get contrast color (black or white)
 */
export function getContrastColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * 21. Generate animation CSS class name
 */
export function getAnimationClass(animation: string): string {
  const animations: Record<string, string> = {
    'fade-in': 'animate-fadeIn',
    'slide-up': 'animate-slideUp',
    'slide-left': 'animate-slideLeft',
    'scale': 'animate-scale',
    'bounce': 'animate-bounce',
    'pulse': 'animate-pulse',
    'spin': 'animate-spin'
  };
  return animations[animation] || '';
}

/**
 * 22. Generate responsive padding
 */
export function generateResponsivePadding(base: number): {
  mobile: string;
  tablet: string;
  desktop: string;
} {
  return {
    mobile: `${base * 0.5}px`,
    tablet: `${base * 0.75}px`,
    desktop: `${base}px`
  };
}

/**
 * 23. Generate responsive font size
 */
export function generateResponsiveFontSize(base: number): {
  mobile: string;
  tablet: string;
  desktop: string;
} {
  return {
    mobile: `${base * 0.75}rem`,
    tablet: `${base * 0.875}rem`,
    desktop: `${base}rem`
  };
}

/**
 * 24. Generate border radius variations
 */
export function getBorderRadiusValue(size: string): string {
  const sizes: Record<string, string> = {
    'none': '0',
    'sm': '4px',
    'md': '8px',
    'lg': '12px',
    'xl': '16px',
    'full': '9999px'
  };
  return sizes[size] || '0';
}

/**
 * 25. Generate CSS filter
 */
export function generateCSSFilter(filters: {
  brightness?: number;
  contrast?: number;
  blur?: number;
  grayscale?: number;
  sepia?: number;
}): string {
  const parts: string[] = [];
  if (filters.brightness !== undefined) parts.push(`brightness(${filters.brightness}%)`);
  if (filters.contrast !== undefined) parts.push(`contrast(${filters.contrast}%)`);
  if (filters.blur !== undefined) parts.push(`blur(${filters.blur}px)`);
  if (filters.grayscale !== undefined) parts.push(`grayscale(${filters.grayscale}%)`);
  if (filters.sepia !== undefined) parts.push(`sepia(${filters.sepia}%)`);
  return parts.join(' ');
}

/**
 * 26. Generate transform CSS
 */
export function generateTransform(transforms: {
  translateX?: number;
  translateY?: number;
  scale?: number;
  rotate?: number;
  skewX?: number;
  skewY?: number;
}): string {
  const parts: string[] = [];
  if (transforms.translateX) parts.push(`translateX(${transforms.translateX}px)`);
  if (transforms.translateY) parts.push(`translateY(${transforms.translateY}px)`);
  if (transforms.scale) parts.push(`scale(${transforms.scale})`);
  if (transforms.rotate) parts.push(`rotate(${transforms.rotate}deg)`);
  if (transforms.skewX) parts.push(`skewX(${transforms.skewX}deg)`);
  if (transforms.skewY) parts.push(`skewY(${transforms.skewY}deg)`);
  return parts.join(' ');
}

/**
 * 27. Predefined color palettes
 */
export const colorPalettes = {
  modern: ['#667eea', '#764ba2', '#f093fb', '#4facfe'],
  sunset: ['#f12711', '#f5af19', '#fdc830', '#f37335'],
  ocean: ['#2e3192', '#1bffff', '#00c6ff', '#0072ff'],
  forest: ['#134e5e', '#71b280', '#56ab2f', '#a8e063'],
  purple: ['#4a00e0', '#8e2de2', '#da22ff', '#9733ee'],
  fire: ['#eb3349', '#f45c43', '#fa709a', '#fee140'],
  sky: ['#0f2027', '#203a43', '#2c5364', '#00d2ff'],
  candy: ['#fc466b', '#3f5efb', '#ffa8a8', '#fcff9e']
};

/**
 * 28. Get palette colors
 */
export function getPaletteColors(paletteName: keyof typeof colorPalettes): string[] {
  return colorPalettes[paletteName] || colorPalettes.modern;
}

/**
 * 29. Generate CSS transition
 */
export function generateTransition(
  property: string = 'all',
  duration: number = 300,
  easing: string = 'ease-in-out'
): string {
  return `${property} ${duration}ms ${easing}`;
}

/**
 * 30. Get spacing value from Tailwind-like scale
 */
export function getSpacingValue(scale: number): string {
  // Tailwind spacing scale: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64
  const spacingMap: Record<number, string> = {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem',
    40: '10rem',
    48: '12rem',
    56: '14rem',
    64: '16rem'
  };
  return spacingMap[scale] || `${scale * 0.25}rem`;
}

// ============================================
// 31-40: Content and Media
// ============================================

/**
 * 31. Generate lazy loading image URL
 */
export function generateLazyImageURL(url: string, width?: number, quality?: number): string {
  // Simple implementation - in production, you'd use a service like Cloudinary
  return url;
}

/**
 * 32. Extract video ID from YouTube URL
 */
export function extractYouTubeID(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
}

/**
 * 33. Extract video ID from Vimeo URL
 */
export function extractVimeoID(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * 34. Generate embed URL for video
 */
export function generateVideoEmbedURL(url: string): string {
  const youtubeID = extractYouTubeID(url);
  if (youtubeID) {
    return `https://www.youtube.com/embed/${youtubeID}`;
  }
  
  const vimeoID = extractVimeoID(url);
  if (vimeoID) {
    return `https://player.vimeo.com/video/${vimeoID}`;
  }
  
  return url;
}

/**
 * 35. Validate image URL
 */
export async function validateImageURL(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    return contentType?.startsWith('image/') || false;
  } catch {
    return false;
  }
}

/**
 * 36. Get image dimensions from URL
 */
export function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * 37. Generate icon element from name
 */
export function getIconElement(iconName: string): string {
  // Return emoji or icon identifier
  const emojiMap: Record<string, string> = {
    'star': '⭐',
    'heart': '❤️',
    'check': '✓',
    'sparkles': '✨',
    'fire': '🔥',
    'rocket': '🚀',
    'light': '💡',
    'shield': '🛡️'
  };
  return emojiMap[iconName] || iconName;
}

/**
 * 38. Generate carousel settings
 */
export function generateCarouselSettings(options: {
  autoplay?: boolean;
  loop?: boolean;
  speed?: number;
  slidesToShow?: number;
}) {
  return {
    autoplay: options.autoplay ?? true,
    loop: options.loop ?? true,
    speed: options.speed ?? 3000,
    slidesToShow: options.slidesToShow ?? 1
  };
}

/**
 * 39. Format number with animation
 */
export function animateCounter(
  start: number,
  end: number,
  duration: number,
  callback: (value: number) => void
): void {
  const startTime = Date.now();
  const diff = end - start;
  
  const step = () => {
    const now = Date.now();
    const progress = Math.min((now - startTime) / duration, 1);
    const value = Math.floor(start + diff * progress);
    callback(value);
    
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };
  
  requestAnimationFrame(step);
}

/**
 * 40. Generate progress bar percentage
 */
export function calculateProgress(current: number, total: number): number {
  return Math.min(Math.max((current / total) * 100, 0), 100);
}

// ============================================
// 41-45: Responsive and Adaptive
// ============================================

/**
 * 41. Get breakpoint values
 */
export const breakpoints = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

/**
 * 42. Check if current viewport matches breakpoint
 */
export function matchesBreakpoint(breakpoint: keyof typeof breakpoints): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= breakpoints[breakpoint];
}

/**
 * 43. Get current breakpoint
 */
export function getCurrentBreakpoint(): keyof typeof breakpoints {
  if (typeof window === 'undefined') return 'md';
  
  const width = window.innerWidth;
  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'xs';
}

/**
 * 44. Generate responsive class
 */
export function generateResponsiveClass(
  baseClass: string,
  breakpoint: keyof typeof breakpoints
): string {
  return breakpoint === 'xs' ? baseClass : `${breakpoint}:${baseClass}`;
}

/**
 * 45. Should hide on device
 */
export function shouldHideOnDevice(
  hiddenDevices: string[],
  currentDevice: string
): boolean {
  return hiddenDevices.includes(currentDevice);
}

// ============================================
// 46-50: SEO and Accessibility
// ============================================

/**
 * 46. Generate alt text suggestion
 */
export function generateAltTextSuggestion(filename: string, context?: string): string {
  const name = filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[_-]/g, ' ') // Replace underscores and dashes
    .replace(/\d+/g, '') // Remove numbers
    .trim();
  
  return context ? `${context} - ${name}` : name;
}

/**
 * 47. Check color contrast ratio
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string): number => {
    const rgb = color.match(/\d+/g);
    if (!rgb || rgb.length < 3) return 0;
    
    const [r, g, b] = rgb.map(val => {
      const sRGB = parseInt(val) / 255;
      return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 48. Check if contrast meets WCAG standards
 */
export function meetsWCAGContrast(
  color1: string,
  color2: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(color1, color2);
  
  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * 49. Generate ARIA label
 */
export function generateAriaLabel(element: {
  type: string;
  title?: string;
  purpose?: string;
}): string {
  if (element.title) return element.title;
  
  const typeLabels: Record<string, string> = {
    'hero': 'Hero banner section',
    'cta': 'Call to action',
    'features': 'Features section',
    'banner': 'Banner',
    'gallery': 'Image gallery',
    'video': 'Video player'
  };
  
  return element.purpose || typeLabels[element.type] || `${element.type} section`;
}

/**
 * 50. Validate semantic HTML structure
 */
export function validateSemanticStructure(sections: any[]): {
  valid: boolean;
  suggestions: string[];
} {
  const suggestions: string[] = [];
  
  // Check for proper heading hierarchy
  const heroSections = sections.filter(s => s.section_type === 'hero');
  if (heroSections.length === 0) {
    suggestions.push('Consider adding a hero section at the top of the page');
  }
  
  // Check for CTAs
  const ctaSections = sections.filter(s => s.section_type === 'cta');
  if (ctaSections.length === 0) {
    suggestions.push('Consider adding a call-to-action section to engage users');
  }
  
  // Check for content sections
  const contentSections = sections.filter(s => 
    ['text', 'features', 'banner'].includes(s.section_type)
  );
  if (contentSections.length === 0) {
    suggestions.push('Add more content sections to provide value to users');
  }
  
  return {
    valid: suggestions.length === 0,
    suggestions
  };
}

// Export all utilities
export default {
  duplicateSection,
  copySectionToClipboard,
  pasteSectionFromClipboard,
  exportSectionAsJSON,
  importSectionFromJSON,
  searchSections,
  filterSectionsByType,
  filterSectionsByVisibility,
  moveSectionUp,
  moveSectionDown,
  moveSectionToPosition,
  bulkToggleVisibility,
  bulkDeleteSections,
  getSectionCountByType,
  getUniqueSectionTypes,
  generateGradient,
  generateBoxShadow,
  generateTextShadow,
  hexToRgba,
  getContrastColor,
  getAnimationClass,
  generateResponsivePadding,
  generateResponsiveFontSize,
  getBorderRadiusValue,
  generateCSSFilter,
  generateTransform,
  colorPalettes,
  getPaletteColors,
  generateTransition,
  getSpacingValue,
  generateLazyImageURL,
  extractYouTubeID,
  extractVimeoID,
  generateVideoEmbedURL,
  validateImageURL,
  getImageDimensions,
  getIconElement,
  generateCarouselSettings,
  animateCounter,
  calculateProgress,
  breakpoints,
  matchesBreakpoint,
  getCurrentBreakpoint,
  generateResponsiveClass,
  shouldHideOnDevice,
  generateAltTextSuggestion,
  getContrastRatio,
  meetsWCAGContrast,
  generateAriaLabel,
  validateSemanticStructure
};
