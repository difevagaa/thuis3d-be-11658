import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Gift, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FirstPurchaseDiscount() {
  const { t } = useTranslation('products');
  const [show, setShow] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(null);

  useEffect(() => {
    checkFirstPurchase();
  }, []);

  const checkFirstPurchase = async () => {
    // Don't show if dismissed
    if (sessionStorage.getItem("first_purchase_dismissed")) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if user has any orders
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count === 0) {
      // Check for a first-purchase coupon
      const { data: coupon } = await supabase
        .from("coupons")
        .select("code, discount_type, discount_value")
        .eq("is_active", true)
        .is("deleted_at", null)
        .ilike("code", "%FIRST%")
        .maybeSingle();

      if (coupon) {
        setCouponCode(coupon.code);
        setShow(true);
      }
    }
  };

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem("first_purchase_dismissed", "1");
  };

  if (!show || !couponCode) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40 bg-primary text-primary-foreground rounded-xl shadow-2xl p-4 animate-in slide-in-from-bottom-5">
      <button onClick={dismiss} className="absolute top-2 right-2 opacity-70 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="bg-primary-foreground/20 rounded-full p-2 flex-shrink-0">
          <Gift className="h-6 w-6" />
        </div>
        <div>
          <p className="font-bold text-sm">{t('firstPurchase.title')}</p>
          <p className="text-xs opacity-90 mt-1">{t('firstPurchase.description')}</p>
          <div className="mt-2 bg-primary-foreground/20 rounded-lg px-3 py-1.5 inline-block">
            <span className="font-mono font-bold text-sm">{couponCode}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
