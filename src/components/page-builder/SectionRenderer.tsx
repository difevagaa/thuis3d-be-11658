import { useState, useEffect, useCallback, CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import FeaturedProductsCarousel from "@/components/FeaturedProductsCarousel";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

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
  
  // Override or merge with specific hero styles
  const heroStyles: CSSProperties = {
    ...inlineStyles,
    backgroundImage: content?.backgroundImage ? `url(${content.backgroundImage})` : inlineStyles.backgroundImage,
    backgroundSize: inlineStyles.backgroundSize || 'cover',
    backgroundPosition: inlineStyles.backgroundPosition || 'center',
    minHeight: inlineStyles.minHeight || settings?.height || '500px',
  };
  
  return (
    <section
      className={cn(
        "relative overflow-hidden",
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius),
        getResponsiveClasses(styles),
        getAnimationClass(settings?.animation)
      )}
      style={heroStyles}
    >
      {content?.backgroundImage && (
        <div className="absolute inset-0 bg-black/30" />
      )}
      <div className={cn(
        "relative z-10 max-w-4xl mx-auto",
        getTextAlignClass(styles?.textAlign)
      )}>
        {content?.title && (
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
            style={{ color: styles?.textColor }}
          >
            {content.title}
          </h1>
        )}
        {content?.subtitle && (
          <p 
            className="text-lg md:text-xl mb-8 opacity-90"
            style={{ color: styles?.textColor }}
          >
            {content.subtitle}
          </p>
        )}
        {content?.buttonText && (
          <Button
            size="lg"
            onClick={() => safeNavigate(content?.buttonUrl || '/')}
            className="text-lg px-8 py-6"
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
        getTextAlignClass(styles?.textAlign)
      )}>
        {content?.title && (
          <h2 className="text-3xl font-bold mb-4" style={{ color: styles?.textColor }}>
            {content.title}
          </h2>
        )}
        {content?.text && (
          <div 
            className="whitespace-pre-wrap"
            style={{ color: styles?.textColor }}
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
        {content?.title && <h2 className="text-3xl font-bold mb-6">{content.title}</h2>}
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
  
  return (
    <section
      className={cn(
        "relative",
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius)
      )}
      style={{
        backgroundColor: styles?.backgroundColor || '#f3f4f6',
        color: styles?.textColor,
        padding: `${styles?.padding || 60}px ${styles?.padding ? styles.padding / 2 : 30}px`,
        backgroundImage: content?.backgroundImage ? `url(${content.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {content?.backgroundImage && (
        <div className="absolute inset-0 bg-black/30 -z-10" />
      )}
      <div className={cn(
        "max-w-3xl mx-auto relative z-10",
        getTextAlignClass(styles?.textAlign)
      )}>
        {content?.title && (
          <h2 className="text-3xl font-bold mb-4" style={{ color: styles?.textColor }}>
            {content.title}
          </h2>
        )}
        {content?.description && (
          <p className="text-lg mb-6" style={{ color: styles?.textColor }}>
            {content.description}
          </p>
        )}
        {content?.buttonText && (
          <Button
            onClick={() => safeNavigate(content?.buttonUrl || '/')}
          >
            {content.buttonText}
          </Button>
        )}
      </div>
    </section>
  );
}

// CTA Section
function CTASection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  
  return (
    <section
      className={cn(
        "relative",
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius)
      )}
      style={{
        backgroundColor: styles?.backgroundColor || '#3b82f6',
        color: styles?.textColor || '#ffffff',
        padding: `${styles?.padding || 80}px ${styles?.padding ? styles.padding / 2 : 40}px`
      }}
    >
      <div className={cn(
        "max-w-3xl mx-auto",
        getTextAlignClass(styles?.textAlign || 'center')
      )}>
        {content?.title && (
          <h2 className="text-4xl font-bold mb-4" style={{ color: styles?.textColor }}>
            {content.title}
          </h2>
        )}
        {content?.description && (
          <p className="text-xl mb-8 opacity-90" style={{ color: styles?.textColor }}>
            {content.description}
          </p>
        )}
        {content?.buttonText && (
          <Button
            size="lg"
            variant="secondary"
            onClick={() => safeNavigate(content?.buttonUrl || '/')}
            className="text-lg px-8 py-6"
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
  const columns = settings?.columns || 3;
  
  return (
    <section
      className={cn(
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius)
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        color: styles?.textColor,
        padding: `${styles?.padding || 60}px ${styles?.padding ? styles.padding / 2 : 30}px`
      }}
    >
      <div className="max-w-6xl mx-auto">
        {content?.title && (
          <h2 className={cn("text-3xl font-bold mb-12", getTextAlignClass(styles?.textAlign))}>
            {content.title}
          </h2>
        )}
        <div className={cn(
          "grid gap-8",
          columns === 2 && "md:grid-cols-2",
          columns === 3 && "md:grid-cols-3",
          columns === 4 && "md:grid-cols-4"
        )}>
          {content?.features?.map((feature: any, index: number) => (
            <div key={index} className="text-center">
              {feature.icon && (
                <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-lg bg-primary/10">
                  <span className="text-2xl">{feature.icon}</span>
                </div>
              )}
              {feature.title && <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>}
              {feature.description && <p className="text-muted-foreground">{feature.description}</p>}
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
  const columns = settings?.columns || 4;
  const gap = settings?.gap || 16;
  
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
      <div className="max-w-7xl mx-auto">
        {content?.title && (
          <h2 className={cn("text-3xl font-bold mb-8", getTextAlignClass(styles?.textAlign))}>
            {content.title}
          </h2>
        )}
        <div 
          className={cn(
            "grid",
            columns === 2 && "md:grid-cols-2",
            columns === 3 && "md:grid-cols-3",
            columns === 4 && "md:grid-cols-4",
            columns === 5 && "md:grid-cols-5"
          )}
          style={{ gap: `${gap}px` }}
        >
          {content?.images?.map((image: string, index: number) => (
            <div key={index} className="overflow-hidden rounded-lg">
              <img
                src={image}
                alt={`Gallery ${index + 1}`}
                className="w-full h-auto hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
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
          <h2 className={cn("text-3xl font-bold mb-6", getTextAlignClass(styles?.textAlign))}>
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

// Products Carousel Section
function ProductsCarouselSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRoles } = useAuth(); // Use centralized auth hook
  
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query based on settings
      const sortBy = settings?.sortBy || 'created_at';
      const sortOrder = settings?.sortOrder || 'desc';
      const limit = settings?.limit || 10;
      
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
      
      // Filter by roles - Fixed logic for correct behavior
      const visibleProducts = (data || []).filter((product: any) => {
        const productRolesList = product.product_roles || [];
        const productRolesNormalized = productRolesList
          .map((pr: any) => String(pr?.role || '').trim().toLowerCase())
          .filter((role: string) => role.length > 0);
        
        // If product has NO roles assigned, it's PUBLIC - visible to everyone
        if (productRolesNormalized.length === 0) {
          return true;
        }
        
        // If product HAS roles but user is NOT logged in, hide the product
        if (!user || userRoles.length === 0) {
          return false;
        }
        
        // User is logged in - check if they have at least one required role
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
      
      setProducts(productsWithSortedImages);
    } catch (error) {
      logger.error('Error loading products for carousel:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [settings?.sortBy, settings?.sortOrder, settings?.limit, user, userRoles]);
  
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);
  
  if (loading) {
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
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </section>
    );
  }
  
  if (products.length === 0) {
    return null;
  }
  
  return (
    <section
      className={cn(
        "relative overflow-hidden",
        settings?.fullWidth ? "w-full" : "container mx-auto",
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        color: styles?.textColor,
        padding: `${styles?.padding || 60}px ${styles?.padding ? styles.padding / 2 : 30}px`
      }}
    >
      <div className={cn(
        "max-w-7xl mx-auto",
        getTextAlignClass(styles?.textAlign)
      )}>
        {content?.title && (
          <h2 className="text-3xl font-bold mb-4" style={{ color: styles?.textColor }}>
            {content.title}
          </h2>
        )}
        {content?.subtitle && (
          <p className="text-lg mb-8 opacity-90" style={{ color: styles?.textColor }}>
            {content.subtitle}
          </p>
        )}
        <FeaturedProductsCarousel 
          products={products} 
          maxVisible={settings?.maxVisible || 4}
        />
      </div>
    </section>
  );
}

// Image Carousel Section
function ImageCarouselSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = content?.images || [];
  
  useEffect(() => {
    if (!settings?.autoplay || images.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, (settings?.autoplayDelay || 5) * 1000);
    
    return () => clearInterval(interval);
  }, [settings?.autoplay, settings?.autoplayDelay, images.length]);
  
  if (images.length === 0) {
    return (
      <section className="container mx-auto py-12">
        <p className="text-center text-muted-foreground">No hay imágenes configuradas</p>
      </section>
    );
  }
  
  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };
  
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };
  
  return (
    <section
      className={cn(
        "relative overflow-hidden",
        settings?.fullWidth ? "w-full" : "container mx-auto",
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        color: styles?.textColor,
        padding: `${styles?.padding || 60}px ${styles?.padding ? styles.padding / 2 : 30}px`
      }}
    >
      <div className={cn(
        settings?.width === 'full' ? 'w-full' :
        settings?.width === 'narrow' ? 'max-w-4xl mx-auto' :
        settings?.width === 'wide' ? 'max-w-7xl mx-auto' :
        'max-w-6xl mx-auto'
      )}>
        {content?.title && (
          <h2 className={cn("text-3xl font-bold mb-8", getTextAlignClass(styles?.textAlign))}>
            {content.title}
          </h2>
        )}
        
        <div 
          className="relative group"
          style={{ height: settings?.height || '400px' }}
        >
          {/* Main Image */}
          <div className="relative w-full h-full">
            {isValidImageUrl(images[currentIndex]?.url) ? (
              <img
                src={images[currentIndex]?.url}
                alt={images[currentIndex]?.alt || `Imagen ${currentIndex + 1}`}
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">URL de imagen inválida</p>
              </div>
            )}
            {images[currentIndex]?.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-4">
                <p className="text-center">{images[currentIndex].caption}</p>
              </div>
            )}
          </div>
          
          {/* Navigation Arrows */}
          {settings?.showNavigation !== false && images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={goToPrevious}
              >
                <span className="sr-only">Previous</span>
                ←
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={goToNext}
              >
                <span className="sr-only">Next</span>
                →
              </Button>
            </>
          )}
          
          {/* Pagination Dots */}
          {settings?.showPagination && images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    index === currentIndex ? "bg-white w-8" : "bg-white/50"
                  )}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Gallery Grid Section - displays images from gallery_items table
function GalleryGridSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const loadGalleryItems = useCallback(async () => {
    try {
      setLoading(true);
      const limit = settings?.limit || 12;
      
      const { data, error } = await supabase
        .from('gallery_items')
        .select('*')
        .eq('is_published', true)
        .is('deleted_at', null)
        .order('display_order', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      setGalleryItems(data || []);
    } catch (error) {
      logger.error('Error loading gallery items:', error);
      setGalleryItems([]);
    } finally {
      setLoading(false);
    }
  }, [settings?.limit]);
  
  useEffect(() => {
    loadGalleryItems();
  }, [loadGalleryItems]);
  
  if (loading) {
    return (
      <section
        className={cn(settings?.fullWidth ? "w-full" : "container mx-auto")}
        style={{
          backgroundColor: styles?.backgroundColor,
          padding: `${styles?.padding || 60}px ${styles?.padding ? styles.padding / 2 : 30}px`
        }}
      >
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </section>
    );
  }
  
  if (galleryItems.length === 0) {
    return null;
  }
  
  const columns = settings?.columns || 4;
  const columnsTablet = settings?.columnsTablet || 3;
  const columnsMobile = settings?.columnsMobile || 2;
  const gap = settings?.gap || 16;
  
  // Static class mapping for grid columns (Tailwind requires static classes)
  const getGridColsClass = (cols: number, breakpoint: '' | 'md:' | 'lg:' = '') => {
    const classMap: Record<string, string> = {
      '1': `${breakpoint}grid-cols-1`,
      '2': `${breakpoint}grid-cols-2`,
      '3': `${breakpoint}grid-cols-3`,
      '4': `${breakpoint}grid-cols-4`,
      '5': `${breakpoint}grid-cols-5`,
      '6': `${breakpoint}grid-cols-6`,
    };
    return classMap[String(cols)] || `${breakpoint}grid-cols-4`;
  };
  
  // Validate and sanitize image URLs
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };
  
  return (
    <section
      className={cn("relative overflow-hidden", settings?.fullWidth ? "w-full" : "container mx-auto")}
      style={{
        backgroundColor: styles?.backgroundColor,
        color: styles?.textColor,
        padding: `${styles?.padding || 60}px ${styles?.padding ? styles.padding / 2 : 30}px`
      }}
    >
      <div className={cn("max-w-7xl mx-auto", getTextAlignClass(styles?.textAlign))}>
        {content?.title && (
          <h2 className="text-3xl font-bold mb-4" style={{ color: styles?.textColor }}>
            {content.title}
          </h2>
        )}
        {content?.subtitle && (
          <p className="text-lg mb-8 opacity-90" style={{ color: styles?.textColor }}>
            {content.subtitle}
          </p>
        )}
        <div 
          className={cn(
            "grid gap-4",
            getGridColsClass(columnsMobile),
            getGridColsClass(columnsTablet, 'md:'),
            getGridColsClass(columns, 'lg:')
          )}
          style={{ gap: `${gap}px` }}
        >
          {galleryItems.map((item) => {
            // Use media_url instead of image_url to match database schema
            const mediaUrl = item.media_url || item.image_url;
            const mediaType = item.media_type || 'image';
            
            if (!mediaUrl || !isValidUrl(mediaUrl)) {
              return null;
            }
            
            return (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 group cursor-pointer"
                style={{
                  aspectRatio: '1 / 1'
                }}
              >
                {mediaType === 'video' ? (
                  <video
                    src={mediaUrl}
                    className="w-full h-full object-cover"
                    controls
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt={item.title || 'Gallery item'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                  />
                )}
                {settings?.showTitles && item.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3">
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    {settings?.showDescriptions && item.description && (
                      <p className="text-xs mt-1 opacity-90">{item.description}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Blog Carousel Section - displays posts from blog_posts table
function BlogCarouselSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const loadBlogPosts = useCallback(async () => {
    try {
      setLoading(true);
      const sortBy = settings?.sortBy || 'created_at';
      const sortOrder = settings?.sortOrder || 'desc';
      const limit = settings?.limit || 6;
      
      let query = supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .limit(limit);
      
      // Filter by category if specified
      if (settings?.category) {
        query = query.eq('category', settings.category);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setBlogPosts(data || []);
    } catch (error) {
      logger.error('Error loading blog posts:', error);
      setBlogPosts([]);
    } finally {
      setLoading(false);
    }
  }, [settings?.sortBy, settings?.sortOrder, settings?.limit, settings?.category]);
  
  useEffect(() => {
    loadBlogPosts();
  }, [loadBlogPosts]);
  
  if (loading) {
    return (
      <section
        className={cn(settings?.fullWidth ? "w-full" : "container mx-auto")}
        style={{
          backgroundColor: styles?.backgroundColor,
          padding: `${styles?.padding || 60}px ${styles?.padding ? styles.padding / 2 : 30}px`
        }}
      >
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </section>
    );
  }
  
  if (blogPosts.length === 0) {
    return null;
  }
  
  const postsPerRow = settings?.postsPerRow || 3;
  const postsPerRowTablet = settings?.postsPerRowTablet || 2;
  const postsPerRowMobile = settings?.postsPerRowMobile || 1;
  
  // Validate and sanitize URLs
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };
  
  return (
    <section
      className={cn("relative overflow-hidden", settings?.fullWidth ? "w-full" : "container mx-auto")}
      style={{
        backgroundColor: styles?.backgroundColor,
        color: styles?.textColor,
        padding: `${styles?.padding || 60}px ${styles?.padding ? styles.padding / 2 : 30}px`
      }}
    >
      <div className={cn("max-w-7xl mx-auto", getTextAlignClass(styles?.textAlign))}>
        {content?.title && (
          <h2 className="text-3xl font-bold mb-4" style={{ color: styles?.textColor }}>
            {content.title}
          </h2>
        )}
        {content?.subtitle && (
          <p className="text-lg mb-8 opacity-90" style={{ color: styles?.textColor }}>
            {content.subtitle}
          </p>
        )}
        <div 
          className={cn(
            "grid gap-6",
            `grid-cols-${postsPerRowMobile}`,
            `md:grid-cols-${postsPerRowTablet}`,
            `lg:grid-cols-${postsPerRow}`
          )}
        >
          {blogPosts.map((post) => (
            <article
              key={post.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden"
            >
              {settings?.showFeaturedImage && post.featured_image && isValidUrl(post.featured_image) && (
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={post.featured_image}
                    alt={post.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{post.title}</h3>
                {settings?.showExcerpt && post.excerpt && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">{post.excerpt}</p>
                )}
                <div className="flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {settings?.showDate && post.created_at && (
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  )}
                  {settings?.showAuthor && post.author && (
                    <span>• {post.author}</span>
                  )}
                  {settings?.showCategories && post.category && (
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded-md">{post.category}</span>
                  )}
                </div>
                {settings?.showReadMore && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/blog/${post.slug || post.id}`}>Leer más</a>
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
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
          <h2 className={cn("text-3xl font-bold mb-8", getTextAlignClass(styles?.textAlign))}>
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
          <h2 className={cn("text-3xl font-bold mb-12", getTextAlignClass(styles?.textAlign))}>
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
                  Destacado
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
                {plan.buttonText || 'Seleccionar plan'}
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
      
      toast.success('Formulario enviado. Te contactaremos pronto!');
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      logger.error('Error submitting form:', error);
      toast.error('Error al enviar el formulario. Por favor, intenta de nuevo.');
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
          <h2 className={cn("text-3xl font-bold mb-4", getTextAlignClass(styles?.textAlign))}>
            {content.title}
          </h2>
        )}
        {content?.description && (
          <p className="text-muted-foreground mb-8">{content.description}</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="tu@email.com"
            />
          </div>
          {settings?.includePhone !== false && (
            <div>
              <label className="block text-sm font-medium mb-2">Teléfono</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="+34 600 000 000"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">
              Mensaje {settings?.requireMessage !== false && '*'}
            </label>
            <textarea
              required={settings?.requireMessage !== false}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Tu mensaje"
              rows={5}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Enviando...' : 'Enviar mensaje'}
          </Button>
        </form>
      </div>
    </section>
  );
}

// Newsletter Section
function NewsletterSection({ section }: { section: SectionData }) {
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
      
      toast.success('¡Gracias por suscribirte!');
      setEmail('');
    } catch (error) {
      logger.error('Error subscribing to newsletter:', error);
      toast.error('Error al suscribirse. Por favor, intenta de nuevo.');
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
          <h2 className="text-3xl font-bold mb-4">{content.title}</h2>
        )}
        {content?.description && (
          <p className="text-lg mb-8 opacity-90">{content.description}</p>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-4 py-3 rounded-lg text-gray-900"
            placeholder={content?.emailPlaceholder || 'tu@email.com'}
          />
          <Button type="submit" variant="secondary" disabled={submitting} className="px-6">
            {submitting ? '...' : (content?.buttonText || 'Suscribirse')}
          </Button>
        </form>
      </div>
    </section>
  );
}

// Main renderer component
function RenderSection({ section }: { section: SectionData }) {
  if (!section.is_visible) return null;
  
  switch (section.section_type) {
    case 'hero':
      return <HeroSection section={section} />;
    case 'text':
      return <TextSection section={section} />;
    case 'image':
      return <ImageSection section={section} />;
    case 'banner':
      return <BannerSection section={section} />;
    case 'cta':
      return <CTASection section={section} />;
    case 'features':
      return <FeaturesSection section={section} />;
    case 'gallery':
      return <GallerySection section={section} />;
    case 'divider':
      return <DividerSection section={section} />;
    case 'spacer':
      return <SpacerSection section={section} />;
    case 'custom':
      return <CustomSection section={section} />;
    case 'video':
      return <VideoSection section={section} />;
    case 'products-carousel':
      return <ProductsCarouselSection section={section} />;
    case 'gallery-grid':
      return <GalleryGridSection section={section} />;
    case 'blog-carousel':
      return <BlogCarouselSection section={section} />;
    case 'image-carousel':
      return <ImageCarouselSection section={section} />;
    case 'accordion':
      return <AccordionSection section={section} />;
    case 'pricing':
      return <PricingSection section={section} />;
    case 'form':
      return <FormSection section={section} />;
    case 'newsletter':
      return <NewsletterSection section={section} />;
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

// Hook to load page sections
// eslint-disable-next-line react-refresh/only-export-components
export function usePageSections(pageKey: string) {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let sectionsChannel: any;

    async function loadSections() {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        
        // Get page by key
        const { data: page, error: pageError } = await supabase
          .from('page_builder_pages')
          .select('id')
          .eq('page_key', pageKey)
          .eq('is_enabled', true)
          .single();

        if (pageError || !page) {
          console.log(`Page '${pageKey}' not found or not enabled`);
          setSections([]);
          setLoading(false);
          return;
        }

        console.log(`Loading sections for page '${pageKey}' (${page.id})`);

        // Get sections for this page
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('page_builder_sections')
          .select('*')
          .eq('page_id', page.id)
          .eq('is_visible', true)
          .order('display_order');

        if (sectionsError) throw sectionsError;
        
        console.log(`Loaded ${sectionsData?.length || 0} sections for page '${pageKey}'`, sectionsData);
        setSections(sectionsData || []);
        setLoading(false);

        // Subscribe to real-time changes for this page's sections
        sectionsChannel = supabase
          .channel(`page-sections-${page.id}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'page_builder_sections',
            filter: `page_id=eq.${page.id}`
          }, async (payload) => {
            console.log(`Real-time update for page '${pageKey}':`, payload);
            
            // Reload sections when any change occurs
            const { data: updatedSections, error } = await supabase
              .from('page_builder_sections')
              .select('*')
              .eq('page_id', page.id)
              .eq('is_visible', true)
              .order('display_order');
              
            if (!error && updatedSections) {
              console.log('Refreshed sections:', updatedSections);
              setSections(updatedSections);
            }
          })
          .subscribe();
      } catch (error) {
        console.error('Error loading page sections:', error);
        setSections([]);
        setLoading(false);
      }
    }

    loadSections();

    // Cleanup subscription
    return () => {
      if (sectionsChannel) {
        const cleanup = async () => {
          const { supabase } = await import("@/integrations/supabase/client");
          await supabase.removeChannel(sectionsChannel);
        };
        cleanup();
      }
    };
  }, [pageKey]);

  return { sections, loading };
}
