import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
import { useParallax } from "@/hooks/useParallax";
import { RichTextDisplay } from "@/components/RichTextDisplay";

// Helper function to calculate responsive font size based on banner height
const getResponsiveFontSize = (bannerHeight: string, baseRatio: number, minSize: string, maxSize: string) => {
  const height = parseFloat(bannerHeight) || 400;
  // Use viewport-based sizing with proper constraints
  return `clamp(${minSize}, ${(height / baseRatio).toFixed(1)}px, ${maxSize})`;
};

export default function HeroBanner() {
  const { t } = useTranslation('home');
  const [banners, setBanners] = useState<any[]>([]);
  const [heroBgColor, setHeroBgColor] = useState<string>('');
  const navigate = useNavigate();
  const parallaxRef = useParallax({ speed: 0.2, direction: 'down' });

  useEffect(() => {
    loadBanners();
    loadHeroBgColor();

    // Subscribe to banner changes for real-time updates
    const bannersChannel = supabase
      .channel('homepage-banners-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'homepage_banners'
      }, loadBanners)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'site_customization'
      }, loadHeroBgColor)
      .subscribe();

    return () => {
      supabase.removeChannel(bannersChannel);
    };
  }, []);

  const loadBanners = async () => {
    // Cargar banners activos de la sección hero
    const { data: bannersData } = await supabase
      .from("homepage_banners")
      .select("*")
      .eq("is_active", true)
      .eq("page_section", "hero")
      .order("display_order", { ascending: true });
    
    if (!bannersData || bannersData.length === 0) {
      setBanners([]);
      return;
    }
    
    // Cargar imágenes para estos banners
    const bannerIds = bannersData.map(b => b.id);
    const { data: imagesData } = await supabase
      .from("banner_images")
      .select("id, banner_id, image_url, display_order, alt_text, is_active")
      .in("banner_id", bannerIds)
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    
    // Combinar banners con sus imágenes
    const bannersWithImages = bannersData.map(banner => ({
      ...banner,
      banner_images: (imagesData || []).filter(img => img.banner_id === banner.id)
    }));
    
    setBanners(bannersWithImages);
  };

  const loadHeroBgColor = async () => {
    const { data } = await supabase
      .from("site_customization")
      .select("home_hero_bg_color")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data?.home_hero_bg_color) {
      setHeroBgColor(data.home_hero_bg_color);
    }
  };

  const handleBannerClick = (linkUrl: string) => {
    if (!linkUrl) return;
    
    if (linkUrl.startsWith('http')) {
      window.open(linkUrl, '_blank');
    } else {
      navigate(linkUrl);
    }
  };

  if (banners.length === 0) return null;

  // Flatten banners: if a banner has multiple images, create separate items for each
  const carouselItems: Array<{ banner: any; imageUrl: string }> = [];
  banners.forEach(banner => {
    if (banner.banner_images && banner.banner_images.length > 0) {
      // Sort banner images by display_order
      const sortedImages = [...banner.banner_images].sort((a, b) => a.display_order - b.display_order);
      sortedImages.forEach(img => {
        if (img.is_active) {
          carouselItems.push({ banner, imageUrl: img.image_url });
        }
      });
    } else if (banner.image_url) {
      // Use the single image from the banner
      carouselItems.push({ banner, imageUrl: banner.image_url });
    }
  });

  if (carouselItems.length === 0) return null;

  // Helper function to get object-fit style for size_mode
  const getBackgroundSize = (sizeMode: string) => {
    switch (sizeMode) {
      case 'contain':
        return 'contain';
      case 'fill':
        return '100% 100%';
      default:
        return 'cover';
    }
  };

  return (
    <Carousel
      opts={{ loop: true }}
      plugins={[
        Autoplay({
          delay: 5000,
        }),
      ]}
      className="w-full"
    >
      <CarouselContent>
        {carouselItems.map((item, index) => {
          const bannerHeight = item.banner.height || '400px';
          
          return (
            <CarouselItem key={`${item.banner.id}-${index}`}>
              <div 
                className="relative overflow-hidden"
                style={{ 
                  height: bannerHeight,
                  width: item.banner.width || '100%'
                }}
              >
                <div 
                  ref={parallaxRef}
                  className="absolute inset-0 bg-center will-change-transform"
                  style={{
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.5)), url(${item.imageUrl})`,
                    backgroundColor: heroBgColor || 'transparent',
                    backgroundSize: getBackgroundSize(item.banner.size_mode || 'cover'),
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    transform: 'translate3d(0, 0, 0)'
                  }}
                />
                <div className="absolute inset-0 container mx-auto px-4 sm:px-6 h-full flex items-center justify-center">
                  <div 
                    className="w-full max-w-3xl text-white z-10 text-center px-2 sm:px-4"
                    style={{
                      maxHeight: '85%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <h1 
                      className="font-bold animate-fade-in leading-tight w-full"
                      style={{ 
                        color: item.banner.title_color || '#ffffff',
                        fontSize: getResponsiveFontSize(bannerHeight, 12, '1.25rem', '3.5rem'),
                        lineHeight: '1.15',
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word'
                      }}
                    >
                      {item.banner.title}
                    </h1>
                    {item.banner.description && (
                      <div 
                        className="w-full max-w-2xl overflow-hidden"
                        style={{ 
                          color: item.banner.text_color || 'rgba(255,255,255,0.95)',
                          fontSize: getResponsiveFontSize(bannerHeight, 25, '0.875rem', '1.25rem'),
                          lineHeight: '1.5',
                          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                          maxHeight: '40%'
                        }}
                      >
                        <RichTextDisplay content={item.banner.description} className="line-clamp-4" />
                      </div>
                    )}
                    {item.banner.link_url && (
                      <Button 
                        variant="secondary"
                        onClick={() => handleBannerClick(item.banner.link_url)}
                        className="mt-2 sm:mt-4 shadow-lg hover:shadow-xl transition-all"
                        style={{
                          fontSize: getResponsiveFontSize(bannerHeight, 35, '0.75rem', '1rem'),
                          padding: `${getResponsiveFontSize(bannerHeight, 60, '0.5rem', '0.875rem')} ${getResponsiveFontSize(bannerHeight, 25, '1rem', '1.75rem')}`
                        }}
                      >
                        {t('hero.viewMore')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious className="left-2 sm:left-4 h-8 w-8 sm:h-10 sm:w-10" />
      <CarouselNext className="right-2 sm:right-4 h-8 w-8 sm:h-10 sm:w-10" />
    </Carousel>
  );
}
