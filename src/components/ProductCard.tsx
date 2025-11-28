import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, ShoppingCart, Euro } from "lucide-react";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";
import ProductCarousel from "@/components/ProductCarousel";
import type { Database } from "@/integrations/supabase/types";

type Product = Database['public']['Tables']['products']['Row'] & {
  product_images?: Array<{
    image_url: string;
    display_order: number;
  }>;
};

interface ProductCardProps {
  product: Product;
  firstImage?: string;
}

export function ProductCard({ product, firstImage }: ProductCardProps) {
  const { t } = useTranslation('products');
  const { content } = useTranslatedContent(
    'products',
    product.id,
    ['name', 'description'],
    product
  );

  // Memoize sorted images to avoid re-sorting on every render
  const sortedImages = useMemo(() => {
    if (!product.product_images || product.product_images.length === 0) {
      return [];
    }
    return [...product.product_images].sort((a, b) => a.display_order - b.display_order);
  }, [product.product_images]);

  return (
    <Link to={`/producto/${product.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
        <CardContent className="p-2 md:p-3 lg:p-4">
          <div className="aspect-square bg-muted rounded-md mb-2 md:mb-3 lg:mb-4 overflow-hidden flex items-center justify-center">
            {sortedImages.length > 0 ? (
              <ProductCarousel 
                images={sortedImages} 
                alt={content.name || ''} 
                autoRotate={true} 
              />
            ) : firstImage ? (
              <img src={firstImage} alt={`3D printed product: ${content.name}`} className="w-full h-full object-cover" />
            ) : (
              <Printer className="h-10 w-10 md:h-12 md:w-12 lg:h-16 lg:w-16 text-muted-foreground" />
            )}
          </div>
          <h3 className="font-semibold mb-1 md:mb-2 text-xs md:text-sm lg:text-base line-clamp-2 group-hover:text-primary transition-colors">
            {content.name}
          </h3>
          
          {/* Product Code */}
          {product.product_code && (
            <p className="text-[9px] md:text-[10px] lg:text-xs text-muted-foreground mb-1 font-mono">
              {product.product_code}
            </p>
          )}
          
          {/* Free Shipping Badge */}
          {product.shipping_type === 'free' && (
            <div className="bg-success/10 border border-success/30 rounded-md p-1 md:p-2 mb-2 md:mb-3">
              <p className="text-[9px] md:text-[10px] lg:text-xs font-semibold text-success text-center leading-tight">
                {t('freeShipping')}
              </p>
            </div>
          )}
          
          <p className="text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-primary mb-2 md:mb-3 lg:mb-4 flex items-center gap-1">
            <Euro className="h-4 w-4 md:h-5 md:w-5" />
            {product.price}
          </p>
          
          <div className="flex items-center justify-center gap-2 text-xs md:text-sm text-muted-foreground group-hover:text-primary transition-colors">
            <ShoppingCart className="h-3 w-3 md:h-4 md:w-4" />
            <span>{t('viewDetails')}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
