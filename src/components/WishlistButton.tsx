import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  productId: string;
  size?: "sm" | "icon";
  className?: string;
  variant?: "ghost" | "outline";
}

export function WishlistButton({ productId, size = "icon", className, variant = "ghost" }: WishlistButtonProps) {
  const { t } = useTranslation('products');
  const [isWished, setIsWished] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkWishlist();
  }, [productId]);

  const checkWishlist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("wishlists" as any)
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();

    setIsWished(!!data);
  };

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error(t('mustLogin'));
      return;
    }

    setLoading(true);
    try {
      if (isWished) {
        await supabase
          .from("wishlists" as any)
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        setIsWished(false);
        toast.success(t('wishlist.removed'));
      } else {
        await supabase
          .from("wishlists" as any)
          .insert({ user_id: user.id, product_id: productId });
        setIsWished(true);
        toast.success(t('wishlist.added'));
      }
    } catch (error) {
      toast.error(t('wishlist.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("transition-all", className)}
      onClick={toggleWishlist}
      disabled={loading}
      aria-label={isWished ? t('wishlist.remove') : t('wishlist.add')}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-all",
          isWished ? "fill-destructive text-destructive" : "text-muted-foreground"
        )}
      />
    </Button>
  );
}
