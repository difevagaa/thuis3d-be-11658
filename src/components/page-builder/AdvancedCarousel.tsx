/**
 * Advanced Carousel Component
 * Supports all carousel configuration options from CarouselSettings
 * 
 * IMPORTANT: This component expects settings already normalized.
 * Use normalizeCarouselSettings() from carouselSettingsNormalizer.ts before passing settings.
 * 
 * Key expectations:
 * - autoplayDelay: in SECONDS (not milliseconds)
 * - transitionDuration: in MILLISECONDS
 */

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CarouselSettings {
  // Display
  itemsPerView?: number;
  itemsPerViewTablet?: number;
  itemsPerViewMobile?: number;
  spaceBetween?: number;
  showNavigation?: boolean;
  showPagination?: boolean;
  loop?: boolean;
  
  // Timing - autoplayDelay is in SECONDS
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  stopOnInteraction?: boolean;
  transitionDuration?: number; // in milliseconds
  effect?: 'slide' | 'fade' | 'cube' | 'coverflow' | 'flip';
  
  // Layout
  direction?: 'horizontal' | 'vertical';
  carouselPosition?: 'left' | 'center' | 'right';
  displayMode?: 'carousel' | 'grid' | 'masonry' | 'stack';
  carouselHeight?: string;
  carouselWidth?: 'full' | 'container' | 'narrow' | 'wide';
  centeredSlides?: boolean;
  freeMode?: boolean;
  
  // Image sizing (for image carousels)
  imageHeight?: number;
  imageFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  
  // Advanced
  lazyLoad?: boolean;
  keyboardControl?: boolean;
  mouseWheelControl?: boolean;
}

interface AdvancedCarouselProps {
  items: any[];
  settings?: CarouselSettings;
  renderItem: (item: any, index: number) => React.ReactNode;
  className?: string;
}

