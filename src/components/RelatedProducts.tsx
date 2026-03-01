import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { Sparkles } from "lucide-react";

interface RelatedProductsProps {
  productId: string;
  type?: "related" | "upsell";
}

export function RelatedProducts({ productId, type = "related" }: RelatedProductsProps) {
  const { t } = useTranslation('products');
  const [products, setProducts] = useState<any[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRelated();
  }, [productId, type]);

  const loadRelated = async () => {
    try {
      const { data: product } = await supabase
        .from("products")
        .select("related_product_ids, upsell_product_ids")
        .eq("id", productId)
        .single();

      const ids = (type === "related" ? (product as any)?.related_product_ids : (product as any)?.upsell_product_ids) as string[] | null;
      if (!ids || ids.length === 0) return;

      const { data } = await supabase
        .from("products")
        .select("*")
        .in("id", ids)
        .is("deleted_at", null);

      if (data && data.length > 0) {
        setProducts(data);
        const { data: imgsData } = await supabase
          .from("product_images")
          .select("product_id, image_url")
          .in("product_id", data.map(p => p.id))
          .order("display_order");

        const imgMap: Record<string, string> = {};
        imgsData?.forEach(img => {
          if (!imgMap[img.product_id]) imgMap[img.product_id] = img.image_url;
        });
        setImages(imgMap);
      }
    } catch {
      // ignore
    }
  };

  if (products.length === 0) return null;

  return (
    <div className="mt-8 md:mt-12">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg md:text-xl font-bold">
          {type === "related" ? t('relatedProducts.title') : t('upsell.title')}
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} firstImage={images[product.id]} />
        ))}
      </div>
    </div>
  );
}
