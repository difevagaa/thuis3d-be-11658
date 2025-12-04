import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles, Zap, Shield, Printer, FileText, Gift, ArrowRight } from "lucide-react";
import * as Icons from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import HeroBanner from "@/components/HeroBanner";
import FeaturedProductsCarousel from "@/components/FeaturedProductsCarousel";
import { useParallax } from "@/hooks/useParallax";
import { logger } from "@/lib/logger";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";
import { RichTextDisplay } from "@/components/RichTextDisplay";
import Autoplay from "embla-carousel-autoplay";
import { getBackgroundColorForCurrentMode, isDarkMode } from "@/utils/sectionBackgroundColors";
import { HomepageOrderConfig, HomepageComponentOrder } from "@/hooks/useHomepageOrder";
import { useConnectionState } from "@/hooks/useConnectionState";

// Componente simple para traducir un campo individual de texto
const TranslatedText = ({
  entityType,
  entityId,
  field,
  originalText
}: {
  entityType: string;
  entityId: string;
  field: string;
  originalText: string;
}) => {
  const {
    content
  } = useTranslatedContent(entityType, entityId, [field], {
    [field]: originalText
  });
  return <>{content[field] || originalText}</>;
};

// Interface for homepage section data
interface HomepageSection {
  id: string;
  section_key: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  image_url?: string | null;
  background_color?: string | null;
  icon_name?: string | null;
  display_order?: number | null;
  is_active?: boolean | null;
}

// Helper function to validate URL for CSS background
const isValidBackgroundUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'data:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

// Helper function to get section styles (background color and image)
// Supports dual-mode colors that automatically adjust based on light/dark mode
const getSectionStyles = (section: HomepageSection | null | undefined): React.CSSProperties => {
  const styles: React.CSSProperties = {};
  if (section?.background_color) {
    // Use dual-mode color parsing to get the appropriate color for current mode
    const colorForCurrentMode = getBackgroundColorForCurrentMode(section.background_color);
    if (colorForCurrentMode) {
      styles.backgroundColor = colorForCurrentMode;
    }
  }
  if (section?.image_url && isValidBackgroundUrl(section.image_url)) {
    styles.backgroundImage = `url(${encodeURI(section.image_url)})`;
    styles.backgroundSize = 'cover';
    styles.backgroundPosition = 'center';
    styles.backgroundRepeat = 'no-repeat';
  }
  return styles;
};

// Helper function to check if section has custom styles
const hasCustomSectionStyles = (section: HomepageSection | null | undefined): boolean => {
  return !!(section?.background_color || (section?.image_url && isValidBackgroundUrl(section.image_url)));
};

// Helper function to calculate responsive font size based on banner height
const getResponsiveFontSize = (bannerHeight: string | number, baseRatio: number, minSize: string, maxSize: string): string => {
  const height = typeof bannerHeight === 'string' ? parseFloat(bannerHeight) : bannerHeight;
  const calculatedSize = (height || 400) / baseRatio;
  return `clamp(${minSize}, ${calculatedSize.toFixed(1)}px, ${maxSize})`;
};

// Componente wrapper para traducir el título de sección "Por Qué Elegirnos"
const TranslatedSectionTitle = ({
  section,
  fallbackTitle,
  fallbackSubtitle
}: {
  section: any;
  fallbackTitle: string;
  fallbackSubtitle: string;
}) => {
  const {
    content
  } = useTranslatedContent('homepage_sections', section?.id || '', ['title', 'subtitle'], section || {});
  return <div className="text-center mb-6 md:mb-8 lg:mb-12">
      <h2 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold mb-2 md:mb-4">
        {section ? content.title : fallbackTitle}
      </h2>
      <p className="text-muted-foreground text-sm md:text-base lg:text-lg">
        {section ? content.subtitle : fallbackSubtitle}
      </p>
    </div>;
};

// Componente wrapper para traducir tarjetas de acceso rápido
const TranslatedQuickAccessCard = ({
  card,
  index
}: {
  card: any;
  index: number;
}) => {
  const {
    content
  } = useTranslatedContent('homepage_quick_access_cards', card.id, ['title', 'description', 'button_text'], card);
  const IconComponent = (Icons as any)[card.icon_name] || Printer;
  return <QuickAccessCard icon={IconComponent} title={content.title} description={content.description} link={card.button_url} buttonText={content.button_text} colorClass={index === 0 ? "primary" : index === 1 ? "secondary" : "accent"} variant={index === 1 ? "secondary" : index === 2 ? "outline" : undefined} />;
};

// Componente wrapper para traducir características
const TranslatedFeatureCard = ({
  feature,
  index
}: {
  feature: any;
  index: number;
}) => {
  const {
    content
  } = useTranslatedContent('homepage_features', feature.id, ['title', 'description'], feature);
  const IconComponent = (Icons as any)[feature.icon_name] || Sparkles;
  return <FeatureCard icon={IconComponent} title={content.title} description={content.description} colorClass={index === 0 ? "primary" : index === 1 ? "secondary" : "accent"} />;
};

// Componente wrapper para traducir secciones
const TranslatedSection = ({
  section
}: {
  section: HomepageSection;
}) => {
  const {
    content
  } = useTranslatedContent('homepage_sections', section.id, ['title', 'subtitle'], section);
  return {
    title: content.title,
    subtitle: content.subtitle
  };
};

