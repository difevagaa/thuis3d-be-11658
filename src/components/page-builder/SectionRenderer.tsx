import { useState, useEffect, CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import FeaturedProductsCarousel from "@/components/FeaturedProductsCarousel";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { AdvancedCarousel } from "./AdvancedCarousel";
import { useTranslation } from "react-i18next";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";
import { normalizeCarouselSettings, toAdvancedCarouselSettings } from "@/lib/carouselSettingsNormalizer";
// Utility function to generate comprehensive inline styles from section styles
const generateSectionStyles = (styles: Record<string, any> | undefined): CSSProperties => {
  if (!styles) return {};
  
  const cssStyles: CSSProperties = {};
  
  // Colors
  if (styles.backgroundColor) cssStyles.backgroundColor = styles.backgroundColor;
  if (styles.textColor) cssStyles.color = styles.textColor;
  if (styles.borderColor) cssStyles.borderColor = styles.borderColor;
  
  // Dimensions
  if (styles.width) {
    cssStyles.width = styles.width === 'custom' ? styles.customWidth : styles.width;
  }
  if (styles.height) {
    cssStyles.height = styles.height === 'custom' ? styles.customHeight : styles.height;
  }
  if (styles.minWidth) cssStyles.minWidth = styles.minWidth;
  if (styles.maxWidth) cssStyles.maxWidth = styles.maxWidth;
  if (styles.minHeight) cssStyles.minHeight = styles.minHeight;
  if (styles.maxHeight) cssStyles.maxHeight = styles.maxHeight;
  if (styles.aspectRatio) cssStyles.aspectRatio = styles.aspectRatio;
  
  // Spacing
  if (styles.padding !== undefined) cssStyles.padding = `${styles.padding}px`;
  if (styles.paddingTop) cssStyles.paddingTop = `${styles.paddingTop}px`;
  if (styles.paddingRight) cssStyles.paddingRight = `${styles.paddingRight}px`;
  if (styles.paddingBottom) cssStyles.paddingBottom = `${styles.paddingBottom}px`;
  if (styles.paddingLeft) cssStyles.paddingLeft = `${styles.paddingLeft}px`;
  
  if (styles.marginTop) cssStyles.marginTop = `${styles.marginTop}px`;
  if (styles.marginRight) cssStyles.marginRight = `${styles.marginRight}px`;
  if (styles.marginBottom) cssStyles.marginBottom = `${styles.marginBottom}px`;
  if (styles.marginLeft) cssStyles.marginLeft = `${styles.marginLeft}px`;
  
  if (styles.gap) cssStyles.gap = `${styles.gap}px`;
  
  // Typography
  if (styles.fontSize) cssStyles.fontSize = `${styles.fontSize}px`;
  if (styles.fontWeight) cssStyles.fontWeight = styles.fontWeight;
  if (styles.lineHeight) cssStyles.lineHeight = styles.lineHeight;
  if (styles.letterSpacing) cssStyles.letterSpacing = `${styles.letterSpacing}px`;
  if (styles.textTransform) cssStyles.textTransform = styles.textTransform as any;
  if (styles.textDecoration) cssStyles.textDecoration = styles.textDecoration;
  if (styles.fontFamily) cssStyles.fontFamily = styles.fontFamily;
  if (styles.textAlign) cssStyles.textAlign = styles.textAlign as any;
  
  // Borders
  if (styles.borderWidth) cssStyles.borderWidth = `${styles.borderWidth}px`;
  if (styles.borderStyle) cssStyles.borderStyle = styles.borderStyle;
  if (styles.borderRadius) {
    const radiusMap: Record<string, string> = {
      'none': '0',
      'sm': '0.125rem',
      'md': '0.375rem',
      'lg': '0.5rem',
      'full': '9999px'
    };
    cssStyles.borderRadius = radiusMap[styles.borderRadius] || styles.borderRadius;
  }
  
  // Box Shadow
  if (styles.boxShadow && styles.boxShadow !== 'none') {
    const shadowMap: Record<string, string> = {
      'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
    };
    cssStyles.boxShadow = shadowMap[styles.boxShadow] || styles.boxShadow;
  }
  
  // Text Shadow
  if (styles.textShadow && styles.textShadow !== 'none') {
    const shadowMap: Record<string, string> = {
      'sm': '0 1px 2px rgba(0,0,0,0.3)',
      'md': '0 2px 4px rgba(0,0,0,0.3)',
      'lg': '0 4px 8px rgba(0,0,0,0.3)'
    };
    cssStyles.textShadow = shadowMap[styles.textShadow] || styles.textShadow;
  }
  
  // Layout
  if (styles.display) cssStyles.display = styles.display;
  if (styles.position) cssStyles.position = styles.position as any;
  if (styles.zIndex) cssStyles.zIndex = styles.zIndex;
  if (styles.overflow) cssStyles.overflow = styles.overflow as any;
  
  // Flexbox
  if (styles.justifyContent) cssStyles.justifyContent = styles.justifyContent as any;
  if (styles.alignItems) cssStyles.alignItems = styles.alignItems as any;
  if (styles.flexDirection) cssStyles.flexDirection = styles.flexDirection as any;
  
  // Visual Effects
  if (styles.opacity !== undefined) cssStyles.opacity = styles.opacity;
  
  // Filters
  const filters: string[] = [];
  if (styles.filterBlur !== undefined && typeof styles.filterBlur === 'number' && styles.filterBlur >= 0) {
    filters.push(`blur(${Math.min(styles.filterBlur, 20)}px)`);
  }
  if (styles.filterBrightness !== undefined && styles.filterBrightness !== 1 && typeof styles.filterBrightness === 'number') {
    filters.push(`brightness(${Math.max(0, Math.min(styles.filterBrightness, 2))})`);
  }
  if (styles.filterContrast !== undefined && styles.filterContrast !== 1 && typeof styles.filterContrast === 'number') {
    filters.push(`contrast(${Math.max(0, Math.min(styles.filterContrast, 2))})`);
  }
  if (styles.filterGrayscale !== undefined && typeof styles.filterGrayscale === 'number') {
    filters.push(`grayscale(${Math.max(0, Math.min(styles.filterGrayscale, 1))})`);
  }
  if (filters.length > 0) cssStyles.filter = filters.join(' ');
  
  // Background
  if (styles.backgroundPosition) cssStyles.backgroundPosition = styles.backgroundPosition;
  if (styles.backgroundSize) cssStyles.backgroundSize = styles.backgroundSize;
  if (styles.backgroundRepeat) cssStyles.backgroundRepeat = styles.backgroundRepeat;
  
  // Gradient
  if (styles.backgroundGradient && styles.backgroundGradient !== 'none') {
    const from = styles.gradientFrom || '#ffffff';
    const to = styles.gradientTo || '#000000';
    const gradientMap: Record<string, string> = {
      'linear-to-r': `linear-gradient(to right, ${from}, ${to})`,
      'linear-to-b': `linear-gradient(to bottom, ${from}, ${to})`,
      'linear-to-br': `linear-gradient(to bottom right, ${from}, ${to})`,
      'radial': `radial-gradient(circle, ${from}, ${to})`
    };
    cssStyles.backgroundImage = gradientMap[styles.backgroundGradient];
  }
  
  // Cursor
  if (styles.cursor) cssStyles.cursor = styles.cursor;
  
  // Transition
  if (styles.transitionDuration) {
    cssStyles.transition = `all ${styles.transitionDuration}ms ease-in-out`;
  }
  
  return cssStyles;
};

// Utility function to safely navigate to URL
const safeNavigate = (url: string) => {
  if (!url) return;
  
  // Remove any potential javascript: or data: URLs
  const sanitizedUrl = url.trim();
  
  // Only allow http, https, and relative URLs starting with /
  if (sanitizedUrl.startsWith('/')) {
    // Validate it's a clean relative URL
    if (/^\/[a-zA-Z0-9\-_/]*(\?[a-zA-Z0-9=&\-_]*)?$/.test(sanitizedUrl)) {
      window.location.href = sanitizedUrl;
    }
    return;
  }
  
  try {
    const parsed = new URL(sanitizedUrl, window.location.origin);
    // Only allow http and https protocols
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      window.location.href = sanitizedUrl;
    }
  } catch {
    // Invalid URL, do nothing
    logger.error('Invalid URL attempted:', sanitizedUrl);
  }
};

// Utility function to validate image URL
const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  
  try {
    const parsed = new URL(url, window.location.origin);
    // Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    // Check for common image extensions
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const hasValidExt = validExtensions.some(ext => 
      parsed.pathname.toLowerCase().endsWith(ext)
    );
    return hasValidExt || parsed.pathname.includes('/'); // Allow paths without extensions
  } catch {
    return false;
  }
};

interface SectionData {
  id: string;
  section_type: string;
  section_name: string;
  is_visible: boolean;
  settings: any;
  content: any;
  styles: any;
}

interface SectionRendererProps {
  sections: SectionData[];
  className?: string;
}

// Get responsive classes from styles
const getResponsiveClasses = (styles: Record<string, any> | undefined): string => {
  if (!styles) return '';
  
  const classes: string[] = [];
  
  // Mobile hiding
  if (styles.mobileHidden) classes.push('hidden sm:block');
  if (styles.tabletHidden) classes.push('sm:hidden lg:block');
  if (styles.desktopHidden) classes.push('lg:hidden');
  
  // Container width
  if (styles.containerWidth) {
    const widthMap: Record<string, string> = {
      'xs': 'max-w-sm',
      'sm': 'max-w-md',
      'md': 'max-w-lg',
      'lg': 'max-w-xl',
      'xl': 'max-w-2xl',
      '2xl': 'max-w-4xl',
      'full': 'w-full'
    };
    if (widthMap[styles.containerWidth]) {
      classes.push(widthMap[styles.containerWidth]);
    }
  }
  
  return classes.join(' ');
};

