import { useEffect, useState, useCallback } from "react";
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
import { triggerNotificationRefresh } from "@/lib/notificationUtils";

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

  const loadCheckoutData = useCallback(async () => {
    try {
      const sessionId = sessionStorage.getItem("checkout_session_id");
      if (!sessionId) {
        toast.error("No hay sesión de checkout");
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
        toast.error("El carrito está vacío");
        navigate("/carrito");
        return;
      }

      const parsedCart: CartItem[] = JSON.parse(savedCart);
      if (parsedCart.length === 0) {
        toast.error("El carrito está vacío");
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
  }, [navigate, t, calculateShipping]);

  useEffect(() => {
    loadCheckoutData();
  }, [loadCheckoutData]);

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => {
      return sum + (Number(item.price) * item.quantity);
    }, 0);
  };

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    
    const subtotal = calculateSubtotal();
    let discount = 0;
    if (appliedCoupon.discount_type === "percentage") {
      discount = subtotal * (appliedCoupon.discount_value / 100);
    } else if (appliedCoupon.discount_type === "fixed") {
      discount = Math.min(appliedCoupon.discount_value, subtotal);
    }
    // free_shipping type: no monetary discount on products, shipping is set to 0 separately
    return Number(discount.toFixed(2));
  };

  const isFreeShippingCoupon = appliedCoupon?.discount_type === "free_shipping";

  // CRITICAL: Calculate tax first without gift card to avoid circular dependency
  const calculateTotalTax = () => {
    if (!taxSettings.enabled) return 0;

    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    
    // Solo aplicar IVA a productos que no sean tarjetas de regalo
    const taxableAmount = cartItems
      .filter(item => !item.isGiftCard && (item.tax_enabled ?? true))
      .reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    
    if (taxableAmount === 0 || subtotal === 0) return 0;
    
    // Aplicar descuentos proporcionalmente (SIN gift card para evitar dependencia circular)
    const discountRatio = taxableAmount / subtotal;
    const taxableAfterDiscount = taxableAmount - (discount * discountRatio);
    
    return calculateTax(Math.max(0, taxableAfterDiscount), true);
  };

  const calculateGiftCardAmount = () => {
    if (!appliedGiftCard) return 0;
    
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const tax = calculateTotalTax();
    const effectiveShipping = isFreeShippingCoupon ? 0 : shippingCost;
    // Gift card covers: subtotal - discount + tax + shipping
    const totalBeforeGiftCard = subtotal - discount + tax + effectiveShipping;
    
    return Number(Math.min(appliedGiftCard.current_balance, Math.max(0, totalBeforeGiftCard)).toFixed(2));
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    const tax = calculateTotalTax();
    const giftCardAmount = calculateGiftCardAmount();
    const effectiveShipping = isFreeShippingCoupon ? 0 : shippingCost;
    
    return Number(Math.max(0, subtotal - discount + tax + effectiveShipping - giftCardAmount).toFixed(2));
  };

  const [processing, setProcessing] = useState(false);

  const handleConfirmOrder = async () => {
    // Prevenir múltiples clicks
    if (processing) return;
    
    const total = calculateTotal();
    
    // Si el total es 0 o negativo (cubierto por tarjeta de regalo), procesar automáticamente
    if (total <= 0 && appliedGiftCard) {
      setProcessing(true);
      
      try {
        // Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error("Debes iniciar sesión para continuar");
          navigate("/auth");
          setProcessing(false);
          return;
        }

        const subtotal = calculateSubtotal();
        const discount = calculateDiscount();
        const giftCardAmount = calculateGiftCardAmount();
        const tax = calculateTotalTax();
        const effectiveShipping = isFreeShippingCoupon ? 0 : shippingCost;
        
        // Preparar notas del pedido
        const orderNotes = [];
        if (appliedGiftCard && giftCardAmount > 0) {
          orderNotes.push(
            `Tarjeta de regalo aplicada: ${appliedGiftCard.code} (-€${giftCardAmount.toFixed(2)})`
          );
        }
        if (appliedCoupon && isFreeShippingCoupon) {
          orderNotes.push(
            `Cupón envío gratis aplicado: ${appliedCoupon.code}`
          );
        } else if (appliedCoupon && discount > 0) {
          orderNotes.push(
            `Cupón aplicado: ${appliedCoupon.code} (-€${discount.toFixed(2)})`
          );
        }

        // Crear pedido con estado PAID ya que está pagado con tarjeta de regalo
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            subtotal,
            tax,
            shipping: effectiveShipping,
            discount: discount + giftCardAmount,
            total: 0, // Total pagado es 0 porque la tarjeta lo cubre todo
            payment_method: "gift_card",
            payment_status: "paid", // CRITICAL: Mark as PAID automatically
            shipping_address: JSON.stringify(shippingInfo),
            billing_address: JSON.stringify(shippingInfo),
            notes: orderNotes.length > 0 ? orderNotes.join('\n\n') : null
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Actualizar balance de tarjeta de regalo
        const newBalance = Number(Math.max(0, appliedGiftCard.current_balance - giftCardAmount).toFixed(2));
        const { error: giftCardError } = await supabase
          .from("gift_cards")
          .update({ current_balance: newBalance })
          .eq("id", appliedGiftCard.id);

        if (giftCardError) throw giftCardError;

        // Crear items del pedido
        const orderItemsData = cartItems.map(item => ({
          order_id: order.id,
          product_id: item.isGiftCard ? null : (item.productId || null),
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          selected_material: item.materialId || null,
          selected_color: item.colorId || null,
          custom_text: item.customText || null
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItemsData);

        if (itemsError) throw itemsError;

        // Actualizar el uso del cupón si se aplicó
        if (appliedCoupon) {
          await supabase
            .from("coupons")
            .update({ times_used: (appliedCoupon.times_used || 0) + 1 })
            .eq("id", appliedCoupon.id);
        }

        // Crear factura automáticamente
        try {
          const invoiceNote = `Factura generada automáticamente para el pedido ${order.order_number} - Pagado con tarjeta de regalo`;
          
          await supabase.from("invoices").insert({
            invoice_number: order.order_number,
            user_id: user.id,
            order_id: order.id,
            subtotal: subtotal,
            tax: tax,
            shipping: effectiveShipping,
            discount: discount + giftCardAmount,
            coupon_discount: isFreeShippingCoupon ? 0 : discount,
            coupon_code: appliedCoupon?.code || null,
            gift_card_code: appliedGiftCard?.code || null,
            gift_card_amount: giftCardAmount || 0,
            total: 0,
            payment_method: "gift_card",
            payment_status: "paid", // CRITICAL: Invoice also marked as PAID
            issue_date: new Date().toISOString(),
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            notes: invoiceNote
          });
        } catch (invoiceError) {
          logger.error('Error creating invoice:', invoiceError);
          // No lanzar error, continuar con el flujo
        }

        // Enviar correo de confirmación al cliente
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', user.id)
            .single();

          if (profile?.email) {
            await supabase.functions.invoke('send-order-confirmation', {
              body: {
                to: profile.email,
                customer_name: profile.full_name || shippingInfo.full_name || 'Cliente',
                order_number: order.order_number,
                subtotal: subtotal,
                tax: tax,
                shipping: effectiveShipping,
                discount: discount + giftCardAmount,
                total: 0,
                items: cartItems.map(item => ({
                  product_name: item.name,
                  quantity: item.quantity,
                  unit_price: item.price
                }))
              }
            });
          }
        } catch (emailError) {
          logger.error('Error sending order confirmation email:', emailError);
          // No lanzar error, continuar con el flujo
        }

        // Notificar a administradores por correo
        try {
          const emailSubject = `Nuevo Pedido: ${order.order_number}`;
          const emailMessage = `Pedido pagado con tarjeta de regalo de ${shippingInfo.full_name || t('common:customer')}`;
          
          await supabase.functions.invoke('send-admin-notification', {
            body: {
              to: 'admin@thuis3d.be',
              type: 'order',
              subject: emailSubject,
              message: emailMessage,
              link: `/admin/pedidos/${order.id}`,
              order_number: order.order_number,
              customer_name: shippingInfo.full_name,
              customer_email: shippingInfo.email
            }
          });
        } catch (notifError) {
          logger.error('Error sending admin notification:', notifError);
          // No lanzar error, continuar con el flujo
        }

        // Enviar notificaciones in-app a todos los administradores
        try {
          const { data: adminRoles } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin');
          
          const adminProfiles = adminRoles?.map(r => ({ id: r.user_id })) || [];

          if (adminProfiles && adminProfiles.length > 0) {
            // Format messages before sending to RPC (don't use t() directly in RPC)
            const notificationTitle = `Nuevo Pedido: ${order.order_number}`;
            const notificationMessage = `Pedido pagado con tarjeta de regalo de ${shippingInfo.full_name || t('common:customer')} - Total: €0.00`;
            
            for (const admin of adminProfiles) {
              await supabase.rpc('send_notification', {
                p_user_id: admin.id,
                p_type: 'new_order',
                p_title: notificationTitle,
                p_message: notificationMessage,
                p_link: `/admin/pedidos/${order.id}`
              });
              
              // Trigger refresh para cada admin
              await triggerNotificationRefresh(admin.id);
            }
          }
        } catch (notifError) {
          logger.error('Error sending admin in-app notifications:', notifError);
          // No lanzar error, continuar con el flujo
        }

        // Limpiar carrito y sesión
        localStorage.removeItem("cart");
        sessionStorage.removeItem("applied_coupon");
        sessionStorage.removeItem("applied_gift_card");
        const sessionId = sessionStorage.getItem("checkout_session_id");
        if (sessionId) {
          await supabase.from('checkout_sessions').delete().eq('id', sessionId);
          sessionStorage.removeItem("checkout_session_id");
        }

        toast.success(t('payment:messages.giftCardOrderCreated', { orderNumber: order.order_number }));
        
        // Redirigir a página de confirmación
        navigate("/mi-cuenta?tab=orders", { 
          state: { 
            newOrder: order.order_number,
            message: t('payment:messages.giftCardOrderSuccess')
          } 
        });
      } catch (error) {
        logger.error("Error processing gift card order:", error);
        toast.error("Error al procesar el pedido. Por favor intenta de nuevo.");
        setProcessing(false);
      }
    } else {
      // Si hay saldo pendiente, continuar al flujo normal de pago
      navigate("/pago");
    }
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
    <div className="container mx-auto px-4 py-6 md:py-12 pb-24 md:pb-12 max-w-3xl">
      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-8">{t('payment:orderSummary')}</h1>

      <div className="flex flex-col gap-4 md:gap-6">
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
            
            {appliedCoupon && !isFreeShippingCoupon && (
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
            
            {isFreeShippingCoupon ? (
              <div className="flex justify-between text-green-600">
                <span className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  {t('cart:summary.shipping')} ({appliedCoupon.code})
                </span>
                <span className="font-semibold">{t('cart:freeShipping')}</span>
              </div>
            ) : shippingCost > 0 ? (
              <div className="flex justify-between">
                <span>{t('cart:summary.shipping')} ({shippingInfo?.country_name || shippingInfo?.country}):</span>
                <span className="font-semibold">€{shippingCost.toFixed(2)}</span>
              </div>
            ) : calculateSubtotal() > 0 ? (
              <div className="flex justify-between text-green-600">
                <span>{t('cart:summary.shipping')}:</span>
                <span className="font-semibold">{t('cart:freeShipping')}</span>
              </div>
            ) : null}

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

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <Button variant="outline" onClick={() => navigate("/informacion-envio")} className="flex-1 order-2 sm:order-1" disabled={processing}>
            {t('common:back')}
          </Button>
          <Button onClick={handleConfirmOrder} className="flex-1 order-1 sm:order-2" size="lg" disabled={processing}>
            {processing ? t('payment:processing') : calculateTotal() <= 0 && appliedGiftCard ? t('payment:messages.confirmOrder') : t('cart:checkout')}
          </Button>
        </div>
      </div>
    </div>
  );
}
