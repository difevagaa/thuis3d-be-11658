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
import { validateCouponCode } from "@/lib/validation";
import { triggerNotificationRefresh } from "@/lib/notificationUtils";
import { saveEncryptedCart, loadEncryptedCart, clearCart } from "@/lib/cartEncryption";

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
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [appliedGiftCard, setAppliedGiftCard] = useState<any>(null); // Keep for display only
  const [loading, setLoading] = useState(false);
  const { calculateTax } = useTaxSettings();

  useEffect(() => {
    // Load cart from encrypted localStorage
    const loadCart = async () => {
      try {
        const savedCart = await loadEncryptedCart<CartItem[]>();
        if (savedCart && Array.isArray(savedCart)) {
          // Validar que todos los items tengan los campos requeridos
          const validatedCart = savedCart.filter(item => 
            item && 
            typeof item === 'object' &&
            item.id && 
            item.productId && 
            item.name && 
            typeof item.price === 'number' &&
            typeof item.quantity === 'number' &&
            item.quantity > 0
          );
          setCartItems(validatedCart);
        }
      } catch (error) {
        logger.error("Error loading encrypted cart:", error);
        // Si falla, empezar con carrito vacío
        setCartItems([]);
      }
    };

    loadCart();

    // Load applied coupon from sessionStorage
    const savedCoupon = sessionStorage.getItem("applied_coupon");
    if (savedCoupon) {
      try {
        setAppliedCoupon(JSON.parse(savedCoupon));
      } catch (e) {
        logger.error("Error loading coupon:", e);
      }
    }

    // Load applied gift card from sessionStorage (display only)
    const savedGiftCard = sessionStorage.getItem("applied_gift_card");
    if (savedGiftCard) {
      try {
        setAppliedGiftCard(JSON.parse(savedGiftCard));
      } catch (e) {
        logger.error("Error loading gift card:", e);
      }
    }
  }, []);

  const updateCart = async (newCart: CartItem[]) => {
    setCartItems(newCart);
    try {
      await saveEncryptedCart(newCart);
    } catch (error) {
      logger.error("Error saving encrypted cart:", error);
      toast.error(t('cart:errorSavingCart'));
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const newCart = cartItems.map(item => {
      if (item.id === id) {
        // Validar que la cantidad sea válida (entre 1 y 999)
        const newQuantity = Math.max(1, Math.min(999, item.quantity + delta));
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

      // Check minimum purchase
      if (data.min_purchase && subtotal < data.min_purchase) {
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

  const removeCoupon = () => {
    setAppliedCoupon(null);
    sessionStorage.removeItem("applied_coupon");
    toast.info(t('cart:coupon.removed'));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate discount from coupon
  let discount = 0;
  const isFreeShippingCoupon = appliedCoupon?.discount_type === "free_shipping";
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percentage") {
      discount = subtotal * (appliedCoupon.discount_value / 100);
    } else if (appliedCoupon.discount_type === "fixed") {
      discount = Math.min(appliedCoupon.discount_value, subtotal);
    }
    // free_shipping type: discount stays 0, shipping handled in PaymentSummary
  }
  discount = Number(discount.toFixed(2));
  
  // IMPORTANTE: IVA solo se aplica a productos con tax_enabled=true (no tarjetas de regalo)
  // Calcular IVA SIN considerar gift card para evitar dependencia circular
  const taxableAmount = cartItems
    .filter(item => !item.isGiftCard && (item.tax_enabled ?? true))
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountRatio = subtotal > 0 ? taxableAmount / subtotal : 0;
  const taxableAfterDiscount = Math.max(0, taxableAmount - (discount * discountRatio));
  const tax = calculateTax(taxableAfterDiscount, true);
  
  // Apply gift card DESPUÉS de calcular IVA (gift card cubre subtotal - discount + tax)
  let giftCardApplied = 0;
  if (appliedGiftCard) {
    const totalBeforeGiftCard = subtotal - discount + tax;
    giftCardApplied = Math.min(appliedGiftCard.current_balance, Math.max(0, totalBeforeGiftCard));
  }
  
  const total = Math.max(0, subtotal - discount + tax - giftCardApplied);

  if (cartItems.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-24 md:pb-12">
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-6 md:p-12 text-center">
            <ShoppingBag className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 md:mb-4 text-muted-foreground" />
            <h2 className="text-xl md:text-2xl font-bold mb-2">{t('cart:empty.title')}</h2>
            <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
              {t('cart:empty.description')}
            </p>
            <Button onClick={() => navigate("/productos")} className="h-10">
              {t('cart:empty.button')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 lg:py-10 pb-24 md:pb-12">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">{t('cart:title')}</h1>
      
      <div className="grid lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-3 md:space-y-4">
          {cartItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-3 md:p-6">
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-base md:text-lg">{item.name}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="sm:hidden h-8 w-8"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {item.materialName && (
                      <p className="text-xs md:text-sm text-muted-foreground">{t('cart:item.material')}: {item.materialName}</p>
                    )}
                    {item.colorName && (
                      <p className="text-xs md:text-sm text-muted-foreground">{t('cart:item.color')}: {item.colorName}</p>
                    )}
                    {item.customText && (
                      <p className="text-xs md:text-sm text-muted-foreground">{t('cart:item.text')}: {item.customText}</p>
                    )}
                    {item.colorSelections && item.colorSelections.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">{t('cart:item.customization')}:</p>
                        {item.colorSelections.map((sel, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            <span className="font-medium">{sel.section_name}:</span>
                            {sel.selection_type === 'color' ? (
                              <div className="flex items-center gap-1.5">
                                {sel.color_hex && (
                                  <div
                                    className="w-3 h-3 rounded border"
                                    style={{ backgroundColor: sel.color_hex }}
                                  />
                                )}
                                <span className="text-muted-foreground">{sel.color_name}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <img 
                                  src={sel.image_url} 
                                  alt={sel.image_name}
                                  className="w-6 h-6 object-cover rounded border"
                                />
                                <span className="text-muted-foreground">{sel.image_name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-base md:text-lg font-bold text-primary mt-2">€{item.price}</p>
                  </div>
                  
                  <div className="flex sm:flex-col items-center sm:items-end gap-3 md:gap-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hidden sm:flex"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 md:h-10 md:w-10"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <span className="w-10 md:w-12 text-center font-semibold text-sm md:text-base">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 md:h-10 md:w-10"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </div>
                    
                    <p className="font-semibold text-sm md:text-base whitespace-nowrap">
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
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">{t('cart:summary.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              <div className="space-y-1.5 md:space-y-2">
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-muted-foreground">{t('common:subtotal')}</span>
                  <span className="font-semibold">€{subtotal.toFixed(2)}</span>
                </div>
                
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600 text-sm md:text-base">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="truncate">
                        {isFreeShippingCoupon 
                          ? `${t('cart:freeShipping', 'Envío Gratis')} (${appliedCoupon.code})`
                          : `${t('cart:summary.discount')} (${appliedCoupon.code})`
                        }
                      </span>
                    </span>
                    <span className="font-semibold whitespace-nowrap">
                      {isFreeShippingCoupon ? t('cart:freeShipping', 'Envío Gratis') : `-€${discount.toFixed(2)}`}
                    </span>
                  </div>
                )}
                
                {appliedGiftCard && (
                  <div className="flex justify-between text-blue-600 text-sm md:text-base">
                    <span className="flex items-center gap-1">
                      <Gift className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="truncate">{t('cart:summary.giftCard')}</span>
                    </span>
                    <span className="font-semibold whitespace-nowrap">-€{giftCardApplied.toFixed(2)}</span>
                  </div>
                )}
                
                {taxableAmount > 0 && (
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-muted-foreground">{t('cart:summary.tax')}</span>
                    <span className="font-semibold">€{tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between text-base md:text-lg font-bold">
                  <span>{t('common:total')}</span>
                  <span className="text-primary">€{total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="space-y-2.5 md:space-y-3 border-t pt-3 md:pt-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                    <Tag className="h-3 w-3 md:h-4 md:w-4" />
                    {t('cart:coupon.title')}
                  </Label>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm">
                      <span className="font-medium truncate">{appliedCoupon.code}</span>
                      <Button size="sm" variant="ghost" onClick={removeCoupon} className="h-7 text-xs">
                        {t('cart:coupon.remove')}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 md:gap-2">
                      <Input
                        placeholder={t('cart:coupon.placeholder')}
                        className="text-sm h-9"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        disabled={loading}
                      />
                      <Button onClick={applyCoupon} variant="outline" disabled={loading} size="sm" className="h-9 text-xs md:text-sm px-3 whitespace-nowrap">
                        {t('cart:coupon.apply')}
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
                {t('cart:continueShopping')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Cart;
