import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import FeaturedProductsCarousel from "@/components/FeaturedProductsCarousel";
import { logger } from "@/lib/logger";

// Utility function to safely navigate to URL
const safeNavigate = (url: string) => {
  if (!url) return;
  
  // Remove any potential javascript: or data: URLs
  const sanitizedUrl = url.trim();
  try {
    const parsed = new URL(sanitizedUrl, window.location.origin);
    // Only allow http, https, and relative URLs
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || sanitizedUrl.startsWith('/')) {
      window.location.href = sanitizedUrl;
    }
  } catch {
    // If URL parsing fails, treat as relative URL
    if (sanitizedUrl.startsWith('/')) {
      window.location.href = sanitizedUrl;
    }
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

// Hero Section
function HeroSection({ section }: { section: SectionData }) {
  const { content, styles, settings } = section;
  
  return (
    <section
      className={cn(
        "relative overflow-hidden",
        settings?.fullWidth ? "w-full" : "container mx-auto",
        getBorderRadiusClass(styles?.borderRadius)
      )}
      style={{
        backgroundColor: styles?.backgroundColor,
        color: styles?.textColor,
        padding: `${styles?.padding || 80}px ${styles?.padding ? styles.padding / 2 : 40}px`,
        backgroundImage: content?.backgroundImage ? `url(${content.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: settings?.height || '500px'
      }}
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
  
  useEffect(() => {
    loadProducts();
  }, [content]);
  
  const loadProducts = async () => {
    try {
      setLoading(true);
      
      // Get user roles for filtering
      const { data: { user } } = await supabase.auth.getUser();
      let userRoles: string[] = [];
      
      if (user) {
        const { data: rolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        userRoles = (rolesData || [])
          .map(r => String(r.role || '').trim().toLowerCase())
          .filter(role => role.length > 0);
      }
      
      // Build query based on settings
      let query = supabase
        .from('products')
        .select(`
          *,
          images:product_images(image_url, display_order),
          product_roles(role)
        `)
        .is('deleted_at', null);
      
      // Apply filters from settings
      if (settings?.category) {
        query = query.eq('category', settings.category);
      }
      
      if (settings?.featured) {
        query = query.eq('is_featured', true);
      }
      
      // Apply sorting
      const sortBy = settings?.sortBy || 'created_at';
      const sortOrder = settings?.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      
      // Apply limit
      const limit = settings?.limit || 10;
      query = query.limit(limit);
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Filter by roles
      const visibleProducts = (data || []).filter((product: any) => {
        const productRolesList = product.product_roles || [];
        const productRolesNormalized = productRolesList
          .map((pr: any) => String(pr?.role || '').trim().toLowerCase())
          .filter((role: string) => role.length > 0);
        
        if (productRolesNormalized.length === 0) return true;
        if (!user || userRoles.length === 0) return false;
        
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
  };
  
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
            <img
              src={images[currentIndex]?.url}
              alt={images[currentIndex]?.alt || `Imagen ${currentIndex + 1}`}
              className="w-full h-full object-cover rounded-lg"
            />
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
    
    // Here you would typically send the form data to your backend
    // For now, we'll just simulate a submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    alert('Formulario enviado. Te contactaremos pronto!');
    setFormData({ name: '', email: '', phone: '', message: '' });
    setSubmitting(false);
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
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    alert('¡Gracias por suscribirte!');
    setEmail('');
    setSubmitting(false);
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
export function usePageSections(pageKey: string) {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          setSections([]);
          return;
        }

        // Get sections for this page
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('page_builder_sections')
          .select('*')
          .eq('page_id', page.id)
          .eq('is_visible', true)
          .order('display_order');

        if (sectionsError) throw sectionsError;
        setSections(sectionsData || []);
      } catch (error) {
        console.error('Error loading page sections:', error);
        setSections([]);
      } finally {
        setLoading(false);
      }
    }

    loadSections();
  }, [pageKey]);

  return { sections, loading };
}
