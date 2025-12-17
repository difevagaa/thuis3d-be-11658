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
      <Card className="h-full overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-200 bg-card">
        <CardContent className="p-0">
          {/* Image Container - Square aspect ratio */}
          <div className="aspect-square overflow-hidden relative product-media-frame">
            {firstImage ? (
              <img 
                src={firstImage} 
                alt={content.name} 
                className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                <Printer className="h-10 w-10 md:h-16 md:w-16 text-muted-foreground/40" />
              </div>
            )}
            
            {/* Free Shipping Badge - Amazon style */}
            {product.shipping_type === 'free' && (
              <div className="absolute top-1 left-1 md:top-2 md:left-2 bg-green-600 text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide z-10">
                {t('freeShipping')}
              </div>
            )}
          </div>
          
          {/* Product Info - Amazon style */}
          <div className="p-2 md:p-3 space-y-1 min-w-0">
            {/* Product Name - 2 lines max (no fixed min-height; prevents clipping on mobile) */}
            <h3 className="font-medium text-[11px] md:text-sm leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {content.name}
            </h3>

            {/* Product Code - Small, mono */}
            {product.product_code && (
              <p className="text-[8px] md:text-[10px] text-muted-foreground font-mono tracking-wide truncate">
                #{product.product_code}
              </p>
            )}

            {/* Price - Amazon style */}
            <div className="flex items-baseline gap-1 pt-0.5 min-w-0">
              <span className="text-[10px] md:text-xs text-muted-foreground">€</span>
              <span className="text-primary font-bold text-base md:text-lg leading-none truncate">
                {product.price}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