export function AdvancedCarousel({ 
  items, 
  settings = {}, 
  renderItem,
  className 
}: AdvancedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Get responsive items per view based on current window width and settings
  const getItemsPerView = () => {
    if (typeof window === 'undefined') {
      return settings.itemsPerView ?? 3;
    }
    
    const width = window.innerWidth;
    
    // Mobile: < 640px (sm breakpoint)
    if (width < 640) {
      const mobileItems = settings.itemsPerViewMobile;
      // Only use default if explicitly undefined/null, not if set to a specific number
      return typeof mobileItems === 'number' ? mobileItems : 1;
    }
    
    // Tablet: >= 640px and < 1024px (md-lg breakpoint)
    if (width < 1024) {
      const tabletItems = settings.itemsPerViewTablet;
      return typeof tabletItems === 'number' ? tabletItems : 2;
    }
    
    // Desktop: >= 1024px
    const desktopItems = settings.itemsPerView;
    return typeof desktopItems === 'number' ? desktopItems : 3;
  };

  const [itemsPerView, setItemsPerView] = useState(getItemsPerView);

  // Handle window resize AND settings changes
  useEffect(() => {
    const handleResize = () => {
      const newItemsPerView = getItemsPerView();
      setItemsPerView(newItemsPerView);
    };

    // Recalculate immediately when settings change
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [
    settings.itemsPerView, 
    settings.itemsPerViewTablet, 
    settings.itemsPerViewMobile
  ]);

  // Calculate max index
  const maxIndex = Math.max(0, items.length - itemsPerView);

  // Autoplay logic - delay is in seconds, convert to ms
  useEffect(() => {
    if (!settings.autoplay || items.length <= itemsPerView) return;
    
    // Convert delay to milliseconds (minimum 2000ms to prevent rapid flickering)
    const delayMs = Math.max(((settings.autoplayDelay || 4) * 1000), 2000);

    const startAutoplay = () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }

      autoplayTimerRef.current = setInterval(() => {
        if (settings.pauseOnHover && isHovered) return;

        setCurrentIndex(prev => {
          if (settings.loop) {
            return prev >= maxIndex ? 0 : prev + 1;
          }
          return Math.min(prev + 1, maxIndex);
        });
      }, delayMs);
    };

    startAutoplay();

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, [settings.autoplay, settings.autoplayDelay, settings.pauseOnHover, settings.loop, isHovered, maxIndex, itemsPerView, items.length]);

  // Navigation functions
  const goToSlide = (index: number) => {
    if (settings.stopOnInteraction && autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    setCurrentIndex(Math.max(0, Math.min(index, maxIndex)));
  };

  const goToPrev = () => {
    goToSlide(settings.loop && currentIndex === 0 ? maxIndex : currentIndex - 1);
  };

  const goToNext = () => {
    goToSlide(settings.loop && currentIndex >= maxIndex ? 0 : currentIndex + 1);
  };

  // Keyboard control
  useEffect(() => {
    if (!settings.keyboardControl) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.keyboardControl, currentIndex, maxIndex]);

  // Mouse wheel control
  useEffect(() => {
    if (!settings.mouseWheelControl || !carouselRef.current) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    };

    const ref = carouselRef.current;
    ref.addEventListener('wheel', handleWheel, { passive: false });
    return () => ref.removeEventListener('wheel', handleWheel);
  }, [settings.mouseWheelControl, currentIndex, maxIndex]);

  // Get container width class
  const getWidthClass = () => {
    switch (settings.carouselWidth) {
      case 'full':
        return 'w-full';
      case 'wide':
        return 'w-[90%]';
      case 'narrow':
        return 'w-[60%]';
      case 'container':
      default:
        return 'w-[80%]';
    }
  };

  // Alignment for the carousel container (NOT the slide track)
  const getWrapperAlignClass = () => {
    switch (settings.carouselPosition) {
      case 'left':
        return 'mr-auto';
      case 'right':
        return 'ml-auto';
      case 'center':
      default:
        return 'mx-auto';
    }
  };

  // Alignment for pagination dots
  const getAlignmentClass = () => {
    switch (settings.carouselPosition) {
      case 'left':
        return 'justify-start';
      case 'right':
        return 'justify-end';
      case 'center':
      default:
        return 'justify-center';
    }
  };

  // Calculate transform based on effect
  const getTransform = () => {
    const offset = currentIndex * (100 / itemsPerView);
    
    switch (settings.effect) {
      case 'fade':
        return '';
      case 'slide':
      default:
        return settings.direction === 'vertical' 
          ? `translateY(-${offset}%)`
          : `translateX(-${offset}%)`;
    }
  };

  if (items.length === 0) return null;

  // Grid display mode
  if (settings.displayMode === 'grid') {
    return (
      <div className={cn('grid gap-4', className)} style={{
        gridTemplateColumns: `repeat(${itemsPerView}, minmax(0, 1fr))`,
        gap: `${settings.spaceBetween || 20}px`
      }}>
        {items.map((item, index) => (
          <div key={index}>{renderItem(item, index)}</div>
        ))}
      </div>
    );
  }

  return (
    <div 
      ref={carouselRef}
      className={cn('relative w-full', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        height: settings.carouselHeight || 'auto'
      }}
    >
      {/* Carousel track wrapper with proper overflow handling */}
      <div className={cn('overflow-hidden', getWidthClass(), getWrapperAlignClass())}>
        <div 
          className={cn(
            'flex transition-transform justify-start',
            settings.direction === 'vertical' ? 'flex-col' : 'flex-row'
          )}
          style={{
            transform: getTransform(),
            transitionDuration: `${settings.transitionDuration || 600}ms`,
            gap: `${settings.spaceBetween || 20}px`,
            // Ensure proper width calculation for mobile
            width: settings.direction === 'vertical' ? '100%' : undefined
          }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              className={cn(
                'flex-shrink-0',
                settings.effect === 'fade' && index !== currentIndex && 'opacity-0'
              )}
              style={{
                width: settings.direction === 'vertical' 
                  ? '100%' 
                  : `calc((100% - ${(settings.spaceBetween || 20) * (itemsPerView - 1)}px) / ${itemsPerView})`,
                transitionProperty: settings.effect === 'fade' ? 'opacity' : 'none',
                transitionDuration: `${settings.transitionDuration || 600}ms`,
                // Prevent content overflow on mobile
                minWidth: 0
              }}
            >
              <div className="w-full h-full">
                {renderItem(item, index)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      {settings.showNavigation !== false && items.length > itemsPerView && (
        <>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              'absolute top-1/2 -translate-y-1/2 z-10',
              settings.direction === 'vertical' ? 'left-1/2 -translate-x-1/2 top-0' : 'left-2'
            )}
            onClick={goToPrev}
            disabled={!settings.loop && currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              'absolute top-1/2 -translate-y-1/2 z-10',
              settings.direction === 'vertical' ? 'left-1/2 -translate-x-1/2 bottom-0 top-auto' : 'right-2'
            )}
            onClick={goToNext}
            disabled={!settings.loop && currentIndex >= maxIndex}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Pagination dots */}
      {settings.showPagination && items.length > itemsPerView && (
        <div className={cn(
          'flex gap-2 mt-4',
          getAlignmentClass()
        )}>
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                index === currentIndex 
                  ? 'bg-primary w-8' 
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