// Get border radius class from style value
const getBorderRadiusClass = (value: string) => {
  const map: Record<string, string> = {
    'none': 'rounded-none',
    'sm': 'rounded-sm',
    'md': 'rounded-md',
    'lg': 'rounded-lg',
    'full': 'rounded-full'
  };
  return map[value] || '';
};

// Get text alignment class
const getTextAlignClass = (value: string) => {
  const map: Record<string, string> = {
    'left': 'text-left',
    'center': 'text-center',
    'right': 'text-right'
  };
  return map[value] || 'text-left';
};

// Get animation class
const getAnimationClass = (animation: string) => {
  if (!animation || animation === 'none') return '';
  
  const map: Record<string, string> = {
    'fade-in': 'animate-fade-in',
    'slide-up': 'animate-slide-up',
    'slide-down': 'animate-slide-down',
    'slide-left': 'animate-slide-left',
    'slide-right': 'animate-slide-right',
    'scale': 'animate-scale',
    'rotate': 'animate-rotate'
  };
  return map[animation] || '';
};

// Hero Section
function HeroSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  const inlineStyles = generateSectionStyles(styles);
  
  // Calculate padding - ensure enough space from navbar
  const paddingTop = styles?.paddingTop || styles?.paddingY || 150;
  const paddingBottom = styles?.paddingBottom || styles?.paddingY || 100;
  
  // Hero-specific settings with defaults - using unified titleSize if available
  const heroOverlayOpacity = (settings?.heroOverlayOpacity ?? settings?.overlayOpacity ?? 50) / 100;
  const heroOverlayColor = settings?.heroOverlayColor || settings?.overlayColor || '#000000';
  const heroTitleSize = settings?.heroTitleSize || settings?.titleSize || 48;
  const heroSubtitleSize = settings?.heroSubtitleSize || settings?.textSize || 20;
  const heroContentPosition = settings?.heroContentPosition || settings?.contentPosition || 'center';
  const heroFullHeight = settings?.heroFullHeight ?? settings?.fullHeight ?? true;
  const heroParallax = settings?.heroParallax || settings?.parallax || false;
  const heroVideoBackground = settings?.heroVideoBackground || settings?.videoBackground || false;
  const heroTitleWeight = settings?.titleWeight || 'bold';
  
  // Position mapping for content alignment
  const positionClasses: Record<string, string> = {
    'top-left': 'items-start justify-start',
    'top-center': 'items-start justify-center',
    'top-right': 'items-start justify-end',
    'center-left': 'items-center justify-start',
    'center': 'items-center justify-center',
    'center-right': 'items-center justify-end',
    'bottom-left': 'items-end justify-start',
    'bottom-center': 'items-end justify-center',
    'bottom-right': 'items-end justify-end',
  };
  
  // Override or merge with specific hero styles
  const heroStyles: CSSProperties = {
    ...inlineStyles,
    backgroundImage: content?.backgroundImage && !heroVideoBackground ? `url(${content.backgroundImage})` : inlineStyles.backgroundImage,
    backgroundSize: inlineStyles.backgroundSize || 'cover',
    backgroundPosition: inlineStyles.backgroundPosition || 'center',
    backgroundAttachment: heroParallax ? 'fixed' : 'scroll',
    minHeight: heroFullHeight ? '100vh' : (settings?.minHeight || settings?.height || '85vh'),
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${paddingBottom}px`,
  };
  
  // Button style variant mapping
  const buttonVariantMap: Record<string, any> = {
    'primary': 'default',
    'secondary': 'secondary',
    'outline': 'outline',
    'ghost': 'ghost',
    'link': 'link'
  };
  
  const buttonSizeMap: Record<string, any> = {
    'sm': 'sm',
    'default': 'default',
    'lg': 'lg',
    'xl': 'lg'
  };
  
  const heroButtonStyle = settings?.heroButtonStyle || 'primary';
  const heroButtonSize = settings?.heroButtonSize || 'lg';
  const heroTextAnimation = settings?.heroTextAnimation || 'fade-in';
  
  return (
    <section
      className={cn(
        "relative overflow-hidden flex",
        positionClasses[heroContentPosition] || positionClasses['center'],
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius),
        getResponsiveClasses(styles),
        getAnimationClass(settings?.animation || heroTextAnimation)
      )}
      style={heroStyles}
    >
      {/* Video Background */}
      {heroVideoBackground && content?.backgroundImage && (
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={content.backgroundImage} type="video/mp4" />
        </video>
      )}
      
      {/* Overlay */}
      {(content?.backgroundImage || heroVideoBackground) && (
        <div 
          className="absolute inset-0" 
          style={{ 
            backgroundColor: `${heroOverlayColor}`,
            opacity: heroOverlayOpacity
          }}
        />
      )}
      
      <div className={cn(
        "relative z-10 max-w-4xl mx-auto px-4",
        getTextAlignClass(styles?.textAlign || 'center')
      )}>
        {content?.title && (
          <h1 
            className="font-bold mb-6 drop-shadow-lg"
            style={{ 
              color: styles?.textColor || '#ffffff',
              fontSize: `${heroTitleSize}px`,
              fontWeight: heroTitleWeight,
              lineHeight: settings?.lineHeight || 1.2
            }}
          >
            {content.title}
          </h1>
        )}
        {content?.subtitle && (
          <p 
            className="mb-10 opacity-95 max-w-3xl mx-auto drop-shadow-md"
            style={{ 
              color: styles?.textColor || '#ffffff',
              fontSize: `${heroSubtitleSize}px`,
              lineHeight: '1.6'
            }}
          >
            {content.subtitle}
          </p>
        )}
        {content?.buttonText && (
          <Button
            size={buttonSizeMap[heroButtonSize]}
            variant={buttonVariantMap[heroButtonStyle]}
            onClick={() => safeNavigate(content?.buttonUrl || '/')}
            className="font-semibold shadow-xl hover:scale-105 transition-transform"
          >
            {content.buttonText}
          </Button>
        )}
      </div>
    </section>
  );
}

// Text Section
function TextSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  const inlineStyles = generateSectionStyles(styles);
  
  return (
    <section
      className={cn(
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius),
        getResponsiveClasses(styles),
        getAnimationClass(settings?.animation)
      )}
      style={inlineStyles}
    >
      <div className={cn(
        "max-w-4xl mx-auto prose prose-lg dark:prose-invert",
        getTextAlignClass(settings?.textAlign || styles?.textAlign || 'left')
      )}>
        {content?.title && (
          <h2 
            className="font-bold mb-4" 
            style={{ 
              color: styles?.textColor,
              fontSize: `${settings?.titleSize || 28}px`,
              fontWeight: settings?.titleWeight || 'bold',
              lineHeight: settings?.lineHeight || 1.3
            }}
          >
            {content.title}
          </h2>
        )}
        {content?.text && (
          <div 
            className="whitespace-pre-wrap"
            style={{ 
              color: styles?.textColor,
              fontSize: `${settings?.textSize || 16}px`
            }}
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(content.text.replace(/\n/g, '<br/>'))
            }}
          />
        )}
      </div>
    </section>
  );
}

// Image Section
function ImageSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  
  return (
    <section
      className={cn(
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius)
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        padding: `${styles?.padding || 40}px ${styles?.padding ? styles.padding / 2 : 20}px`
      }}
    >
      <div className={cn(
        "max-w-5xl mx-auto",
        getTextAlignClass(styles?.textAlign)
      )}>
        {content?.title && (
          <h2 
            className="font-bold mb-6"
            style={{ 
              fontSize: `${settings?.titleSize || 28}px`,
              fontWeight: settings?.titleWeight || 'bold',
              color: styles?.textColor
            }}
          >
            {content.title}
          </h2>
        )}
        {content?.imageUrl && (
          <img
            src={content.imageUrl}
            alt={content?.title || 'Image'}
            className={cn("w-full h-auto", getBorderRadiusClass(styles?.borderRadius))}
          />
        )}
      </div>
    </section>
  );
}

// Banner Section
function BannerSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  
  // Banner-specific settings with defaults
  const bannerHeight = settings?.bannerHeight || 300;
  const bannerWidth = settings?.bannerWidth || 'full';
  const bannerMaxWidth = settings?.bannerMaxWidth || 1200;
  const bannerContentAlign = settings?.bannerContentAlign || 'center';
  const bannerOverlayColor = settings?.bannerOverlayColor || '#000000';
  const bannerOverlayOpacity = (settings?.bannerOverlayOpacity ?? 40) / 100;
  const bannerTitleSize = settings?.bannerTitleSize || 32;
  const bannerTextSize = settings?.bannerTextSize || 16;
  const bannerButtonStyle = settings?.bannerButtonStyle || 'primary';
  const bannerSticky = settings?.bannerSticky || false;
  const bannerDismissible = settings?.bannerDismissible || false;
  
  const paddingY = styles?.paddingY || styles?.padding || 80;
  const paddingX = styles?.paddingX || (styles?.padding ? styles.padding / 2 : 40);
  const marginTop = styles?.marginTop || 60;
  const marginBottom = styles?.marginBottom || 40;
  
  // Content alignment classes
  const contentAlignClasses: Record<string, string> = {
    'left': 'items-center justify-start text-left',
    'center': 'items-center justify-center text-center',
    'right': 'items-center justify-end text-right'
  };
  
  // Button variant mapping
  const buttonVariantMap: Record<string, any> = {
    'primary': 'default',
    'secondary': 'secondary',
    'outline': 'outline',
    'ghost': 'ghost'
  };
  
  // Width classes and styles
  const getWidthStyle = () => {
    switch (bannerWidth) {
      case 'full': return { width: '100%', maxWidth: '100%' };
      case 'wide': return { width: '90%', maxWidth: '90%' };
      case 'container': return { width: '80%', maxWidth: '1280px' };
      case 'narrow': return { width: '60%', maxWidth: '960px' };
      case 'custom': return { width: '100%', maxWidth: `${bannerMaxWidth}px` };
      default: return { width: '100%', maxWidth: '100%' };
    }
  };
  
  const widthStyle = getWidthStyle();
  
  return (
    <section
      className={cn(
        "relative overflow-hidden flex mx-auto",
        contentAlignClasses[bannerContentAlign] || contentAlignClasses['center'],
        getBorderRadiusClass(styles?.borderRadius),
        getResponsiveClasses(styles),
        getAnimationClass(settings?.animation),
        bannerSticky && "sticky top-0 z-40"
      )}
      style={{
        backgroundColor: styles?.backgroundColor || 'hsl(var(--primary))',
        color: styles?.textColor || '#ffffff',
        padding: `${paddingY}px ${paddingX}px`,
        marginTop: `${marginTop}px`,
        marginBottom: `${marginBottom}px`,
        backgroundImage: content?.backgroundImage ? `url(${content.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: `${bannerHeight}px`,
        ...widthStyle
      }}
    >
      {/* Overlay */}
      {content?.backgroundImage && (
        <div 
          className="absolute inset-0 z-0" 
          style={{ 
            backgroundColor: bannerOverlayColor,
            opacity: bannerOverlayOpacity
          }}
        />
      )}
      
      <div className="max-w-3xl mx-auto relative z-10">
        {content?.title && (
          <h2 
            className="font-bold mb-4 drop-shadow-lg" 
            style={{ 
              color: styles?.textColor || '#ffffff',
              fontSize: `${bannerTitleSize}px`
            }}
          >
            {content.title}
          </h2>
        )}
        {content?.description && (
          <p 
            className="mb-6 opacity-95 drop-shadow-md" 
            style={{ 
              color: styles?.textColor || '#ffffff',
              fontSize: `${bannerTextSize}px`
            }}
          >
            {content.description}
          </p>
        )}
        {content?.buttonText && (
          <Button
            variant={buttonVariantMap[bannerButtonStyle]}
            size="lg"
            onClick={() => safeNavigate(content?.buttonUrl || '/')}
            className="font-semibold shadow-lg hover:scale-105 transition-transform"
          >
            {content.buttonText}
          </Button>
        )}
      </div>
      
      {/* Dismissible close button */}
      {bannerDismissible && (
        <button
          className="absolute top-4 right-4 z-20 text-white/80 hover:text-white"
          onClick={(e) => {
            const section = e.currentTarget.closest('section');
            if (section) section.style.display = 'none';
          }}
        >
          ✕
        </button>
      )}
    </section>
  );
}

