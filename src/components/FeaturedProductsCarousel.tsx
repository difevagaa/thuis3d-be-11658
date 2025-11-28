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
            <div className="relative h-32 md:h-40 lg:h-48 bg-muted flex items-center justify-center">
              <ProductCarousel images={product.images} alt={translatedName} autoRotate={true} />
            </div>
          ) : (
            <div className="h-32 md:h-40 lg:h-48 bg-muted flex items-center justify-center">
              <Printer className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-muted-foreground/30" />
            </div>
          )}
          <CardHeader className="p-2 md:p-3 lg:pb-3">
            <CardTitle className="text-xs md:text-sm lg:text-base group-hover:text-primary transition-colors line-clamp-2">
              {translatedName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 md:space-y-3 pt-0 p-2 md:p-3">
            {product.price && (
              <p className="text-lg md:text-xl lg:text-2xl font-bold text-primary">
                €{Number(product.price).toFixed(2)}
              </p>
            )}
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground group-hover:text-primary transition-colors">
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

export default function FeaturedProductsCarousel({
  products,
  maxVisible = 4
}: FeaturedProductsCarouselProps) {
  const { t } = useTranslation('home');
  const [rotationKey, setRotationKey] = useState(0);

  // Get random products on each rotation
  const visibleProducts = useMemo(() => {
    return getRandomProducts(products, maxVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rotationKey intentionally triggers re-randomization
  }, [products, maxVisible, rotationKey]);

  // Auto-rotate every 60 seconds (1 minute)
  useEffect(() => {
    const interval = setInterval(() => {
      setRotationKey(prev => prev + 1);
    }, 60000); // 60 seconds (1 minute)

    return () => clearInterval(interval);
  }, []);

  const handleRotate = () => {
    setRotationKey(prev => prev + 1);
  };

  return (
    <div className="relative">
      {/* Header with View All button */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">{t('featured.title')}</h2>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/productos">
            <Package2 className="h-4 w-4" />
            {t('featured.viewAllProducts')}
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 bg-slate-100 dark:bg-slate-900">
        {visibleProducts.map((product) => (
          <TranslatedFeaturedProductCard key={product.id} product={product} />
        ))}
      </div>

      {products.length > maxVisible && (
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