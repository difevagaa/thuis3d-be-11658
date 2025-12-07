/**
 * Advanced Section Editor Functions
 * 50+ new editing functions with extensive configuration options
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================
// 1-10: Advanced Content Editing
// ============================================

/**
 * 1. Rich text formatting
 */
export function formatRichText(text: string, format: 'bold' | 'italic' | 'underline' | 'strikethrough'): string {
  const tags: Record<string, [string, string]> = {
    bold: ['<strong>', '</strong>'],
    italic: ['<em>', '</em>'],
    underline: ['<u>', '</u>'],
    strikethrough: ['<s>', '</s>']
  };
  const [open, close] = tags[format];
  return `${open}${text}${close}`;
}

/**
 * 2. Auto-generate slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * 3. Word count
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * 4. Character count
 */
export function countCharacters(text: string, includeSpaces: boolean = true): number {
  return includeSpaces ? text.length : text.replace(/\s/g, '').length;
}

/**
 * 5. Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number, ellipsis: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - ellipsis.length) + ellipsis;
}

/**
 * 6. Extract excerpt from content
 */
export function extractExcerpt(content: string, maxWords: number = 30): string {
  const words = content.trim().split(/\s+/);
  if (words.length <= maxWords) return content;
  return words.slice(0, maxWords).join(' ') + '...';
}

/**
 * 7. Sanitize HTML but keep safe tags
 */
export function sanitizeHTML(html: string, allowedTags: string[] = ['p', 'br', 'strong', 'em', 'a']): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  
  const walk = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      if (!allowedTags.includes(element.tagName.toLowerCase())) {
        const text = document.createTextNode(element.textContent || '');
        element.parentNode?.replaceChild(text, element);
      } else {
        Array.from(element.childNodes).forEach(walk);
      }
    }
  };
  
  Array.from(div.childNodes).forEach(walk);
  return div.innerHTML;
}

/**
 * 8. Convert markdown to HTML (basic)
 */
export function markdownToHTML(markdown: string): string {
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\n/gim, '<br>');
}

/**
 * 9. HTML to plain text
 */
export function htmlToPlainText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * 10. Auto-link URLs in text
 */
export function autoLinkURLs(text: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

// ============================================
// 11-20: Image and Media Management
// ============================================

/**
 * 11. Compress image URL (placeholder for CDN)
 */
export function getCompressedImageURL(url: string, width?: number, quality?: number): string {
  // In production, integrate with Cloudinary, Imgix, etc.
  const params = new URLSearchParams();
  if (width) params.append('w', width.toString());
  if (quality) params.append('q', quality.toString());
  return params.toString() ? `${url}?${params.toString()}` : url;
}

/**
 * 12. Generate responsive image srcset
 */
export function generateSrcSet(baseUrl: string, sizes: number[]): string {
  return sizes
    .map(size => `${getCompressedImageURL(baseUrl, size)} ${size}w`)
    .join(', ');
}

/**
 * 13. Get optimal image format
 */
export function getOptimalImageFormat(): 'webp' | 'avif' | 'jpeg' {
  if (typeof window === 'undefined') return 'jpeg';
  
  const canvas = document.createElement('canvas');
  if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
    return 'webp';
  }
  return 'jpeg';
}

/**
 * 14. Calculate aspect ratio
 */
export function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

/**
 * 15. Get image dominant color
 */
export async function getDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let r = 0, g = 0, b = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      
      const pixelCount = data.length / 4;
      r = Math.floor(r / pixelCount);
      g = Math.floor(g / pixelCount);
      b = Math.floor(b / pixelCount);
      
      resolve(`rgb(${r}, ${g}, ${b})`);
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}

/**
 * 16. Validate video URL
 */
export function isValidVideoURL(url: string): boolean {
  const patterns = [
    /youtube\.com\/watch\?v=/,
    /youtu\.be\//,
    /vimeo\.com\//,
    /dailymotion\.com/,
    /\.mp4$/,
    /\.webm$/,
    /\.ogg$/
  ];
  return patterns.some(pattern => pattern.test(url));
}

/**
 * 17. Get video thumbnail
 */
