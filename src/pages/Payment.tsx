import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Banknote } from "lucide-react";
import { logger } from "@/lib/logger";
import { 
  createOrder, 
  createOrderItems, 
  convertCartToOrderItems, 
  calculateOrderTotals,
  generateOrderNotes,
  updateGiftCardBalance 
} from "@/lib/paymentUtils";
import { useShippingCalculator } from "@/hooks/useShippingCalculator";
import { useTaxSettings } from "@/hooks/useTaxSettings";

export default function Payment() {
  const navigate = useNavigate();
  const { t } = useTranslation(['payment', 'common']);
  const [shippingInfo, setShippingInfo] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [paymentConfig, setPaymentConfig] = useState({
    bank_transfer_enabled: true,
    card_enabled: true,
    paypal_enabled: false,
    revolut_enabled: false,
    paypal_email: "",
    revolut_link: "",
    company_info: ""
  });
  
  const { calculateShipping } = useShippingCalculator();
  const { taxSettings, calculateTax: calculateTaxFromSettings } = useTaxSettings();

  useEffect(() => {
    loadPaymentConfig();
  }, []);

  const loadPaymentConfig = async () => {
    try {
      // Leer solo las claves de configuración de pago que usamos en todo el sistema
      const settingKeys = [
        'bank_transfer_enabled', 'card_enabled', 'paypal_enabled', 'revolut_enabled',
        'paypal_email', 'revolut_link', 'company_info'
      ];

      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .in("setting_key", settingKeys);

      if (data && data.length > 0) {
        const settings: any = {};
        data.forEach((setting) => {
          if (setting.setting_key.includes('enabled')) {
            settings[setting.setting_key] = setting.setting_value === "true";
          } else {
            settings[setting.setting_key] = setting.setting_value;
          }
        });

        setPaymentConfig({
          bank_transfer_enabled: settings.bank_transfer_enabled ?? true,
          card_enabled: settings.card_enabled ?? true,
          paypal_enabled: settings.paypal_enabled ?? false,
          revolut_enabled: settings.revolut_enabled ?? false,
          paypal_email: settings.paypal_email || "",
          revolut_link: settings.revolut_link || "",
          company_info: settings.company_info || ""
        });
      }
    } catch (error) {
      logger.error("Error loading payment config:", error);
    }
  };

  useEffect(() => {
    // Check if this is an invoice payment
    const invoicePaymentData = sessionStorage.getItem("invoice_payment");
    
    if (invoicePaymentData) {
      // This is an invoice payment - load invoice data
      try {
        const invoiceData = JSON.parse(invoicePaymentData);
        setShippingInfo({ isInvoicePayment: true, ...invoiceData });
        setCartItems([]);
      } catch (error) {
        logger.error("Error parsing invoice payment data:", error);
        toast.error(t('payment:messages.errorLoadingInvoice'));
        navigate("/mi-cuenta");
      }
    } else {
      // Normal cart checkout flow
      loadShippingInfo();

      // Load cart items from localStorage
      const savedCart = localStorage.getItem("cart");
      logger.debug('Cart load', { savedCart });
      
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          logger.debug('Cart parsed successfully', { count: parsedCart.length });
          setCartItems(parsedCart);
        } catch (error) {
          logger.error("Error parsing cart:", error);
          setCartItems([]);
        }
      } else {
        logger.warn('No cart found in localStorage');
        setCartItems([]);
      }

      // Load applied coupon from sessionStorage
      const savedCoupon = sessionStorage.getItem("applied_coupon");
      if (savedCoupon) {
        try {
          const parsedCoupon = JSON.parse(savedCoupon);
          logger.debug('Applied coupon loaded', parsedCoupon);
          setAppliedCoupon(parsedCoupon);
        } catch (error) {
          logger.error("Error parsing applied coupon:", error);
          setAppliedCoupon(null);
        }
      }
    }
  }, [navigate]);

  // Calculate shipping when shipping info and cart items are loaded
  useEffect(() => {
    const calculateShippingCost = async () => {
      if (!shippingInfo || shippingInfo.isInvoicePayment || cartItems.length === 0) {
        return;
      }

      try {
        const productIds = cartItems
          .filter(item => !item.isGiftCard && item.productId)
          .map(item => item.productId);
        
        const cartTotal = calculateSubtotal();
        
        const shippingResult = await calculateShipping(
          shippingInfo.country || 'BE',
          shippingInfo.postal_code || '',
          cartTotal,
          productIds
        );
        
        logger.info('Shipping calculated:', shippingResult);
        setShippingCost(shippingResult.cost);
      } catch (error) {
        logger.error('Error calculating shipping:', error);
        setShippingCost(0);
      }
    };

    calculateShippingCost();
  }, [shippingInfo, cartItems]);

  const loadShippingInfo = async () => {
    try {
      // Get session ID from session storage
      const sessionId = sessionStorage.getItem("checkout_session_id");
      if (!sessionId) {
        toast.error(t('payment:messages.mustCompleteShipping'));
        navigate("/informacion-envio");
        return;
      }

      // Load shipping info from database
      const { data: session, error } = await supabase
        .from('checkout_sessions')
        .select('shipping_info')
        .eq('id', sessionId)
        .single();

      if (error || !session) {
        toast.error(t('payment:messages.mustCompleteShipping'));
        navigate("/informacion-envio");
        return;
      }

      setShippingInfo(session.shipping_info);
    } catch (error) {
      logger.error("Error loading shipping info:", error);
      navigate("/informacion-envio");
    }
  };

  // Calcular subtotal (precio sin IVA)
  const calculateSubtotal = () => {
    const subtotal = cartItems.reduce((sum, item) => {
      const itemPrice = Number(item.price) || 0;
      const itemQuantity = Number(item.quantity) || 1;
      return sum + (itemPrice * itemQuantity);
    }, 0);
    return subtotal;
  };

  // Calcular descuento de cupón
  const calculateCouponDiscount = () => {
    if (!appliedCoupon) return 0;
    
    const subtotal = calculateSubtotal();
    
    if (appliedCoupon.discount_type === "free_shipping") {
      // Free shipping is handled in shipping calculation, not as a discount
      return 0;
    } else if (appliedCoupon.product_id) {
      // Product-specific coupon: only apply to the specified product
      const productAmount = cartItems
        .filter(item => item.productId === appliedCoupon.product_id)
        .reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
      
      if (appliedCoupon.discount_type === "percentage") {
        return Number((productAmount * (appliedCoupon.discount_value / 100)).toFixed(2));
      } else if (appliedCoupon.discount_type === "fixed") {
        return Number(Math.min(appliedCoupon.discount_value, productAmount).toFixed(2));
      }
    } else {
      // General coupon: apply to entire subtotal
      if (appliedCoupon.discount_type === "percentage") {
        return Number((subtotal * (appliedCoupon.discount_value / 100)).toFixed(2));
      } else if (appliedCoupon.discount_type === "fixed") {
        return Number(Math.min(appliedCoupon.discount_value, subtotal).toFixed(2));
      }
    }
    return 0;
  };

  // Get effective shipping cost (considering free shipping coupons)
  const getEffectiveShippingCost = () => {
    if (appliedCoupon && appliedCoupon.discount_type === "free_shipping") {
      return 0;
    }
    return shippingCost;
  };

  // Calcular IVA solo para productos con tax_enabled=true (no tarjetas regalo)
  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    const couponDiscount = calculateCouponDiscount();
    
    const taxableAmount = cartItems
      .filter(item => !item.isGiftCard && (item.tax_enabled ?? true))
      .reduce((sum, item) => {
        const itemPrice = Number(item.price) || 0;
        const itemQuantity = Number(item.quantity) || 1;
        return sum + (itemPrice * itemQuantity);
      }, 0);
    
    // Calculate proportional discount for taxable amount
    const taxableRatio = subtotal > 0 ? taxableAmount / subtotal : 0;
    const taxableDiscount = couponDiscount * taxableRatio;
    const taxableAfterDiscount = Math.max(0, taxableAmount - taxableDiscount);
    
    // Use tax rate from settings
    const taxRate = taxSettings.enabled ? taxSettings.rate / 100 : 0;
    return Number((taxableAfterDiscount * taxRate).toFixed(2));
  };

  // Total = subtotal - descuento + IVA + envío
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const couponDiscount = calculateCouponDiscount();
    const effectiveShipping = getEffectiveShippingCost();
    const tax = calculateTax();
    return Number((subtotal - couponDiscount + tax + effectiveShipping).toFixed(2));
  };

  const handlePayment = async (method: string) => {
    // Validar método de pago
    if (method !== "bank_transfer" && method !== "card" && method !== "paypal" && method !== "revolut") {
      toast.error(t('payment:messages.invalidPaymentMethod'));
      return;
    }

    setProcessing(true);
    
    try {
      // Check if this is an invoice payment
      const invoicePaymentData = sessionStorage.getItem("invoice_payment");
      
      if (invoicePaymentData) {
        // Handle invoice payment
        const invoiceData = JSON.parse(invoicePaymentData);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast.error(t('payment:messages.loginRequired'));
          navigate("/auth");
          return;
        }

        // Update invoice payment status and method
        const { error: updateError } = await supabase
          .from("invoices")
          .update({
            payment_status: method === "card" ? "paid" : "pending",
            payment_method: method
          })
          .eq("id", invoiceData.invoiceId)
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        // Clear invoice payment data
        sessionStorage.removeItem("invoice_payment");

        toast.success(method === "card" ? t('payment:messages.invoicePaid') : t('payment:messages.paymentRegistered'));

        // Navigate based on payment method
        if (method === "bank_transfer") {
          navigate("/pago-instrucciones", { 
            state: { 
              orderNumber: invoiceData.invoiceNumber,
              method: "bank_transfer",
              total: invoiceData.total,
              isPending: false,
              isInvoicePayment: true
            } 
          });
        } else if (method === "paypal") {
          // Get PayPal configuration and open payment
          const { data: paypalConfig } = await supabase
            .from("site_settings")
            .select("setting_value")
            .eq("setting_key", "paypal_email")
            .single();
          
          if (paypalConfig?.setting_value) {
            // Use invoice total (already includes subtotal + tax + shipping - discounts)
            const paypalUrl = `https://www.paypal.com/paypalme/${paypalConfig.setting_value.replace('@', '')}/${Number(invoiceData.total).toFixed(2)}EUR`;
            window.open(paypalUrl, '_blank');
            navigate("/pago-instrucciones", { 
              state: { 
                orderNumber: invoiceData.invoiceNumber,
                method: "paypal",
                total: invoiceData.total,
                isPending: false,
                isInvoicePayment: true
              } 
            });
          } else {
            toast.error(t('payment:messages.paypalNotConfigured'));
            navigate("/mi-cuenta?tab=invoices");
          }
        } else if (method === "revolut") {
          // Get Revolut configuration and open payment
          const { data: revolutConfig } = await supabase
            .from("site_settings")
            .select("setting_value")
            .eq("setting_key", "revolut_link")
            .single();
          
          if (revolutConfig?.setting_value) {
            window.open(revolutConfig.setting_value, '_blank');
            navigate("/pago-instrucciones", { 
              state: { 
                orderNumber: invoiceData.invoiceNumber,
                method: "revolut",
                total: invoiceData.total,
                isPending: false,
                isInvoicePayment: true
              } 
            });
          } else {
            toast.error(t('payment:messages.revolutNotConfigured'));
            navigate("/mi-cuenta?tab=invoices");
          }
        } else {
          navigate("/mi-cuenta?tab=invoices");
        }

        setProcessing(false);
        return;
      }

      // Normal cart checkout flow
      // CRITICAL: Authentication is required for all purchases
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error(t('payment:messages.loginRequired'));
        navigate("/auth");
        setProcessing(false);
        return;
      }

      // IMPORTANTE: Calcular correctamente subtotal, IVA, envío y total
      const isGiftCardPurchase = cartItems.some(item => item.isGiftCard);
      const hasOnlyGiftCards = cartItems.every(item => item.isGiftCard);
      
      const subtotal = calculateSubtotal(); // Precio sin IVA
      const couponDiscount = calculateCouponDiscount(); // Descuento de cupón
      const effectiveShipping = getEffectiveShippingCost(); // Envío (0 si tiene cupón de envío gratis)
      const tax = calculateTax(); // IVA calculado según configuración (después de descuento)
      const total = calculateTotal(); // subtotal - descuento + IVA + envío

      // Para transferencia bancaria, solo guardar info y redirigir a instrucciones
      if (method === "bank_transfer") {
        
        // Guardar información temporal en sessionStorage
        // CRÍTICO: Incluir shipping y coupon en el pending_order
        sessionStorage.setItem("pending_order", JSON.stringify({
          cartItems,
          shippingInfo,
          total,
          subtotal,
          tax,
          shipping: effectiveShipping,
          couponDiscount,
          appliedCoupon,
          method: "bank_transfer"
        }));

        toast.success(t('payment:messages.redirectingToInstructions'));
        
        // Navegar inmediatamente
        navigate("/pago-instrucciones", { 
          state: { 
            orderNumber: `TEMP-${Date.now()}`,
            method: "bank_transfer",
            total,
            isPending: true
          } 
        });
        
        setProcessing(false);
        return;
      }

      // Para otros métodos de pago, crear el pedido normalmente

      // Get saved gift card from cart if applied
      const savedGiftCard = sessionStorage.getItem("applied_gift_card");
      let giftCardDiscount = 0;
      let giftCardData = null;
      
      if (savedGiftCard) {
        giftCardData = JSON.parse(savedGiftCard);
        giftCardDiscount = Number(Math.min(giftCardData.current_balance, total).toFixed(2));
      }

      // CRÍTICO: El total final = total (ya incluye IVA y descuento de cupón) - descuento de tarjeta regalo
      const finalTotal = Number(Math.max(0, total - giftCardDiscount).toFixed(2));
      const totalDiscount = Number((couponDiscount + giftCardDiscount).toFixed(2));

      // Preparar notas del pedido
      let orderNotes = "";
      if (appliedCoupon) {
        orderNotes += `Cupón aplicado: ${appliedCoupon.code} (-€${couponDiscount.toFixed(2)})\n`;
      }
      if (giftCardData) {
        orderNotes += `Tarjeta de regalo aplicada: ${giftCardData.code} (-€${giftCardDiscount.toFixed(2)})\n`;
      }
      
      // Si es compra de tarjeta regalo, agregar info a las notas
      if (isGiftCardPurchase) {
        const giftCardItem = cartItems.find(item => item.isGiftCard);
        if (giftCardItem) {
          orderNotes += `Tarjeta Regalo: ${giftCardItem.giftCardCode}\nPara: ${giftCardItem.giftCardRecipient}\nDe: ${giftCardItem.giftCardSender}`;
        }
      }

      // Create order (user is guaranteed to be authenticated at this point)
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          subtotal,
          tax,
          shipping: effectiveShipping,
          discount: totalDiscount,
          total: finalTotal,
          payment_method: method,
          payment_status: method === "card" ? "paid" : "pending",
          shipping_address: JSON.stringify(shippingInfo),
          billing_address: JSON.stringify(shippingInfo),
          notes: orderNotes.trim() || null
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Update gift card balance if used
      if (giftCardData && giftCardDiscount > 0) {
        await updateGiftCardBalance(
          giftCardData.id,
          giftCardData.current_balance - giftCardDiscount
        );
        sessionStorage.removeItem("applied_gift_card");
      }

      // Increment coupon usage counter if coupon was applied
      if (appliedCoupon && couponDiscount > 0) {
        try {
          const { error: couponUpdateError } = await supabase
            .from("coupons")
            .update({ times_used: (appliedCoupon.times_used || 0) + 1 })
            .eq("id", appliedCoupon.id);
          
          if (couponUpdateError) {
            logger.error("Error updating coupon usage:", couponUpdateError);
          } else {
            logger.info("Coupon usage incremented:", appliedCoupon.code);
          }
          
          // If this is a redeemed loyalty coupon, update the redemption status
          if (appliedCoupon.max_uses === 1) {
            await supabase
              .from("loyalty_redemptions")
              .update({ status: 'used', used_at: new Date().toISOString() })
              .eq("coupon_code", appliedCoupon.code);
          }
        } catch (couponError) {
          logger.error("Error processing coupon:", couponError);
        }
        sessionStorage.removeItem("applied_coupon");
      }

      // Create order items using utility function
      const orderItemsData = convertCartToOrderItems(cartItems, order.id);
      
      logger.debug('Order items prepared', { count: orderItemsData.length });

      if (!cartItems || cartItems.length === 0) {
        logger.error('CRITICAL: cartItems is empty');
        throw new Error('El carrito está vacío. No se pueden crear items del pedido.');
      }

      if (orderItemsData.length === 0) {
        logger.error('CRITICAL: orderItemsData is empty');
        throw new Error('Error preparando items del pedido.');
      }

      const insertedItems = await createOrderItems(orderItemsData);
      
      if (!insertedItems || insertedItems.length === 0) {
        logger.error('Failed to create order items');
        toast.error(t('payment:messages.errorCreatingOrderItems'));
        throw new Error(t('payment:messages.errorCreatingOrderItems'));
      }

      logger.info('Order items created successfully', { 
        orderId: order.id, 
        itemCount: insertedItems.length 
      });

      // Create invoice automatically (el trigger se encarga de la notificación)
      try {
        // CRÍTICO: El número de factura debe ser igual al número de pedido
        await supabase.from("invoices").insert({
          invoice_number: order.order_number, // Usar el mismo número del pedido
          user_id: user?.id || null,
          order_id: order.id,
          subtotal: subtotal,
          tax: tax,
          shipping: effectiveShipping, // CRÍTICO: Incluir el costo de envío efectivo
          discount: totalDiscount, // Incluir total de descuentos (cupón + tarjeta regalo)
          coupon_code: appliedCoupon?.code || null,
          coupon_discount: couponDiscount > 0 ? couponDiscount : null,
          gift_card_code: giftCardData?.code || null,
          gift_card_amount: giftCardDiscount > 0 ? giftCardDiscount : null,
          total: finalTotal,
          payment_method: method,
          payment_status: method === "card" ? "paid" : "pending",
          issue_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notes: `Factura generada automáticamente para el pedido ${order.order_number}`
        });
      } catch (invoiceError) {
        logger.error('Error creating invoice:', invoiceError);
      }

      // Enviar correo de confirmación al cliente
      if (user?.id) {
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
                customer_name: profile.full_name || 'Cliente',
                order_number: order.order_number,
                subtotal: subtotal,
                tax: tax,
                shipping: effectiveShipping,
                discount: totalDiscount,
                total: finalTotal,
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
        }
      }

      // Notificar a administradores
      try {
        await supabase.functions.invoke('send-admin-notification', {
          body: {
            to: 'admin@thuis3d.be',
            type: 'order',
            subject: `Nuevo Pedido: ${order.order_number}`,
            message: `Pedido por €${finalTotal.toFixed(2)} de ${shippingInfo.fullName || shippingInfo.full_name}`,
            link: `/admin/pedidos/${order.id}`,
            order_number: order.order_number,
            customer_name: shippingInfo.fullName || shippingInfo.full_name,
            customer_email: shippingInfo.email
          }
        });
      } catch (notifError) {
        logger.error('Error sending admin notification:', notifError);
      }

      // Clear cart and session
      localStorage.removeItem("cart");
      const sessionId = sessionStorage.getItem("checkout_session_id");
      if (sessionId) {
        await supabase.from('checkout_sessions').delete().eq('id', sessionId);
        sessionStorage.removeItem("checkout_session_id");
      }

      toast.success(t('payment:messages.orderCreated'));

      // Navigate based on payment method
      if (method === "paypal") {
        const { data: paypalConfig } = await supabase
          .from("site_settings")
          .select("setting_value")
          .eq("setting_key", "paypal_email")
          .single();
        
        if (paypalConfig?.setting_value) {
          // CRÍTICO: Usar finalTotal que ya incluye: subtotal + tax + shipping - descuentos
          const paypalUrl = `https://www.paypal.com/paypalme/${paypalConfig.setting_value.replace('@', '')}/${finalTotal.toFixed(2)}EUR`;
          window.open(paypalUrl, '_blank');
          navigate("/pago-instrucciones", { 
            state: { 
              orderNumber: order.order_number, 
              method: "paypal",
              total: finalTotal,
              subtotal: subtotal,
              tax: tax,
              shipping: shipping
            } 
          });
        } else {
          toast.error(t('payment:messages.paypalNotConfigured'));
          navigate("/mi-cuenta", { state: { activeTab: 'orders' } });
        }
      } else if (method === "revolut") {
        const { data: revolutConfig } = await supabase
          .from("site_settings")
          .select("setting_value")
          .eq("setting_key", "revolut_link")
          .single();
        
        if (revolutConfig?.setting_value) {
          window.open(revolutConfig.setting_value, '_blank');
          navigate("/pago-instrucciones", { 
            state: { 
              orderNumber: order.order_number, 
              method: "revolut",
              total: finalTotal,
              subtotal: subtotal,
              tax: tax,
              shipping: shipping
            } 
          });
        } else {
          toast.error(t('payment:messages.revolutNotConfigured'));
          navigate("/mi-cuenta", { state: { activeTab: 'orders' } });
        }
      } else {
        navigate("/mi-cuenta", { state: { activeTab: 'orders' } });
      }
    } catch (error) {
      logger.error("Error creating order:", error);
      toast.error(t('payment:messages.errorProcessingOrder'));
    } finally {
      setProcessing(false);
    }
  };

  if (!shippingInfo) {
    return <div className="container mx-auto px-4 py-12">{t('common:loading')}</div>;
  }

  // Check if this is an invoice payment
  const isInvoicePayment = shippingInfo.isInvoicePayment;

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>{isInvoicePayment ? 'Resumen de Factura' : 'Resumen del Pedido'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isInvoicePayment ? (
                // Invoice payment summary
                <>
                  <div className="flex justify-between items-center py-2">
                    <div>
                      <p className="font-medium">Factura {shippingInfo.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">Pago de factura</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>€{Number(shippingInfo.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {shippingInfo.shipping > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Envío</span>
                        <span>€{Number(shippingInfo.shipping).toFixed(2)}</span>
                      </div>
                    )}
                    {shippingInfo.tax > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IVA (21%)</span>
                        <span>€{Number(shippingInfo.tax).toFixed(2)}</span>
                      </div>
                    )}
                    {shippingInfo.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>{t('cart:summary.discount')}</span>
                        <span>-€{Number(shippingInfo.discount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>{t('payment:totalToPay')}</span>
                      <span>€{Number(shippingInfo.total).toFixed(2)}</span>
                    </div>
                  </div>
                </>
              ) : (
                // Normal cart checkout
                <>
                  {cartItems.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Cantidad: {item.quantity} x €{Number(item.price).toFixed(2)}
                        </p>
                      </div>
                      <p className="font-medium">€{(Number(item.price) * Number(item.quantity)).toFixed(2)}</p>
                    </div>
                  ))}
                  
                   <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>€{calculateSubtotal().toFixed(2)}</span>
                    </div>
                    {appliedCoupon && calculateCouponDiscount() > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Cupón ({appliedCoupon.code})</span>
                        <span>-€{calculateCouponDiscount().toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {appliedCoupon?.discount_type === 'free_shipping' ? 'Envío (Gratis)' : 'Envío'}
                      </span>
                      <span>€{getEffectiveShippingCost().toFixed(2)}</span>
                    </div>
                    {(() => {
                      const tax = calculateTax();
                      const total = calculateTotal();
                      
                      return (
                        <>
                          {tax > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">IVA ({taxSettings.rate}%)</span>
                              <span>€{tax.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold pt-2 border-t">
                            <span>Total</span>
                            <span>€{total.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">{t('payment:shippingAddress')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {shippingInfo.full_name}<br />
                      {shippingInfo.address}<br />
                      {shippingInfo.city}, {shippingInfo.postal_code}<br />
                      {shippingInfo.country}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <div className="space-y-4">
          {paymentConfig.company_info && (
            <Card>
              <CardHeader>
                <CardTitle>Información de la Empresa</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{paymentConfig.company_info}</p>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>{t('payment:paymentMethodTitle')}</CardTitle>
              <CardDescription>{t('payment:paymentMethod')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {paymentConfig.bank_transfer_enabled && (
                <Button
                  onClick={() => handlePayment("bank_transfer")}
                  disabled={processing}
                  className="w-full h-20 text-lg"
                  variant="outline"
                >
                  <Banknote className="h-8 w-8 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Transferencia Bancaria</div>
                    <div className="text-xs text-muted-foreground">Te enviaremos los datos bancarios</div>
                  </div>
                </Button>
              )}

              {paymentConfig.card_enabled && (
                <Button
                  onClick={() => handlePayment("card")}
                  disabled={processing}
                  className="w-full h-20 text-lg"
                  variant="outline"
                >
                  <CreditCard className="h-8 w-8 mr-3" />
                  <div className="text-left">
                    <div className="font-semibold">Tarjeta de Crédito/Débito</div>
                    <div className="text-xs text-muted-foreground">Visa, Mastercard, American Express</div>
                  </div>
                </Button>
              )}

              {paymentConfig.paypal_enabled && paymentConfig.paypal_email && (
                <Button
                  onClick={() => handlePayment("paypal")}
                  disabled={processing}
                  className="w-full h-20 text-lg"
                  variant="outline"
                >
                  <svg className="h-8 w-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.68l-.04.22-.63 3.993-.028.15a.806.806 0 01-.795.68H8.934c-.414 0-.629-.29-.535-.67l.105-.67.629-3.99.04-.22a.806.806 0 01.794-.68h.5c3.238 0 5.774-1.314 6.514-5.12.256-1.313.192-2.447-.3-3.327z"/>
                    <path d="M19.107 5.663c-.382-.636-1.016-1.04-1.922-1.04H9.772C9.274 4.623 8.9 5.05 8.817 5.584L6.456 20.883c-.1.536.22.977.756.977h4.124l1.035-6.572-.032.202c.083-.534.457-.96.955-.96h1.99c3.904 0 6.96-1.586 7.85-6.172.025-.127.048-.251.068-.374.258-1.656-.006-2.78-.745-3.76-.236-.313-.516-.58-.85-.797z"/>
                  </svg>
                  <div className="text-left">
                    <div className="font-semibold">PayPal</div>
                    <div className="text-xs text-muted-foreground">Pagar de forma segura con PayPal</div>
                  </div>
                </Button>
              )}

              {paymentConfig.revolut_enabled && paymentConfig.revolut_link && (
                <Button
                  onClick={() => handlePayment("revolut")}
                  disabled={processing}
                  className="w-full h-20 text-lg"
                  variant="outline"
                >
                  <svg className="h-8 w-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
                  </svg>
                  <div className="text-left">
                    <div className="font-semibold">Revolut</div>
                    <div className="text-xs text-muted-foreground">Tarjetas crédito/débito - Pago rápido y seguro</div>
                  </div>
                </Button>
              )}

              {!paymentConfig.bank_transfer_enabled && !paymentConfig.card_enabled && !paymentConfig.paypal_enabled && !paymentConfig.revolut_enabled && (
                <p className="text-center text-muted-foreground py-8">
                  No hay métodos de pago disponibles en este momento. Por favor, contacta con soporte.
                </p>
              )}

              <p className="text-xs text-muted-foreground text-center pt-4">
                Tu información está segura. Usamos encriptación SSL.
              </p>
            </CardContent>
          </Card>

          {!isInvoicePayment && (
            <Button
              onClick={() => navigate("/informacion-envio")}
              variant="ghost"
              className="w-full"
            >
              ← {t('payment:backToShipping')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
