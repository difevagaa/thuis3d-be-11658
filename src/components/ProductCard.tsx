import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, TruckIcon } from "lucide-react";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";
import type { Database } from "@/integrations/supabase/types";

type Product = Database['public']['Tables']['products']['Row'];

interface ProductCardProps {
  product: Product;
  firstImage?: string;
}

// Modern product card with hover lift, gradient overlay hint, and better price layout
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
      <Card className="h-full overflow-hidden border border-border/40 bg-card transition-all duration-300 hover:shadow-[var(--shadow-strong)] hover:-translate-y-1 hover:border-primary/30">
        <CardContent className="p-0">
          {/* Image Container - Square aspect ratio */}
          <div className="aspect-square overflow-hidden relative bg-muted/20">
            {firstImage ? (
              <img 
                src={firstImage} 
                alt={content.name} 
                className="absolute inset-0 w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" 
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                <Printer className="h-10 w-10 md:h-16 md:w-16 text-muted-foreground/30" />
              </div>
            )}
            
            {/* Free Shipping Badge */}
            {product.shipping_type === 'free' && (
              <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 flex items-center gap-1 bg-success text-success-foreground text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded-md uppercase tracking-wide z-10 shadow-sm">
                <TruckIcon className="h-2.5 w-2.5 md:h-3 md:w-3" />
                <span className="hidden sm:inline">{t('freeShipping')}</span>
                <span className="sm:hidden">FREE</span>
              </div>
            )}

            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </div>
          
          {/* Product Info */}
          <div className="p-2.5 md:p-3 space-y-1.5 min-w-0">
            {/* Product Name - 2 lines max */}
            <h3 className="font-medium text-[11px] md:text-sm leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors duration-200">
              {content.name}
            </h3>

            {/* Product Code */}
            {product.product_code && (
              <p className="text-[8px] md:text-[10px] text-muted-foreground font-mono tracking-wider truncate opacity-70">
                #{product.product_code}
              </p>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-0.5 pt-0.5 min-w-0">
              <span className="text-[10px] md:text-xs text-primary/70 font-medium">€</span>
              <span className="text-primary font-bold text-base md:text-lg leading-none truncate">
                {typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
