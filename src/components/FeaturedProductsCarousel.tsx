import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Printer, Package2, RefreshCw, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCarousel from "./ProductCarousel";
import { useParallax } from "@/hooks/useParallax";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";

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

// Helper function to shuffle array using Fisher-Yates algorithm (more uniform distribution)
const getRandomProducts = (array: Product[], count: number) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, array.length));
};

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
    <Link to={`/producto/${product.id}`}>
      <div ref={cardRef} className="will-change-transform">
        <Card className="group hover:shadow-strong transition-all duration-300 hover:-translate-y-2 overflow-hidden cursor-pointer">
          {product.images && product.images.length > 0 ? (
            <div className="relative h-40 md:h-48 lg:h-56 bg-muted flex items-center justify-center">
              <ProductCarousel images={product.images} alt={translatedName} autoRotate={true} />
            </div>
          ) : (
            <div className="h-40 md:h-48 lg:h-56 bg-muted flex items-center justify-center">
              <Printer className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-muted-foreground/30" />
            </div>
          )}
          <CardHeader className="p-2 md:p-2.5 lg:pb-2">
            <CardTitle className="text-xs md:text-sm lg:text-base group-hover:text-primary transition-colors line-clamp-2 leading-tight">
              {translatedName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 md:space-y-1.5 pt-0 p-2 md:p-2.5">
            {product.price && (
              <p className="text-base md:text-lg lg:text-xl font-bold text-primary">
                €{Number(product.price).toFixed(2)}
              </p>
            )}
            <div className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground group-hover:text-primary transition-colors">
              <ShoppingCart className="h-3 w-3 md:h-4 md:w-4" />
              <span>{t('featured.viewDetails')}</span>
              <ArrowRight className="h-3 w-3 md:h-4 md:w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </CardContent>
        </Card>
      </div>
    </Link>
  );
};

interface FeaturedCarouselSettings {
  itemsPerView?: number;
  itemsPerViewTablet?: number;
  itemsPerViewMobile?: number;
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
  const [rotationKey, setRotationKey] = useState(0);
  const [currentItemsPerView, setCurrentItemsPerView] = useState(maxVisible);

  // Responsive items per view calculation
  useEffect(() => {
    const calculateItemsPerView = () => {
      const width = window.innerWidth;
      
      if (width < 640) {
        // Mobile
        const mobileItems = settings?.itemsPerViewMobile;
        setCurrentItemsPerView(typeof mobileItems === 'number' ? mobileItems : 1);
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

  // Get random products on each rotation
  const visibleProducts = useMemo(() => {
    return getRandomProducts(products, currentItemsPerView);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rotationKey intentionally triggers re-randomization
  }, [products, currentItemsPerView, rotationKey]);

  // Auto-rotate based on settings
  const autoRotate = settings?.autoRotate !== false;
  const rotateInterval = settings?.rotateInterval || 10000;
  
  useEffect(() => {
    if (!autoRotate) return;
    
    const interval = setInterval(() => {
      setRotationKey(prev => prev + 1);
    }, rotateInterval);

    return () => clearInterval(interval);
  }, [autoRotate, rotateInterval]);

  const handleRotate = () => {
    setRotationKey(prev => prev + 1);
  };

  // Dynamic gap
  const gap = settings?.gap || 16;
  const showTitle = settings?.showTitle !== false;
  const showViewAll = settings?.showViewAll !== false;
  const showRefresh = settings?.showRefresh !== false;

  // Generate dynamic grid classes based on current items per view
  const getGridCols = () => {
    // Use CSS grid with dynamic columns
    return `repeat(${currentItemsPerView}, minmax(0, 1fr))`;
  };

  return (
    <div className="relative">
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
      
      <div 
        className="grid bg-slate-100 dark:bg-slate-900"
        style={{
          gridTemplateColumns: getGridCols(),
          gap: `${gap}px`
        }}
      >
        {visibleProducts.map((product) => (
          <TranslatedFeaturedProductCard key={product.id} product={product} />
        ))}
      </div>

      {showRefresh && products.length > currentItemsPerView && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <Button variant="outline" onClick={handleRotate} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('featured.refreshProducts')}
          </Button>
        </div>
      )}
    </div>
  );
}