// CTA Section
function CTASection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  
  const paddingY = styles?.paddingY || styles?.padding || 100;
  const paddingX = styles?.paddingX || (styles?.padding ? styles.padding / 2 : 40);
  
  return (
    <section
      className={cn(
        "relative",
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius)
      )}
      style={{
        backgroundColor: styles?.backgroundColor || 'hsl(var(--primary))',
        color: styles?.textColor || '#ffffff',
        padding: `${paddingY}px ${paddingX}px`,
        marginTop: `${styles?.marginTop || 60}px`,
        marginBottom: `${styles?.marginBottom || 60}px`
      }}
    >
      <div className={cn(
        "max-w-3xl mx-auto",
        getTextAlignClass(settings?.textAlign || styles?.textAlign || 'center')
      )}>
        {content?.title && (
          <h2 
            className="font-bold mb-6 drop-shadow-lg" 
            style={{ 
              color: styles?.textColor || '#ffffff',
              fontSize: `${settings?.titleSize || 32}px`,
              fontWeight: settings?.titleWeight || 'bold'
            }}
          >
            {content.title}
          </h2>
        )}
        {content?.description && (
          <p 
            className="mb-10 opacity-95 max-w-2xl mx-auto" 
            style={{ 
              color: styles?.textColor || '#ffffff',
              fontSize: `${settings?.textSize || 20}px`
            }}
          >
            {content.description}
          </p>
        )}
        {content?.buttonText && (
          <Button
            size="lg"
            variant="secondary"
            onClick={() => safeNavigate(content?.buttonUrl || '/')}
            className="text-lg px-10 py-7 font-semibold shadow-lg hover:scale-105 transition-transform"
          >
            {content.buttonText}
          </Button>
        )}
      </div>
    </section>
  );
}

