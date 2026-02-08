import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Printer } from "lucide-react";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";
import type { Database } from "@/integrations/supabase/types";

type Product = Database['public']['Tables']['products']['Row'];

interface ProductCardProps {
  product: Product;
  firstImage?: string;
}

// Amazon-style product card: square image (contain, not cropped), prominent price, 2-line title
export function ProductCard({ product, firstImage }: ProductCardProps) {
  const { t } = useTranslation('products');
  const { content } = useTranslatedContent(
    'products',
    product.id,
    ['name', 'description'],
    product
  );

  return (
    <Link to={`/producto/${product.id}`} className="block group">
      <Card className="h-full overflow-hidden border-0 bg-card hover:shadow-strong transition-all duration-300 rounded-2xl">
        <CardContent className="p-0">
          {/* Image Container - Square aspect ratio */}
          <div className="aspect-square overflow-hidden relative rounded-t-2xl bg-muted/30 product-media-frame">
            {firstImage ? (
              <img 
                src={firstImage} 
                alt={content.name} 
                className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 ease-out" 
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                <Printer className="h-10 w-10 md:h-16 md:w-16 text-muted-foreground/30" />
              </div>
            )}
            
            {/* Free Shipping Badge */}
            {product.shipping_type === 'free' && (
              <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-success text-success-foreground text-[9px] md:text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider z-10">
                {t('freeShipping')}
              </div>
            )}
          </div>
          
          {/* Product Info */}
          <div className="p-3 md:p-4 space-y-1.5 min-w-0">
            {/* Product Name */}
            <h3 className="font-medium text-xs md:text-sm leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200">
              {content.name}
            </h3>

            {/* Product Code */}
            {product.product_code && (
              <p className="text-[9px] md:text-[11px] text-muted-foreground font-mono tracking-wide truncate">
                #{product.product_code}
              </p>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-0.5 pt-1 min-w-0">
              <span className="text-[11px] md:text-xs text-muted-foreground">€</span>
              <span className="text-primary font-bold text-lg md:text-xl leading-none tracking-tight truncate">
                {product.price}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
