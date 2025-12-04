import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { professionalPalettes } from '@/data/professionalPalettes';
import { logger } from '@/lib/logger';
import { saveFontsToCache } from '@/utils/fontPersistence';
import { 
  hexToHSL, 
  saveAdvancedColorsToCache, 
  applyAdvancedColorsFromCache,
  reapplyAdvancedColorsAfterThemeChange
} from '@/utils/colorPersistence';

interface ThemeCustomization {
  primary_color: string;
  secondary_color: string;
  background_color?: string;
  home_hero_bg_color?: string;
  card_bg_color?: string;
  font_heading?: string;
  font_body?: string;
  border_radius?: string;
  palette_id?: string;
  // Campos extendidos usados por applyColors (opcionales)
  text_color_light?: string;
  text_color_dark?: string;
  navbar_color?: string;
  base_font_size?: number | string;
  heading_size_h1?: number | string;
  heading_size_h2?: number | string;
  heading_size_h3?: number | string;
  sidebar_text_color?: string;
  sidebar_label_size?: number | string;
  admin_sidebar_bg?: string;
  admin_sidebar_active_bg?: string;
  favicon_url?: string;
  site_name?: string;
  // Home menu and header customization fields
  home_menu_bg_color?: string;
  home_menu_text_color?: string;
  home_menu_hover_bg_color?: string;
  header_bg_color?: string;
  header_text_color?: string;
  sidebar_bg_color?: string;
  sidebar_active_bg_color?: string;
}


interface PaletteTheme {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  border: string;
  input: string;
  ring: string;
}

interface PaletteData {
  palette_name: string;
  light: PaletteTheme;
  dark: PaletteTheme;
}

