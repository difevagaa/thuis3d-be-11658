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
import { createChannel, removeChannels } from "@/lib/channelManager";

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
        <CardHeader className="pb-2 md:pb-3">
          <CardTitle 
            className="text-sm md:text-base lg:text-lg"
            style={titleColor ? { color: titleColor } : undefined}
          >
            {content.title}
          </CardTitle>
          {content.description && (
            <CardDescription 
              className="text-xs md:text-sm"
              style={textColor ? { color: textColor } : undefined}
            >
              <RichTextDisplay content={content.description} className="line-clamp-2" />
            </CardDescription>
          )}
        </CardHeader>
      </Card>;
  } else {
    // Single image card
    return <Card className="group hover:shadow-strong transition-all duration-300 hover:-translate-y-2 overflow-hidden cursor-pointer" style={{
      width: banner.width || '100%',
      maxWidth: '100%'
    }} onClick={handleClick}>
        <div className="relative overflow-hidden" style={{ height: cardBannerHeight }}>
          {renderMedia(images[0].image_url, images[0].alt_text || content.title)}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
        <CardHeader className="pb-2 md:pb-3">
          <CardTitle 
            className="text-sm md:text-base lg:text-lg"
            style={titleColor ? { color: titleColor } : undefined}
          >
            {content.title}
          </CardTitle>
          {content.description && (
            <CardDescription 
              className="text-xs md:text-sm"
              style={textColor ? { color: textColor } : undefined}
            >
              <RichTextDisplay content={content.description} className="line-clamp-2" />
            </CardDescription>
          )}
        </CardHeader>
      </Card>;
  }
};