// Features Section
function FeaturesSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  
  // Feature-specific settings with defaults
  const featuresColumns = settings?.featuresColumns || settings?.columns || 3;
  const featuresGap = settings?.featuresGap || 24;
  const featuresIconSize = settings?.featuresIconSize || 48;
  const featuresIconColor = settings?.featuresIconColor || '#3b82f6';
  const featuresCardStyle = settings?.featuresCardStyle || 'default';
  const featuresAlignment = settings?.featuresAlignment || 'center';
  const featuresTitleSize = settings?.featuresTitleSize || 20;
  const featuresDescSize = settings?.featuresDescSize || 14;
  const featuresHoverEffect = settings?.featuresHoverEffect !== false;
  const featuresHoverType = settings?.featuresHoverType || 'lift';
  const featuresScrollAnimation = settings?.featuresScrollAnimation !== false;
  const featuresIconPosition = settings?.featuresIconPosition || 'top';
  
  const paddingY = styles?.paddingY || styles?.padding || 80;
  const paddingX = styles?.paddingX || (styles?.padding ? styles.padding / 2 : 40);
  
  // Card style classes
  const cardStyleClasses: Record<string, string> = {
    'default': 'bg-card/50',
    'bordered': 'border-2 border-border',
    'shadowed': 'shadow-lg',
    'filled': 'bg-primary/5',
    'minimal': 'bg-transparent'
  };
  
  // Hover effect classes
  const hoverEffectClasses: Record<string, string> = {
    'none': '',
    'lift': 'hover:-translate-y-2',
    'scale': 'hover:scale-105',
    'glow': 'hover:shadow-xl hover:shadow-primary/20',
    'tilt': 'hover:rotate-1'
  };
  
  // Alignment classes
  const alignmentClasses: Record<string, string> = {
    'left': 'text-left items-start',
    'center': 'text-center items-center',
    'right': 'text-right items-end'
  };
  
  // Icon position classes
  const iconPositionClasses: Record<string, string> = {
    'top': 'flex-col',
    'left': 'flex-row',
    'right': 'flex-row-reverse'
  };
  
  // Column classes - using static mapping for Tailwind
  const gridColsClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-6'
  };
  
  return (
    <section
      className={cn(
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius),
        getResponsiveClasses(styles),
        featuresScrollAnimation && getAnimationClass(settings?.animation || 'fade-in')
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        color: styles?.textColor,
        padding: `${paddingY}px ${paddingX}px`,
        marginTop: `${styles?.marginTop || 0}px`,
        marginBottom: `${styles?.marginBottom || 0}px`
      }}
    >
      <div className="max-w-6xl mx-auto">
        {content?.title && (
          <h2 
            className={cn("font-bold mb-12", getTextAlignClass(settings?.textAlign || 'center'))}
            style={{ 
              fontSize: `${settings?.titleSize || 32}px`,
              fontWeight: settings?.titleWeight || 'bold',
              color: styles?.textColor
            }}
          >
            {content.title}
          </h2>
        )}
        <div 
          className={cn(
            "grid",
            gridColsClasses[featuresColumns] || gridColsClasses[3]
          )}
          style={{ gap: `${featuresGap}px` }}
        >
          {content?.features?.map((feature: any, index: number) => (
            <div 
              key={index} 
              className={cn(
                "p-6 rounded-lg transition-all duration-300 flex",
                iconPositionClasses[featuresIconPosition],
                alignmentClasses[featuresAlignment],
                cardStyleClasses[featuresCardStyle],
                featuresHoverEffect && hoverEffectClasses[featuresHoverType]
              )}
            >
              {feature.icon && (
                <div 
                  className={cn(
                    "flex items-center justify-center rounded-xl",
                    featuresIconPosition === 'top' ? 'mb-4' : 'mr-4'
                  )}
                  style={{ 
                    width: `${featuresIconSize}px`,
                    height: `${featuresIconSize}px`,
                    fontSize: `${featuresIconSize * 0.6}px`,
                    color: featuresIconColor,
                    backgroundColor: `${featuresIconColor}20`
                  }}
                >
                  <span>{feature.icon}</span>
                </div>
              )}
              <div className="flex-1">
                {feature.title && (
                  <h3 
                    className="font-semibold mb-3"
                    style={{ fontSize: `${featuresTitleSize}px` }}
                  >
                    {feature.title}
                  </h3>
                )}
                {feature.description && (
                  <p 
                    className="text-muted-foreground leading-relaxed"
                    style={{ fontSize: `${featuresDescSize}px` }}
                  >
                    {feature.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Gallery Section
function GallerySection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  
  // Gallery-specific settings with defaults
  const galleryLayout = settings?.galleryLayout || 'grid';
  const galleryColumns = settings?.galleryColumns || 4;
  const galleryColumnsTablet = settings?.galleryColumnsTablet || 3;
  const galleryColumnsMobile = settings?.galleryColumnsMobile || 2;
  const galleryGap = settings?.galleryGap || 16;
  const galleryAspectRatio = settings?.galleryAspectRatio || 'auto';
  const galleryLightbox = settings?.galleryLightbox !== false;
  const galleryLazyLoad = settings?.galleryLazyLoad !== false;
  const galleryShowCaptions = settings?.galleryShowCaptions || false;
  const galleryHoverEffect = settings?.galleryHoverEffect || 'zoom';
  const galleryFilter = settings?.galleryFilter || false;
  const galleryLoadMore = settings?.galleryLoadMore || false;
  
  // Grid column classes - static mapping for Tailwind to ensure classes are included in build
  const gridColsMap: Record<string, string> = {
    '1-1-1': 'grid-cols-1',
    '2-2-1': 'grid-cols-1 md:grid-cols-2',
    '2-2-2': 'grid-cols-2 md:grid-cols-2',
    '3-2-1': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    '3-2-2': 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3',
    '3-3-1': 'grid-cols-1 md:grid-cols-3 lg:grid-cols-3',
    '3-3-2': 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3',
    '3-3-3': 'grid-cols-3 md:grid-cols-3 lg:grid-cols-3',
    '4-3-2': 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    '4-3-1': 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4',
    '4-4-2': 'grid-cols-2 md:grid-cols-4 lg:grid-cols-4',
    '5-3-2': 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    '6-3-2': 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    '6-4-2': 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6',
    '8-4-2': 'grid-cols-2 md:grid-cols-4 lg:grid-cols-8'
  };
  const gridColsKey = `${galleryColumns}-${galleryColumnsTablet}-${galleryColumnsMobile}`;
  const gridColsClasses = gridColsMap[gridColsKey] || gridColsMap['4-3-2'];
  
  // Hover effect classes
  const hoverEffectClasses: Record<string, string> = {
    'none': '',
    'zoom': 'hover:scale-110',
    'overlay': 'hover:opacity-80',
    'lift': 'hover:-translate-y-2',
    'blur': 'hover:blur-sm'
  };
  
  // Aspect ratio classes
  const aspectRatioClasses: Record<string, string> = {
    'auto': '',
    '1/1': 'aspect-square',
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
    '3/2': 'aspect-[3/2]'
  };
  
  return (
    <section
      className={cn(
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius),
        getResponsiveClasses(styles),
        getAnimationClass(settings?.animation)
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        padding: `${styles?.padding || 40}px ${styles?.padding ? styles.padding / 2 : 20}px`
      }}
    >
      <div className="max-w-7xl mx-auto">
        {content?.title && (
          <h2 
            className={cn("font-bold mb-8", getTextAlignClass(settings?.textAlign || styles?.textAlign || 'center'))}
            style={{ 
              fontSize: `${settings?.titleSize || 28}px`,
              fontWeight: settings?.titleWeight || 'bold',
              color: styles?.textColor
            }}
          >
            {content.title}
          </h2>
        )}
        
        {/* Filter buttons (if enabled) */}
        {galleryFilter && content?.categories && (
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground">
              Todos
            </button>
            {content.categories.map((cat: string, idx: number) => (
              <button 
                key={idx}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                {cat}
              </button>
            ))}
          </div>
        )}
        
        <div 
          className={cn(
            "grid",
            gridColsClasses
          )}
          style={{ gap: `${galleryGap}px` }}
        >
          {content?.images?.map((image: any, index: number) => {
            const imageUrl = typeof image === 'string' ? image : image.url;
            const imageCaption = typeof image === 'object' ? image.caption : '';
            const imageAlt = typeof image === 'object' ? image.alt : `Gallery ${index + 1}`;
            
            return (
              <div 
                key={index} 
                className={cn(
                  "overflow-hidden rounded-lg relative group",
                  aspectRatioClasses[galleryAspectRatio]
                )}
              >
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  loading={galleryLazyLoad ? 'lazy' : 'eager'}
                  className={cn(
                    "w-full h-full object-cover transition-all duration-300",
                    hoverEffectClasses[galleryHoverEffect],
                    galleryLightbox && "cursor-pointer"
                  )}
                  onClick={() => {
                    if (galleryLightbox) {
                      // Simple lightbox implementation (could be enhanced)
                      window.open(imageUrl, '_blank');
                    }
                  }}
                />
                
                {/* Caption overlay */}
                {galleryShowCaptions && imageCaption && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-white text-sm">{imageCaption}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Load more button (if enabled) */}
        {galleryLoadMore && (
          <div className="text-center mt-8">
            <Button variant="outline" size="lg">
              Cargar más imágenes
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

// Divider Section
function DividerSection({ section }: { section: SectionData }) {
  const { styles, settings } = section;
  
  return (
    <div
      className={cn(
        settings?.fullWidth ? "w-full" : "container mx-auto"
      )}
      style={{
        padding: `${styles?.padding || 20}px ${styles?.padding ? styles.padding / 2 : 10}px`
      }}
    >
      <hr 
        className="border-t"
        style={{
          borderColor: styles?.backgroundColor || '#e5e7eb',
          borderStyle: settings?.style || 'solid'
        }}
      />
    </div>
  );
}

// Spacer Section
function SpacerSection({ section }: { section: SectionData }) {
  const { settings } = section;
  const height = settings?.height || 60;
  
  return <div style={{ height: `${height}px` }} />;
}

// Custom HTML Section
function CustomSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  
  return (
    <section
      className={cn(
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius)
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        color: styles?.textColor,
        padding: `${styles?.padding || 40}px ${styles?.padding ? styles.padding / 2 : 20}px`
      }}
    >
      <div 
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content?.html || '') }}
      />
    </section>
  );
}

// Video Section
function VideoSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  
  return (
    <section
      className={cn(
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius)
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        padding: `${styles?.padding || 40}px ${styles?.padding ? styles.padding / 2 : 20}px`
      }}
    >
      <div className="max-w-5xl mx-auto">
        {content?.title && (
          <h2 
            className={cn("font-bold mb-6", getTextAlignClass(settings?.textAlign || styles?.textAlign || 'center'))}
            style={{ 
              fontSize: `${settings?.titleSize || 28}px`,
              fontWeight: settings?.titleWeight || 'bold',
              color: styles?.textColor
            }}
          >
            {content.title}
          </h2>
        )}
        {content?.videoUrl && (
          <div className={cn("relative w-full", getBorderRadiusClass(styles?.borderRadius))} style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={content.videoUrl}
              className="absolute top-0 left-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>
    </section>
  );
}

// Amazon-style Compact Product Card for Carousel - configurable sizing
function ProductCardCompact({
  product,
  imageHeight = 180,
  imageFit = 'cover',
  imageAspectRatio = '1/1',
  titleSize = 13,
  priceSize = 18,
}: {
  product: any;
  imageHeight?: number;
  imageFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  imageAspectRatio?: string;
  titleSize?: number;
  priceSize?: number;
}) {
  const firstImage = product.images?.[0]?.image_url;
  const { content } = useTranslatedContent('products', product.id, ['name', 'description'], product);
  const translatedName = content.name || product.name;

  const aspectClass =
    imageAspectRatio === '4/5'
      ? 'aspect-[4/5]'
      : imageAspectRatio === '16/9'
        ? 'aspect-video'
        : imageAspectRatio === '3/4'
          ? 'aspect-[3/4]'
          : 'aspect-square';

  const imageContainerStyle: React.CSSProperties | undefined =
    typeof imageHeight === 'number' && Number.isFinite(imageHeight)
      ? { height: `${Math.max(80, imageHeight)}px` }
      : undefined;

  return (
    <a
      href={`/producto/${product.id}`}
      className="block h-full bg-card border border-border/50 rounded-lg overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all duration-200 group"
    >
      {/* Image Container */}
      <div
        className={cn(
          'bg-muted/30 overflow-hidden relative',
          imageContainerStyle ? '' : aspectClass
        )}
        style={imageContainerStyle}
      >
        {firstImage ? (
          <img
            src={firstImage}
            alt={translatedName}
            className="w-full h-full group-hover:scale-105 transition-transform duration-300"
            style={{ objectFit: imageFit as any }}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Free Shipping Badge */}
        {product.shipping_type === 'free' && (
          <div className="absolute top-1.5 left-1.5 bg-green-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
            Envío gratis
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 sm:p-3">
        <h3
          className="font-medium line-clamp-2 leading-snug text-foreground group-hover:text-primary transition-colors hyphens-none break-words"
          style={{ fontSize: `${Math.max(10, titleSize)}px` }}
        >
          {translatedName}
        </h3>

        {/* Price */}
        {product.price !== null && product.price !== undefined && product.price !== '' && (
          <div className="flex items-baseline gap-0.5 mt-1">
            <span className="text-xs text-muted-foreground">€</span>
            <span className="text-primary font-bold leading-none" style={{ fontSize: `${Math.max(12, priceSize)}px` }}>
              {Number(product.price).toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </a>
  );
}

// View All Button Component for Carousels - Inline version for header
function ViewAllButtonInline({ settings }: { settings: any }) {
  const { t } = useTranslation(['products']);
  const variant = settings?.viewAllButtonVariant || 'default';
  const text = settings?.viewAllButtonText || t('products:viewAllProducts');
  const url = settings?.viewAllButtonUrl || '/productos';
  const bgColor = settings?.viewAllButtonBgColor;
  const textColor = settings?.viewAllButtonTextColor;
  
  const buttonStyle: React.CSSProperties = {};
  if (bgColor && variant === 'default') {
    buttonStyle.backgroundColor = bgColor;
  }
  if (textColor) {
    buttonStyle.color = textColor;
  }

  return (
    <Button
      variant={variant as any}
      onClick={() => safeNavigate(url)}
      style={buttonStyle}
      className="font-semibold shrink-0"
    >
      {text}
    </Button>
  );
}

// View All Button Component for Carousels - Bottom position
function ViewAllButton({ settings }: { settings: any }) {
  const { t } = useTranslation(['products']);
  const position = settings?.viewAllButtonPosition || 'top-right';
  const variant = settings?.viewAllButtonVariant || 'default';
  const text = settings?.viewAllButtonText || t('products:viewAllProducts');
  const url = settings?.viewAllButtonUrl || '/productos';
  const bgColor = settings?.viewAllButtonBgColor;
  const textColor = settings?.viewAllButtonTextColor;
  
  const justifyClasses: Record<string, string> = {
    'bottom-left': 'justify-start',
    'bottom-center': 'justify-center',
    'bottom-right': 'justify-end',
  };
  
  const buttonStyle: React.CSSProperties = {};
  if (bgColor && variant === 'default') {
    buttonStyle.backgroundColor = bgColor;
  }
  if (textColor) {
    buttonStyle.color = textColor;
  }

  return (
    <div className={cn("flex w-full mt-4", justifyClasses[position] || justifyClasses['bottom-center'])}>
      <Button
        variant={variant as any}
        onClick={() => safeNavigate(url)}
        style={buttonStyle}
        className="font-medium text-sm"
      >
        {text}
      </Button>
    </div>
  );
}

// Products Carousel Section
function ProductsCarouselSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadProducts();
  }, [content, settings]);
  
  const loadProducts = async () => {
    try {
      setLoading(true);
      
      // Get user roles for filtering
      let userRoles: string[] = [];
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);
          userRoles = (rolesData || [])
            .map(r => String(r.role || '').trim().toLowerCase())
            .filter(role => role.length > 0);
        }
      } catch (authError) {
        // User not authenticated, continue with empty roles
        logger.info('User not authenticated, showing public products only');
      }
      
      // Build query based on settings - validate sortBy column
      const validSortColumns = ['created_at', 'name', 'price', 'updated_at'];
      const rawSortBy = settings?.sortBy || 'created_at';
      const sortBy = validSortColumns.includes(rawSortBy) ? rawSortBy : 'created_at';
      const sortOrder = settings?.sortOrder || 'desc';

      // Respect product limit settings from all editor variants
      const limit =
        (typeof settings?.productLimit === 'number' ? settings.productLimit : undefined) ??
        (typeof content?.limit === 'number' ? content.limit : undefined) ??
        (typeof settings?.limit === 'number' ? settings.limit : undefined) ??
        10;
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          images:product_images(image_url, display_order),
          product_roles(role)
        `)
        .is('deleted_at', null)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .limit(limit);
      
      if (error) throw error;
      
      // Filter by roles - products without roles are visible to everyone
      const visibleProducts = (data || []).filter((product: any) => {
        const productRolesList = product.product_roles || [];
        const productRolesNormalized = productRolesList
          .map((pr: any) => String(pr?.role || '').trim().toLowerCase())
          .filter((role: string) => role.length > 0);
        
        // Products without roles are visible to everyone
        if (productRolesNormalized.length === 0) return true;
        
        // Products with roles require user to have matching role
        if (userRoles.length === 0) return false;
        
        return productRolesNormalized.some((productRole: string) => 
          userRoles.includes(productRole)
        );
      });
      
      // Sort images
      const productsWithSortedImages = visibleProducts.map(product => ({
        ...product,
        images: product.images?.sort((a: any, b: any) => 
          a.display_order - b.display_order
        ) || []
      }));
      
      logger.info(`ProductsCarouselSection loaded ${productsWithSortedImages.length} products`);
      setProducts(productsWithSortedImages);
    } catch (error) {
      logger.error('Error loading products for carousel:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <section
        className={cn(
          settings?.fullWidth ? "w-full" : "container mx-auto",
        )}
        style={{
          backgroundColor: styles?.backgroundColor,
          padding: `${styles?.paddingY || styles?.padding || 60}px ${styles?.paddingX || (styles?.padding ? styles.padding / 2 : 30)}px`,
          marginTop: `${styles?.marginTop || 0}px`,
          marginBottom: `${styles?.marginBottom || 0}px`
        }}
      >
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </section>
    );
  }
  
  if (products.length === 0) {
    // Show section with "no products" message instead of hiding
    return (
      <section
        className={cn(
          settings?.fullWidth ? "w-full" : "container mx-auto",
        )}
        style={{
          backgroundColor: styles?.backgroundColor,
          padding: `${styles?.paddingY || styles?.padding || 60}px ${styles?.paddingX || (styles?.padding ? styles.padding / 2 : 30)}px`,
        }}
      >
        <div className="text-center py-8">
          {content?.title && (
            <h2 className="font-bold mb-4" style={{ fontSize: `${settings?.titleSize || 32}px` }}>
              {content.title}
            </h2>
          )}
          <p className="text-muted-foreground">No hay productos disponibles en este momento.</p>
        </div>
      </section>
    );
  }
  
  // Mobile-optimized padding
  const paddingY = styles?.paddingY ?? styles?.padding ?? 32;
  const paddingX = styles?.paddingX ?? 12;

  // View-all button placement defaults to: after title (and subtitle) but before products
  const viewAllPos = settings?.viewAllButtonPosition || 'top-center';
  const showViewAllTop = !!settings?.showViewAllButton && viewAllPos.startsWith('top');
  const showViewAllBottom = !!settings?.showViewAllButton && viewAllPos.startsWith('bottom');
  
  return (
    <section
      id={settings?.sectionId}
      className={cn(
        "relative",
        settings?.fullWidth ? "w-full" : "container mx-auto",
        settings?.customClass
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
        backgroundSize: styles?.backgroundSize || 'cover',
        backgroundPosition: styles?.backgroundPosition || 'center',
        backgroundAttachment: styles?.backgroundAttachment || 'scroll',
        color: styles?.textColor,
        paddingTop: `${paddingY}px`,
        paddingBottom: `${paddingY}px`,
        paddingLeft: `${paddingX}px`,
        paddingRight: `${paddingX}px`,
        marginTop: `${styles?.marginTop || 0}px`,
        marginBottom: `${styles?.marginBottom || 0}px`,
        minHeight: settings?.minHeight || 'auto',
        borderRadius: styles?.borderRadius || '0',
        borderWidth: `${styles?.borderWidth || 0}px`,
        borderColor: styles?.borderColor,
        borderStyle: styles?.borderStyle || 'solid',
        boxShadow: styles?.boxShadow
      }}
    >
      <div className={cn(
        "max-w-7xl mx-auto",
        getTextAlignClass(settings?.textAlign || styles?.textAlign || 'center')
      )}>
        {/* Header with title, subtitle, and View All button - all in the same flow */}
        {(content?.title || content?.subtitle || showViewAllTop) && (
          <div className="mb-6">
            {/* Title row with View All button for top-right position */}
            {content?.title && (
              <div className={cn(
                "flex flex-wrap items-center gap-3 mb-2",
                viewAllPos === 'top-left' ? 'flex-row-reverse justify-end' : '',
                viewAllPos === 'top-center' ? 'flex-col items-center' : '',
                viewAllPos === 'top-right' ? 'justify-between' : '',
                !showViewAllTop ? 'justify-center' : ''
              )}>
                <h2 
                  className="font-bold" 
                  style={{ 
                    color: styles?.textColor,
                    fontFamily: styles?.fontFamily,
                    fontSize: `${settings?.titleSize || 32}px`,
                    fontWeight: settings?.titleWeight || 'bold',
                    lineHeight: settings?.lineHeight || 1.2
                  }}
                >
                  {content.title}
                </h2>
                {/* View All Button - Inline with title */}
                {showViewAllTop && viewAllPos !== 'top-center' && (
                  <ViewAllButtonInline settings={{ ...settings, viewAllButtonPosition: viewAllPos }} />
                )}
              </div>
            )}
            
            {/* Subtitle */}
            {content?.subtitle && (
              <p 
                className="opacity-90" 
                style={{ 
                  color: styles?.textColor,
                  fontSize: `${settings?.textSize || 18}px`
                }}
              >
                {content.subtitle}
              </p>
            )}
            
            {/* View All Button - Center position (below title/subtitle) */}
            {showViewAllTop && viewAllPos === 'top-center' && (
              <div className="flex justify-center mt-4">
                <ViewAllButtonInline settings={{ ...settings, viewAllButtonPosition: viewAllPos }} />
              </div>
            )}
          </div>
        )}
        
        {/* Carousel with relative positioning to keep buttons above it */}
        <div className="relative">
          <AdvancedCarousel
            items={products}
            settings={{
              ...toAdvancedCarouselSettings(normalizeCarouselSettings(settings || {})),
              displayMode: 'carousel',
              itemsPerViewMobile: settings?.itemsPerViewMobile ?? 2,
              spaceBetween: settings?.spaceBetween ?? 8,
              showNavigation: settings?.showNavigation !== false,
              showPagination: settings?.showPagination ?? false,
            }}
            renderItem={(product: any) => (
              <ProductCardCompact 
                product={product}
                imageHeight={settings?.imageHeight ?? settings?.carouselImageHeight ?? 180}
                imageFit={settings?.imageFit ?? 'cover'}
                imageAspectRatio={styles?.imageAspectRatio ?? settings?.imageAspectRatio ?? '1/1'}
                titleSize={settings?.cardTitleSize ?? settings?.titleSize ?? 13}
                priceSize={settings?.cardPriceSize ?? settings?.priceSize ?? 18}
              />
            )}
          />
        </div>
        
        {/* View All Button - Bottom Position (only when explicitly configured) */}
        {showViewAllBottom && (
          <ViewAllButton settings={{ ...settings, viewAllButtonPosition: viewAllPos }} />
        )}
      </div>
      
      {/* Custom CSS if provided */}
      {settings?.customCSS && (
        <style dangerouslySetInnerHTML={{ __html: settings.customCSS }} />
      )}
    </section>
  );
}

// Simple Product Card for carousel with configurable height
interface ProductCardProps {
  product: any;
  imageHeight?: number;
  titleSize?: number;
  priceSize?: number;
}

function ProductCard({ product, imageHeight = 200, titleSize = 14, priceSize = 18 }: ProductCardProps) {
  const firstImage = product.images?.[0]?.image_url;
  const { content } = useTranslatedContent(
    'products',
    product.id,
    ['name', 'description'],
    product
  );
  const translatedName = content.name || product.name;
  
  return (
    <a 
      href={`/producto/${product.id}`}
      className="block group bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      <div 
        className="relative bg-muted flex items-center justify-center overflow-hidden"
        style={{ height: `${imageHeight}px` }}
      >
        {firstImage ? (
          <img 
            src={firstImage} 
            alt={translatedName}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="text-muted-foreground">Sin imagen</div>
        )}
      </div>
      <div className="p-4">
        <h3 
          className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors"
          style={{ fontSize: `${titleSize}px` }}
        >
          {translatedName}
        </h3>
        {product.price && (
          <p 
            className="font-bold text-primary"
            style={{ fontSize: `${priceSize}px` }}
          >
            €{Number(product.price).toFixed(2)}
          </p>
        )}
      </div>
    </a>
  );
}

// Image Carousel Section
function ImageCarouselSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  const images = content?.images || [];
  
  // Image carousel specific settings with defaults
  const imageCarouselPerView = settings?.imageCarouselPerView || settings?.itemsPerView || 3;
  const imageCarouselHeight = settings?.imageCarouselHeight || 400;
  const imageCarouselFit = settings?.imageCarouselFit || 'cover';
  const imageCarouselShowCaptions = settings?.imageCarouselShowCaptions !== false;
  const imageCarouselAutoplay = settings?.imageCarouselAutoplay || false;
  const imageCarouselAutoplaySpeed = settings?.imageCarouselAutoplaySpeed || 4;
  const imageCarouselKenBurns = settings?.imageCarouselKenBurns || false;
  const imageCarouselThumbnails = settings?.imageCarouselThumbnails || false;
  const imageCarouselLightbox = settings?.imageCarouselLightbox !== false;
  const imageCarouselTransition = settings?.imageCarouselTransition || 'slide';
  
  const paddingY = styles?.paddingY || styles?.padding || 80;
  const paddingX = styles?.paddingX || (styles?.padding ? styles.padding / 2 : 40);
  
  if (images.length === 0) {
    return (
      <section className="container mx-auto py-12">
        <p className="text-center text-muted-foreground">No hay imágenes configuradas</p>
      </section>
    );
  }

  return (
    <section
      id={settings?.sectionId}
      className={cn(
        "relative overflow-hidden",
        settings?.fullWidth ? "w-full" : "container mx-auto",
        settings?.customClass,
        getResponsiveClasses(styles),
        getAnimationClass(settings?.animation)
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        backgroundImage: styles?.backgroundImage ? `url(${styles.backgroundImage})` : undefined,
        backgroundSize: styles?.backgroundSize || 'cover',
        backgroundPosition: styles?.backgroundPosition || 'center',
        backgroundAttachment: styles?.backgroundAttachment || 'scroll',
        color: styles?.textColor,
        padding: `${paddingY}px ${paddingX}px`,
        marginTop: `${styles?.marginTop || 0}px`,
        marginBottom: `${styles?.marginBottom || 0}px`,
        minHeight: settings?.minHeight || 'auto',
        borderRadius: styles?.borderRadius || '0'
      }}
    >
      <div className={cn(
        settings?.containerWidth === 'full' ? 'w-full' :
        settings?.containerWidth === 'narrow' ? 'max-w-4xl mx-auto' :
        settings?.containerWidth === 'wide' ? 'max-w-7xl mx-auto' :
        'max-w-6xl mx-auto'
      )}>
        {content?.title && (
          <h2 
            className={cn("font-bold mb-4", getTextAlignClass(settings?.textAlign || styles?.textAlign || 'center'))}
            style={{ 
              color: styles?.textColor,
              fontFamily: styles?.fontFamily,
              fontSize: `${settings?.titleSize || 32}px`,
              fontWeight: settings?.titleWeight || 'bold',
              lineHeight: settings?.lineHeight || 1.2
            }}
          >
            {content.title}
          </h2>
        )}
        {content?.subtitle && (
          <p 
            className={cn("text-muted-foreground mb-8", getTextAlignClass(settings?.textAlign || styles?.textAlign || 'center'))}
            style={{ 
              fontSize: `${settings?.textSize || 18}px`
            }}
          >
            {content.subtitle}
          </p>
        )}
        
        <AdvancedCarousel
          items={images}
          settings={toAdvancedCarouselSettings(normalizeCarouselSettings({
            ...settings,
            itemsPerView: imageCarouselPerView,
            autoplay: imageCarouselAutoplay,
            autoplayDelay: imageCarouselAutoplaySpeed,
            effect: imageCarouselTransition,
            imageHeight: imageCarouselHeight,
            imageFit: imageCarouselFit
          }))}
          renderItem={(image: any, index: number) => (
            <div 
              className={cn(
                "relative w-full group",
                imageCarouselLightbox && "cursor-pointer"
              )}
              style={{ height: `${imageCarouselHeight}px` }}
              onClick={() => {
                if (imageCarouselLightbox) {
                  window.open(image?.url, '_blank');
                }
              }}
            >
              {isValidImageUrl(image?.url) ? (
                <img
                  src={image.url}
                  alt={image.alt || `Imagen ${index + 1}`}
                  className={cn(
                    "w-full h-full rounded-xl shadow-md group-hover:shadow-xl transition-all duration-300",
                    imageCarouselKenBurns && imageCarouselAutoplay && "group-hover:scale-110",
                    "group-hover:scale-[1.02]"
                  )}
                  style={{
                    objectFit: imageCarouselFit as any
                  }}
                  loading={settings?.lazyLoad !== false ? "lazy" : undefined}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted rounded-xl">
                  <p className="text-muted-foreground">URL de imagen inválida</p>
                </div>
              )}
              {imageCarouselShowCaptions && image?.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white p-4 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="text-center text-sm font-medium">{image.caption}</p>
                </div>
              )}
            </div>
          )}
        />
        
        {/* Thumbnails navigation (if enabled) */}
        {imageCarouselThumbnails && images.length > 1 && (
          <div className="flex gap-2 mt-4 justify-center overflow-x-auto">
            {images.map((image: any, idx: number) => (
              <img
                key={idx}
                src={image?.url}
                alt={`Thumbnail ${idx + 1}`}
                className="w-16 h-16 object-cover rounded hover:ring-2 ring-primary transition-all"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// Accordion Section
function AccordionSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0]));
  
  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };
  
  return (
    <section
      className={cn(
        settings?.fullWidth ? "w-full" : "container mx-auto",
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        padding: `${styles?.padding || 60}px ${styles?.padding ? styles.padding / 2 : 30}px`
      }}
    >
      <div className="max-w-4xl mx-auto">
        {content?.title && (
          <h2 
            className={cn("font-bold mb-8", getTextAlignClass(settings?.textAlign || styles?.textAlign || 'center'))}
            style={{ 
              fontSize: `${settings?.titleSize || 28}px`,
              fontWeight: settings?.titleWeight || 'bold',
              color: styles?.textColor
            }}
          >
            {content.title}
          </h2>
        )}
        <div className="space-y-4">
          {(content?.items || []).map((item: any, index: number) => (
            <div key={index} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleItem(index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <span className="font-semibold">{item.title}</span>
                <span className={cn(
                  "transition-transform",
                  openItems.has(index) ? "rotate-180" : ""
                )}>
                  ▼
                </span>
              </button>
              {openItems.has(index) && (
                <div className="p-4 border-t bg-muted/20">
                  <p className="text-muted-foreground">{item.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Pricing Section
function PricingSection({ section }: { section: SectionData }) {
  const { t } = useTranslation(["pageBuilder"]);
  const { content, styles, settings } = section;

  return (
    <section
      className={cn(
        settings?.fullWidth ? "w-full" : "container mx-auto",
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        padding: `${styles?.padding || 80}px ${styles?.padding ? styles.padding / 2 : 40}px`
      }}
    >
      <div className="max-w-7xl mx-auto">
        {content?.title && (
          <h2
            className={cn("font-bold mb-12", getTextAlignClass(settings?.textAlign || styles?.textAlign || 'center'))}
            style={{
              fontSize: `${settings?.titleSize || 28}px`,
              fontWeight: settings?.titleWeight || 'bold',
              color: styles?.textColor
            }}
          >
            {content.title}
          </h2>
        )}
        <div className={cn(
          "grid gap-8",
          (content?.plans?.length || 0) <= 2 ? "md:grid-cols-2" : "md:grid-cols-3"
        )}>
          {(content?.plans || []).map((plan: any, index: number) => (
            <div
              key={index}
              className={cn(
                "relative rounded-lg border p-8",
                plan.highlighted ? "border-primary shadow-lg scale-105" : "border-border"
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                  {t("pageBuilder:pricing.featured")}
                </div>
              )}
              <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {(plan.features || []).filter((f: string) => f.trim()).map((feature: string, i: number) => (
                  <li key={i} className="flex items-start">
                    <span className="text-primary mr-2">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.highlighted ? "default" : "outline"}
                onClick={() => safeNavigate(plan.buttonUrl || '/contact')}
              >
                {plan.buttonText || t("pageBuilder:pricing.selectPlan")}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Form Section
function FormSection({ section }: { section: SectionData }) {
  const { t } = useTranslation(["pageBuilder", "forms"]);
  const { content, styles, settings } = section;
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // TODO: Integrate with backend API or Supabase Edge Function
      // Example: await supabase.functions.invoke('send-contact-form', { body: formData });

      // Simulate submission for now
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(t("pageBuilder:form.success"));
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      logger.error('Error submitting form:', error);
      toast.error(t("pageBuilder:form.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className={cn(
        settings?.fullWidth ? "w-full" : "container mx-auto",
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        padding: `${styles?.padding || 60}px ${styles?.padding ? styles.padding / 2 : 30}px`
      }}
    >
      <div className="max-w-2xl mx-auto">
        {content?.title && (
          <h2
            className={cn("font-bold mb-4", getTextAlignClass(settings?.textAlign || styles?.textAlign || 'center'))}
            style={{
              fontSize: `${settings?.titleSize || 28}px`,
              fontWeight: settings?.titleWeight || 'bold',
              color: styles?.textColor
            }}
          >
            {content.title}
          </h2>
        )}
        {content?.description && (
          <p
            className="text-muted-foreground mb-8"
            style={{ fontSize: `${settings?.textSize || 16}px` }}
          >
            {content.description}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t("forms:name")} *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("pageBuilder:form.namePlaceholder")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t("forms:email")} *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("pageBuilder:form.emailPlaceholder")}
            />
          </div>
          {settings?.includePhone !== false && (
            <div>
              <label className="block text-sm font-medium mb-2">{t("forms:phone")}</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={t("pageBuilder:form.phonePlaceholder")}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t("forms:message")} {settings?.requireMessage !== false && '*'}
            </label>
            <textarea
              required={settings?.requireMessage !== false}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("pageBuilder:form.messagePlaceholder")}
              rows={5}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t("pageBuilder:form.sending") : t("pageBuilder:form.submit")}
          </Button>
        </form>
      </div>
    </section>
  );
}

// Newsletter Section
function NewsletterSection({ section }: { section: SectionData }) {
  const { t } = useTranslation(["pageBuilder"]);
  const { content, styles, settings } = section;
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // TODO: Integrate with newsletter service or backend
      // Example: await supabase.functions.invoke('subscribe-newsletter', { body: { email } });

      // Simulate submission for now
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(t("pageBuilder:newsletter.success"));
      setEmail('');
    } catch (error) {
      logger.error('Error subscribing to newsletter:', error);
      toast.error(t("pageBuilder:newsletter.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className={cn(
        settings?.fullWidth ? "w-full" : "container mx-auto",
      )}
      style={{
        backgroundColor: styles?.backgroundColor || '#3b82f6',
        color: styles?.textColor || '#ffffff',
        padding: `${styles?.padding || 60}px ${styles?.padding ? styles.padding / 2 : 30}px`
      }}
    >
      <div className="max-w-2xl mx-auto text-center">
        {content?.title && (
          <h2
            className="font-bold mb-4"
            style={{
              fontSize: `${settings?.titleSize || 28}px`,
              fontWeight: settings?.titleWeight || 'bold'
            }}
          >
            {content.title}
          </h2>
        )}
        {content?.description && (
          <p
            className="mb-8 opacity-90"
            style={{ fontSize: `${settings?.textSize || 18}px` }}
          >
            {content.description}
          </p>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-4 py-3 rounded-lg text-gray-900"
            placeholder={content?.emailPlaceholder || t("pageBuilder:newsletter.emailPlaceholder")}
          />
          <Button type="submit" variant="secondary" disabled={submitting} className="px-6">
            {submitting ? t("pageBuilder:newsletter.sending") : (content?.buttonText || t("pageBuilder:newsletter.button"))}
          </Button>
        </form>
      </div>
    </section>
  );
}

// Steps / Process Section
function StepsSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;

  return (
    <section
      className={cn(
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius),
        getResponsiveClasses(styles)
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        color: styles?.textColor,
        padding: `${styles?.padding || 80}px ${styles?.padding ? styles.padding / 2 : 40}px`
      }}
    >
      <div className="max-w-5xl mx-auto">
        {content?.title && (
          <h2
            className={cn("font-bold mb-4", getTextAlignClass(settings?.textAlign || 'center'))}
            style={{
              fontSize: `${settings?.titleSize || 32}px`,
              fontWeight: settings?.titleWeight || 'bold',
              color: styles?.textColor
            }}
          >
            {content.title}
          </h2>
        )}
        {content?.subtitle && (
          <p
            className={cn("mb-12 opacity-80", getTextAlignClass(settings?.textAlign || 'center'))}
            style={{ fontSize: `${settings?.subtitleSize || 18}px` }}
          >
            {content.subtitle}
          </p>
        )}
        <div className="relative">
          {(content?.steps || []).map((step: any, index: number) => (
            <div key={index} className="flex gap-6 mb-8 last:mb-0">
              <div className="flex flex-col items-center">
                <div
                  className="flex items-center justify-center w-12 h-12 rounded-full text-white font-bold text-lg shrink-0"
                  style={{ backgroundColor: styles?.textColor ? styles.textColor : '#3b82f6' }}
                >
                  {step.number || index + 1}
                </div>
                {index < (content?.steps || []).length - 1 && (
                  <div className="w-0.5 flex-1 mt-2" style={{ backgroundColor: styles?.textColor ? `${styles.textColor}30` : '#3b82f620' }} />
                )}
              </div>
              <div className="pb-8">
                {step.title && (
                  <h3 className="font-semibold text-xl mb-2">{step.title}</h3>
                )}
                {step.description && (
                  <p className="opacity-70">{step.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Stats / Metrics Section
function StatsSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  const columns = settings?.columns || 4;

  const gridColsClasses: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
  };

  return (
    <section
      className={cn(
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius),
        getResponsiveClasses(styles)
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        color: styles?.textColor,
        padding: `${styles?.padding || 60}px ${styles?.padding ? styles.padding / 2 : 30}px`
      }}
    >
      <div className="max-w-6xl mx-auto">
        {content?.title && (
          <h2
            className={cn("font-bold mb-12", getTextAlignClass(settings?.textAlign || 'center'))}
            style={{
              fontSize: `${settings?.titleSize || 28}px`,
              fontWeight: settings?.titleWeight || 'bold'
            }}
          >
            {content.title}
          </h2>
        )}
        <div className={cn("grid gap-8", gridColsClasses[columns] || gridColsClasses[4])}>
          {(content?.stats || []).map((stat: any, index: number) => (
            <div key={index} className="text-center">
              <div
                className="font-bold mb-2"
                style={{ fontSize: `${settings?.valueSize || 40}px` }}
              >
                {stat.value}
              </div>
              <div className="opacity-80" style={{ fontSize: `${settings?.labelSize || 16}px` }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Icon Grid Section
function IconGridSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  const columns = settings?.columns || 4;
  const iconSize = settings?.iconSize || 48;
  const iconColor = settings?.iconColor || '#3b82f6';

  const gridColsClasses: Record<number, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
  };

  return (
    <section
      className={cn(
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius),
        getResponsiveClasses(styles)
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        color: styles?.textColor,
        padding: `${styles?.padding || 80}px ${styles?.padding ? styles.padding / 2 : 40}px`
      }}
    >
      <div className="max-w-6xl mx-auto">
        {content?.title && (
          <h2
            className={cn("font-bold mb-4", getTextAlignClass(settings?.textAlign || 'center'))}
            style={{
              fontSize: `${settings?.titleSize || 32}px`,
              fontWeight: settings?.titleWeight || 'bold',
              color: styles?.textColor
            }}
          >
            {content.title}
          </h2>
        )}
        {content?.subtitle && (
          <p
            className={cn("mb-12 opacity-80", getTextAlignClass(settings?.textAlign || 'center'))}
            style={{ fontSize: `${settings?.subtitleSize || 18}px` }}
          >
            {content.subtitle}
          </p>
        )}
        <div className={cn("grid gap-8", gridColsClasses[columns] || gridColsClasses[4])}>
          {(content?.items || []).map((item: any, index: number) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-6 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {item.icon && (
                <div
                  className="flex items-center justify-center rounded-xl mb-4"
                  style={{
                    width: `${iconSize}px`,
                    height: `${iconSize}px`,
                    fontSize: `${iconSize * 0.6}px`,
                    color: iconColor,
                    backgroundColor: `${iconColor}20`
                  }}
                >
                  <span>{item.icon}</span>
                </div>
              )}
              {item.title && (
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              )}
              {item.description && (
                <p className="text-sm opacity-70">{item.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Social Media Links Section
function SocialSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  const iconSize = settings?.iconSize === 'large' ? 48 : settings?.iconSize === 'small' ? 32 : 40;

  return (
    <section
      className={cn(
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius),
        getResponsiveClasses(styles)
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        color: styles?.textColor,
        padding: `${styles?.padding || 60}px ${styles?.padding ? styles.padding / 2 : 30}px`,
        textAlign: (styles?.textAlign || 'center') as any
      }}
    >
      <div className="max-w-4xl mx-auto">
        {content?.title && (
          <h2
            className="font-bold mb-4"
            style={{
              fontSize: `${settings?.titleSize || 28}px`,
              fontWeight: settings?.titleWeight || 'bold'
            }}
          >
            {content.title}
          </h2>
        )}
        {content?.subtitle && (
          <p className="mb-8 opacity-80" style={{ fontSize: `${settings?.subtitleSize || 16}px` }}>
            {content.subtitle}
          </p>
        )}
        <div className="flex items-center justify-center gap-6 flex-wrap">
          {(content?.platforms || []).map((platform: any, index: number) => (
            <a
              key={index}
              href={platform.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-full hover:opacity-80 transition-opacity"
              style={{
                width: `${iconSize}px`,
                height: `${iconSize}px`,
                backgroundColor: styles?.textColor ? `${styles.textColor}15` : '#00000015'
              }}
              aria-label={platform.platform || platform.icon}
            >
              <span style={{ fontSize: `${iconSize * 0.5}px` }}>
                {platform.icon || platform.platform?.charAt(0).toUpperCase()}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// Testimonials Section
function TestimonialsSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  const columns = settings?.columns || 2;

  const gridColsClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <section
      className={cn(
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius),
        getResponsiveClasses(styles)
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        color: styles?.textColor,
        padding: `${styles?.padding || 80}px ${styles?.padding ? styles.padding / 2 : 40}px`
      }}
    >
      <div className="max-w-6xl mx-auto">
        {content?.title && (
          <h2
            className={cn("font-bold mb-4", getTextAlignClass(settings?.textAlign || 'center'))}
            style={{
              fontSize: `${settings?.titleSize || 32}px`,
              fontWeight: settings?.titleWeight || 'bold',
              color: styles?.textColor
            }}
          >
            {content.title}
          </h2>
        )}
        {content?.subtitle && (
          <p
            className={cn("mb-12 opacity-80", getTextAlignClass(settings?.textAlign || 'center'))}
            style={{ fontSize: `${settings?.subtitleSize || 18}px` }}
          >
            {content.subtitle}
          </p>
        )}
        <div className={cn("grid gap-8", gridColsClasses[columns] || gridColsClasses[2])}>
          {(content?.testimonials || []).map((testimonial: any, index: number) => (
            <div
              key={index}
              className="p-6 rounded-xl bg-black/5 dark:bg-white/5"
            >
              {testimonial.rating && (
                <div className="mb-3 text-yellow-500">
                  {'★'.repeat(testimonial.rating)}{'☆'.repeat(5 - testimonial.rating)}
                </div>
              )}
              <blockquote className="text-lg mb-4 italic opacity-90">
                "{testimonial.quote}"
              </blockquote>
              <div className="flex items-center gap-3">
                {testimonial.avatar && (
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.author}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <div className="font-semibold">{testimonial.author}</div>
                  {testimonial.role && (
                    <div className="text-sm opacity-70">{testimonial.role}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Hook to translate section content
function useTranslatedSection(section: SectionData): SectionData {
  const { i18n } = useTranslation();
  const [translatedSection, setTranslatedSection] = useState<SectionData>(section);
  
  useEffect(() => {
    const loadTranslations = async () => {
      const baseLang = i18n.language.split('-')[0];
      
      // If Spanish, use original content
      if (baseLang === 'es') {
        setTranslatedSection(section);
        return;
      }
      
      if (!section.id) {
        setTranslatedSection(section);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('translations')
          .select('field_name, translated_text')
          .eq('entity_type', 'page_builder_sections')
          .eq('entity_id', section.id)
          .eq('language', baseLang);
        
        if (error || !data || data.length === 0) {
          setTranslatedSection(section);
          return;
        }
        
        // Apply translations to content
        const newContent = { ...(section.content || {}) };
        let newSectionName = section.section_name;
        
        // Helper function to handle array translations
        const handleArrayTranslation = (arrayName: string, fieldName: string, translatedText: string) => {
          const match = fieldName.match(new RegExp(`${arrayName}_(\\d+)_(\\w+)`));
          if (match) {
            const index = parseInt(match[1]);
            const field = match[2];
            if (!newContent[arrayName]) {
              newContent[arrayName] = [...(section.content?.[arrayName] || [])];
            }
            if (newContent[arrayName][index]) {
              newContent[arrayName][index] = {
                ...newContent[arrayName][index],
                [field]: translatedText
              };
            }
          }
        };
        
        data.forEach(translation => {
          const fieldName = translation.field_name;
          const text = translation.translated_text;
          
          if (fieldName === 'section_name') {
            newSectionName = text || section.section_name;
          } else if (fieldName === 'title') {
            newContent.title = text || section.content?.title;
          } else if (fieldName === 'subtitle') {
            newContent.subtitle = text || section.content?.subtitle;
          } else if (fieldName === 'description') {
            newContent.description = text || section.content?.description;
          } else if (fieldName === 'buttonText') {
            newContent.buttonText = text || section.content?.buttonText;
          } else if (fieldName === 'text') {
            newContent.text = text || section.content?.text;
          } else if (fieldName.startsWith('items_')) {
            handleArrayTranslation('items', fieldName, text);
          } else if (fieldName.startsWith('cards_')) {
            handleArrayTranslation('cards', fieldName, text);
          } else if (fieldName.startsWith('features_')) {
            handleArrayTranslation('features', fieldName, text);
          } else if (fieldName.startsWith('testimonials_')) {
            handleArrayTranslation('testimonials', fieldName, text);
          } else if (fieldName.startsWith('benefits_')) {
            handleArrayTranslation('benefits', fieldName, text);
          } else if (fieldName.startsWith('steps_')) {
            handleArrayTranslation('steps', fieldName, text);
          }
        });
        
        setTranslatedSection({
          ...section,
          section_name: newSectionName,
          content: newContent
        });
      } catch (error) {
        console.error('Error loading section translations:', error);
        setTranslatedSection(section);
      }
    };
    
    loadTranslations();
  }, [section, i18n.language]);
  
  return translatedSection;
}

// Main renderer component with translation support
function RenderSection({ section }: { section: SectionData }) {
  const translatedSection = useTranslatedSection(section);
  
  if (!translatedSection.is_visible) return null;
  
  switch (translatedSection.section_type) {
    case 'hero':
      return <HeroSection section={translatedSection} />;
    case 'text':
      return <TextSection section={translatedSection} />;
    case 'image':
      return <ImageSection section={translatedSection} />;
    case 'banner':
      return <BannerSection section={translatedSection} />;
    case 'cta':
      return <CTASection section={translatedSection} />;
    case 'features':
      return <FeaturesSection section={translatedSection} />;
    case 'gallery':
      return <GallerySection section={translatedSection} />;
    case 'divider':
      return <DividerSection section={translatedSection} />;
    case 'spacer':
      return <SpacerSection section={translatedSection} />;
    case 'custom':
      return <CustomSection section={translatedSection} />;
    case 'video':
      return <VideoSection section={translatedSection} />;
    case 'products-carousel':
      return <ProductsCarouselSection section={translatedSection} />;
    case 'image-carousel':
      return <ImageCarouselSection section={translatedSection} />;
    case 'accordion':
      return <AccordionSection section={translatedSection} />;
    case 'pricing':
      return <PricingSection section={translatedSection} />;
    case 'form':
      return <FormSection section={translatedSection} />;
    case 'newsletter':
      return <NewsletterSection section={translatedSection} />;
    case 'steps':
      return <StepsSection section={translatedSection} />;
    case 'stats':
      return <StatsSection section={translatedSection} />;
    case 'icon-grid':
      return <IconGridSection section={translatedSection} />;
    case 'social':
      return <SocialSection section={translatedSection} />;
    case 'testimonials':
      return <TestimonialsSection section={translatedSection} />;
    default:
      return null;
  }
}

export function SectionRenderer({ sections, className }: SectionRendererProps) {
  if (!sections || sections.length === 0) {
    return null;
  }

  // Sort sections by display_order
  const sortedSections = [...sections].sort((a, b) => 
    (a as any).display_order - (b as any).display_order
  );

  return (
    <div className={className}>
      {sortedSections.map((section) => (
        <RenderSection key={section.id} section={section} />
      ))}
    </div>
  );
}

// Re-export usePageSections from dedicated hook for backwards compatibility
export { usePageSections } from "@/hooks/usePageSections";
