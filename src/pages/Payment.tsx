import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Banknote, Building2, ShieldCheck, Copy, QrCode, AlertTriangle } from "lucide-react";
import { logger } from "@/lib/logger";
import { 
  createOrder, 
  createOrderItems, 
  convertCartToOrderItems, 
  calculateOrderTotals,
  generateOrderNotes,
  updateGiftCardBalance,
  calculateCouponDiscount as calculateCouponDiscountUtil
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [orderCreated, setOrderCreated] = useState<{ orderNumber: string; total: number } | null>(null);
  const [paymentImages, setPaymentImages] = useState<string[]>([]);
  const [paymentConfig, setPaymentConfig] = useState({
    bank_transfer_enabled: true,
    card_enabled: true,
    paypal_enabled: false,
    revolut_enabled: false,
    paypal_email: "",
    revolut_link: "",
    company_info: "",
    bank_account_number: "",
    bank_account_name: "",
    bank_name: "",
    bank_instructions: ""
  });
  
  const { calculateShipping } = useShippingCalculator();
  const { taxSettings, calculateTax: calculateTaxFromSettings } = useTaxSettings();

  useEffect(() => {
    loadPaymentConfig();
  }, []);

  const loadPaymentConfig = async () => {
    try {
      // Read all payment configuration keys including bank account details
      const settingKeys = [
        'bank_transfer_enabled', 'card_enabled', 'paypal_enabled', 'revolut_enabled',
        'paypal_email', 'revolut_link', 'company_info',
        'bank_account_number', 'bank_account_name', 'bank_name', 'bank_instructions',
        'payment_images'
      ];

      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .in("setting_key", settingKeys);

      if (data && data.length > 0) {
        const settings: any = {};
        data.forEach((setting) => {
          if (setting.setting_key === 'payment_images') {
            try {
              setPaymentImages(JSON.parse(setting.setting_value));
            } catch (e) {
              setPaymentImages([]);
            }
          } else if (setting.setting_key.includes('enabled')) {
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
          company_info: settings.company_info || "",
          bank_account_number: settings.bank_account_number || "",
          bank_account_name: settings.bank_account_name || "",
          bank_name: settings.bank_name || "",
          bank_instructions: settings.bank_instructions || ""
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

  // Calcular descuento de cupón - using shared utility
  const calculateCouponDiscount = () => {
    return calculateCouponDiscountUtil(cartItems, appliedCoupon);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('payment:messages.copiedToClipboard'));
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
      const effectiveShipping = getEffectiveShippingCost(); // Shipping (0 if has free shipping coupon)
      const tax = calculateTax(); // Tax calculated according to settings (after discount)
      const total = calculateTotal(); // subtotal - discount + tax + shipping

      // For bank transfer, show payment info on the same page
      if (method === "bank_transfer") {
        
        // Save temporary info in sessionStorage
        // CRITICAL: Include shipping and coupon in the pending_order
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

        // Generate temporary order number to display
        const tempOrderNumber = `TEMP-${Date.now()}`;
        
        // Show payment info on the same page
        setSelectedPaymentMethod("bank_transfer");
        setOrderCreated({ orderNumber: tempOrderNumber, total });
        
        toast.success(t('payment:messages.bankTransferSelected'));
        setProcessing(false);
        return;
      }

      // For card payment, redirect to Revolut (since there's no direct payment gateway)
      if (method === "card") {
        if (paymentConfig.revolut_link) {
          // Save temporary info
          sessionStorage.setItem("pending_order", JSON.stringify({
            cartItems,
            shippingInfo,
            total,
            subtotal,
            tax,
            shipping: effectiveShipping,
            couponDiscount,
            appliedCoupon,
            method: "card"
          }));

          // Generar número de pedido temporal
          const tempOrderNumber = `TEMP-${Date.now()}`;
          
          // Mostrar información y abrir Revolut
          setSelectedPaymentMethod("card");
          setOrderCreated({ orderNumber: tempOrderNumber, total });
          
          // Abrir enlace de Revolut para pago con tarjeta
          window.open(paymentConfig.revolut_link, '_blank');
          
          toast.success(t('payment:messages.redirectingToPayment'));
          setProcessing(false);
          return;
        } else {
          toast.error(t('payment:messages.cardPaymentNotConfigured'));
          setProcessing(false);
          return;
        }
      }

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
            <CardTitle>{isInvoicePayment ? t('payment:invoiceSummary') : t('payment:orderSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isInvoicePayment ? (
                // Invoice payment summary
                <>
                  <div className="flex justify-between items-center py-2">
                    <div>
                      <p className="font-medium">{t('payment:invoice')} {shippingInfo.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">{t('payment:invoicePayment')}</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('payment:subtotal')}</span>
                      <span>€{Number(shippingInfo.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {shippingInfo.shipping > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('payment:shipping')}</span>
                        <span>€{Number(shippingInfo.shipping).toFixed(2)}</span>
                      </div>
                    )}
                    {shippingInfo.tax > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('payment:tax')} (21%)</span>
                        <span>€{Number(shippingInfo.tax).toFixed(2)}</span>
                      </div>
                    )}
                    {shippingInfo.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>{t('payment:discount')}</span>
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
                          {t('payment:quantity')}: {item.quantity} x €{Number(item.price).toFixed(2)}
                        </p>
                      </div>
                      <p className="font-medium">€{(Number(item.price) * Number(item.quantity)).toFixed(2)}</p>
                    </div>
                  ))}
                  
                   <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('payment:subtotal')}</span>
                      <span>€{calculateSubtotal().toFixed(2)}</span>
                    </div>
                    {appliedCoupon && calculateCouponDiscount() > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>{t('payment:coupon')} ({appliedCoupon.code})</span>
                        <span>-€{calculateCouponDiscount().toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {appliedCoupon?.discount_type === 'free_shipping' ? t('payment:shippingFree') : t('payment:shipping')}
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
                              <span className="text-muted-foreground">{t('payment:tax')} ({taxSettings.rate}%)</span>
                              <span>€{tax.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold pt-2 border-t">
                            <span>{t('payment:total')}</span>
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

        {/* Bank Transfer Payment Info - Show when bank transfer is selected */}
        {selectedPaymentMethod === "bank_transfer" && orderCreated && (
          <Card className="md:col-span-2 shadow-lg border-2 border-green-200 dark:border-green-800">
            <CardHeader className="text-center bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-t-lg">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl text-green-800 dark:text-green-200">
                {t('payment:instructions.bankTransferTitle')}
              </CardTitle>
              <CardDescription className="text-green-700 dark:text-green-300">
                {t('payment:instructions.orderNumber')}: <strong className="text-green-800 dark:text-green-200">{orderCreated.orderNumber}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Amount to Transfer */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary rounded-xl p-6 text-center">
                <p className="text-sm font-medium text-foreground/70 mb-2">{t('payment:instructions.amountToTransfer')}:</p>
                <p className="text-4xl font-bold text-primary">€{orderCreated.total.toFixed(2)}</p>
                <p className="text-xs text-foreground/60 mt-2">{t('payment:instructions.vatIncluded')}</p>
              </div>

              {/* Bank Information */}
              <div className="bg-slate-800 dark:bg-slate-900 text-white rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-white border-b border-slate-600 pb-3">
                  <Building2 className="h-5 w-5" />
                  {t('payment:instructions.bankDetails')}
                </h3>
                
                <div className="grid gap-4">
                  {paymentConfig.company_info && (
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="font-medium text-slate-300 text-sm mb-1">{t('payment:instructions.companyInfo')}:</p>
                      <p className="whitespace-pre-line text-white">{paymentConfig.company_info}</p>
                    </div>
                  )}
                  
                  {paymentConfig.bank_name && (
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="font-medium text-slate-300 text-sm mb-1">{t('payment:instructions.bankName')}:</p>
                      <p className="text-white font-medium">{paymentConfig.bank_name}</p>
                    </div>
                  )}
                  
                  {paymentConfig.bank_account_name && (
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="font-medium text-slate-300 text-sm mb-1">{t('payment:instructions.accountHolder')}:</p>
                      <p className="text-white font-medium">{paymentConfig.bank_account_name}</p>
                    </div>
                  )}
                  
                  {paymentConfig.bank_account_number && (
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="font-medium text-slate-300 text-sm mb-1">{t('payment:instructions.iban')}:</p>
                      <div className="flex items-center gap-2 mt-2">
                        <code className="bg-white text-slate-900 px-4 py-3 rounded-lg flex-1 font-mono text-lg font-bold">
                          {paymentConfig.bank_account_number}
                        </code>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => copyToClipboard(paymentConfig.bank_account_number)}
                          className="h-12 px-4"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="font-medium text-slate-300 text-sm mb-1">{t('payment:instructions.transferReference')}:</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="bg-white text-slate-900 px-4 py-3 rounded-lg flex-1 font-mono text-lg font-bold">
                        {t('payment:instructions.order')} {orderCreated.orderNumber}
                      </code>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyToClipboard(`${t('payment:instructions.order')} ${orderCreated.orderNumber}`)}
                        className="h-12 px-4"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {paymentConfig.bank_instructions && (
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="font-medium text-slate-300 text-sm mb-1">{t('payment:instructions.additionalInstructions')}:</p>
                      <p className="whitespace-pre-line text-slate-200">
                        {paymentConfig.bank_instructions}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* QR Codes */}
              {paymentImages.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold text-lg">{t('payment:instructions.qrCodes')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('payment:instructions.scanQr')}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paymentImages.map((img, index) => (
                      <div key={index} className="border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                        <img 
                          src={img} 
                          alt={`${t('payment:instructions.qrCode')} ${index + 1}`}
                          className="w-full h-56 object-contain rounded-lg bg-white p-2"
                        />
                        <div className="text-center space-y-1">
                          <p className="font-semibold text-foreground">
                            {index === 0 ? t('payment:instructions.qrBankTransfer') : 
                             index === 1 ? t('payment:instructions.qrRevolut') : 
                             `${t('payment:instructions.qrCode')} ${index + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {index === 0 ? t('payment:instructions.scanForDirectTransfer') : 
                             index === 1 ? t('payment:instructions.fastRevolutPayment') : 
                             t('payment:instructions.alternativePayment')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {t('payment:instructions.pendingWarning')}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {t('payment:instructions.includeOrderNumber')} <strong>{orderCreated.orderNumber}</strong> {t('payment:instructions.inTransferReference')}
                  </p>
                </div>
              </div>

              {/* Confirm Order Button */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button 
                  onClick={() => {
                    navigate("/pago-instrucciones", { 
                      state: { 
                        orderNumber: orderCreated.orderNumber,
                        method: "bank_transfer",
                        total: orderCreated.total,
                        isPending: true
                      } 
                    });
                  }}
                  className="flex-1" 
                  size="lg"
                >
                  {t('payment:confirmAndCreateOrder')}
                </Button>
                <Button 
                  onClick={() => {
                    setSelectedPaymentMethod(null);
                    setOrderCreated(null);
                  }}
                  variant="outline" 
                  className="flex-1" 
                  size="lg"
                >
                  {t('payment:changePaymentMethod')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card Payment Info - Show when card is selected */}
        {selectedPaymentMethod === "card" && orderCreated && (
          <Card className="md:col-span-2 shadow-lg border-2 border-blue-200 dark:border-blue-800">
            <CardHeader className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-t-lg">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-4">
                <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl text-blue-800 dark:text-blue-200">
                {t('payment:instructions.cardPaymentTitle')}
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                {t('payment:instructions.orderNumber')}: <strong className="text-blue-800 dark:text-blue-200">{orderCreated.orderNumber}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Amount to Pay */}
              <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/5 border-2 border-blue-500 rounded-xl p-6 text-center">
                <p className="text-sm font-medium text-foreground/70 mb-2">{t('payment:instructions.amountToPay')}:</p>
                <p className="text-4xl font-bold text-blue-600">€{orderCreated.total.toFixed(2)}</p>
                <p className="text-xs text-foreground/60 mt-2">{t('payment:instructions.vatIncluded')}</p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {t('payment:instructions.revolutOpened')}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                  {t('payment:instructions.completePaymentInRevolut')}
                </p>
              </div>

              {/* QR Codes */}
              {paymentImages.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold text-lg">{t('payment:instructions.qrCodes')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('payment:instructions.scanQrForCard')}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paymentImages.map((img, index) => (
                      <div key={index} className="border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
                        <img 
                          src={img} 
                          alt={`${t('payment:instructions.qrCode')} ${index + 1}`}
                          className="w-full h-56 object-contain rounded-lg bg-white p-2"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button 
                  onClick={() => {
                    if (paymentConfig.revolut_link) {
                      window.open(paymentConfig.revolut_link, '_blank');
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                  size="lg"
                >
                  {t('payment:openPaymentLink')}
                </Button>
                <Button 
                  onClick={() => {
                    navigate("/pago-instrucciones", { 
                      state: { 
                        orderNumber: orderCreated.orderNumber,
                        method: "card",
                        total: orderCreated.total,
                        isPending: true
                      } 
                    });
                  }}
                  variant="outline" 
                  className="flex-1" 
                  size="lg"
                >
                  {t('payment:confirmPayment')}
                </Button>
              </div>
              <Button 
                onClick={() => {
                  setSelectedPaymentMethod(null);
                  setOrderCreated(null);
                }}
                variant="ghost" 
                className="w-full" 
              >
                {t('payment:changePaymentMethod')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Payment Methods - Only show if no payment method is selected */}
        {!selectedPaymentMethod && (
        <div className="space-y-4">
          {paymentConfig.company_info && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t('payment:companyInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-line">{paymentConfig.company_info}</p>
              </CardContent>
            </Card>
          )}
          
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {t('payment:paymentMethodTitle')}
              </CardTitle>
              <CardDescription className="text-foreground/70">{t('payment:paymentMethod')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {/* REVOLUT - Destacado como opción principal para tarjetas */}
              {paymentConfig.revolut_enabled && paymentConfig.revolut_link && (
                <Button
                  onClick={() => handlePayment("revolut")}
                  disabled={processing}
                  className="w-full h-auto py-4 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                >
                  <div className="flex items-center w-full">
                    <div className="flex-shrink-0 mr-4">
                      <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                        <path d="M12.31 11.14c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
                      </svg>
                    </div>
                    <div className="text-left flex-grow">
                      <div className="font-bold text-lg">{t('payment:methods.revolut')}</div>
                      <div className="text-xs text-white/90 mt-1">
                        💳 {t('payment:methods.revolutDesc')}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white/20">Visa</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white/20">Mastercard</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white/20">Bancontact</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white/20">Google Pay</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-white/20">Apple Pay</span>
                      </div>
                    </div>
                  </div>
                </Button>
              )}

              {/* TRANSFERENCIA BANCARIA */}
              {paymentConfig.bank_transfer_enabled && (
                <Button
                  onClick={() => handlePayment("bank_transfer")}
                  disabled={processing}
                  className="w-full h-auto py-4 text-lg border-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                  variant="outline"
                >
                  <div className="flex items-center w-full">
                    <Banknote className="h-10 w-10 mr-4 text-green-600" />
                    <div className="text-left flex-grow">
                      <div className="font-bold text-foreground">{t('payment:methods.bankTransfer')}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        🏦 {t('payment:methods.bankTransferDesc')}
                      </div>
                    </div>
                  </div>
                </Button>
              )}

              {/* PAYPAL */}
              {paymentConfig.paypal_enabled && paymentConfig.paypal_email && (
                <Button
                  onClick={() => handlePayment("paypal")}
                  disabled={processing}
                  className="w-full h-auto py-4 text-lg border-2 hover:bg-blue-50 dark:hover:bg-blue-950"
                  variant="outline"
                >
                  <div className="flex items-center w-full">
                    <svg className="h-10 w-10 mr-4 text-[#003087]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.68l-.04.22-.63 3.993-.028.15a.806.806 0 01-.795.68H8.934c-.414 0-.629-.29-.535-.67l.105-.67.629-3.99.04-.22a.806.806 0 01.794-.68h.5c3.238 0 5.774-1.314 6.514-5.12.256-1.313.192-2.447-.3-3.327z"/>
                      <path d="M19.107 5.663c-.382-.636-1.016-1.04-1.922-1.04H9.772C9.274 4.623 8.9 5.05 8.817 5.584L6.456 20.883c-.1.536.22.977.756.977h4.124l1.035-6.572-.032.202c.083-.534.457-.96.955-.96h1.99c3.904 0 6.96-1.586 7.85-6.172.025-.127.048-.251.068-.374.258-1.656-.006-2.78-.745-3.76-.236-.313-.516-.58-.85-.797z"/>
                    </svg>
                    <div className="text-left flex-grow">
                      <div className="font-bold text-foreground">{t('payment:methods.paypal')}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        🔒 {t('payment:methods.paypalDesc')}
                      </div>
                    </div>
                  </div>
                </Button>
              )}

              {/* Tarjeta directa (si está habilitado) */}
              {paymentConfig.card_enabled && (
                <Button
                  onClick={() => handlePayment("card")}
                  disabled={processing}
                  className="w-full h-auto py-4 text-lg border-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                  variant="outline"
                >
                  <div className="flex items-center w-full">
                    <CreditCard className="h-10 w-10 mr-4 text-purple-600" />
                    <div className="text-left flex-grow">
                      <div className="font-bold text-foreground">{t('payment:methods.creditCard')}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        💳 {t('payment:methods.creditCardDesc')}
                      </div>
                    </div>
                  </div>
                </Button>
              )}

              {!paymentConfig.bank_transfer_enabled && !paymentConfig.card_enabled && !paymentConfig.paypal_enabled && !paymentConfig.revolut_enabled && (
                <div className="text-center text-muted-foreground py-8 bg-muted/30 rounded-lg">
                  <p>{t('payment:noPaymentMethods')}</p>
                </div>
              )}

              {/* Security Notice - We don't store payment data */}
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-800 dark:text-green-200 text-sm">
                      {t('payment:securityNotice.title')}
                    </h4>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1 leading-relaxed">
                      {t('payment:securityNotice.description')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 pt-4 text-xs text-muted-foreground border-t">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <span>{t('payment:securePayment')}</span>
              </div>
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
        )}
      </div>
    </div>
  );
}