// Componente para renderizar secciones personalizadas dinámicamente
const CustomSection = ({
  section
}: {
  section: HomepageSection;
}) => {
  const {
    content
  } = useTranslatedContent('homepage_sections', section.id, ['title', 'subtitle', 'description'], section);
  const IconComponent = section.icon_name ? (Icons as any)[section.icon_name] : null;
  const hasImage = section.image_url && isValidBackgroundUrl(section.image_url);
  
  return (
    <section 
      className="py-6 md:py-12 lg:py-16 relative overflow-hidden"
      style={getSectionStyles(section)}
    >
      {hasImage && (
        <div className="absolute inset-0 bg-black/30 z-0" />
      )}
      <div className="container mx-auto px-3 md:px-4 relative z-10">
        <div className="text-center mb-6 md:mb-8 lg:mb-12">
          {IconComponent && (
            <div className="flex justify-center mb-4">
              <IconComponent className="h-10 w-10 md:h-12 md:w-12 text-primary" />
            </div>
          )}
          <h2 
            className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold mb-2 md:mb-4"
            style={hasImage ? { color: '#ffffff' } : undefined}
          >
            {content.title}
          </h2>
          {content.subtitle && (
            <p 
              className="text-sm md:text-base lg:text-lg max-w-2xl mx-auto"
              style={hasImage ? { color: 'rgba(255,255,255,0.9)' } : { color: 'inherit' }}
            >
              {content.subtitle}
            </p>
          )}
          {content.description && (
            <div 
              className="mt-4 text-sm md:text-base max-w-3xl mx-auto"
              style={hasImage ? { color: 'rgba(255,255,255,0.85)' } : { color: 'inherit' }}
            >
              <RichTextDisplay content={content.description} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

// Componente wrapper para traducir banners con personalización completa
const TranslatedBanner = ({
  banner
}: {
  banner: any;
}) => {
  const {
    content
  } = useTranslatedContent('homepage_banners', banner.id, ['title', 'description'], banner);
  const navigate = useNavigate();
  const getObjectFit = () => {
    switch (banner.size_mode) {
      case 'contain':
        return 'object-contain';
      case 'fill':
        return 'object-fill';
      default:
        return 'object-cover';
    }
  };
  const isFullscreen = banner.display_style === 'fullscreen';
  const handleClick = () => {
    if (!banner.link_url) return;
    if (banner.link_url.startsWith('http')) {
      window.open(banner.link_url, '_blank');
    } else {
      navigate(banner.link_url);
    }
  };
  
  // For fullscreen banners, default to white colors (overlay on image)
  // For card banners, use theme colors (no default) so CardTitle/CardDescription styles apply
  const titleColor = isFullscreen 
    ? (banner.title_color || '#ffffff')
    : (banner.title_color || undefined);
  const textColor = isFullscreen 
    ? (banner.text_color || 'rgba(255,255,255,0.9)')
    : (banner.text_color || undefined);
  
  // Check if banner has multiple images
  const hasMultipleImages = banner.banner_images && banner.banner_images.length > 0;
  const images = hasMultipleImages 
    ? banner.banner_images.filter((img: any) => img.is_active).sort((a: any, b: any) => a.display_order - b.display_order)
    : [{ image_url: banner.image_url, alt_text: content.title }];
  
  const renderMedia = (imageUrl: string, altText: string) => {
    return banner.video_url ? (
      <video src={banner.video_url} autoPlay muted loop playsInline className={`w-full h-full ${getObjectFit()} group-hover:scale-110 transition-transform duration-300`} />
    ) : (
      <img src={imageUrl} alt={`3D printing service: ${altText}`} className={`w-full h-full ${getObjectFit()} group-hover:scale-110 transition-transform duration-300`} />
    );
  };
  
  if (isFullscreen) {
    const bannerHeight = banner.height || '400px';
    if (hasMultipleImages && images.length > 1) {
      // Render fullscreen carousel for multiple images
      return <section className="relative overflow-hidden" style={{ height: bannerHeight }}>
          <Carousel
            opts={{ loop: true }}
            plugins={[
              Autoplay({
                delay: 4000,
              }),
            ]}
            className="w-full h-full"
          >
            <CarouselContent className="h-full">
              {images.map((img: any, index: number) => (
                <CarouselItem key={index} className="h-full">
                  <div className="relative h-full cursor-pointer group" onClick={handleClick}>
                    <div className="absolute inset-0">
                      {renderMedia(img.image_url, img.alt_text || content.title)}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
                    <div className="relative z-10 h-full flex items-center justify-center px-4 sm:px-6 md:px-8">
                      <div 
                        className="w-full max-w-3xl text-center px-2"
                        style={{
                          maxHeight: '85%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <h3 
                          className="font-bold leading-tight w-full" 
                          style={{ 
                            color: titleColor,
                            fontSize: getResponsiveFontSize(bannerHeight, 12, '1.25rem', '3rem'),
                            lineHeight: '1.15',
                            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word'
                          }}
                        >
                          {content.title}
                        </h3>
                        {content.description && <div 
                          className="w-full max-w-2xl overflow-hidden" 
                          style={{ 
                            color: textColor,
                            fontSize: getResponsiveFontSize(bannerHeight, 25, '0.875rem', '1.25rem'),
                            lineHeight: '1.5',
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                            maxHeight: '40%'
                          }}
                        >
                            <RichTextDisplay content={content.description} className="line-clamp-4" />
                          </div>}
                        {banner.link_url && <Button 
                          variant="secondary"
                          className="mt-2 sm:mt-3 shadow-lg"
                          style={{
                            fontSize: getResponsiveFontSize(bannerHeight, 35, '0.75rem', '1rem'),
                            padding: `${getResponsiveFontSize(bannerHeight, 60, '0.5rem', '0.75rem')} ${getResponsiveFontSize(bannerHeight, 25, '1rem', '1.5rem')}`
                          }}
                        >
                            Ver más <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>}
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 h-6 w-6" />
            <CarouselNext className="right-2 h-6 w-6" />
          </Carousel>
        </section>;
    } else {
      // Single image fullscreen
      return <section className="relative overflow-hidden cursor-pointer group" style={{
        height: bannerHeight
      }} onClick={handleClick}>
          <div className="absolute inset-0">
            {renderMedia(images[0].image_url, images[0].alt_text || content.title)}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
          <div className="relative z-10 h-full flex items-center justify-center px-4 sm:px-6 md:px-8">
            <div 
              className="w-full max-w-3xl text-center px-2"
              style={{
                maxHeight: '85%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <h3 
                className="font-bold leading-tight w-full" 
                style={{
                  color: titleColor,
                  fontSize: getResponsiveFontSize(bannerHeight, 12, '1.25rem', '3rem'),
                  lineHeight: '1.15',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word'
                }}
              >
                {content.title}
              </h3>
              {content.description && <div 
                className="w-full max-w-2xl overflow-hidden" 
                style={{
                  color: textColor,
                  fontSize: getResponsiveFontSize(bannerHeight, 25, '0.875rem', '1.25rem'),
                  lineHeight: '1.5',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  maxHeight: '40%'
                }}
              >
                  <RichTextDisplay content={content.description} className="line-clamp-4" />
                </div>}
              {banner.link_url && <Button 
                variant="secondary"
                className="mt-2 sm:mt-3 shadow-lg"
                style={{
                  fontSize: getResponsiveFontSize(bannerHeight, 35, '0.75rem', '1rem'),
                  padding: `${getResponsiveFontSize(bannerHeight, 60, '0.5rem', '0.75rem')} ${getResponsiveFontSize(bannerHeight, 25, '1rem', '1.5rem')}`
                }}
              >
                  Ver más <ArrowRight className="ml-2 h-4 w-4" />
                </Button>}
            </div>
          </div>
      </section>;
    }
  }
  
  // Non-fullscreen card style
  const cardBannerHeight = banner.height || '400px';
  if (hasMultipleImages && images.length > 1) {
    // Render card with carousel for multiple images
    return <Card className="group hover:shadow-strong transition-all duration-300 hover:-translate-y-2 overflow-hidden cursor-pointer" style={{
      width: banner.width || '100%',
      maxWidth: '100%'
    }} onClick={handleClick}>
        <div className="relative" style={{ height: cardBannerHeight }}>
          <Carousel
            opts={{ loop: true }}
            plugins={[
              Autoplay({
                delay: 3500,
              }),
            ]}
            className="w-full h-full"
          >
            <CarouselContent className="h-full">
              {images.map((img: any, index: number) => (
                <CarouselItem key={index} className="h-full">
                  <div className="relative overflow-hidden h-full">
                    {renderMedia(img.image_url, img.alt_text || content.title)}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 h-6 w-6" />
            <CarouselNext className="right-2 h-6 w-6" />
          </Carousel>
        </div>
        <CardHeader className="p-3 md:p-4">
          <CardTitle 
            className="leading-tight line-clamp-2" 
            style={titleColor ? { 
              color: titleColor,
              fontSize: getResponsiveFontSize(cardBannerHeight, 22, '0.9rem', '1.25rem')
            } : {
              fontSize: getResponsiveFontSize(cardBannerHeight, 22, '0.9rem', '1.25rem')
            }}
          >
            {content.title}
          </CardTitle>
          {content.description && <CardDescription 
            className="line-clamp-2 mt-1" 
            style={textColor ? { 
              color: textColor,
              fontSize: getResponsiveFontSize(cardBannerHeight, 32, '0.75rem', '1rem')
            } : {
              fontSize: getResponsiveFontSize(cardBannerHeight, 32, '0.75rem', '1rem')
            }}
          >
              <RichTextDisplay content={content.description} className="line-clamp-2" />
            </CardDescription>}
        </CardHeader>
        {banner.link_url && <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
            <Button 
              variant="outline" 
              size="sm" 
              asChild 
              className="w-full"
              style={{
                fontSize: getResponsiveFontSize(cardBannerHeight, 38, '0.75rem', '0.875rem')
              }}
            >
              <Link to={banner.link_url}>
                Ver más <ArrowRight className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </CardContent>}
      </Card>;
  }
  
  // Single image card
  return <Card className="group hover:shadow-strong transition-all duration-300 hover:-translate-y-2 overflow-hidden cursor-pointer" style={{
    width: banner.width || '100%',
    maxWidth: '100%'
  }} onClick={handleClick}>
      <div className="relative overflow-hidden" style={{
      height: cardBannerHeight
    }}>
        {renderMedia(images[0].image_url, images[0].alt_text || content.title)}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <CardHeader className="p-3 md:p-4">
        <CardTitle 
          className="leading-tight line-clamp-2" 
          style={titleColor ? { 
            color: titleColor,
            fontSize: getResponsiveFontSize(cardBannerHeight, 22, '0.9rem', '1.25rem')
          } : {
            fontSize: getResponsiveFontSize(cardBannerHeight, 22, '0.9rem', '1.25rem')
          }}
        >
          {content.title}
        </CardTitle>
        {content.description && <CardDescription 
          className="line-clamp-2 mt-1" 
          style={textColor ? { 
            color: textColor,
            fontSize: getResponsiveFontSize(cardBannerHeight, 32, '0.75rem', '1rem')
          } : {
            fontSize: getResponsiveFontSize(cardBannerHeight, 32, '0.75rem', '1rem')
          }}
        >
            <RichTextDisplay content={content.description} className="line-clamp-2" />
          </CardDescription>}
      </CardHeader>
      {banner.link_url && <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
          <Button 
            variant="outline" 
            size="sm" 
            asChild 
            className="w-full"
            style={{
              fontSize: getResponsiveFontSize(cardBannerHeight, 38, '0.75rem', '0.875rem')
            }}
          >
            <Link to={banner.link_url}>
              Ver más <ArrowRight className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        </CardContent>}
    </Card>;
};
interface Banner {
  id: string;
  title: string;
  description: string;
  image_url: string;
  video_url?: string;
  link_url?: string;
  display_order: number;
  position_order: number;
  is_active: boolean;
  page_section: string;
  height?: string;
  width?: string;
  size_mode?: string;
  display_style?: string;
  title_color?: string;
  text_color?: string;
}
// Connection states - REMOVED (using useConnectionState instead)

const Home = () => {
  const { t } = useTranslation(['home', 'common']);
  const navigate = useNavigate();
  
  // Use global connection state
  const { status: connectionStatus, isConnected, isConnecting, isFailed } = useConnectionState();
  
  // Data states
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [sections, setSections] = useState<any>({});
  const [orderedSections, setOrderedSections] = useState<any[]>([]);
  const [quickAccessCards, setQuickAccessCards] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [orderConfig, setOrderConfig] = useState<HomepageOrderConfig | null>(null);
  
  // Loading states - SIMPLIFIED
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  
  // Track dark mode state
  const [currentDarkMode, setCurrentDarkMode] = useState(isDarkMode());
  
  // Refs for managing load state - SIMPLIFIED
  const loadInProgressRef = useRef(false);

  /**
   * Execute Supabase query with timeout
   * SIMPLIFIED - no complex retry logic, just timeout
   */
  const executeWithTimeout = useCallback(async <T,>(
    queryFn: () => PromiseLike<{ data: T | null; error: any }>,
    timeoutMs = 8000
  ): Promise<{ data: T | null; error: any }> => {
    try {
      const result = await Promise.race([
        queryFn(),
        new Promise<{ data: null; error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
        )
      ]);
      return result;
    } catch (err: any) {
      logger.warn('[Home] Query failed:', err.message);
      return { data: null, error: err };
    }
  }, []);

  // Load component order configuration
  const loadOrderConfig = useCallback(async () => {
    const { data, error } = await executeWithTimeout<{ setting_value: string } | null>(() =>
      supabase
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", "homepage_component_order")
        .maybeSingle()
    );

    if (error || !data) return;

    if (data.setting_value) {
      try {
        const parsed = JSON.parse(data.setting_value) as HomepageOrderConfig;
        setOrderConfig(parsed);
      } catch (parseError) {
        logger.error('[Home] Error parsing order config:', parseError);
      }
    }
  }, [executeWithTimeout]);

  // Load banners
  const loadBanners = useCallback(async () => {
    const { data: bannersData, error: bannersError } = await executeWithTimeout<any[]>(() =>
      supabase
        .from("homepage_banners")
        .select("*")
        .neq("is_active", false)
        .order("position_order", { ascending: true, nullsFirst: false })
    );
    
    if (bannersError || !bannersData || bannersData.length === 0) {
      setBanners([]);
      return;
    }
    
    // Load images for banners
    const bannerIds = bannersData.map((b: any) => b.id);
    const { data: imagesData } = await executeWithTimeout<any[]>(() =>
      supabase
        .from("banner_images")
        .select("id, banner_id, image_url, display_order, alt_text, is_active")
        .in("banner_id", bannerIds)
        .neq("is_active", false)
        .order("display_order", { ascending: true, nullsFirst: false })
    );

    const bannersWithImages = bannersData.map((banner: any) => ({
      ...banner,
      banner_images: (imagesData || []).filter((img: any) => img.banner_id === banner.id)
    }));
    
    setBanners(bannersWithImages as Banner[]);
  }, [executeWithTimeout]);

  // Load sections
  const loadSections = useCallback(async () => {
    const { data, error } = await executeWithTimeout<any[]>(() =>
      supabase
        .from("homepage_sections")
        .select("*")
        .neq("is_active", false)
        .order("display_order", { ascending: true, nullsFirst: false })
    );
    
    if (error || !data || data.length === 0) return;
    
    const sectionsMap: any = {};
    data.forEach((section: any) => {
      sectionsMap[section.section_key] = section;
    });
    setSections(sectionsMap);
    setOrderedSections(data);
  }, [executeWithTimeout]);

  // Load quick access cards
  const loadQuickAccessCards = useCallback(async () => {
    const { data, error } = await executeWithTimeout<any[]>(() =>
      supabase
        .from("homepage_quick_access_cards")
        .select("*")
        .neq("is_active", false)
        .order("display_order", { ascending: true, nullsFirst: false })
    );
    
    if (!error && data) {
      setQuickAccessCards(data);
    }
  }, [executeWithTimeout]);

  // Load features
  const loadFeatures = useCallback(async () => {
    const { data, error } = await executeWithTimeout<any[]>(() =>
      supabase
        .from("homepage_features")
        .select("*")
        .neq("is_active", false)
        .order("display_order", { ascending: true, nullsFirst: false })
    );
    
    if (!error && data) {
      setFeatures(data);
    }
  }, [executeWithTimeout]);

  // Load featured products
  const loadFeaturedProducts = useCallback(async () => {
    const { data, error: productsError } = await executeWithTimeout<any[]>(() =>
      supabase
        .from("products")
        .select(`
          *,
          images:product_images(image_url, display_order),
          product_roles(role)
        `)
        .is("deleted_at", null)
        .order('created_at', { ascending: false })
        .limit(5)
    );
    
    if (productsError || !data) return;

    // Get user session (don't block if fails)
    let user = null;
    let userRoles: string[] = [];
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user ?? null;
      
      if (user) {
        const { data: rolesData } = await executeWithTimeout<any[]>(() =>
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
        );
        userRoles = (rolesData || [])
          .map((r: any) => String(r.role || '').trim().toLowerCase())
          .filter((role: string) => role.length > 0);
      }
    } catch (authError) {
      logger.warn('[Home] Auth error (continuing without user):', authError);
    }

    // Filter products based on roles
    const visibleProducts = data.filter((product: any) => {
      const productRolesList = product.product_roles || [];
      const productRolesNormalized = productRolesList
        .map((pr: any) => String(pr?.role || '').trim().toLowerCase())
        .filter((role: string) => role.length > 0);

      if (productRolesNormalized.length === 0) {
        return true;
      }

      if (!user || userRoles.length === 0) {
        return false;
      }
      return productRolesNormalized.some((productRole: string) => userRoles.includes(productRole));
    });
    
    const productsWithSortedImages = visibleProducts.map((product: any) => ({
      ...product,
      images: product.images?.sort((a: any, b: any) => a.display_order - b.display_order) || []
    }));
    setFeaturedProducts(productsWithSortedImages);
  }, [executeWithTimeout]);

  /**
   * Reload all homepage data - REWRITTEN FOR RELIABILITY
   * GUARANTEED to complete and reset loading state
   */
  const reloadAllData = useCallback(async () => {
    // Prevent concurrent reloads
    if (loadInProgressRef.current) {
      logger.info('[Home] Reload already in progress, skipping');
      return;
    }

    logger.info('[Home] Reloading all homepage data...');
    loadInProgressRef.current = true;
    setIsLoading(true);
    setLoadError(false);

    try {
      // Wait for connection if still connecting
      if (isConnecting) {
        logger.info('[Home] Waiting for connection to establish...');
        // Wait up to 3 seconds for connection to be ready
        for (let i = 0; i < 6; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          if (isConnected) {
            logger.info('[Home] Connection established, proceeding with load');
            break;
          }
          if (isFailed) {
            logger.warn('[Home] Connection failed while waiting');
            break;
          }
        }
      }

      // Load all data in parallel
      // Even if some fail, others should succeed
      const results = await Promise.allSettled([
        loadFeaturedProducts(),
        loadBanners(),
        loadSections(),
        loadQuickAccessCards(),
        loadFeatures(),
        loadOrderConfig()
      ]);

      // Check if any succeeded
      const anySucceeded = results.some(r => r.status === 'fulfilled');
      
      if (!anySucceeded) {
        logger.error('[Home] All data loads failed');
        setLoadError(true);
      } else {
        logger.info('[Home] Homepage data loaded successfully');
        setLoadError(false);
      }

    } catch (error) {
      logger.error('[Home] Error loading homepage data:', error);
      setLoadError(true);
    } finally {
      // CRITICAL: Always reset loading state
      setIsLoading(false);
      loadInProgressRef.current = false;
      logger.info('[Home] Reload complete');
    }
  }, [isConnected, isConnecting, loadFeaturedProducts, loadBanners, loadSections, loadQuickAccessCards, loadFeatures, loadOrderConfig]);

  // Listen for theme mode changes to update section background colors
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const newDarkMode = isDarkMode();
          setCurrentDarkMode(prevMode => {
            if (newDarkMode !== prevMode) {
              logger.log(`🎨 [Home] Theme mode changed: ${newDarkMode ? 'dark' : 'light'}`);
              return newDarkMode;
            }
            return prevMode;
          });
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, []);

  // Initial data load - simple and direct
  useEffect(() => {
    // Load data immediately
    reloadAllData();

    // Subscribe to auth state changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      loadFeaturedProducts();
    });

    // Subscribe to product changes for real-time updates
    const productsChannel = supabase.channel('homepage-products-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'products'
    }, loadFeaturedProducts).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'product_images'
    }, loadFeaturedProducts).subscribe();

    // Subscribe to banner changes
    const bannersChannel = supabase.channel('homepage-banners-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'homepage_banners'
    }, loadBanners).subscribe();

    // Subscribe to sections changes
    const sectionsChannel = supabase.channel('homepage-sections-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'homepage_sections'
    }, loadSections).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'homepage_quick_access_cards'
    }, loadQuickAccessCards).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'homepage_features'
    }, loadFeatures).subscribe();

    // Subscribe to order config changes
    const orderChannel = supabase.channel('homepage-order-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'site_settings',
      filter: 'setting_key=eq.homepage_component_order'
    }, loadOrderConfig).subscribe();

    return () => {
      authSubscription.unsubscribe();
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(bannersChannel);
      supabase.removeChannel(sectionsChannel);
      supabase.removeChannel(orderChannel);
    };
  }, [loadOrderConfig, reloadAllData, loadFeaturedProducts, loadBanners, loadSections, loadQuickAccessCards, loadFeatures]);

  // Listen for session/connection recovery events
  // IMPORTANT: Do NOT listen to visibilitychange/pageshow/focus here!
  // Those are handled by useConnectionRecovery and useSessionRecovery,
  // which dispatch 'connection-recovered' and 'session-recovered' events.
  // Listening here would cause triple loading attempts and race conditions.
  useEffect(() => {
    const handleRecovery = () => {
      logger.info('[Home] Recovery event received, reloading data...');
      // No debounce needed - reloadAllData has its own concurrency protection
      reloadAllData();
    };

    // Only listen to recovery events dispatched by global hooks
    // Do NOT add visibilitychange, pageshow, online, or focus listeners here
    window.addEventListener('session-recovered', handleRecovery);
    window.addEventListener('connection-recovered', handleRecovery);

    return () => {
      window.removeEventListener('session-recovered', handleRecovery);
      window.removeEventListener('connection-recovered', handleRecovery);
    };
  }, [reloadAllData]);

  // Helper function to get banners by section
  const getBannersBySection = (section: string) => {
    return banners.filter(b => b.page_section === section);
  };
  // Renderizar sección de banners dinámicamente
  const renderBannersSection = (section: string, className: string = "") => {
    const sectionBanners = getBannersBySection(section);
    if (sectionBanners.length === 0) return null;
    return <section className={`py-4 md:py-8 lg:py-12 ${className}`}>
        <div className="container mx-auto px-3 md:px-4">
          <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {sectionBanners.map(banner => <TranslatedBanner key={banner.id} banner={banner} />)}
          </div>
        </div>
      </section>;
  };

  // Renderizar una sección específica basada en su section_key
  const renderSection = (sectionData: HomepageSection) => {
    switch (sectionData.section_key) {
      case 'featured_products':
        // Featured Products Section
        if (featuredProducts.length === 0) return null;
        return (
          <section 
            key={sectionData.id}
            className="py-4 md:py-8 lg:py-12 relative overflow-hidden"
            style={{
              ...getSectionStyles(sectionData),
              ...(!hasCustomSectionStyles(sectionData) 
                ? { background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.03), transparent)' } 
                : {})
            }}
          >
            {!hasCustomSectionStyles(sectionData) && (
              <div className="absolute inset-0 bg-gradient-primary opacity-5 bg-red-100"></div>
            )}
            <div className="container mx-auto px-3 md:px-4 relative z-10">
              <div className="text-center mb-4 md:mb-6 lg:mb-8">
                <h2 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold mb-2 md:mb-4 text-center text-foreground">
                  <TranslatedText entityType="homepage_sections" entityId={sectionData.id} field="title" originalText={sectionData.title} />
                </h2>
                <p className="text-muted-foreground text-sm md:text-base lg:text-lg">
                  <TranslatedText entityType="homepage_sections" entityId={sectionData.id} field="subtitle" originalText={sectionData.subtitle || ''} />
                </p>
              </div>
              <FeaturedProductsCarousel products={featuredProducts} maxVisible={4} />
            </div>
          </section>
        );
      
      case 'quick_access':
        // Quick Access Cards Section
        if (quickAccessCards.length === 0) return null;
        return (
          <section 
            key={sectionData.id}
            className="py-4 md:py-8 lg:py-12 text-foreground"
            style={getSectionStyles(sectionData)}
          >
            <div className="container mx-auto px-3 md:px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                {quickAccessCards.map((card: any, index: number) => <TranslatedQuickAccessCard key={card.id} card={card} index={index} />)}
              </div>
            </div>
          </section>
        );
      
      case 'why_us':
        // Features/Why Us Section
        return (
          <section 
            key={sectionData.id}
            className="py-6 md:py-12 lg:py-20 relative overflow-hidden"
            style={getSectionStyles(sectionData)}
          >
            {!hasCustomSectionStyles(sectionData) && (
              <div className="absolute inset-0 bg-gradient-hero opacity-5"></div>
            )}
            <div className="container mx-auto px-3 md:px-4 relative z-10">
              <TranslatedSectionTitle section={sectionData} fallbackTitle={t('whyUs.title')} fallbackSubtitle={t('whyUs.subtitle')} />
              {features.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                  {features.map((feature: any, index: number) => <TranslatedFeatureCard key={feature.id} feature={feature} index={index} />)}
                </div> : <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                  <FeatureCard icon={Sparkles} title={t('whyUs.quality.title')} description={t('whyUs.quality.description')} colorClass="primary" />
                  <FeatureCard icon={Zap} title={t('whyUs.speed.title')} description={t('whyUs.speed.description')} colorClass="secondary" />
                  <FeatureCard icon={Shield} title={t('whyUs.guarantee.title')} description={t('whyUs.guarantee.description')} colorClass="accent" />
                </div>}
            </div>
          </section>
        );
      
      default:
        // Custom/Other Sections
        return <CustomSection key={sectionData.id} section={sectionData} />;
    }
  };

  // Helper to check if a section_key exists in orderedSections
  const hasSectionKey = (key: string) => orderedSections.some(s => s.section_key === key);

  // Reusable Quick Access Cards section component
  const QuickAccessCardsSection = () => (
    <section className="py-4 md:py-8 lg:py-12 text-foreground">
      <div className="container mx-auto px-3 md:px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {quickAccessCards.map((card: any, index: number) => (
            <TranslatedQuickAccessCard key={card.id} card={card} index={index} />
          ))}
        </div>
      </div>
    </section>
  );

  // Reusable Why Us section component
  const WhyUsSection = () => (
    <section className="py-6 md:py-12 lg:py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero opacity-5"></div>
      <div className="container mx-auto px-3 md:px-4 relative z-10">
        <div className="text-center mb-6 md:mb-8 lg:mb-12">
          <h2 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold mb-2 md:mb-4">
            {t('whyUs.title')}
          </h2>
          <p className="text-muted-foreground text-sm md:text-base lg:text-lg">
            {t('whyUs.subtitle')}
          </p>
        </div>
        {features.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {features.map((feature: any, index: number) => (
              <TranslatedFeatureCard key={feature.id} feature={feature} index={index} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            <FeatureCard icon={Sparkles} title={t('whyUs.quality.title')} description={t('whyUs.quality.description')} colorClass="primary" />
            <FeatureCard icon={Zap} title={t('whyUs.speed.title')} description={t('whyUs.speed.description')} colorClass="secondary" />
            <FeatureCard icon={Shield} title={t('whyUs.guarantee.title')} description={t('whyUs.guarantee.description')} colorClass="accent" />
          </div>
        )}
      </div>
    </section>
  );

  // Render fallback sections when no sections are configured in the database
  const renderFallbackSections = () => {
    return (
      <>
        {/* Featured Products Fallback */}
        {featuredProducts.length > 0 && (
          <section className="py-4 md:py-8 lg:py-12 relative overflow-hidden" style={{ background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.03), transparent)' }}>
            <div className="absolute inset-0 bg-gradient-primary opacity-5 bg-red-100"></div>
            <div className="container mx-auto px-3 md:px-4 relative z-10">
              <div className="text-center mb-4 md:mb-6 lg:mb-8">
                <h2 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold mb-2 md:mb-4 text-center text-foreground">
                  {t('featured.title')}
                </h2>
                <p className="text-muted-foreground text-sm md:text-base lg:text-lg">
                  {t('featured.subtitle')}
                </p>
              </div>
              <FeaturedProductsCarousel products={featuredProducts} maxVisible={4} />
            </div>
          </section>
        )}
        
        {/* Quick Access Cards Fallback */}
        {quickAccessCards.length > 0 && <QuickAccessCardsSection />}
        
        {/* Features/Why Us Fallback */}
        <WhyUsSection />
      </>
    );
  };

  // Render Quick Access Cards section independently if no matching section exists
  const renderQuickAccessIfNeeded = () => {
    if (quickAccessCards.length === 0 || hasSectionKey('quick_access')) return null;
    return <QuickAccessCardsSection />;
  };
  
  // Render Features/Why Us section independently if no matching section exists
  const renderWhyUsIfNeeded = () => {
    if (hasSectionKey('why_us')) return null;
    return <WhyUsSection />;
  };

  // Render component based on order configuration
  const renderOrderedComponent = (component: HomepageComponentOrder) => {
    if (!component.isActive) return null;

    switch (component.type) {
      case 'featured_products': {
        const featuredSection = orderedSections.find(s => s.id === component.id || s.section_key === 'featured_products');
        if (featuredSection) {
          return renderSection(featuredSection);
        }
        // Fallback for featured products
        if (featuredProducts.length > 0) {
          return (
            <section key="featured_products_fallback" className="py-4 md:py-8 lg:py-12 relative overflow-hidden" style={{ background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.03), transparent)' }}>
              <div className="absolute inset-0 bg-gradient-primary opacity-5 bg-red-100"></div>
              <div className="container mx-auto px-3 md:px-4 relative z-10">
                <div className="text-center mb-4 md:mb-6 lg:mb-8">
                  <h2 className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold mb-2 md:mb-4 text-center text-foreground">
                    {t('featured.title')}
                  </h2>
                  <p className="text-muted-foreground text-sm md:text-base lg:text-lg">
                    {t('featured.subtitle')}
                  </p>
                </div>
                <FeaturedProductsCarousel products={featuredProducts} maxVisible={4} />
              </div>
            </section>
          );
        }
        return null;
      }

      case 'quick_access_card': {
        const quickAccessSection = orderedSections.find(s => s.id === component.id || s.section_key === 'quick_access');
        if (quickAccessSection) {
          return renderSection(quickAccessSection);
        }
        // Fallback for quick access cards
        if (quickAccessCards.length > 0) {
          return <QuickAccessCardsSection key="quick_access_fallback" />;
        }
        return null;
      }

      case 'why_us': {
        const whyUsSection = orderedSections.find(s => s.id === component.id || s.section_key === 'why_us');
        if (whyUsSection) {
          return renderSection(whyUsSection);
        }
        // Fallback for why us section
        return <WhyUsSection key="why_us_fallback" />;
      }

      case 'section': {
        const customSection = orderedSections.find(s => s.id === component.id);
        if (customSection) {
          return renderSection(customSection);
        }
        return null;
      }

      default:
        return null;
    }
  };

  // Generate ordered components list based on order config or defaults
  const getOrderedComponentsList = (): HomepageComponentOrder[] => {
    if (orderConfig?.components && orderConfig.components.length > 0) {
      return orderConfig.components
        .filter(c => c.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder);
    }

    // Default order when no config is saved
    const defaultComponents: HomepageComponentOrder[] = [];
    let order = 0;

    // Add featured products first
    const featuredSection = orderedSections.find(s => s.section_key === 'featured_products');
    if (featuredSection || featuredProducts.length > 0) {
      defaultComponents.push({
        id: featuredSection?.id || 'featured_products_default',
        type: 'featured_products',
        displayOrder: order++,
        isActive: true,
        label: featuredSection?.title || 'Productos Destacados'
      });
    }

    // Add quick access cards
    const quickAccessSection = orderedSections.find(s => s.section_key === 'quick_access');
    if (quickAccessSection || quickAccessCards.length > 0) {
      defaultComponents.push({
        id: quickAccessSection?.id || 'quick_access_default',
        type: 'quick_access_card',
        displayOrder: order++,
        isActive: true,
        label: quickAccessSection?.title || 'Accesos Rápidos'
      });
    }

    // Add why us section
    const whyUsSection = orderedSections.find(s => s.section_key === 'why_us');
    defaultComponents.push({
      id: whyUsSection?.id || 'why_us_default',
      type: 'why_us',
      displayOrder: order++,
      isActive: true,
      label: whyUsSection?.title || '¿Por Qué Elegirnos?'
    });

    // Add other custom sections
    orderedSections
      .filter(s => !['featured_products', 'quick_access', 'why_us'].includes(s.section_key))
      .forEach(section => {
        defaultComponents.push({
          id: section.id,
          type: 'section',
          displayOrder: order++,
          isActive: section.is_active !== false,
          label: section.title
        });
      });

    return defaultComponents;
  };

  // Show connection/loading state - USING NEW CONNECTION STATE
  if ((isConnecting || isLoading) && !isFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">{t('common:connection.connecting', { defaultValue: 'Conectando...' })}</p>
        </div>
      </div>
    );
  }

  // Show error state with retry button - USING NEW CONNECTION STATE
  if (isFailed || loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <div className="text-destructive mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {t('common:connection.error', { defaultValue: 'Error de conexión' })}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t('common:connection.errorMessage', { defaultValue: 'No se pudo conectar al servidor. Por favor, verifica tu conexión a internet e intenta de nuevo.' })}
          </p>
          <Button 
            onClick={() => {
              setLoadError(false);
              reloadAllData();
            }}
            className="mt-4"
          >
            {t('common:connection.retry', { defaultValue: 'Reintentar' })}
          </Button>
        </div>
      </div>
    );
  }

  return <div className="min-h-screen">
      {/* Hero Banner with Gradient - Banners de tipo "hero" */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <HeroBanner />
      </div>

      {/* Render components based on order configuration */}
      {getOrderedComponentsList().map(component => renderOrderedComponent(component))}

      {/* Banners al final de la página */}
      {renderBannersSection('bottom', 'bg-gradient-to-t from-muted/20 to-background')}
    </div>;
};

