/**
 * Product Carousel Templates
 * 10 different carousel configurations for products
 */

export interface ProductCarouselTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  settings: {
    itemsPerView: number;
    itemsPerViewTablet: number;
    itemsPerViewMobile: number;
    spaceBetween: number;
    autoplay: boolean;
    autoplayDelay: number;
    loop: boolean;
    showNavigation: boolean;
    showPagination: boolean;
    pauseOnHover: boolean;
    carouselWidth: 'full' | 'container' | 'narrow' | 'wide';
    displayMode?: 'carousel' | 'grid';
    effect?: 'slide' | 'fade' | 'cube' | 'coverflow' | 'flip';
    centeredSlides?: boolean;
    freeMode?: boolean;
  };
  styles: {
    cardStyle?: 'default' | 'elevated' | 'minimal' | 'outlined' | 'gradient';
    showPrice?: boolean;
    showRating?: boolean;
    showAddToCart?: boolean;
    imageAspectRatio?: string;
    hoverEffect?: 'zoom' | 'lift' | 'tilt' | 'none';
  };
}

export const productCarouselTemplates: ProductCarouselTemplate[] = [
  {
    id: 'classic-3-column',
    name: 'Clásico 3 Columnas',
    description: 'Carrusel tradicional con 3 productos visibles, navegación lateral y auto-play',
    icon: '🎯',
    settings: {
      itemsPerView: 3,
      itemsPerViewTablet: 2,
      itemsPerViewMobile: 1,
      spaceBetween: 24,
      autoplay: true,
      autoplayDelay: 5,
      loop: true,
      showNavigation: true,
      showPagination: true,
      pauseOnHover: true,
      carouselWidth: 'container',
      effect: 'slide'
    },
    styles: {
      cardStyle: 'default',
      showPrice: true,
      showRating: true,
      showAddToCart: true,
      imageAspectRatio: '1/1',
      hoverEffect: 'lift'
    }
  },
  {
    id: 'full-width-showcase',
    name: 'Exhibición Ancho Completo',
    description: 'Carrusel a todo ancho con 4 productos, ideal para destacar productos premium',
    icon: '🌟',
    settings: {
      itemsPerView: 4,
      itemsPerViewTablet: 3,
      itemsPerViewMobile: 1,
      spaceBetween: 20,
      autoplay: true,
      autoplayDelay: 6,
      loop: true,
      showNavigation: true,
      showPagination: false,
      pauseOnHover: true,
      carouselWidth: 'full',
      effect: 'slide'
    },
    styles: {
      cardStyle: 'elevated',
      showPrice: true,
      showRating: true,
      showAddToCart: true,
      imageAspectRatio: '4/3',
      hoverEffect: 'zoom'
    }
  },
  {
    id: 'compact-single',
    name: 'Compacto Individual',
    description: 'Muestra un producto a la vez con transición suave, perfecto para hero sections',
    icon: '⭐',
    settings: {
      itemsPerView: 1,
      itemsPerViewTablet: 1,
      itemsPerViewMobile: 1,
      spaceBetween: 0,
      autoplay: true,
      autoplayDelay: 4,
      loop: true,
      showNavigation: true,
      showPagination: true,
      pauseOnHover: true,
      carouselWidth: 'narrow',
      effect: 'fade',
      centeredSlides: true
    },
    styles: {
      cardStyle: 'minimal',
      showPrice: true,
      showRating: true,
      showAddToCart: true,
      imageAspectRatio: '16/9',
      hoverEffect: 'none'
    }
  },
  {
    id: 'grid-6-products',
    name: 'Cuadrícula 6 Productos',
    description: 'Vista de cuadrícula estática con 6 productos, sin auto-scroll',
    icon: '📦',
    settings: {
      itemsPerView: 3,
      itemsPerViewTablet: 2,
      itemsPerViewMobile: 1,
      spaceBetween: 16,
      autoplay: false,
      autoplayDelay: 5,
      loop: true,
      showNavigation: true,
      showPagination: true,
      pauseOnHover: false,
      carouselWidth: 'container',
      displayMode: 'grid',
      effect: 'slide'
    },
    styles: {
      cardStyle: 'outlined',
      showPrice: true,
      showRating: false,
      showAddToCart: true,
      imageAspectRatio: '1/1',
      hoverEffect: 'lift'
    }
  },
  {
    id: 'fast-scroll-5',
    name: 'Scroll Rápido 5',
    description: 'Carrusel con 5 productos y scroll rápido automático, ideal para muchos productos',
    icon: '⚡',
    settings: {
      itemsPerView: 5,
      itemsPerViewTablet: 3,
      itemsPerViewMobile: 2,
      spaceBetween: 12,
      autoplay: true,
      autoplayDelay: 3,
      loop: true,
      showNavigation: true,
      showPagination: false,
      pauseOnHover: true,
      carouselWidth: 'wide',
      effect: 'slide'
    },
    styles: {
      cardStyle: 'minimal',
      showPrice: true,
      showRating: false,
      showAddToCart: false,
      imageAspectRatio: '1/1',
      hoverEffect: 'zoom'
    }
  },
  {
    id: 'premium-centered',
    name: 'Premium Centrado',
    description: 'Productos centrados con efecto de enfoque, destacando el producto central',
    icon: '💎',
    settings: {
      itemsPerView: 3,
      itemsPerViewTablet: 2,
      itemsPerViewMobile: 1,
      spaceBetween: 30,
      autoplay: true,
      autoplayDelay: 5,
      loop: true,
      showNavigation: true,
      showPagination: true,
      pauseOnHover: true,
      carouselWidth: 'container',
      effect: 'coverflow',
      centeredSlides: true
    },
    styles: {
      cardStyle: 'gradient',
      showPrice: true,
      showRating: true,
      showAddToCart: true,
      imageAspectRatio: '3/4',
      hoverEffect: 'tilt'
    }
  },
  {
    id: 'minimal-2-column',
    name: 'Minimalista 2 Columnas',
    description: 'Diseño limpio con 2 productos, perfecto para productos de alta gama',
    icon: '🎨',
    settings: {
      itemsPerView: 2,
      itemsPerViewTablet: 2,
      itemsPerViewMobile: 1,
      spaceBetween: 40,
      autoplay: true,
      autoplayDelay: 6,
      loop: true,
      showNavigation: true,
      showPagination: true,
      pauseOnHover: true,
      carouselWidth: 'narrow',
      effect: 'slide'
    },
    styles: {
      cardStyle: 'minimal',
      showPrice: true,
      showRating: false,
      showAddToCart: true,
      imageAspectRatio: '2/3',
      hoverEffect: 'lift'
    }
  },
  {
    id: 'continuous-scroll',
    name: 'Scroll Continuo',
    description: 'Movimiento fluido continuo sin pausas, modo libre para exploración',
    icon: '∞',
    settings: {
      itemsPerView: 4,
      itemsPerViewTablet: 3,
      itemsPerViewMobile: 2,
      spaceBetween: 16,
      autoplay: true,
      autoplayDelay: 2,
      loop: true,
      showNavigation: false,
      showPagination: false,
      pauseOnHover: true,
      carouselWidth: 'full',
      effect: 'slide',
      freeMode: true
    },
    styles: {
      cardStyle: 'default',
      showPrice: true,
      showRating: false,
      showAddToCart: false,
      imageAspectRatio: '1/1',
      hoverEffect: 'zoom'
    }
  },
  {
    id: 'flip-card-style',
    name: 'Estilo Tarjeta Giratoria',
    description: 'Transición con efecto flip 3D entre productos, muy llamativo',
    icon: '🔄',
    settings: {
      itemsPerView: 3,
      itemsPerViewTablet: 2,
      itemsPerViewMobile: 1,
      spaceBetween: 24,
      autoplay: true,
      autoplayDelay: 5,
      loop: true,
      showNavigation: true,
      showPagination: true,
      pauseOnHover: true,
      carouselWidth: 'container',
      effect: 'flip'
    },
    styles: {
      cardStyle: 'elevated',
      showPrice: true,
      showRating: true,
      showAddToCart: true,
      imageAspectRatio: '1/1',
      hoverEffect: 'tilt'
    }
  },
  {
    id: 'compact-mobile-first',
    name: 'Compacto Mobile-First',
    description: 'Optimizado para móviles, mostrando más productos en escritorio',
    icon: '📱',
    settings: {
      itemsPerView: 6,
      itemsPerViewTablet: 4,
      itemsPerViewMobile: 2,
      spaceBetween: 12,
      autoplay: true,
      autoplayDelay: 4,
      loop: true,
      showNavigation: true,
      showPagination: true,
      pauseOnHover: true,
      carouselWidth: 'wide',
      effect: 'slide'
    },
    styles: {
      cardStyle: 'outlined',
      showPrice: true,
      showRating: true,
      showAddToCart: false,
      imageAspectRatio: '1/1',
      hoverEffect: 'lift'
    }
  }
];

// Helper function to get template by id
export function getCarouselTemplate(id: string): ProductCarouselTemplate | undefined {
  return productCarouselTemplates.find(template => template.id === id);
}

// Helper function to get all template names for dropdown
export function getCarouselTemplateOptions() {
  return productCarouselTemplates.map(template => ({
    value: template.id,
    label: `${template.icon} ${template.name}`,
    description: template.description
  }));
}
