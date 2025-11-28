import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTaxSettings } from "@/hooks/useTaxSettings";
import { useShippingCalculator } from "@/hooks/useShippingCalculator";
import { Separator } from "@/components/ui/separator";
import { Tag, Gift } from "lucide-react";
import { logger } from "@/lib/logger";
import { handleSupabaseError } from "@/lib/errorHandler";

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
}

export default function PaymentSummary() {
  const navigate = useNavigate();
  const { t } = useTranslation(['payment', 'shipping', 'cart', 'common']);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [shippingInfo, setShippingInfo] = useState<any>(null);
  const [shippingCost, setShippingCost] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [appliedGiftCard, setAppliedGiftCard] = useState<any>(null);
  const { taxSettings, calculateTax } = useTaxSettings();
  const { calculateShipping } = useShippingCalculator();

  useEffect(() => {
    loadCheckoutData();
  }, []);

  const loadCheckoutData = async () => {
    try {
      const sessionId = sessionStorage.getItem("checkout_session_id");
      if (!sessionId) {
        i18nToast.error("error.checkoutSessionMissing");
        navigate("/carrito");
        return;
      }

      // Cargar información de envío desde checkout_sessions
      const { data: session, error: sessionError } = await supabase
        .from("checkout_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();
      
      if (sessionError) {
        handleSupabaseError(sessionError, {
          toastMessage: t('shipping:messages.error'),
          context: "Load Checkout Session"
        });
      }

      if (sessionError || !session) {
        handleSupabaseError(sessionError, {
          toastMessage: t('shipping:messages.error'),
          context: "Load Checkout Session"
        });
        navigate("/informacion-envio");
        return;
      }

      const shippingData = typeof session.shipping_info === 'string' 
        ? JSON.parse(session.shipping_info) 
        : session.shipping_info;
      
      setShippingInfo(shippingData);

      // Cargar items del carrito desde localStorage
      const savedCart = localStorage.getItem("cart");
      if (!savedCart) {
        i18nToast.error("error.cartEmpty");
        navigate("/carrito");
        return;
      }

      const parsedCart: CartItem[] = JSON.parse(savedCart);
      if (parsedCart.length === 0) {
        i18nToast.error("error.cartEmpty");
        navigate("/carrito");
        return;
      }

      setCartItems(parsedCart);

      // Cargar cupón aplicado desde sessionStorage
      const savedCoupon = sessionStorage.getItem("applied_coupon");
      if (savedCoupon) {
        try {
          setAppliedCoupon(JSON.parse(savedCoupon));
        } catch (e) {
          logger.error("Error parsing coupon:", e);
        }
      }

      // Cargar tarjeta de regalo aplicada desde sessionStorage
      const savedGiftCard = sessionStorage.getItem("applied_gift_card");
      if (savedGiftCard) {
        try {
          setAppliedGiftCard(JSON.parse(savedGiftCard));
        } catch (e) {
          logger.error("Error parsing gift card:", e);
        }
      }

      // CRÍTICO: Calcular costo de envío con TODOS los datos correctos
      if (parsedCart.length > 0 && shippingData) {
        // Verificar si SOLO hay tarjetas de regalo
        const hasOnlyGiftCards = parsedCart.every(item => item.isGiftCard);
        
        if (hasOnlyGiftCards) {
          setShippingCost(0);
        } else {
          const subtotal = parsedCart.reduce((sum, item) => {
            return sum + (Number(item.price) * item.quantity);
          }, 0);

          // Obtener los IDs de productos correctamente (excluir tarjetas regalo)
          const productIds = parsedCart
            .filter(item => item.productId && !item.isGiftCard)
            .map(item => item.productId);

          const shipping = await calculateShipping(
            shippingData.country || 'BE',
            shippingData.postal_code || '',
            subtotal,
            productIds
          );

          setShippingCost(shipping.cost);
        }
      }
    } catch (error) {
      handleSupabaseError(error, {
        toastMessage: t('payment:messages.error'),
        context: "Load Checkout Data"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => {
      return sum + (Number(item.price) * item.quantity);
    }, 0);
  };

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    
    const subtotal = calculateSubtotal();
    if (appliedCoupon.discount_type === "percentage") {
      return subtotal * (appliedCoupon.discount_value / 100);
    } else if (appliedCoupon.discount_type === "fixed") {
      return appliedCoupon.discount_value;
    }
    return 0;
  };

  const calculateGiftCardAmount = () => {
    if (!appliedGiftCard) return 0;
    
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const afterDiscount = subtotal - discount;
    
    return Math.min(appliedGiftCard.current_balance, afterDiscount);
  };

  const calculateTotalTax = () => {
    if (!taxSettings.enabled) return 0;

    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const giftCardAmount = calculateGiftCardAmount();
    
    // Solo aplicar IVA a productos que no sean tarjetas de regalo
    const taxableAmount = cartItems
      .filter(item => !item.isGiftCard && (item.tax_enabled ?? true))
      .reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    
    if (taxableAmount === 0) return 0;
    
    // Aplicar descuentos proporcionalmente
    const discountRatio = subtotal > 0 ? taxableAmount / subtotal : 0;
    const taxableAfterDiscount = taxableAmount - (discount * discountRatio) - (giftCardAmount * discountRatio);
    
    return calculateTax(Math.max(0, taxableAfterDiscount), true);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const giftCardAmount = calculateGiftCardAmount();
    const tax = calculateTotalTax();
    
    return Math.max(0, subtotal - discount - giftCardAmount + tax + shippingCost);
  };

  const handleConfirmOrder = () => {
    navigate("/pago");
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardContent className="p-8 text-center">
            <p>{t('common:loading')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">{t('payment:orderSummary')}</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('payment:shippingInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>{t('payment:fullName')}:</strong> {shippingInfo?.full_name}</p>
            <p><strong>{t('payment:email')}:</strong> {shippingInfo?.email}</p>
            <p><strong>{t('payment:phone')}:</strong> {shippingInfo?.phone}</p>
            <p><strong>{t('payment:address')}:</strong> {shippingInfo?.address}</p>
            <p><strong>{t('shipping:form.city')}:</strong> {shippingInfo?.city}</p>
            <p><strong>{t('shipping:form.postalCode')}:</strong> {shippingInfo?.postal_code}</p>
            <p><strong>{t('payment:country')}:</strong> {shippingInfo?.country_name || shippingInfo?.country}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('payment:items')} ({cartItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {cartItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {t('cart:empty')}
              </p>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-start gap-4 pb-4 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      {item.materialName && (
                        <p className="text-sm text-muted-foreground">Material: {item.materialName}</p>
                      )}
                      {item.colorName && (
                        <p className="text-sm text-muted-foreground">Color: {item.colorName}</p>
                      )}
                      {item.customText && (
                        <p className="text-sm text-muted-foreground">Texto: {item.customText}</p>
                      )}
                      {item.isGiftCard && (
                        <Badge variant="secondary" className="mt-1">Tarjeta Regalo</Badge>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        Cantidad: {item.quantity} × €{Number(item.price).toFixed(2)}
                      </p>
                    </div>
                    <p className="font-medium">
                      €{(Number(item.price) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('cart:summary.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>{t('cart:summary.subtotal')}:</span>
              <span className="font-semibold">€{calculateSubtotal().toFixed(2)}</span>
            </div>
            
            {appliedCoupon && (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  {t('cart:summary.discount')} ({appliedCoupon.code})
                </span>
                <span className="font-semibold">-€{calculateDiscount().toFixed(2)}</span>
              </div>
            )}

            {appliedGiftCard && (
              <div className="flex justify-between text-blue-600">
                <span className="flex items-center gap-1">
                  <Gift className="h-4 w-4" />
                  {t('cart:summary.giftCard')} ({appliedGiftCard.code})
                </span>
                <span className="font-semibold">-€{calculateGiftCardAmount().toFixed(2)}</span>
              </div>
            )}
            
            {shippingCost > 0 && (
              <div className="flex justify-between">
                <span>{t('cart:summary.shipping')} ({shippingInfo?.country_name || shippingInfo?.country}):</span>
                <span className="font-semibold">€{shippingCost.toFixed(2)}</span>
              </div>
            )}

            {shippingCost === 0 && calculateSubtotal() > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{t('cart:summary.shipping')}:</span>
                <span className="font-semibold">{t('cart:freeShipping')}</span>
              </div>
            )}

            {taxSettings.enabled && calculateTotalTax() > 0 && (
              <div className="flex justify-between">
                <span>{t('cart:summary.tax')} ({taxSettings.rate}%):</span>
                <span className="font-semibold">€{calculateTotalTax().toFixed(2)}</span>
              </div>
            )}

            <Separator className="my-2" />

            <div className="flex justify-between text-lg font-bold">
              <span>{t('cart:summary.total')}:</span>
              <span className="text-primary">€{calculateTotal().toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate("/informacion-envio")} className="flex-1">
            {t('common:back')}
          </Button>
          <Button onClick={handleConfirmOrder} className="flex-1" size="lg">
            {t('cart:checkout')}
          </Button>
        </div>
      </div>
    </div>
  );
}
