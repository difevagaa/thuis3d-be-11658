/**
 * Comprehensive Section Configuration Options
 * 25+ configurable options for each section type
 */

export interface SectionConfig {
  // Basic Settings (5)
  fullWidth: boolean;
  maxWidth: string;
  minHeight: string;
  aspectRatio: string;
  overflow: 'visible' | 'hidden' | 'scroll' | 'auto';
  
  // Spacing (5)
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  margin: number;
  
  // Background (6)
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize: 'cover' | 'contain' | 'auto';
  backgroundPosition: string;
  backgroundRepeat: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y';
  backgroundAttachment: 'scroll' | 'fixed' | 'local';
  
  // Border (5)
  borderWidth: number;
  borderColor: string;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'double';
  borderRadius: number;
  boxShadow: string;
  
  // Typography (6)
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  
  // Colors (3)
  textColor: string;
  linkColor: string;
  linkHoverColor: string;
  
  // Animation (5)
  animation: string;
  animationDuration: number;
  animationDelay: number;
  animationEasing: string;
  animationIterations: number | 'infinite';
  
  // Responsive (5)
  hideOnMobile: boolean;
  hideOnTablet: boolean;
  hideOnDesktop: boolean;
  mobileOrder: number;
  tabletOrder: number;
  
  // Advanced (5)
  zIndex: number;
  opacity: number;
  transform: string;
  filter: string;
  mixBlendMode: string;
  
  // Accessibility (3)
  ariaLabel: string;
  role: string;
  tabIndex: number;
  
  // SEO (3)
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  
  // Interaction (4)
  cursor: string;
  pointerEvents: 'auto' | 'none';
  userSelect: 'auto' | 'none' | 'text';
  scrollBehavior: 'auto' | 'smooth';
}

// Hero Section specific options (30+)
export interface HeroSectionConfig extends SectionConfig {
  // Hero specific
  height: string;
  heroStyle: 'fullscreen' | 'half' | 'tall' | 'short';
  overlayColor: string;
  overlayOpacity: number;
  contentPosition: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'center' | 'bottom';
  
  // Video background
  videoUrl: string;
  videoAutoplay: boolean;
  videoLoop: boolean;
  videoMuted: boolean;
  
  // Particles/Effects
  enableParticles: boolean;
  particleCount: number;
  particleColor: string;
  enableParallax: boolean;
  parallaxSpeed: number;
}

// Text Section options (25+)
export interface TextSectionConfig extends SectionConfig {
  // Text specific
  columns: number;
  columnGap: number;
  textJustify: boolean;
  dropCap: boolean;
  
  // Lists
  listStyle: 'disc' | 'circle' | 'square' | 'decimal' | 'none';
  listPosition: 'inside' | 'outside';
  
  // Links
  linkUnderline: boolean;
  linkBold: boolean;
  
  // Reading
  readingWidth: number;
  lineNumbers: boolean;
}

// Image Section options (30+)
export interface ImageSectionConfig extends SectionConfig {
  // Image specific
  objectFit: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  objectPosition: string;
  imageFilter: string;
  
  // Lazy loading
  loading: 'lazy' | 'eager';
  fetchPriority: 'high' | 'low' | 'auto';
  
  // Lightbox
  enableLightbox: boolean;
  lightboxEffect: 'fade' | 'slide' | 'zoom';
  
  // Captions
  showCaption: boolean;
  captionPosition: 'top' | 'bottom' | 'overlay';
  captionBackground: string;
  
  // Effects
  hoverZoom: boolean;
  hoverBrightness: number;
  hoverRotate: number;
  
  // Srcset
  enableResponsive: boolean;
  sizes: string;
  srcset: string;
}

// Gallery Section options (35+)
export interface GallerySectionConfig extends SectionConfig {
  // Layout
  layout: 'grid' | 'masonry' | 'carousel' | 'justified';
  columns: number;
  gap: number;
  aspectRatio: string;
  
  // Carousel specific
  autoplay: boolean;
  autoplaySpeed: number;
  infinite: boolean;
  slidesToShow: number;
  slidesToScroll: number;
  arrows: boolean;
  dots: boolean;
  
  // Masonry specific
  columnWidth: number;
  gutter: number;
  
  // Lightbox
  enableLightbox: boolean;
  lightboxNavigation: boolean;
  lightboxCaptions: boolean;
  lightboxCounter: boolean;
  
  // Filtering
  enableFiltering: boolean;
  filterCategories: string[];
  defaultFilter: string;
  
  // Pagination
  enablePagination: boolean;
  itemsPerPage: number;
  paginationStyle: 'numbers' | 'dots' | 'load-more';
}

// Features Section options (30+)
export interface FeaturesSectionConfig extends SectionConfig {
  // Layout
  columns: number;
  gap: number;
  cardStyle: 'default' | 'bordered' | 'elevated' | 'flat';
  
  // Icons
  iconSize: number;
  iconColor: string;
  iconBackground: string;
  iconBorderRadius: number;
  
  // Hover effects
  hoverEffect: 'lift' | 'scale' | 'glow' | 'none';
  hoverScale: number;
  hoverShadow: string;
  
  // Content
  titleSize: number;
  descriptionSize: number;
  alignContent: 'left' | 'center' | 'right';
  
  // Numbering
  showNumbers: boolean;
  numberStyle: 'circle' | 'square' | 'plain';
  numberColor: string;
}

// CTA Section options (25+)
export interface CTASectionConfig extends SectionConfig {
  // Style
  ctaStyle: 'banner' | 'box' | 'inline' | 'floating';
  
  // Button
  buttonSize: 'sm' | 'md' | 'lg' | 'xl';
  buttonStyle: 'solid' | 'outline' | 'ghost';
  buttonColor: string;
  buttonHoverColor: string;
  buttonRounded: number;
  
