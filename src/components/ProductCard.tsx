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
      <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group border-border/50 bg-card h-full flex flex-col">
        <CardContent className="p-3 md:p-4 flex flex-col h-full">
          {/* Product Image */}
          <div className="aspect-square bg-white rounded-md mb-3 overflow-hidden flex items-center justify-center relative">
            {sortedImages.length > 0 ? (
              <ProductCarousel 
                images={sortedImages} 
                alt={content.name || ''} 
                autoRotate={true} 
              />
            ) : firstImage ? (
              <img 
                src={firstImage} 
                alt={`3D printed product: ${content.name}`} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              />
            ) : (
              <Printer className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground/30" />
            )}
            
            {/* Free Shipping Badge */}
            {product.shipping_type === 'free' && (
              <div className="absolute top-2 left-2 bg-success text-white text-xs font-semibold px-2 py-1 rounded shadow-md">
                FREE Shipping
              </div>
            )}
          </div>
          
          {/* Product Info */}
          <div className="flex flex-col flex-1">
            <h3 className="font-medium mb-1 text-sm md:text-base line-clamp-2 group-hover:text-primary transition-colors min-h-[2.5rem]">
              {content.name}
            </h3>
            
            {/* Product Code */}
            {product.product_code && (
              <p className="text-xs text-muted-foreground mb-2 font-mono">
                {product.product_code}
              </p>
            )}
            
            {/* Rating placeholder - Amazon style */}
            <div className="flex items-center gap-1 mb-2">
              <div className="flex text-primary">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-xs">★</span>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">(0)</span>
            </div>
            
            {/* Price */}
            <div className="mt-auto">
              <p className="text-2xl md:text-3xl font-bold text-foreground flex items-baseline gap-1">
                <span className="text-base text-muted-foreground">€</span>
                {product.price}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