export function getVideoThumbnail(url: string): string | null {
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
  if (youtubeMatch) {
    return `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
  }
  
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
  }
  
  return null;
}

/**
 * 18. Convert image to base64
 */
export async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 19. Resize image client-side
 */
export async function resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Could not create blob'));
      }, file.type);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 20. Get file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ============================================
// 21-30: Layout and Grid Functions
// ============================================

/**
 * 21. Calculate grid columns
 */
export function calculateGridColumns(itemCount: number, maxColumns: number = 4): number {
  return Math.min(itemCount, maxColumns);
}

/**
 * 22. Generate CSS Grid template
 */
export function generateGridTemplate(columns: number, gap: number = 16): string {
  return `repeat(${columns}, 1fr)`;
}

/**
 * 23. Calculate responsive columns
 */
export function getResponsiveColumns(breakpoint: string): number {
  const columnMap: Record<string, number> = {
    'xs': 1,
    'sm': 2,
    'md': 3,
    'lg': 4,
    'xl': 5,
    '2xl': 6
  };
  return columnMap[breakpoint] || 3;
}

/**
 * 24. Generate flexbox classes
 */
export function generateFlexClasses(
  direction: 'row' | 'column',
  justify: 'start' | 'center' | 'end' | 'between' | 'around',
  align: 'start' | 'center' | 'end' | 'stretch'
): string {
  const directionClass = direction === 'row' ? 'flex-row' : 'flex-col';
  const justifyClass = `justify-${justify}`;
  const alignClass = `items-${align}`;
  return `flex ${directionClass} ${justifyClass} ${alignClass}`;
}

/**
 * 25. Calculate container width
 */
export function getContainerWidth(size: 'sm' | 'md' | 'lg' | 'xl' | 'full'): string {
  const widths = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    full: '100%'
  };
  return widths[size];
}

/**
 * 26. Generate masonry layout
 */
export function calculateMasonryColumns(containerWidth: number, columnWidth: number, gap: number): number {
  return Math.floor((containerWidth + gap) / (columnWidth + gap));
}

/**
 * 27. Calculate item position in grid
 */
export function getGridItemPosition(index: number, columns: number): { row: number; col: number } {
  return {
    row: Math.floor(index / columns),
    col: index % columns
  };
}

/**
 * 28. Generate sticky position styles
 */
export function generateStickyStyles(top: number = 0, zIndex: number = 10): Record<string, any> {
  return {
    position: 'sticky',
    top: `${top}px`,
    zIndex
  };
}

/**
 * 29. Calculate scroll progress
 */
export function calculateScrollProgress(): number {
  if (typeof window === 'undefined') return 0;
  const scrolled = window.scrollY;
  const height = document.documentElement.scrollHeight - window.innerHeight;
  return height > 0 ? (scrolled / height) * 100 : 0;
}

/**
 * 30. Check if element is in viewport
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// ============================================
// 31-40: Advanced Styling Functions
// ============================================

/**
 * 31. Generate neumorphism shadow
 */
export function generateNeumorphism(
  lightColor: string = '#ffffff',
  darkColor: string = '#d1d1d1',
  distance: number = 10
): string {
  return `${distance}px ${distance}px ${distance * 2}px ${darkColor}, -${distance}px -${distance}px ${distance * 2}px ${lightColor}`;
}

/**
 * 32. Generate glassmorphism styles
 */
export function generateGlassmorphism(blur: number = 10, opacity: number = 0.1): Record<string, any> {
  return {
    background: `rgba(255, 255, 255, ${opacity})`,
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    border: '1px solid rgba(255, 255, 255, 0.18)'
  };
}

/**
 * 33. Generate custom cursor styles
 */
export function generateCursorStyle(type: 'pointer' | 'grab' | 'text' | 'crosshair' | 'custom', customUrl?: string): string {
  if (type === 'custom' && customUrl) {
    return `url('${customUrl}'), auto`;
  }
  return type;
}

/**
 * 34. Generate clip-path shapes
 */
export function generateClipPath(shape: 'circle' | 'ellipse' | 'polygon' | 'triangle'): string {
  const shapes: Record<string, string> = {
    circle: 'circle(50% at 50% 50%)',
    ellipse: 'ellipse(50% 50% at 50% 50%)',
    polygon: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
    triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)'
  };
  return shapes[shape];
}

/**
 * 35. Generate CSS custom properties
 */
export function generateCSSVariables(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([key, value]) => `--${key}: ${value};`)
    .join('\n');
}

/**
 * 36. Parse CSS color to RGB
 */
export function parseColorToRGB(color: string): { r: number; g: number; b: number } | null {
  const hex = color.replace('#', '');
  if (hex.length === 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  }
  return null;
}

/**
 * 37. Generate gradient angle
 */
export function generateGradientAngle(direction: 'to-top' | 'to-right' | 'to-bottom' | 'to-left' | 'diagonal'): number {
  const angles = {
    'to-top': 0,
    'to-right': 90,
    'to-bottom': 180,
    'to-left': 270,
    'diagonal': 135
  };
  return angles[direction];
}

/**
 * 38. Lighten color
 */
export function lightenColor(color: string, percent: number): string {
  const rgb = parseColorToRGB(color);
  if (!rgb) return color;
  
  const amount = Math.round(2.55 * percent);
  return `rgb(${Math.min(255, rgb.r + amount)}, ${Math.min(255, rgb.g + amount)}, ${Math.min(255, rgb.b + amount)})`;
}

/**
 * 39. Darken color
 */
export function darkenColor(color: string, percent: number): string {
  const rgb = parseColorToRGB(color);
  if (!rgb) return color;
  
  const amount = Math.round(2.55 * percent);
  return `rgb(${Math.max(0, rgb.r - amount)}, ${Math.max(0, rgb.g - amount)}, ${Math.max(0, rgb.b - amount)})`;
}

/**
 * 40. Generate color palette from base color
 */
export function generateColorPalette(baseColor: string): string[] {
  return [
    lightenColor(baseColor, 40),
    lightenColor(baseColor, 20),
    baseColor,
    darkenColor(baseColor, 20),
    darkenColor(baseColor, 40)
  ];
}

// ============================================
// 41-50: Animation and Interaction Functions
// ============================================

/**
 * 41. Generate keyframe animation
 */
export function generateKeyframes(name: string, frames: Record<string, Record<string, string>>): string {
  const keyframes = Object.entries(frames)
    .map(([percent, styles]) => {
      const styleStr = Object.entries(styles)
        .map(([prop, value]) => `${prop}: ${value};`)
        .join(' ');
      return `${percent} { ${styleStr} }`;
    })
    .join('\n');
  
  return `@keyframes ${name} {\n${keyframes}\n}`;
}

/**
 * 42. Calculate animation duration based on distance
 */
export function calculateAnimationDuration(distance: number, speed: number = 1): number {
  return Math.max(200, distance / speed);
}

/**
 * 43. Generate easing function
 */
export function getEasingFunction(type: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' | 'bounce'): string {
  const easings: Record<string, string> = {
    ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    'ease-in': 'cubic-bezier(0.42, 0, 1, 1)',
    'ease-out': 'cubic-bezier(0, 0, 0.58, 1)',
    'ease-in-out': 'cubic-bezier(0.42, 0, 0.58, 1)',
    linear: 'linear',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  };
  return easings[type];
}

/**
 * 44. Generate parallax transform
 */
export function calculateParallaxTransform(scrollY: number, speed: number = 0.5): string {
  return `translateY(${scrollY * speed}px)`;
}

/**
 * 45. Generate hover scale effect
 */
export function generateHoverScale(scale: number = 1.05, duration: number = 300): Record<string, any> {
  return {
    transition: `transform ${duration}ms ease-in-out`,
    ':hover': {
      transform: `scale(${scale})`
    }
  };
}

/**
 * 46. Calculate scroll snap positions
 */
export function calculateSnapPositions(itemCount: number, containerHeight: number): number[] {
  return Array.from({ length: itemCount }, (_, i) => i * containerHeight);
}

/**
 * 47. Generate ripple effect coordinates
 */
export function getRippleCoordinates(event: React.MouseEvent, element: HTMLElement): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

/**
 * 48. Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * 49. Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * 50. Generate intersection observer options
 */
export function generateIntersectionOptions(
  threshold: number = 0.5,
  rootMargin: string = '0px'
): IntersectionObserverInit {
  return {
    threshold,
    rootMargin
  };
}

export default {
  formatRichText,
  generateSlug,
  countWords,
  countCharacters,
  truncateText,
  extractExcerpt,
  sanitizeHTML,
  markdownToHTML,
  htmlToPlainText,
  autoLinkURLs,
  getCompressedImageURL,
  generateSrcSet,
  getOptimalImageFormat,
  calculateAspectRatio,
  getDominantColor,
  isValidVideoURL,
  getVideoThumbnail,
  imageToBase64,
  resizeImage,
  formatFileSize,
  calculateGridColumns,
  generateGridTemplate,
  getResponsiveColumns,
  generateFlexClasses,
  getContainerWidth,
  calculateMasonryColumns,
  getGridItemPosition,
  generateStickyStyles,
  calculateScrollProgress,
  isInViewport,
  generateNeumorphism,
  generateGlassmorphism,
  generateCursorStyle,
  generateClipPath,
  generateCSSVariables,
  parseColorToRGB,
  generateGradientAngle,
  lightenColor,
  darkenColor,
  generateColorPalette,
  generateKeyframes,
  calculateAnimationDuration,
  getEasingFunction,
  calculateParallaxTransform,
  generateHoverScale,
  calculateSnapPositions,
  getRippleCoordinates,
  throttle,
  debounce,
  generateIntersectionOptions
};