  // Icon
  showIcon: boolean;
  iconPosition: 'left' | 'right';
  iconName: string;
  
  // Effects
  pulseEffect: boolean;
  glowEffect: boolean;
  
  // Positioning
  position: 'static' | 'sticky' | 'fixed';
  stickyTop: number;
  stickyBottom: number;
}

// Products Carousel options (40+)
export interface ProductsCarouselConfig extends SectionConfig {
  // Filters
  category: string;
  tags: string[];
  priceMin: number;
  priceMax: number;
  inStock: boolean;
  featured: boolean;
  onSale: boolean;
  
  // Sorting
  sortBy: 'created_at' | 'name' | 'price' | 'popularity' | 'rating';
  sortOrder: 'asc' | 'desc';
  
  // Display
  limit: number;
  maxVisible: number;
  showPrice: boolean;
  showRating: boolean;
  showDescription: boolean;
  showAddToCart: boolean;
  showQuickView: boolean;
  
  // Carousel
  autoplay: boolean;
  autoplaySpeed: number;
  infinite: boolean;
  slidesToShow: number;
  slidesToScroll: number;
  arrows: boolean;
  dots: boolean;
  
  // Card Style
  cardLayout: 'vertical' | 'horizontal';
  imageAspectRatio: string;
  cardBorder: boolean;
  cardShadow: boolean;
  cardHoverEffect: 'lift' | 'scale' | 'border';
  
  // Badge
  showBadge: boolean;
  badgeText: string;
  badgeColor: string;
  badgePosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

// Video Section options (30+)
export interface VideoSectionConfig extends SectionConfig {
  // Video
  videoUrl: string;
  videoType: 'youtube' | 'vimeo' | 'direct';
  
  // Controls
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  controls: boolean;
  
  // Playback
  startTime: number;
  endTime: number;
  playbackRate: number;
  
  // Quality
  quality: 'auto' | 'hd1080' | 'hd720' | 'large' | 'medium' | 'small';
  
  // Captions
  showCaptions: boolean;
  captionsLanguage: string;
  
  // Thumbnail
  customThumbnail: string;
  showPlayButton: boolean;
  playButtonStyle: 'default' | 'minimal' | 'large';
  
  // Aspect Ratio
  aspectRatio: '16:9' | '4:3' | '21:9' | '1:1' | 'custom';
  customAspectRatio: string;
  
  // Privacy
  noCookie: boolean;
  privacyEnhanced: boolean;
}

// Banner Section options (30+)
export interface BannerSectionConfig extends SectionConfig {
  // Style
  bannerStyle: 'image' | 'gradient' | 'solid' | 'pattern';
  
  // Content
  contentWidth: 'narrow' | 'medium' | 'wide' | 'full';
  contentAlign: 'left' | 'center' | 'right';
  contentVerticalAlign: 'top' | 'center' | 'bottom';
  
  // Overlay
  overlayEnabled: boolean;
  overlayColor: string;
  overlayOpacity: number;
  overlayBlur: number;
  
  // Button
  showButton: boolean;
  buttonText: string;
  buttonUrl: string;
  buttonStyle: 'primary' | 'secondary' | 'outline';
  buttonSize: 'sm' | 'md' | 'lg';
  
  // Shape divider
  showDivider: boolean;
  dividerType: 'wave' | 'curve' | 'triangle' | 'zigzag';
  dividerPosition: 'top' | 'bottom' | 'both';
  dividerColor: string;
  dividerHeight: number;
}

// Default configurations
export const defaultConfigs = {
  hero: {
    fullWidth: true,
    height: '80vh',
    heroStyle: 'fullscreen',
    contentPosition: 'center',
    verticalAlign: 'center',
    overlayOpacity: 0.3,
    enableParallax: true,
    parallaxSpeed: 0.5
  } as Partial<HeroSectionConfig>,
  
  text: {
    fullWidth: false,
    maxWidth: '800px',
    columns: 1,
    textAlign: 'left',
    lineHeight: 1.6
  } as Partial<TextSectionConfig>,
  
  image: {
    fullWidth: false,
    objectFit: 'cover',
    loading: 'lazy',
    enableLightbox: true,
    hoverZoom: true
  } as Partial<ImageSectionConfig>,
  
  gallery: {
    layout: 'grid',
    columns: 4,
    gap: 16,
    enableLightbox: true,
    lightboxNavigation: true
  } as Partial<GallerySectionConfig>,
  
  features: {
    columns: 3,
    gap: 24,
    cardStyle: 'elevated',
    iconSize: 48,
    hoverEffect: 'lift'
  } as Partial<FeaturesSectionConfig>,
  
  cta: {
    ctaStyle: 'banner',
    buttonSize: 'lg',
    buttonStyle: 'solid',
    showIcon: true,
    iconPosition: 'right'
  } as Partial<CTASectionConfig>,
  
  'products-carousel': {
    limit: 10,
    maxVisible: 4,
    showPrice: true,
    showRating: true,
    autoplay: true,
    autoplaySpeed: 3000,
    cardHoverEffect: 'lift'
  } as Partial<ProductsCarouselConfig>,
  
  video: {
    aspectRatio: '16:9',
    controls: true,
    quality: 'auto',
    showPlayButton: true,
    privacyEnhanced: true
  } as Partial<VideoSectionConfig>,
  
  banner: {
    bannerStyle: 'image',
    contentWidth: 'wide',
    contentAlign: 'center',
    showButton: true,
    buttonSize: 'lg'
  } as Partial<BannerSectionConfig>
};

export function getDefaultConfig(sectionType: string): Partial<SectionConfig> {
  return (defaultConfigs as any)[sectionType] || {};
}
