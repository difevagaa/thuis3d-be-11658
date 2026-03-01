import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { Clock } from "lucide-react";

const STORAGE_KEY = "recently_viewed_products";
const MAX_ITEMS = 10;

export function addToRecentlyViewed(productId: string) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as string[];
    const filtered = stored.filter(id => id !== productId);
    filtered.unshift(productId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
  } catch {
    // ignore
  }
}

export function RecentlyViewedProducts({ excludeProductId }: { excludeProductId?: string }) {
  const { t } = useTranslation('products');
  const [products, setProducts] = useState<any[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProducts();
  }, [excludeProductId]);

  const loadProducts = async () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as string[];
      const ids = stored.filter(id => id !== excludeProductId).slice(0, 6);
      if (ids.length === 0) return;

      const { data } = await supabase
        .from("products")
        .select("*")
        .in("id", ids)
        .is("deleted_at", null);

      if (data) {
        // Maintain order from localStorage
        const ordered = ids.map(id => data.find(p => p.id === id)).filter(Boolean);
        setProducts(ordered);

        // Fetch first images
        const { data: imgsData } = await supabase
          .from("product_images")
          .select("product_id, image_url")
          .in("product_id", ids)
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
        <Clock className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg md:text-xl font-bold">{t('recentlyViewed.title')}</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} firstImage={images[product.id]} />
        ))}
      </div>
    </div>
  );
}