// Parallax-enabled Quick Access Card Component
const QuickAccessCard = ({
  icon: Icon,
  title,
  description,
  link,
  buttonText,
  colorClass,
  variant = "default"
}: {
  icon: any;
  title: string;
  description: string;
  link: string;
  buttonText: string;
  colorClass: string;
  variant?: "default" | "secondary" | "outline";
}) => {
  const cardRef = useParallax({
    speed: 0.15,
    direction: 'up'
  });

  // Configurar clases según el tipo de tarjeta
  const iconColor = colorClass === 'primary' ? 'text-primary' : colorClass === 'secondary' ? 'text-secondary' : 'text-accent';
  const titleColor = colorClass === 'primary' ? 'text-primary' : colorClass === 'secondary' ? 'text-secondary' : 'text-accent';
  const borderHoverColor = colorClass === 'primary' ? 'hover:border-primary/50' : colorClass === 'secondary' ? 'hover:border-secondary/50' : 'hover:border-accent/50';
  return <div ref={cardRef} className="will-change-transform">
      <Card className={`group hover:shadow-strong transition-all duration-300 hover:-translate-y-2 border-2 ${borderHoverColor}`}>
        <CardHeader className="p-3 md:p-4 lg:pb-4">
          <div className="relative">
            <Icon className={`h-10 w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 mb-2 md:mb-4 ${iconColor} group-hover:scale-110 transition-transform duration-300`} />
          </div>
          <CardTitle className={`text-base md:text-lg lg:text-xl xl:text-2xl ${titleColor}`}>
            {title}
          </CardTitle>
          <CardDescription className="text-xs md:text-sm lg:text-base text-muted-foreground">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 p-3 md:p-4">
          <Button asChild variant={variant} className="w-full text-xs md:text-sm group/btn hover:shadow-medium transition-all duration-300 h-8 md:h-10">
            <Link to={link}>
              {buttonText}
              <ArrowRight className="ml-1 md:ml-2 h-3 w-3 md:h-4 md:w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>;
};

