import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Minus, ShoppingBag, Tag, Gift } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTaxSettings } from "@/hooks/useTaxSettings";
import { logger } from "@/lib/logger";
import { handleSupabaseError } from "@/lib/errorHandler";
import { validateCouponCode, validateGiftCardCode } from "@/lib/validation";
import { triggerNotificationRefresh } from "@/lib/notificationUtils";
import { calculateCouponDiscount as calculateCouponDiscountUtil } from "@/lib/paymentUtils";

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  materialId?: string | null;
  materialName?: string | null;
  colorId?: string | null;
  colorName?: string | null;
  customText?: string;
  isGiftCard?: boolean;
  tax_enabled?: boolean;
  colorSelections?: Array<{
    section_id: string;
    section_name: string;
    selection_type: 'color' | 'image';
    color_id?: string;
    color_name?: string;
    color_hex?: string;
    image_id?: string;
    image_name?: string;
    image_url?: string;
  }>;
}

const Cart = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['cart', 'common']);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [giftCardCode, setGiftCardCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [appliedGiftCard, setAppliedGiftCard] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { calculateTax } = useTaxSettings();

  useEffect(() => {
    // Load cart from localStorage
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }

    // Load applied coupon from sessionStorage
    const savedCoupon = sessionStorage.getItem("applied_coupon");
    if (savedCoupon) {
      try {
        setAppliedCoupon(JSON.parse(savedCoupon));
      } catch (e) {
        logger.error("Error loading coupon:", e);
      }
    }

    // Load applied gift card from sessionStorage
    const savedGiftCard = sessionStorage.getItem("applied_gift_card");
    if (savedGiftCard) {
      try {
        setAppliedGiftCard(JSON.parse(savedGiftCard));
      } catch (e) {
        logger.error("Error loading gift card:", e);
      }
    }
  }, []);

  const updateCart = (newCart: CartItem[]) => {
    setCartItems(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const updateQuantity = (id: string, delta: number) => {
    const newCart = cartItems.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    updateCart(newCart);
  };

  const removeItem = (id: string) => {
    const newCart = cartItems.filter(item => item.id !== id);
    updateCart(newCart);
    toast.success(t('cart:itemRemoved'));
  };

  const applyCoupon = async () => {
    const validation = validateCouponCode(couponCode);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase())
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (error || !data) {
        toast.error(t('cart:coupon.invalid'));
        return;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error(t('cart:coupon.expired'));
        return;
      }

      // Check max uses
      if (data.max_uses && data.times_used >= data.max_uses) {
        toast.error(t('cart:coupon.unavailable'));
        return;
      }

      // Check if coupon is product-specific and validate the product is in cart
      // Also calculate applicable amount for min purchase check
      let applicableAmount = subtotal;
      if (data.product_id) {
        const productItems = cartItems.filter(item => item.productId === data.product_id);
        if (productItems.length === 0) {
          toast.error(t('cart:coupon.productNotInCart'));
          return;
        }
        applicableAmount = productItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      }
      
      // Check minimum purchase (for product-specific coupons, uses the product's amount)
      if (data.min_purchase && applicableAmount < data.min_purchase) {
        toast.error(t('cart:coupon.minPurchase', { amount: data.min_purchase }));
        return;
      }

      setAppliedCoupon(data);
      sessionStorage.setItem("applied_coupon", JSON.stringify(data));
      toast.success(t('cart:coupon.applied'));
      setCouponCode("");
    } catch (error) {
      handleSupabaseError(error, {
        toastMessage: t('cart:coupon.invalid'),
        context: "Apply Coupon"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyGiftCard = async () => {
    const validation = validateGiftCardCode(giftCardCode);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("gift_cards")
        .select("*")
        .eq("code", giftCardCode.toUpperCase())
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) {
        handleSupabaseError(error, {
          toastMessage: t('cart:giftCard.invalid'),
          context: "Validate Gift Card"
        });
        return;
      }

      if (!data) {
        toast.error(t('cart:giftCard.invalid'));
        return;
      }

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast.error(t('cart:giftCard.expired'));
        return;
      }

      if (data.current_balance <= 0) {
        toast.error(t('cart:giftCard.noBalance'));
        return;
      }

      setAppliedGiftCard(data);
      sessionStorage.setItem("applied_gift_card", JSON.stringify(data));
      
      // Send notification about gift card redemption with broadcast for immediate update
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Use RPC to create the notification
        await supabase.rpc('send_notification', {
          p_user_id: user.id,
          p_type: 'giftcard_redeemed',
          p_title: t('cart:giftCard.redeemed', { amount: data.current_balance.toFixed(2) }),
          p_message: t('cart:giftCard.redeemed', { amount: data.current_balance.toFixed(2) }),
          p_link: '/carrito'
        });
        
        // Trigger a broadcast to ensure immediate notification refresh
        await triggerNotificationRefresh(user.id);
      }
      
      toast.success(t('cart:giftCard.applied', { balance: data.current_balance.toFixed(2) }));
      setGiftCardCode("");
    } catch (error) {
      handleSupabaseError(error, {
        toastMessage: t('cart:giftCard.invalid'),
        context: "Apply Gift Card"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    sessionStorage.removeItem("applied_coupon");
    toast.info(t('cart:coupon.removed'));
  };

  const removeGiftCard = () => {
    setAppliedGiftCard(null);
    sessionStorage.removeItem("applied_gift_card");
    toast.info(t('cart:giftCard.removed'));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate discount using shared utility - handles product-specific coupons and all types
  const discount = calculateCouponDiscountUtil(cartItems, appliedCoupon);
  
  // Apply gift card after coupon discount
  let giftCardApplied = 0;
  if (appliedGiftCard) {
    const afterDiscount = subtotal - discount;
    giftCardApplied = Math.min(appliedGiftCard.current_balance, Math.max(0, afterDiscount));
  }
  
  // IMPORTANTE: IVA solo se aplica a productos con tax_enabled=true (no tarjetas de regalo)
  const taxableAmount = cartItems
    .filter(item => !item.isGiftCard && (item.tax_enabled ?? true))
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate proportional discount and gift card amounts for taxable products
  const taxableRatio = subtotal > 0 ? taxableAmount / subtotal : 0;
  const taxableDiscount = discount * taxableRatio;
  const taxableGiftCard = giftCardApplied * taxableRatio;
  const taxableAfterDiscounts = Math.max(0, taxableAmount - taxableDiscount - taxableGiftCard);
  const tax = calculateTax(taxableAfterDiscounts, true);
  const total = Math.max(0, subtotal - discount - giftCardApplied + tax);

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 md:py-12 pb-24 md:pb-12">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6 md:p-12 text-center">
            <ShoppingBag className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 md:mb-4 text-muted-foreground" />
            <h2 className="text-xl md:text-2xl font-bold mb-2">{t('cart:empty.title')}</h2>
            <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
              {t('cart:empty.description')}
            </p>
            <Button onClick={() => navigate("/productos")} size="sm" className="md:h-10">
              {t('cart:empty.button')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 xs:px-3 sm:px-4 py-4 xs:py-6 md:py-12 pb-24 md:pb-12">
      <h1 className="text-xl xs:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 xs:mb-4 md:mb-8">{t('cart:title')}</h1>
      
      <div className="grid lg:grid-cols-3 gap-3 xs:gap-4 md:gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-2 xs:space-y-3 md:space-y-4">
          {cartItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-2.5 xs:p-3 md:p-6">
                <div className="flex flex-col sm:flex-row gap-2 xs:gap-3 md:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1.5 xs:mb-2 gap-2">
                      <h3 className="font-semibold text-sm xs:text-base md:text-lg truncate">{item.name}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="sm:hidden h-7 w-7 xs:h-8 xs:w-8 shrink-0"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                      </Button>
                    </div>
                    {item.materialName && (
                      <p className="text-[10px] xs:text-xs md:text-sm text-muted-foreground">Material: {item.materialName}</p>
                    )}
                    {item.colorName && (
                      <p className="text-[10px] xs:text-xs md:text-sm text-muted-foreground">{t('cart:item.color')}: {item.colorName}</p>
                    )}
                    {item.customText && (
                      <p className="text-[10px] xs:text-xs md:text-sm text-muted-foreground truncate">{t('cart:item.text')}: {item.customText}</p>
                    )}
                    {item.colorSelections && item.colorSelections.length > 0 && (
                      <div className="mt-1.5 xs:mt-2 space-y-0.5 xs:space-y-1">
                        <p className="text-[10px] xs:text-xs font-semibold text-muted-foreground">Personalización:</p>
                        {item.colorSelections.map((sel, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 xs:gap-2 text-[10px] xs:text-xs">
                            <span className="font-medium truncate">{sel.section_name}:</span>
                            {sel.selection_type === 'color' ? (
                              <div className="flex items-center gap-1 xs:gap-1.5 min-w-0">
                                {sel.color_hex && (
                                  <div
                                    className="w-2.5 h-2.5 xs:w-3 xs:h-3 rounded border shrink-0"
                                    style={{ backgroundColor: sel.color_hex }}
                                  />
                                )}
                                <span className="text-muted-foreground truncate">{sel.color_name}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 xs:gap-1.5 min-w-0">
                                <img 
                                  src={sel.image_url} 
                                  alt={sel.image_name}
                                  className="w-5 h-5 xs:w-6 xs:h-6 object-cover rounded border shrink-0"
                                />
                                <span className="text-muted-foreground truncate">{sel.image_name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-sm xs:text-base md:text-lg font-bold text-primary mt-1.5 xs:mt-2">€{item.price}</p>
                  </div>
                  
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 xs:gap-3 md:gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hidden sm:flex h-8 w-8"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1 xs:gap-1.5 md:gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 xs:h-8 xs:w-8 md:h-10 md:w-10"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <span className="w-8 xs:w-10 md:w-12 text-center font-semibold text-xs xs:text-sm md:text-base">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 xs:h-8 xs:w-8 md:h-10 md:w-10"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </div>
                    
                    <p className="font-semibold text-xs xs:text-sm md:text-base whitespace-nowrap">
                      {t('cart:item.subtotal')}: €{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-4">
            <CardHeader className="p-3 xs:p-4 md:p-6">
              <CardTitle className="text-base xs:text-lg md:text-xl">{t('cart:summary.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 xs:space-y-3 md:space-y-4 p-3 xs:p-4 md:p-6 pt-0">
              <div className="space-y-1 xs:space-y-1.5 md:space-y-2">
                <div className="flex justify-between text-xs xs:text-sm md:text-base">
                  <span className="text-muted-foreground">{t('common:subtotal')}</span>
                  <span className="font-semibold">€{subtotal.toFixed(2)}</span>
                </div>
                
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600 text-xs xs:text-sm md:text-base">
                    <span className="flex items-center gap-1 min-w-0">
                      <Tag className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                      <span className="truncate">{t('cart:summary.discount')} ({appliedCoupon.code})</span>
                    </span>
                    <span className="font-semibold whitespace-nowrap ml-1">-€{discount.toFixed(2)}</span>
                  </div>
                )}
                
                {appliedGiftCard && (
                  <div className="flex justify-between text-blue-600 text-xs xs:text-sm md:text-base">
                    <span className="flex items-center gap-1 min-w-0">
                      <Gift className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                      <span className="truncate">{t('cart:summary.giftCard')}</span>
                    </span>
                    <span className="font-semibold whitespace-nowrap ml-1">-€{giftCardApplied.toFixed(2)}</span>
                  </div>
                )}
                
                {taxableAmount > 0 && (
                  <div className="flex justify-between text-xs xs:text-sm md:text-base">
                    <span className="text-muted-foreground">{t('cart:summary.tax')}</span>
                    <span className="font-semibold">€{tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-1.5 xs:pt-2 flex justify-between text-sm xs:text-base md:text-lg font-bold">
                  <span>{t('common:total')}</span>
                  <span className="text-primary">€{total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="space-y-2 xs:space-y-2.5 md:space-y-3 border-t pt-2 xs:pt-3 md:pt-4">
                <div className="space-y-1 xs:space-y-1.5 md:space-y-2">
                  <Label className="flex items-center gap-1 xs:gap-1.5 md:gap-2 text-[10px] xs:text-xs md:text-sm">
                    <Tag className="h-3 w-3 md:h-4 md:w-4" />
                    {t('cart:coupon.title')}
                  </Label>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-1.5 xs:p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs xs:text-sm">
                      <span className="font-medium truncate">{appliedCoupon.code}</span>
                      <Button size="sm" variant="ghost" onClick={removeCoupon} className="h-6 xs:h-7 text-[10px] xs:text-xs shrink-0 ml-1">
                        {t('cart:coupon.remove')}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 md:gap-2">
                      <Input
                        placeholder={t('cart:coupon.placeholder')}
                        className="text-xs xs:text-sm h-8 xs:h-9 min-w-0 flex-1"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        disabled={loading}
                      />
                      <Button onClick={applyCoupon} variant="outline" disabled={loading} size="sm" className="h-9 text-xs md:text-sm px-2 xs:px-3 whitespace-nowrap shrink-0">
                        {t('cart:coupon.apply')}
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1.5 md:space-y-2">
                  <Label className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                    <Gift className="h-3 w-3 md:h-4 md:w-4" />
                    {t('cart:giftCard.title')}
                  </Label>
                  {appliedGiftCard ? (
                    <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{appliedGiftCard.code}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('cart:giftCard.balance')}: €{appliedGiftCard.current_balance}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={removeGiftCard} className="h-7 text-xs ml-2">
                        {t('cart:giftCard.remove')}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 md:gap-2">
                      <Input
                        placeholder={t('cart:giftCard.placeholder')}
                        className="text-sm h-9 min-w-0 flex-1"
                        value={giftCardCode}
                        onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                        disabled={loading}
                      />
                      <Button onClick={applyGiftCard} variant="outline" disabled={loading} size="sm" className="h-9 text-xs md:text-sm px-2 xs:px-3 whitespace-nowrap shrink-0">
                        {t('cart:giftCard.apply')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <Button 
                className="w-full" 
                size="default"
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) {
                    toast.error(t('cart:loginRequired'));
                    navigate("/auth");
                    return;
                  }
                  navigate("/informacion-envio");
                }}
              >
                {t('cart:checkout')}
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                size="default"
                onClick={() => navigate("/productos")}
              >
                Continuar Comprando
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Cart;
