import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Autoplay from "embla-carousel-autoplay";
import { useScrollProgress } from "@/hooks/useScrollAnimation";
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
  const { ref: scrollRef, progress } = useScrollProgress();

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

  // Scroll-driven animation values
  const scrollOpacity = Math.max(0, 1 - progress * 1.8);
  const scrollScale = 1 + progress * 0.08;
  const scrollTranslateY = progress * 60;

  return (
    <div ref={scrollRef}>
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
                  {/* Background with scroll-driven scale */}
                  <div 
                    className="absolute inset-0 bg-center will-change-transform"
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%), url(${item.imageUrl})`,
                      backgroundColor: heroBgColor || 'transparent',
                      backgroundSize: getBackgroundSize(item.banner.size_mode || 'cover'),
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      transform: `scale(${scrollScale})`,
                    }}
                  />
                  {/* Content with scroll-driven fade & translate */}
                  <div 
                    className="absolute inset-0 container mx-auto px-4 sm:px-6 h-full flex items-center justify-center"
                    style={{
                      opacity: scrollOpacity,
                      transform: `translateY(${scrollTranslateY}px)`,
                    }}
                  >
                    <div 
                      className="w-full max-w-3xl text-white z-10 text-center px-2 sm:px-4"
                      style={{
                        maxHeight: '85%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}
                    >
                      <h1 
                        className="font-bold animate-fade-in leading-none w-full"
                        style={{ 
                          color: item.banner.title_color || '#ffffff',
                          // Ratio 10: bannerHeight/ratio yields a large cinematic display font
                          fontSize: getResponsiveFontSize(bannerHeight, 10, '1.5rem', '4rem'),
                          lineHeight: '1.08',
                          letterSpacing: '-0.04em',
                          textShadow: '0 2px 8px rgba(0,0,0,0.25)',
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
                            color: item.banner.text_color || 'rgba(255,255,255,0.9)',
                            fontSize: getResponsiveFontSize(bannerHeight, 25, '0.875rem', '1.25rem'),
                            lineHeight: '1.6',
                            letterSpacing: '-0.01em',
                            textShadow: '0 1px 4px rgba(0,0,0,0.2)',
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
                          className="mt-3 sm:mt-5 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full font-semibold"
                          style={{
                            fontSize: getResponsiveFontSize(bannerHeight, 35, '0.75rem', '1rem'),
                            padding: `${getResponsiveFontSize(bannerHeight, 60, '0.5rem', '0.875rem')} ${getResponsiveFontSize(bannerHeight, 20, '1.25rem', '2rem')}`
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
        <CarouselPrevious className="left-3 sm:left-5 h-10 w-10 rounded-full bg-white/20 backdrop-blur-md border-white/20 text-white hover:bg-white/30" />
        <CarouselNext className="right-3 sm:right-5 h-10 w-10 rounded-full bg-white/20 backdrop-blur-md border-white/20 text-white hover:bg-white/30" />
      </Carousel>
    </div>
  );
}
