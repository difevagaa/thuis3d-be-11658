/**
 * Carousel Settings Normalizer
 * Unifica todas las variantes de claves de configuración de carruseles
 * para garantizar que los settings siempre se apliquen correctamente.
 */

export interface NormalizedCarouselSettings {
  // Display
  itemsPerView: number;
  itemsPerViewTablet: number;
  itemsPerViewMobile: number;
  spaceBetween: number;
  showNavigation: boolean;
  showPagination: boolean;
  loop: boolean;
  
  // Timing
  autoplay: boolean;
  autoplayDelay: number; // Always in SECONDS
  pauseOnHover: boolean;
  stopOnInteraction: boolean;
  transitionDuration: number; // Always in MS
  effect: 'slide' | 'fade' | 'cube' | 'coverflow' | 'flip';
  
  // Layout
  direction: 'horizontal' | 'vertical';
  carouselPosition: 'left' | 'center' | 'right';
  displayMode: 'carousel' | 'grid' | 'masonry' | 'stack';
  carouselHeight: string;
  carouselWidth: 'full' | 'container' | 'narrow' | 'wide';
  centeredSlides: boolean;
  freeMode: boolean;
  
  // Image sizing
  imageHeight: number;
  imageFit: 'cover' | 'contain' | 'fill' | 'scale-down';
  
  // Advanced
  lazyLoad: boolean;
  keyboardControl: boolean;
  mouseWheelControl: boolean;
}

/**
 * Normaliza settings de carrusel desde cualquier formato (legacy o nuevo)
 * a un formato unificado que AdvancedCarousel puede consumir.
 */
export function normalizeCarouselSettings(settings: Record<string, any> = {}): NormalizedCarouselSettings {
  // Helper para obtener valor con múltiples claves fallback
  const get = <T>(keys: string[], defaultValue: T): T => {
    for (const key of keys) {
      if (settings[key] !== undefined && settings[key] !== null) {
        return settings[key] as T;
      }
    }
    return defaultValue;
  };

  // Normalizar autoplayDelay - puede venir en segundos o milisegundos
  let autoplayDelay = get<number>(
    ['autoplayDelay', 'carouselAutoplaySpeed', 'autoplaySpeed', 'rotateInterval', 'imageCarouselAutoplaySpeed'],
    4
  );
  
  // Si el valor es muy grande (>100), asumimos que está en ms y convertimos a segundos
  if (autoplayDelay > 100) {
    autoplayDelay = autoplayDelay / 1000;
  }
  
  // Normalizar transitionDuration - debe estar en ms
  let transitionDuration = get<number>(
    ['transitionDuration', 'transitionSpeed', 'carouselTransitionSpeed'],
    600
  );
  
  // Si el valor es muy pequeño (<10), asumimos que está en segundos y convertimos a ms
  if (transitionDuration < 10) {
    transitionDuration = transitionDuration * 1000;
  }

  return {
    // Display
    itemsPerView: get(['itemsPerView', 'carouselProductsPerView', 'imageCarouselPerView', 'slidesToShow'], 3),
    itemsPerViewTablet: get(['itemsPerViewTablet', 'carouselProductsPerViewTablet'], 2),
    itemsPerViewMobile: get(['itemsPerViewMobile', 'carouselProductsPerViewMobile'], 1),
    spaceBetween: get(['spaceBetween', 'carouselGap', 'gap'], 20),
    showNavigation: get(['showNavigation', 'carouselShowArrows', 'arrows'], true),
    showPagination: get(['showPagination', 'showDots', 'carouselShowDots', 'dots'], false),
    loop: get(['loop', 'carouselLoop', 'infinite'], true),
    
    // Timing
    autoplay: get(['autoplay', 'carouselAutoplay', 'autoRotate', 'imageCarouselAutoplay'], false),
    autoplayDelay,
    pauseOnHover: get(['pauseOnHover', 'carouselPauseOnHover'], true),
    stopOnInteraction: get(['stopOnInteraction', 'carouselStopOnInteraction'], false),
    transitionDuration,
    effect: get(['effect', 'transitionEffect', 'carouselTransition', 'imageCarouselTransition'], 'slide'),
    
    // Layout
    direction: get(['direction', 'carouselDirection'], 'horizontal'),
    carouselPosition: get(['carouselPosition', 'position'], 'center'),
    displayMode: get(['displayMode', 'carouselDisplayMode'], 'carousel'),
    carouselHeight: get(['carouselHeight', 'height'], 'auto'),
    carouselWidth: get(['carouselWidth', 'width'], 'full'),
    centeredSlides: get(['centeredSlides', 'carouselCentered'], false),
    freeMode: get(['freeMode', 'carouselFreeMode'], false),
    
    // Image sizing
    imageHeight: get(['imageHeight', 'carouselImageHeight', 'imageCarouselHeight'], 250),
    imageFit: get(['imageFit', 'imageCarouselFit', 'objectFit'], 'cover'),
    
    // Advanced
    lazyLoad: get(['lazyLoad', 'lazy'], true),
    keyboardControl: get(['keyboardControl', 'keyboard'], false),
    mouseWheelControl: get(['mouseWheelControl', 'mousewheel'], false),
  };
}

/**
 * Convierte settings normalizados al formato esperado por AdvancedCarousel
 */
export function toAdvancedCarouselSettings(normalized: NormalizedCarouselSettings): Record<string, any> {
  return {
    itemsPerView: normalized.itemsPerView,
    itemsPerViewTablet: normalized.itemsPerViewTablet,
    itemsPerViewMobile: normalized.itemsPerViewMobile,
    spaceBetween: normalized.spaceBetween,
    showNavigation: normalized.showNavigation,
    showPagination: normalized.showPagination,
    loop: normalized.loop,
    autoplay: normalized.autoplay,
    autoplayDelay: normalized.autoplayDelay, // In seconds
    pauseOnHover: normalized.pauseOnHover,
    stopOnInteraction: normalized.stopOnInteraction,
    transitionDuration: normalized.transitionDuration, // In ms
    effect: normalized.effect,
    direction: normalized.direction,
    carouselPosition: normalized.carouselPosition,
    displayMode: normalized.displayMode,
    carouselHeight: normalized.carouselHeight,
    carouselWidth: normalized.carouselWidth,
    centeredSlides: normalized.centeredSlides,
    freeMode: normalized.freeMode,
    imageHeight: normalized.imageHeight,
    imageFit: normalized.imageFit,
    lazyLoad: normalized.lazyLoad,
    keyboardControl: normalized.keyboardControl,
    mouseWheelControl: normalized.mouseWheelControl,
  };
}

/**
 * Convierte settings normalizados al formato esperado por FeaturedProductsCarousel
 */
export function toFeaturedCarouselSettings(normalized: NormalizedCarouselSettings): Record<string, any> {
  return {
    displayMode: normalized.displayMode,
    itemsPerView: normalized.itemsPerView,
    itemsPerViewTablet: normalized.itemsPerViewTablet,
    itemsPerViewMobile: normalized.itemsPerViewMobile,
    autoplay: normalized.autoplay,
    autoplayDelay: normalized.autoplayDelay, // In seconds
    showNavigation: normalized.showNavigation,
    showPagination: normalized.showPagination,
    loop: normalized.loop,
    pauseOnHover: normalized.pauseOnHover,
    transitionDuration: normalized.transitionDuration, // In ms
    gap: normalized.spaceBetween,
  };
}
