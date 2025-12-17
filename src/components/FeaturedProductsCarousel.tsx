import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Package2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCarousel from "./ProductCarousel";
import { useParallax } from "@/hooks/useParallax";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  images: Array<{
    image_url: string;
    display_order: number;
  }>;
}

interface FeaturedProductsCarouselProps {
  products: Product[];
  maxVisible?: number;
}

// Translated Product Card Component - properly uses the translation hook
const TranslatedFeaturedProductCard = ({ 
  product 
}: { 
  product: Product;
}) => {
  const { t } = useTranslation('home');
  const cardRef = useParallax({
    speed: 0.15,
    direction: 'up'
  });
  
  // Use the translation hook to get translated product name
  const { content } = useTranslatedContent(
    'products',
    product.id,
    ['name', 'description'],
    product
  );

  const translatedName = content.name || product.name;

  return (
    <Link to={`/producto/${product.id}`} className="block">
      <div ref={cardRef} className="will-change-transform">
        <Card className="group hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer border-border/30 bg-card">
          {product.images && product.images.length > 0 ? (
            <div className="relative aspect-square overflow-hidden">
              <ProductCarousel images={product.images} alt={translatedName} autoRotate={true} />
            </div>
          ) : (
            <div className="aspect-square bg-muted/30 flex items-center justify-center">
              <Printer className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}
          <div className="p-2 sm:p-3">
            <h3 className="text-xs sm:text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
              {translatedName}
            </h3>
            {product.price && (
              <p className="text-sm sm:text-base font-bold text-primary mt-1">
                €{Number(product.price).toFixed(2)}
              </p>
            )}
          </div>
        </Card>
      </div>
    </Link>
  );
};

export interface FeaturedCarouselSettings {
  // Display mode
  displayMode?: 'carousel' | 'grid';
  
  // Items per view
  itemsPerView?: number;
  itemsPerViewTablet?: number;
  itemsPerViewMobile?: number;
  
  // Carousel behavior
  autoplay?: boolean;
  autoplayDelay?: number; // in seconds
  showNavigation?: boolean;
  showPagination?: boolean;
  loop?: boolean;
  pauseOnHover?: boolean;
  transitionDuration?: number;
  
  // Legacy support
  autoRotate?: boolean;
  rotateInterval?: number;
  gap?: number;
  showTitle?: boolean;
  showViewAll?: boolean;
  showRefresh?: boolean;
}

export default function FeaturedProductsCarousel({
  products,
  maxVisible = 4,
  settings
}: FeaturedProductsCarouselProps & { settings?: FeaturedCarouselSettings }) {
  const { t } = useTranslation('home');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [currentItemsPerView, setCurrentItemsPerView] = useState(maxVisible);

  // Responsive items per view calculation
  useEffect(() => {
    const calculateItemsPerView = () => {
      const width = window.innerWidth;
      
      if (width < 640) {
        // Mobile - default to 2 items for better space usage
        const mobileItems = settings?.itemsPerViewMobile;
        setCurrentItemsPerView(typeof mobileItems === 'number' ? mobileItems : 2);
      } else if (width < 1024) {
        // Tablet
        const tabletItems = settings?.itemsPerViewTablet;
        setCurrentItemsPerView(typeof tabletItems === 'number' ? tabletItems : 2);
      } else {
        // Desktop
        const desktopItems = settings?.itemsPerView ?? maxVisible;
        setCurrentItemsPerView(typeof desktopItems === 'number' ? desktopItems : maxVisible);
      }
    };

    calculateItemsPerView();
    window.addEventListener('resize', calculateItemsPerView);
    return () => window.removeEventListener('resize', calculateItemsPerView);
  }, [settings?.itemsPerView, settings?.itemsPerViewTablet, settings?.itemsPerViewMobile, maxVisible]);

  // Max index for carousel navigation
  const maxIndex = Math.max(0, products.length - currentItemsPerView);

  // Autoplay functionality
  const autoplay = settings?.autoplay ?? settings?.autoRotate ?? false;
  const autoplayDelay = (settings?.autoplayDelay ?? (settings?.rotateInterval ? settings.rotateInterval / 1000 : 5)) * 1000;
  const loop = settings?.loop ?? true;
  const pauseOnHover = settings?.pauseOnHover ?? true;

  useEffect(() => {
    if (!autoplay || products.length <= currentItemsPerView) return;

    const interval = setInterval(() => {
      if (pauseOnHover && isHovered) return;

      setCurrentIndex(prev => {
        if (loop) {
          return prev >= maxIndex ? 0 : prev + 1;
        }
        return Math.min(prev + 1, maxIndex);
      });
    }, Math.max(autoplayDelay, 2000));

    return () => clearInterval(interval);
  }, [autoplay, autoplayDelay, pauseOnHover, loop, isHovered, maxIndex, currentItemsPerView, products.length]);

  // Navigation functions
  const goToPrev = () => {
    setCurrentIndex(prev => (loop && prev === 0 ? maxIndex : Math.max(0, prev - 1)));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (loop && prev >= maxIndex ? 0 : Math.min(maxIndex, prev + 1)));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, maxIndex)));
  };

  // Dynamic gap
  const gap = settings?.gap || 16;
  const showTitle = settings?.showTitle !== false;
  const showViewAll = settings?.showViewAll !== false;
  const showRefresh = settings?.showRefresh !== false;
  const showNavigation = settings?.showNavigation ?? true;
  const showPagination = settings?.showPagination ?? true;
  const transitionDuration = settings?.transitionDuration || 600;

  // Determine if we should use carousel or grid mode
  const useCarouselMode = settings?.displayMode === 'carousel' || products.length > currentItemsPerView;

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with View All button */}
      {(showTitle || showViewAll) && (
        <div className="flex justify-between items-center mb-4">
          {showTitle && (
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{t('featured.title')}</h2>
            </div>
          )}
          {showViewAll && (
            <Button asChild variant="outline" className="gap-2">
              <Link to="/productos">
                <Package2 className="h-4 w-4" />
                {t('featured.viewAllProducts')}
              </Link>
            </Button>
          )}
        </div>
      )}
      
      {useCarouselMode ? (
        /* Carousel Mode - Strictly Horizontal */
        <div className="relative">
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform ease-out"
              style={{
                transform: `translateX(-${currentIndex * (100 / currentItemsPerView)}%)`,
                transitionDuration: `${transitionDuration}ms`,
                gap: `${Math.max(8, gap)}px`
              }}
            >
              {products.map((product) => (
                <div 
                  key={product.id}
                  className="flex-shrink-0"
                  style={{
                    width: `calc((100% - ${Math.max(8, gap) * (currentItemsPerView - 1)}px) / ${currentItemsPerView})`
                  }}
                >
                  <TranslatedFeaturedProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
          
          {/* Navigation arrows */}
          {showNavigation && products.length > currentItemsPerView && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 bg-background shadow-md hover:bg-accent border-border h-8 w-8 sm:h-9 sm:w-9 rounded-full"
                onClick={goToPrev}
                disabled={!loop && currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 bg-background shadow-md hover:bg-accent border-border h-8 w-8 sm:h-9 sm:w-9 rounded-full"
                onClick={goToNext}
                disabled={!loop && currentIndex >= maxIndex}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {/* Pagination dots */}
          {showPagination && products.length > currentItemsPerView && (
            <div className="flex gap-1.5 mt-3 justify-center">
              {Array.from({ length: maxIndex + 1 }).map((_, index) => (
                <button
                  key={index}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    index === currentIndex 
                      ? 'bg-primary w-6' 
                      : 'bg-muted-foreground/20 w-1.5 hover:bg-muted-foreground/40'
                  )}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Grid Mode (when products fit in view) */
        <div 
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${currentItemsPerView}, minmax(0, 1fr))`,
            gap: `${gap}px`
          }}
        >
          {products.map((product) => (
            <TranslatedFeaturedProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {showRefresh && products.length > currentItemsPerView && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <Button variant="outline" onClick={() => setCurrentIndex(0)} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('featured.refreshProducts')}
          </Button>
        </div>
      )}
    </div>
  );
}