// Quick Access Card Component
const QuickAccessCard = ({
  icon: Icon,
  title,
  description,
  link,
  buttonText,
  colorClass = "primary",
  variant = "default"
}: {
  icon: any;
  title: string;
  description: string;
  link: string;
  buttonText: string;
  colorClass?: string;
  variant?: "default" | "secondary" | "outline";
}) => {
  const navigate = useNavigate();
  return (
    <Card className="group hover:shadow-strong transition-all duration-300 hover:-translate-y-2 h-full">
      <CardHeader className="text-center pb-2 md:pb-4">
        <div className={`mx-auto mb-2 md:mb-3 w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full bg-${colorClass}/10 flex items-center justify-center group-hover:bg-${colorClass}/20 transition-colors`}>
          <Icon className={`h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 text-${colorClass}`} />
        </div>
        <CardTitle className="text-base md:text-lg lg:text-xl">{title}</CardTitle>
        <CardDescription className="text-xs md:text-sm lg:text-base">{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-center pt-0">
        <Button 
          variant={variant} 
          className="text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2" 
          onClick={() => navigate(link)}
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
};

// Feature Card Component
const FeatureCard = ({
  icon: Icon,
  title,
  description,
  colorClass = "primary"
}: {
  icon: any;
  title: string;
  description: string;
  colorClass?: string;
}) => (
  <div className="text-center p-3 md:p-4 lg:p-6">
    <div className={`mx-auto mb-2 md:mb-3 lg:mb-4 w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full bg-${colorClass}/10 flex items-center justify-center`}>
      <Icon className={`h-5 w-5 md:h-6 md:w-6 lg:h-8 lg:w-8 text-${colorClass}`} />
    </div>
    <h3 className="font-semibold mb-1 md:mb-2 text-sm md:text-base lg:text-lg">{title}</h3>
    <p className="text-muted-foreground text-xs md:text-sm">{description}</p>
  </div>
);

// Banner interface
interface Banner {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  link_url?: string;
  video_url?: string;
  display_order?: number;
  position_order?: number;
  is_active: boolean;
  page_section: string;
  height?: string;
  width?: string;
  size_mode?: string;
  display_style?: string;
  title_color?: string;
  text_color?: string;
}

const Home = () => {
  const { t } = useTranslation(['home', 'common']);
  const navigate = useNavigate();
  
  // Data states
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [sections, setSections] = useState<any>({});
  const [orderedSections, setOrderedSections] = useState<any[]>([]);
  const [quickAccessCards, setQuickAccessCards] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [orderConfig, setOrderConfig] = useState<HomepageOrderConfig | null>(null);
  
  // Loading state - ULTRA SIMPLIFIED
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  
  // Track dark mode state
  const [currentDarkMode, setCurrentDarkMode] = useState(isDarkMode());

  /**
   * Execute Supabase query - SIMPLE AND RELIABLE
   * No timeout tricks, just try and return result
   */
  const executeQuery = useCallback(async <T,>(
    queryFn: () => PromiseLike<{ data: T | null; error: any }>
  ): Promise<T | null> => {
    try {
      const result = await queryFn();
      if (result.error) {
        logger.warn('[Home] Query error:', result.error.message);
        return null;
      }
      return result.data;
    } catch (err: any) {
      logger.warn('[Home] Query failed:', err.message);
      return null;
    }
  }, []);

  // Load component order configuration
  const loadOrderConfig = useCallback(async () => {
    const data = await executeQuery<{ setting_value: string }>(() =>
      supabase
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", "homepage_component_order")
        .maybeSingle()
    );

    if (data?.setting_value) {
      try {
        const parsed = JSON.parse(data.setting_value) as HomepageOrderConfig;
        setOrderConfig(parsed);
      } catch (parseError) {
        logger.error('[Home] Error parsing order config:', parseError);
      }
    }
  }, [executeQuery]);

  // Load banners
  const loadBanners = useCallback(async () => {
    const bannersData = await executeQuery<any[]>(() =>
      supabase
        .from("homepage_banners")
        .select("*")
        .neq("is_active", false)
        .order("position_order", { ascending: true, nullsFirst: false })
    );
    
    if (!bannersData || bannersData.length === 0) {
      setBanners([]);
      return;
    }
    
    // Load images for banners
    const bannerIds = bannersData.map((b: any) => b.id);
    const imagesData = await executeQuery<any[]>(() =>
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
  }, [executeQuery]);

  // Load sections
  const loadSections = useCallback(async () => {
    const data = await executeQuery<any[]>(() =>
      supabase
        .from("homepage_sections")
        .select("*")
        .neq("is_active", false)
        .order("display_order", { ascending: true, nullsFirst: false })
    );
    
    if (!data || data.length === 0) return;
    
    const sectionsMap: any = {};
    data.forEach((section: any) => {
      sectionsMap[section.section_key] = section;
    });
    setSections(sectionsMap);
    setOrderedSections(data);
  }, [executeQuery]);

  // Load quick access cards
  const loadQuickAccessCards = useCallback(async () => {
    const data = await executeQuery<any[]>(() =>
      supabase
        .from("homepage_quick_access_cards")
        .select("*")
        .neq("is_active", false)
        .order("display_order", { ascending: true, nullsFirst: false })
    );
    
    if (data) {
      setQuickAccessCards(data);
    }
  }, [executeQuery]);

  // Load features
  const loadFeatures = useCallback(async () => {
    const data = await executeQuery<any[]>(() =>
      supabase
        .from("homepage_features")
        .select("*")
        .neq("is_active", false)
        .order("display_order", { ascending: true, nullsFirst: false })
    );
    
    if (data) {
      setFeatures(data);
    }
  }, [executeQuery]);

  // Load featured products
  const loadFeaturedProducts = useCallback(async () => {
    const data = await executeQuery<any[]>(() =>
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
    
    if (!data) return;

    // Get user session (don't block if fails)
    let user = null;
    let userRoles: string[] = [];
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      user = session?.user ?? null;
      
      if (user) {
        const rolesData = await executeQuery<any[]>(() =>
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
  }, [executeQuery]);

  /**
   * Load all homepage data - SIMPLE VERSION
   */
  const loadAllData = useCallback(async () => {
    logger.info('[Home] Loading homepage data...');

    // Load all data in parallel - don't wait for all to succeed
    await Promise.allSettled([
      loadFeaturedProducts(),
      loadBanners(),
      loadSections(),
      loadQuickAccessCards(),
      loadFeatures(),
      loadOrderConfig()
    ]);

    logger.info('[Home] Homepage data loaded');
    setIsLoading(false);
    hasLoadedRef.current = true;
  }, [loadFeaturedProducts, loadBanners, loadSections, loadQuickAccessCards, loadFeatures, loadOrderConfig]);

  // Listen for theme mode changes to update section background colors
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const newDarkMode = isDarkMode();
          setCurrentDarkMode(prevMode => {
            if (newDarkMode !== prevMode) {
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

  // Initial data load - ONCE on mount
  useEffect(() => {
    // Load data immediately
    loadAllData();

    // Subscribe to auth state changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      loadFeaturedProducts();
    });

    // Channel names for cleanup
    const channelNames = [
      'homepage-products-changes',
      'homepage-banners-changes', 
      'homepage-sections-changes',
      'homepage-order-changes'
    ];

    // Subscribe to product changes for real-time updates
    const productsChannel = createChannel('homepage-products-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products'
      }, loadFeaturedProducts)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'product_images'
      }, loadFeaturedProducts)
      .subscribe();

    // Subscribe to banner changes
    const bannersChannel = createChannel('homepage-banners-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'homepage_banners'
      }, loadBanners)
      .subscribe();

    // Subscribe to sections changes
    const sectionsChannel = createChannel('homepage-sections-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'homepage_sections'
      }, loadSections)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'homepage_quick_access_cards'
      }, loadQuickAccessCards)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'homepage_features'
      }, loadFeatures)
      .subscribe();

    // Subscribe to order config changes
    const orderChannel = createChannel('homepage-order-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'site_settings',
        filter: 'setting_key=eq.homepage_component_order'
      }, loadOrderConfig)
      .subscribe();

    // CRITICAL: Cleanup on unmount
    return () => {
      authSubscription.unsubscribe();
      removeChannels(channelNames);
    };
  }, [loadAllData, loadFeaturedProducts, loadBanners, loadSections, loadQuickAccessCards, loadFeatures, loadOrderConfig]);

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
            className="py-4 md:py-8 lg:py-12"
            style={getSectionStyles(sectionData)}
          >
            <div className="container mx-auto px-3 md:px-4">
              <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {quickAccessCards.map((card, index) => (
                  <TranslatedQuickAccessCard key={card.id} card={card} index={index} />
                ))}
              </div>
            </div>
          </section>
        );
      
      case 'why_us':
        // Why Choose Us Section
        if (features.length === 0) return null;
        return (
          <section 
            key={sectionData.id}
            className="py-6 md:py-12 lg:py-16"
            style={getSectionStyles(sectionData)}
          >
            <div className="container mx-auto px-3 md:px-4">
              <TranslatedSectionTitle section={sectionData} fallbackTitle={t("home:whyUs.title")} fallbackSubtitle={t("home:whyUs.subtitle")} />
              <div className="grid gap-4 md:gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((feature, index) => (
                  <TranslatedFeatureCard key={feature.id} feature={feature} index={index} />
                ))}
              </div>
            </div>
          </section>
        );
      
      default:
        // Custom sections - render dynamically
        return <CustomSection key={sectionData.id} section={sectionData} />;
    }
  };

  // Render sections using order config
  const renderOrderedComponents = () => {
    if (!orderConfig?.components) {
      // Fallback: render all sections in their display_order
      return orderedSections.map(section => renderSection(section));
    }

    return orderConfig.components
      .filter(component => component.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(component => {
        // Find matching section data
        const sectionData = orderedSections.find(s => s.id === component.id);
        
        // Handle virtual components (quick_access_card is a virtual component)
        if (component.type === 'quick_access_card') {
          if (quickAccessCards.length === 0) return null;
          return (
            <section 
              key={component.id}
              className="py-4 md:py-8 lg:py-12"
            >
              <div className="container mx-auto px-3 md:px-4">
                <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {quickAccessCards.map((card, index) => (
                    <TranslatedQuickAccessCard key={card.id} card={card} index={index} />
                  ))}
                </div>
              </div>
            </section>
          );
        }

        // Regular sections need sectionData
        if (!sectionData) return null;
        
        return renderSection(sectionData);
      });
  };

  // Show simple spinner while loading
  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      {/* Hero Banner Section */}
      <HeroBanner />

      {/* Hero banners */}
      {renderBannersSection("hero")}

      {/* Pre-content banners */}
      {renderBannersSection("pre-content")}

      {/* Render ordered homepage components */}
      {renderOrderedComponents()}
      
      {/* Post-content banners */}
      {renderBannersSection("post-content")}

      {/* Footer banners */}
      {renderBannersSection("footer")}
    </div>
  );
};

export default Home;