// Hook to load and apply global colors from database
export const useGlobalColors = () => {
  useEffect(() => {
    let mounted = true;
    
    const loadAndApplyColors = async () => {
      if (!mounted) return;
      
      try {
        // PRIORIDAD 0: Aplicar favicon y site_name desde caché inmediatamente
        const cachedMetadata = localStorage.getItem('site_metadata');
        if (cachedMetadata) {
          try {
            const metadata = JSON.parse(cachedMetadata);
            if (metadata.favicon_url && mounted) {
              const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
              if (favicon) favicon.href = metadata.favicon_url;
              const apple = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
              if (apple) apple.href = metadata.favicon_url;
            }
            if (metadata.site_name && mounted) {
              document.title = metadata.site_name;
            }
          } catch (e) {
            logger.warn('⚠️ Error al parsear metadata en caché');
          }
        }
        
        // PRIORIDAD 0.5: Aplicar fuentes desde caché inmediatamente (independiente de paletas)
        const cachedFonts = localStorage.getItem('font_customization');
        if (cachedFonts) {
          try {
            const fonts = JSON.parse(cachedFonts);
            logger.log('🔤 [useGlobalColors] Aplicando fuentes desde caché primero');
            const root = document.documentElement;
            if (fonts.font_heading) root.style.setProperty('--font-heading', `"${fonts.font_heading}", serif`);
            if (fonts.font_body) root.style.setProperty('--font-body', `"${fonts.font_body}", sans-serif`);
            if (fonts.base_font_size) root.style.setProperty('--base-font-size', `${fonts.base_font_size}px`);
            if (fonts.heading_size_h1) root.style.setProperty('--heading-size-h1', `${fonts.heading_size_h1}px`);
            if (fonts.heading_size_h2) root.style.setProperty('--heading-size-h2', `${fonts.heading_size_h2}px`);
            if (fonts.heading_size_h3) root.style.setProperty('--heading-size-h3', `${fonts.heading_size_h3}px`);
            if (fonts.sidebar_label_size) root.style.setProperty('--sidebar-label-size', `${fonts.sidebar_label_size}px`);
          } catch (e) {
            logger.warn('⚠️ Error al parsear fuentes en caché');
          }
        }
        
        // PRIORIDAD 0.6: Apply advanced colors from cache immediately
        applyAdvancedColorsFromCache();
        
        // PRIORIDAD 1: Verificar si hay paleta profesional seleccionada
        const cachedPalette = localStorage.getItem('selected_palette');
        if (cachedPalette) {
          try {
            const palette = JSON.parse(cachedPalette);
            logger.log('🎨 [useGlobalColors] Aplicando paleta profesional desde caché:', palette.palette_name);
            applyProfessionalPalette(palette);
            // CRÍTICO: Eliminar theme_customization legacy que causa flickering
            localStorage.removeItem('theme_customization');
          } catch (e) {
            logger.warn('⚠️ Error al parsear paleta en caché');
          }
        } else {
          // PRIORIDAD 2: Si no hay paleta, usar colores individuales legacy
          const cachedTheme = localStorage.getItem('theme_customization');
          if (cachedTheme) {
            try {
              const parsed = JSON.parse(cachedTheme);
              logger.log('🎨 [useGlobalColors] Aplicando tema desde caché primero');
              const root = document.documentElement;
              if (parsed.primary_hsl) root.style.setProperty('--primary', parsed.primary_hsl);
              if (parsed.secondary_hsl) root.style.setProperty('--secondary', parsed.secondary_hsl);
              if (parsed.background_hsl) root.style.setProperty('--background', parsed.background_hsl);
              if (parsed.home_hero_bg_hsl) root.style.setProperty('--home-hero-bg', parsed.home_hero_bg_hsl);
              if (parsed.card_bg_hsl) root.style.setProperty('--card', parsed.card_bg_hsl);
              if (parsed.font_heading) root.style.setProperty('--font-heading', `"${parsed.font_heading}", serif`);
              if (parsed.font_body) root.style.setProperty('--font-body', `"${parsed.font_body}", sans-serif`);
              if (parsed.border_radius) root.style.setProperty('--radius', parsed.border_radius);
            } catch (e) {
              logger.warn('⚠️ Error al parsear tema en caché');
            }
          }
        }

        // Luego cargar desde la base de datos para obtener la versión más reciente
        const { data, error } = await supabase
          .from('site_customization')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          logger.error('Error loading colors:', error);
          return;
        }

        if (data) {
          logger.log('🎨 [useGlobalColors] Aplicando tema desde base de datos');
          
          // SIEMPRE aplicar favicon y site_name independientemente de la paleta
          if (data.favicon_url || data.site_name) {
            // Guardar metadata en caché para próxima carga
            const metadata = {
              favicon_url: data.favicon_url || '',
              site_name: data.site_name || 'Thuis3D',
              cached_at: new Date().toISOString()
            };
            localStorage.setItem('site_metadata', JSON.stringify(metadata));
            logger.log('💾 [useGlobalColors] Metadata guardada en caché');
          }
          
          if (data.favicon_url) {
            const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
            if (favicon) {
              favicon.href = data.favicon_url;
              logger.log('🖼️ [useGlobalColors] Favicon aplicado:', data.favicon_url);
            }
            const apple = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
            if (apple) {
              apple.href = data.favicon_url;
              logger.log('🍎 [useGlobalColors] Apple touch icon aplicado:', data.favicon_url);
            }
          }
          
          if (data.site_name) {
            document.title = data.site_name;
            logger.log('📄 [useGlobalColors] Título aplicado:', data.site_name);
          }
          
          // PRIORIDAD: Si hay theme_preset, aplicar paleta profesional
          if (data.theme_preset) {
            const palette = professionalPalettes.find(p => p.id === data.theme_preset);
            if (palette) {
              const paletteCache = {
                palette_id: palette.id,
                palette_name: palette.name,
                light: palette.light,
                dark: palette.dark,
                applied_at: new Date().toISOString()
              };
              localStorage.setItem('selected_palette', JSON.stringify(paletteCache));
              // CRÍTICO: Eliminar theme_customization para evitar conflicto
              localStorage.removeItem('theme_customization');
              applyProfessionalPalette(paletteCache);
            }
          } else {
            // Solo usar colores individuales si NO hay paleta
            applyColors(data);
            // CRÍTICO: Guardar colores en caché para próxima carga instantánea
            saveToLocalStorage(data);
          }
          
          // SIEMPRE guardar y aplicar colores avanzados (header, sidebar, home_menu) independientemente de la paleta
          saveAdvancedColorsToCache(data);
          
          // CRÍTICO: SIEMPRE aplicar fuentes independientemente de la paleta
          applyFonts(data);
        }
      } catch (error) {
        logger.error('Error in loadAndApplyColors:', error);
      }
    };

    loadAndApplyColors();

    // Subscribe to changes in real-time
    const channel = supabase
      .channel('site-customization-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'site_customization'
      }, () => {
        loadAndApplyColors();
      })
      .subscribe();

    // Observar cambios de tema dark/light para reaplicar paleta y colores avanzados
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          logger.log('🌓 [useGlobalColors] Theme class changed, reapplying colors');
          
          // Reapply professional palette if exists
          const cachedPalette = localStorage.getItem('selected_palette');
          if (cachedPalette) {
            try {
              const palette = JSON.parse(cachedPalette);
              applyProfessionalPalette(palette);
            } catch (e) {
              logger.warn('⚠️ Error al reaplicar paleta después de cambio de tema');
            }
          }
          
          // Reapply advanced colors (only customized ones)
          // This ensures non-customized colors use CSS defaults for the current theme
          reapplyAdvancedColorsAfterThemeChange();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      observer.disconnect();
    };
  }, []);
};