// Parallax-enabled Feature Card Component
const FeatureCard = ({
  icon: Icon,
  title,
  description,
  colorClass
}: {
  icon: any;
  title: string;
  description: string;
  colorClass: string;
}) => {
  const cardRef = useParallax({
    speed: 0.2,
    direction: 'up'
  });
  const iconColor = colorClass === 'primary' ? 'text-primary' : colorClass === 'secondary' ? 'text-secondary' : 'text-accent';
  const borderHoverColor = colorClass === 'primary' ? 'hover:border-primary/30' : colorClass === 'secondary' ? 'hover:border-secondary/30' : 'hover:border-accent/30';
  return <div ref={cardRef} className="will-change-transform">
      <Card className={`group hover:shadow-strong transition-all duration-300 hover:-translate-y-2 text-center border-2 ${borderHoverColor}`}>
        <CardHeader className="p-3 md:p-4 lg:p-6">
          <div className="mx-auto relative">
            <Icon className={`h-10 w-10 md:h-12 md:w-12 lg:h-16 lg:w-16 mb-2 md:mb-4 ${iconColor} group-hover:scale-110 transition-transform duration-300 mx-auto`} />
          </div>
          <CardTitle className="text-base md:text-lg lg:text-xl xl:text-2xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4 lg:p-6 pt-0">
          <p className="text-muted-foreground text-xs md:text-sm lg:text-base">
            {description}
          </p>
        </CardContent>
      </Card>
    </div>;
};
export default Home;