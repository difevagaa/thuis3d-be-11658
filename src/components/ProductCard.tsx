import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, Euro } from "lucide-react";
import { useTranslatedContent } from "@/hooks/useTranslatedContent";
import type { Database } from "@/integrations/supabase/types";

type Product = Database['public']['Tables']['products']['Row'];

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

  return (
    <Link to={`/producto/${product.id}`}>
      <Card className="hover:shadow-md transition-all cursor-pointer group overflow-hidden border-0 shadow-sm bg-card">
        <CardContent className="p-0">
          {/* Image Container - Square aspect ratio */}
          <div className="aspect-square bg-muted overflow-hidden relative">
            {firstImage ? (
              <img 
                src={firstImage} 
                alt={content.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Printer className="h-8 w-8 md:h-12 md:w-12 text-muted-foreground/50" />
              </div>
            )}
            
            {/* Free Shipping Badge - Top left corner */}
            {product.shipping_type === 'free' && (
              <div className="absolute top-1.5 left-1.5 bg-green-500 text-white text-[9px] md:text-[10px] font-semibold px-1.5 py-0.5 rounded">
                {t('freeShipping')}
              </div>
            )}
          </div>
          
          {/* Product Info */}
          <div className="p-2 md:p-3 space-y-1">
            {/* Product Name - 2 lines max */}
            <h3 className="font-medium text-xs md:text-sm leading-tight line-clamp-2 min-h-[2rem] md:min-h-[2.5rem] group-hover:text-primary transition-colors">
              {content.name}
            </h3>
            
            {/* Product Code */}
            {product.product_code && (
              <p className="text-[9px] md:text-[10px] text-muted-foreground font-mono">
                #{product.product_code}
              </p>
            )}
            
            {/* Price */}
            <div className="flex items-baseline gap-0.5">
              <span className="text-primary font-bold text-sm md:text-base">€{product.price}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
