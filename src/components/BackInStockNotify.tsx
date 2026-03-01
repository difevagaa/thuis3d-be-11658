import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface BackInStockNotifyProps {
  productId: string;
}

export function BackInStockNotify({ productId }: BackInStockNotifyProps) {
  const { t } = useTranslation('products');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, [productId]);

  const checkSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("stock_waitlist" as any)
      .select("id")
      .eq("product_id", productId)
      .eq("user_id", user.id)
      .eq("notified", false)
      .maybeSingle();

    setIsSubscribed(!!data);
  };

  const toggleSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error(t('mustLogin'));
      return;
    }

    setLoading(true);
    try {
      if (isSubscribed) {
        await supabase
          .from("stock_waitlist" as any)
          .delete()
          .eq("product_id", productId)
          .eq("user_id", user.id);
        setIsSubscribed(false);
        toast.success(t('stock.leftWaitlist'));
      } else {
        await supabase
          .from("stock_waitlist" as any)
          .insert({
            product_id: productId,
            user_id: user.id,
            user_email: user.email,
          });
        setIsSubscribed(true);
        toast.success(t('stock.waitlistSuccess'));
      }
    } catch {
      toast.error(t('stock.waitlistError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isSubscribed ? "secondary" : "outline"}
      size="sm"
      onClick={toggleSubscription}
      disabled={loading}
      className="w-full gap-2"
    >
      {isSubscribed ? (
        <>
          <BellOff className="h-4 w-4" />
          {t('stock.leaveWaitlist')}
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          {t('stock.joinWaitlist')}
        </>
      )}
    </Button>
  );
}