// Apply professional palette from cache
const applyProfessionalPalette = (paletteData: PaletteData) => {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  const theme = isDark ? paletteData.dark : paletteData.light;

  // Aplicar todos los colores de la paleta profesional
  root.style.setProperty('--background', theme.background);
  root.style.setProperty('--foreground', theme.foreground);
  root.style.setProperty('--card', theme.card);
  root.style.setProperty('--card-foreground', theme.cardForeground);
  root.style.setProperty('--popover', theme.popover);
  root.style.setProperty('--popover-foreground', theme.popoverForeground);
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--primary-foreground', theme.primaryForeground);
  root.style.setProperty('--secondary', theme.secondary);
  root.style.setProperty('--secondary-foreground', theme.secondaryForeground);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-foreground', theme.accentForeground);
  root.style.setProperty('--muted', theme.muted);
  root.style.setProperty('--muted-foreground', theme.mutedForeground);
  root.style.setProperty('--destructive', theme.destructive);
  root.style.setProperty('--destructive-foreground', theme.destructiveForeground);
  root.style.setProperty('--success', theme.success);
  root.style.setProperty('--success-foreground', theme.successForeground);
  root.style.setProperty('--warning', theme.warning);
  root.style.setProperty('--warning-foreground', theme.warningForeground);
  root.style.setProperty('--border', theme.border);
  root.style.setProperty('--input', theme.input);
  root.style.setProperty('--ring', theme.ring);

  // Check if sidebar colors are explicitly customized
  // If they are, we should NOT override them with the palette
  const advancedColorsCache = localStorage.getItem('advanced_colors');
  let sidebarIsCustomized = false;
  
  if (advancedColorsCache) {
    try {
      const advancedColors = JSON.parse(advancedColorsCache);
      sidebarIsCustomized = Boolean(advancedColors.sidebar_customized);
    } catch (e) {
      logger.warn('⚠️ Error parsing advanced_colors cache in applyProfessionalPalette');
    }
  }

  // Only apply palette sidebar colors if sidebar is NOT explicitly customized
  if (!sidebarIsCustomized) {
    root.style.setProperty('--sidebar-background', theme.secondary);
    root.style.setProperty('--sidebar-foreground', theme.secondaryForeground);
    root.style.setProperty('--sidebar-primary', theme.primary);
    root.style.setProperty('--sidebar-primary-foreground', theme.primaryForeground);
    root.style.setProperty('--sidebar-accent', theme.accent);
    root.style.setProperty('--sidebar-accent-foreground', theme.accentForeground);
    root.style.setProperty('--sidebar-border', theme.border);
    root.style.setProperty('--sidebar-ring', theme.ring);
    logger.log('🎨 [applyProfessionalPalette] Sidebar colors from palette applied');
  } else {
    logger.log('🎨 [applyProfessionalPalette] Sidebar colors customized - preserving custom colors');
  }
  
  logger.log('✅ [useGlobalColors] Paleta profesional aplicada:', paletteData.palette_name);
};

// Save to localStorage for instant load on next visit
const saveToLocalStorage = (data: ThemeCustomization) => {
  const themeData = {
    primary_color: data.primary_color,
    primary_hsl: hexToHSL(data.primary_color),
    secondary_color: data.secondary_color,
    secondary_hsl: hexToHSL(data.secondary_color),
    background_color: data.background_color,
    background_hsl: hexToHSL(data.background_color || '#FFFFFF'),
    home_hero_bg_color: data.home_hero_bg_color,
    home_hero_bg_hsl: hexToHSL(data.home_hero_bg_color || '#FEF2F2'),
    card_bg_color: data.card_bg_color,
    card_bg_hsl: hexToHSL(data.card_bg_color || '#FFFFFF'),
    font_heading: data.font_heading || 'Playfair Display',
    font_body: data.font_body || 'Inter',
    border_radius: data.border_radius || '0.75rem'
  };
  
  localStorage.setItem('theme_customization', JSON.stringify(themeData));
};

