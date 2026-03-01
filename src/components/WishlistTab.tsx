import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface WishlistItem {
  id: string;
  product_id: string;
  created_at: string;
  product: {
    id: string;
    name: string;
    price: number;
    is_on_sale?: boolean;
    sale_price?: number;
  } | null;
  image_url?: string;
}

export function WishlistTab({ userId }: { userId?: string }) {
  const { t } = useTranslation(['account', 'products']);
  const navigate = useNavigate();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) loadWishlist();
  }, [userId]);

  const loadWishlist = async () => {
    try {
      const { data, error } = await supabase
        .from("wishlists")
        .select("id, product_id, created_at, products(id, name, price, is_on_sale, sale_price)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch first image for each product
      const withImages = await Promise.all(
        (data || []).map(async (item: any) => {
          const { data: imgData } = await supabase
            .from("product_images")
            .select("image_url")
            .eq("product_id", item.product_id)
            .order("display_order")
            .limit(1)
            .maybeSingle();
          return { ...item, product: item.products, image_url: imgData?.image_url };
        })
      );
      setItems(withImages);
    } catch (error) {
      console.error("Error loading wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("wishlists").delete().eq("id", id);
    if (!error) {
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success(t('account:wishlist.removed'));
    }
  };

  if (loading) return <div className="text-center py-8">{t('account:loading')}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          {t('account:wishlist.title')}
        </CardTitle>
        <CardDescription>{t('account:wishlist.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t('account:wishlist.empty')}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="border rounded-lg overflow-hidden group hover:shadow-md transition-shadow">
                <div
                  className="aspect-square bg-muted cursor-pointer"
                  onClick={() => navigate(`/producto/${item.product_id}`)}
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.product?.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                      {t('products:noImage')}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h4
                    className="font-medium text-sm truncate cursor-pointer hover:text-primary"
                    onClick={() => navigate(`/producto/${item.product_id}`)}
                  >
                    {item.product?.name || t('account:wishlist.unknownProduct')}
                  </h4>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-primary">
                      €{(item.product?.is_on_sale && item.product?.sale_price
                        ? item.product.sale_price
                        : item.product?.price || 0
                      ).toFixed(2)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