// Apply colors to CSS variables
const applyColors = (customization: ThemeCustomization) => {
  const root = document.documentElement;
  
  // Update primary color
  const primaryHSL = hexToHSL(customization.primary_color);
  if (primaryHSL) {
    root.style.setProperty('--primary', primaryHSL);
  }
  
  // Update secondary color
  const secondaryHSL = hexToHSL(customization.secondary_color);
  if (secondaryHSL) {
    root.style.setProperty('--secondary', secondaryHSL);
  }
  
  // Update background colors
  const backgroundHSL = hexToHSL(customization.background_color || '#FFFFFF');
  if (backgroundHSL) {
    root.style.setProperty('--background', backgroundHSL);
  }
  
  const homeHeroBgHSL = hexToHSL(customization.home_hero_bg_color || '#FEF2F2');
  if (homeHeroBgHSL) {
    root.style.setProperty('--home-hero-bg', homeHeroBgHSL);
  }
  
  const cardBgHSL = hexToHSL(customization.card_bg_color || '#FFFFFF');
  if (cardBgHSL) {
    root.style.setProperty('--card', cardBgHSL);
  }
  
  // Update text colors
  const textLightHSL = hexToHSL(customization.text_color_light);
  if (textLightHSL) {
    root.style.setProperty('--foreground', textLightHSL);
  }
  
  const textDarkHSL = hexToHSL(customization.text_color_dark);
  if (textDarkHSL) {
    root.style.setProperty('--foreground-dark', textDarkHSL);
  }

  // Update navbar color
  if (customization.navbar_color) {
    root.style.setProperty('--navbar-bg', customization.navbar_color);
  }
  
  // Update fonts
  if (customization.font_heading) {
    root.style.setProperty('--font-heading', `"${customization.font_heading}", serif`);
  }
  
  if (customization.font_body) {
    root.style.setProperty('--font-body', `"${customization.font_body}", sans-serif`);
  }
  
  // Update border radius
  if (customization.border_radius) {
    root.style.setProperty('--radius', customization.border_radius);
  }
  
  // Update font sizes
  if (customization.base_font_size) {
    root.style.setProperty('--base-font-size', `${customization.base_font_size}px`);
  }
  
  if (customization.heading_size_h1) {
    root.style.setProperty('--heading-size-h1', `${customization.heading_size_h1}px`);
  }
  
  if (customization.heading_size_h2) {
    root.style.setProperty('--heading-size-h2', `${customization.heading_size_h2}px`);
  }
  
  if (customization.heading_size_h3) {
    root.style.setProperty('--heading-size-h3', `${customization.heading_size_h3}px`);
  }
  
  // Update sidebar customization
  if (customization.sidebar_text_color) {
    const sidebarTextHSL = hexToHSL(customization.sidebar_text_color);
    if (sidebarTextHSL) {
      root.style.setProperty('--sidebar-foreground', sidebarTextHSL);
    }
  }
  
  if (customization.sidebar_label_size) {
    root.style.setProperty('--sidebar-label-size', `${customization.sidebar_label_size}px`);
  }
  
  // Update admin sidebar background if present
  if (customization.admin_sidebar_bg) {
    const sidebarBgHSL = hexToHSL(customization.admin_sidebar_bg);
    if (sidebarBgHSL) {
      root.style.setProperty('--sidebar', sidebarBgHSL);
    }
  }
  
  if (customization.admin_sidebar_active_bg) {
    const sidebarActiveHSL = hexToHSL(customization.admin_sidebar_active_bg);
    if (sidebarActiveHSL) {
      root.style.setProperty('--sidebar-accent', sidebarActiveHSL);
    }
  }
  
  // Update favicon if changed
  if (customization.favicon_url) {
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (favicon) {
      favicon.href = customization.favicon_url;
    }
    const apple = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (apple) {
      apple.href = customization.favicon_url;
    }
  }
  
  // Update page title if changed
  if (customization.site_name) {
    document.title = customization.site_name;
  }

  // NOTE: Home menu, header, and sidebar colors are handled separately by saveAdvancedColorsToCache
  // which properly checks if colors are explicitly customized before applying them.
  // This ensures that CSS dark mode defaults work correctly for non-customized colors.
};

// Apply fonts independently from colors
const applyFonts = (customization: ThemeCustomization) => {
  const root = document.documentElement;
  
  logger.log('🔤 [applyFonts] Aplicando fuentes desde base de datos');
  
  // Update fonts
  if (customization.font_heading) {
    const headingFont = `"${customization.font_heading}", serif`;
    root.style.setProperty('--font-heading', headingFont);
    logger.log('✅ [applyFonts] font_heading aplicado:', customization.font_heading);
  }
  
  if (customization.font_body) {
    const bodyFont = `"${customization.font_body}", sans-serif`;
    root.style.setProperty('--font-body', bodyFont);
    logger.log('✅ [applyFonts] font_body aplicado:', customization.font_body);
  }
  
  // Update font sizes
  if (customization.base_font_size) {
    root.style.setProperty('--base-font-size', `${customization.base_font_size}px`);
  }
  
  if (customization.heading_size_h1) {
    root.style.setProperty('--heading-size-h1', `${customization.heading_size_h1}px`);
  }
  
  if (customization.heading_size_h2) {
    root.style.setProperty('--heading-size-h2', `${customization.heading_size_h2}px`);
  }
  
  if (customization.heading_size_h3) {
    root.style.setProperty('--heading-size-h3', `${customization.heading_size_h3}px`);
  }
  
  if (customization.sidebar_label_size) {
    root.style.setProperty('--sidebar-label-size', `${customization.sidebar_label_size}px`);
  }
  
  // Save fonts to localStorage for quick loading
  saveFontsToCache(customization);
  logger.log('💾 [applyFonts] Fuentes guardadas en localStorage');
};
