import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Banknote, Gift } from "lucide-react";
import { logger } from "@/lib/logger";
import { 
  createOrder, 
  createOrderItems, 
  convertCartToOrderItems, 
  calculateOrderTotals,
  generateOrderNotes,
  updateGiftCardBalance,
  getOrCreateOrderNumber,
  generateOrderNumber,
  processGiftCardPayment,
  createInvoiceForOrder
} from "@/lib/paymentUtils";
import { useShippingCalculator } from "@/hooks/useShippingCalculator";
import { useTaxSettings } from "@/hooks/useTaxSettings";
import { validateGiftCardCode } from "@/lib/validation";
import { handleSupabaseError, isSchemaGCacheError } from "@/lib/errorHandler";
import { triggerNotificationRefresh } from "@/lib/notificationUtils";

// Constants
const POSTGREST_NO_ROWS_UPDATED = 'PGRST116'; // PostgREST error code for optimistic locking failure
const SESSION_CLEANUP_DELAY_MS = 100; // Delay to ensure sessionStorage cleanup before navigation

export default function Payment() {
  const navigate = useNavigate();
  const { t } = useTranslation(['payment', 'common', 'cart']);
  const [shippingInfo, setShippingInfo] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [paymentImages, setPaymentImages] = useState<string[]>([]);
  const [giftCardCode, setGiftCardCode] = useState("");
  const [appliedGiftCard, setAppliedGiftCard] = useState<any>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [giftCardLoading, setGiftCardLoading] = useState(false);
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
        'paypal_email', 'revolut_link', 'company_info', 'payment_images'
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
    }
  }, [navigate]);

  // Load applied gift card and coupon from sessionStorage
  useEffect(() => {
    const savedGiftCard = sessionStorage.getItem("applied_gift_card");
    if (savedGiftCard) {
      try {
        setAppliedGiftCard(JSON.parse(savedGiftCard));
      } catch (e) {
        logger.error("Error loading gift card:", e);
      }
    }

    const savedCoupon = sessionStorage.getItem("applied_coupon");
    if (savedCoupon) {
      try {
        setAppliedCoupon(JSON.parse(savedCoupon));
      } catch (e) {
        logger.error("Error loading coupon:", e);
      }
    }
  }, []);

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

  // Calcular IVA solo para productos con tax_enabled=true (no tarjetas regalo)
  // CRITICAL: Sin gift card en el cálculo de IVA para evitar dependencia circular
  // Coupon discount is applied proportionally to the taxable amount before calculating tax
  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) return 0;
    
    const taxableAmount = cartItems
      .filter(item => !item.isGiftCard && (item.tax_enabled ?? true))
      .reduce((sum, item) => {
        const itemPrice = Number(item.price) || 0;
        const itemQuantity = Number(item.quantity) || 1;
        return sum + (itemPrice * itemQuantity);
      }, 0);
    
    if (taxableAmount === 0) return 0;

    // Apply coupon discount proportionally to the taxable amount
    const couponDisc = calculateCouponDiscount();
    const discountRatio = subtotal > 0 ? taxableAmount / subtotal : 0;
    const taxableAfterDiscount = Math.max(0, taxableAmount - (couponDisc * discountRatio));

    // Use tax rate from settings
    const taxRate = taxSettings.enabled ? taxSettings.rate / 100 : 0;
    return Number((taxableAfterDiscount * taxRate).toFixed(2));
  };

  // Calcular descuento por cupón
  const isFreeShippingCoupon = appliedCoupon?.discount_type === "free_shipping";

  const calculateCouponDiscount = () => {
    if (!appliedCoupon) return 0;
    const subtotal = calculateSubtotal();
    let discount = 0;
    if (appliedCoupon.discount_type === "percentage") {
      discount = subtotal * (appliedCoupon.discount_value / 100);
    } else if (appliedCoupon.discount_type === "fixed") {
      discount = Math.min(appliedCoupon.discount_value, subtotal);
    }
    // free_shipping: no monetary discount on products
    return Number(discount.toFixed(2));
  };

  const calculateGiftCardAmount = () => {
    if (!appliedGiftCard || !appliedGiftCard.current_balance) return 0;
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const couponDiscount = calculateCouponDiscount();
    const effectiveShipping = isFreeShippingCoupon ? 0 : shippingCost;
    // Gift card covers: subtotal - couponDiscount + IVA + envío
    const totalBeforeGiftCard = subtotal - couponDiscount + tax + effectiveShipping;
    return Math.min(Number(appliedGiftCard.current_balance) || 0, Math.max(0, totalBeforeGiftCard));
  };

  // Total = subtotal - couponDiscount + IVA + envío - gift card
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const couponDiscount = calculateCouponDiscount();
    const giftCardAmount = calculateGiftCardAmount();
    const effectiveShipping = isFreeShippingCoupon ? 0 : shippingCost;
    return Number(Math.max(0, subtotal - couponDiscount + tax + effectiveShipping - giftCardAmount).toFixed(2));
  };

  // Helper to calculate remaining balance after gift card for both orders and invoices
  const calculateRemainingBalance = () => {
    if (isInvoicePayment) {
      const invoiceTotal = Number(shippingInfo.total || 0);
      if (appliedGiftCard) {
        return Math.max(0, invoiceTotal - Math.min(appliedGiftCard.current_balance, invoiceTotal));
      }
      return invoiceTotal;
    }
    return calculateTotal();
  };

  const applyGiftCard = async () => {
    const validation = validateGiftCardCode(giftCardCode);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }
    
    setGiftCardLoading(true);
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
      
      // Send notification about gift card redemption
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const notificationTitle = `Tarjeta regalo aplicada: €${data.current_balance.toFixed(2)}`;
        const notificationMessage = `Has aplicado una tarjeta regalo por €${data.current_balance.toFixed(2)}`;
        
        await supabase.rpc('send_notification', {
          p_user_id: user.id,
          p_type: 'giftcard_redeemed',
          p_title: notificationTitle,
          p_message: notificationMessage,
          p_link: '/informacion-envio'
        });
        
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
      setGiftCardLoading(false);
    }
  };

  const removeGiftCard = () => {
    setAppliedGiftCard(null);
    sessionStorage.removeItem("applied_gift_card");
    toast.info(t('cart:giftCard.removed'));
  };

  const processGiftCardOnlyPayment = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('payment:messages.loginRequired'));
        navigate("/auth");
        return;
      }

      const subtotal = calculateSubtotal();
      const giftCardAmount = calculateGiftCardAmount();
      const tax = calculateTax();
      const couponDisc = calculateCouponDiscount();
      const effShipping = isFreeShippingCoupon ? 0 : shippingCost;
      const total = 0;

      const orderNumber = generateOrderNumber();

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([{
          user_id: user.id,
          order_number: orderNumber,
          status: "pending",
          payment_status: "paid",
          payment_method: "gift_card",
          subtotal: subtotal,
          shipping: effShipping,
          tax: tax,
          discount: couponDisc + giftCardAmount,
          total: total,
          shipping_info: shippingInfo,
          notes: `Pedido pagado completamente con tarjeta de regalo: ${appliedGiftCard.code} (-€${giftCardAmount.toFixed(2)})${appliedCoupon ? `\nCupón aplicado: ${appliedCoupon.code}` : ''}`
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = convertCartToOrderItems(cartItems, order.id);
      const insertedItems = await createOrderItems(orderItems);
      
      if (insertedItems.length === 0) {
        throw new Error('Error creating order items');
      }

      // CRITICAL: Process gift card using unified function
      const giftCardResult = await processGiftCardPayment(
        appliedGiftCard.id,
        giftCardAmount,
        'GIFT_CARD_ONLY_PAYMENT'
      );

      if (!giftCardResult.success) {
        logger.error('[GIFT CARD ONLY PAYMENT] Gift card processing failed:', giftCardResult);
        // Rollback: delete created order
        const { error: rollbackError } = await supabase.from("orders").delete().eq("id", order.id);
        if (rollbackError) {
          logger.error('[GIFT CARD ONLY PAYMENT] CRITICAL: Rollback failed:', rollbackError);
        }
        toast.error(giftCardResult.error || "No se pudo procesar el pago con la tarjeta de regalo");
        removeGiftCard();
        return;
      }

      logger.log('[GIFT CARD ONLY PAYMENT] Gift card processed successfully');

      // Actualizar uso del cupón si se aplicó
      if (appliedCoupon) {
        try {
          await supabase
            .from("coupons")
            .update({ times_used: (appliedCoupon.times_used || 0) + 1 })
            .eq("id", appliedCoupon.id);
        } catch (couponError) {
          logger.error('Error updating coupon usage:', couponError);
        }
      }

      // CRITICAL: Create invoice automatically
      const invoice = await createInvoiceForOrder(order.id, {
        order_number: orderNumber,
        user_id: user.id,
        subtotal: subtotal,
        tax: tax,
        total: total,
        shipping: effShipping,
        discount: couponDisc + giftCardAmount,
        payment_status: 'paid',
        payment_method: 'gift_card',
        gift_card_code: appliedGiftCard.code,
        gift_card_amount: giftCardAmount,
        coupon_code: appliedCoupon?.code || null,
        coupon_discount: couponDisc,
        notes: `Pedido pagado completamente con tarjeta de regalo ${appliedGiftCard.code}`
      });

      if (!invoice) {
        logger.error('[GIFT CARD ONLY PAYMENT] Warning: Invoice creation failed');
        // Continue - invoice can be created manually
      }

      localStorage.removeItem("cart");
      sessionStorage.removeItem("applied_gift_card");
      sessionStorage.removeItem("applied_coupon");
      const sessionId = sessionStorage.getItem("checkout_session_id");
      if (sessionId) {
        await supabase.from('checkout_sessions').delete().eq('id', sessionId);
        sessionStorage.removeItem("checkout_session_id");
      }

      toast.success("¡Pedido completado! Pagado con tarjeta de regalo.");
      navigate("/mi-cuenta", { state: { activeTab: 'orders' } });
    } catch (error) {
      logger.error("Error processing gift card payment:", error);
      toast.error("Error al procesar el pago con tarjeta de regalo");
    } finally {
      setProcessing(false);
    }
  };

  const processInvoiceGiftCardPayment = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t('payment:messages.loginRequired'));
        navigate("/auth");
        return;
      }

      // Validate we have a gift card applied
      if (!appliedGiftCard) {
        toast.error("No hay tarjeta de regalo aplicada");
        return;
      }

      const invoiceData = JSON.parse(sessionStorage.getItem("invoice_payment") || "{}");
      
      if (!invoiceData.invoiceId) {
        toast.error("No se encontró información de la factura");
        return;
      }

      const invoiceTotal = Number(shippingInfo.total || 0);

      logger.log('[INVOICE GIFT CARD PAYMENT] Processing payment:', {
        invoiceId: invoiceData.invoiceId,
        invoiceTotal,
        giftCardCode: appliedGiftCard.code,
        staleGiftCardBalance: appliedGiftCard.current_balance
      });

      // Calculate amounts
      const giftCardAmount = Math.min(appliedGiftCard.current_balance, invoiceTotal);
      const remainingTotal = Math.max(0, invoiceTotal - giftCardAmount);

      logger.log('[INVOICE GIFT CARD PAYMENT] Calculated amounts:', {
        giftCardAmount,
        remainingTotal,
        willMarkPaid: remainingTotal <= 0
      });

      // Get the invoice to check if it has an order linked
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("id, order_id, payment_status")
        .eq("id", invoiceData.invoiceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (invoiceError) {
        logger.error('[INVOICE GIFT CARD PAYMENT] Error fetching invoice:', invoiceError);
        // Check for schema cache errors
        if (isSchemaGCacheError(invoiceError)) {
          throw new Error('Error de base de datos: Por favor recarga la página e intenta nuevamente');
        }
        throw new Error('Error al obtener la factura: ' + invoiceError.message);
      }

      if (!invoice) {
        throw new Error('Factura no encontrada o no tienes permiso para pagarla');
      }

      // Check if invoice is already paid
      if (invoice.payment_status === 'paid') {
        toast.info('Esta factura ya ha sido pagada');
        sessionStorage.removeItem("invoice_payment");
        sessionStorage.removeItem("applied_gift_card");
        navigate("/mi-cuenta?tab=invoices");
        return;
      }

      // CRITICAL: Process gift card using unified function
      const giftCardResult = await processGiftCardPayment(
        appliedGiftCard.id,
        giftCardAmount,
        'INVOICE_PAYMENT'
      );

      if (!giftCardResult.success) {
        logger.error('[INVOICE GIFT CARD PAYMENT] Gift card processing failed:', giftCardResult);
        toast.error(giftCardResult.error || 'Error al procesar la tarjeta de regalo');
        removeGiftCard();
        return;
      }

      logger.log('[INVOICE GIFT CARD PAYMENT] Gift card balance updated successfully');

      // 2. Update invoice payment status and gift card info
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          payment_status: remainingTotal <= 0 ? "paid" : "pending",
          payment_method: "gift_card",
          gift_card_code: appliedGiftCard.code,
          gift_card_amount: giftCardAmount,
          notes: `Pagado con tarjeta de regalo: ${appliedGiftCard.code} (-€${giftCardAmount.toFixed(2)})`
        })
        .eq("id", invoiceData.invoiceId)
        .eq("user_id", user.id);

      if (updateError) {
        logger.error('[INVOICE GIFT CARD PAYMENT] Error updating invoice:', updateError);
        
        // Note: Gift card balance already updated - cannot rollback automatically
        // Admin will need to handle this manually if invoice update fails
        logger.error('[INVOICE GIFT CARD PAYMENT] CRITICAL: Invoice update failed after gift card deduction');
        
        // Check for schema cache errors
        if (isSchemaGCacheError(updateError)) {
          throw new Error('Error de base de datos: Por favor contacta soporte - tu tarjeta fue debitada pero la factura no se actualizó');
        }
        
        throw new Error('Error al actualizar la factura: ' + updateError.message);
      }

      logger.log('[INVOICE GIFT CARD PAYMENT] Invoice updated successfully');

      // 3. If invoice is fully paid and has a linked order, update the order payment status
      if (remainingTotal <= 0 && invoice.order_id) {
        logger.log('[INVOICE GIFT CARD PAYMENT] Updating linked order payment status:', invoice.order_id);
        
        const { error: orderUpdateError } = await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            payment_method: "gift_card"
          })
          .eq("id", invoice.order_id);

        if (orderUpdateError) {
          logger.error('[INVOICE GIFT CARD PAYMENT] Error updating order:', orderUpdateError);
          // Check for schema cache errors
          if (isSchemaGCacheError(orderUpdateError)) {
            toast.warning('Factura pagada. Si el pedido no se actualiza automáticamente, contacta soporte.');
          } else {
            // Log but don't fail - invoice is already paid
            toast.warning('Factura pagada, pero hubo un error al actualizar el pedido. Contacta soporte si es necesario.');
          }
        } else {
          logger.log('[INVOICE GIFT CARD PAYMENT] Order payment status updated successfully');
        }
      }

      // 4. Create notification for user
      if (remainingTotal <= 0) {
        try {
          await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              type: 'payment_success',
              title: '✅ Factura Pagada',
              message: `Tu factura ${invoiceData.invoiceNumber} ha sido pagada con tarjeta de regalo.`,
              link: `/mi-cuenta?tab=invoices`,
              is_read: false
            });

          // Trigger notification refresh
          await triggerNotificationRefresh();
        } catch (notifError) {
          logger.error('[INVOICE GIFT CARD PAYMENT] Error creating notification:', notifError);
          // Don't fail payment for notification errors
        }
      }

      // Clear session data
      sessionStorage.removeItem("invoice_payment");
      sessionStorage.removeItem("applied_gift_card");

      // Show success message
      if (remainingTotal <= 0) {
        toast.success(`¡Factura ${invoiceData.invoiceNumber} pagada con tarjeta de regalo!`);
      } else {
        toast.success(`Se aplicó €${giftCardAmount.toFixed(2)} de tu tarjeta de regalo. Saldo pendiente: €${remainingTotal.toFixed(2)}`);
      }
      
      // Navigate after a short delay to ensure session cleanup completes
      setTimeout(() => {
        navigate("/mi-cuenta?tab=invoices");
      }, SESSION_CLEANUP_DELAY_MS);
      
    } catch (error) {
      logger.error("[INVOICE GIFT CARD PAYMENT] Error processing payment:", error);
      toast.error("Error al procesar el pago: " + (error as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async (method: string) => {
    // Check if gift card covers the total amount
    const total = calculateTotal();
    const giftCardAmount = calculateGiftCardAmount();
    
    // If gift card covers the entire amount, process payment automatically
    if (appliedGiftCard && total <= 0) {
      return await processGiftCardOnlyPayment();
    }
    
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

        // Update invoice payment status and method - TODOS los pagos en pending
        const { error: updateError } = await supabase
          .from("invoices")
          .update({
            payment_status: "pending", // CRÍTICO: SIEMPRE pending
            payment_method: method
          })
          .eq("id", invoiceData.invoiceId)
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        // Clear invoice payment data
        sessionStorage.removeItem("invoice_payment");

        // No mostrar toast aquí - se muestra en la página de destino

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
        } else if (method === "card") {
          // Navigate to card payment intermediate page for invoice payments
          sessionStorage.setItem("pending_card_invoice", JSON.stringify({
            invoiceId: invoiceData.invoiceId,
            invoiceNumber: invoiceData.invoiceNumber,
            total: invoiceData.total,
            subtotal: invoiceData.subtotal,
            tax: invoiceData.tax,
            shipping: invoiceData.shipping || 0,
            discount: invoiceData.discount || 0,
            isInvoicePayment: true
          }));
          
          // No mostrar toast aquí - se mostrará en la página de pago
          navigate("/pago-tarjeta");
          setProcessing(false);
          return;
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
          // Navigate to revolut payment intermediate page for invoice payments
          sessionStorage.setItem("pending_revolut_invoice", JSON.stringify({
            invoiceId: invoiceData.invoiceId,
            invoiceNumber: invoiceData.invoiceNumber,
            total: invoiceData.total,
            subtotal: invoiceData.subtotal,
            tax: invoiceData.tax,
            shipping: invoiceData.shipping || 0,
            discount: invoiceData.discount || 0,
            isInvoicePayment: true
          }));
          
          // No mostrar toast aquí - se mostrará en la página de pago
          navigate("/pago-revolut");
          setProcessing(false);
          return;
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
      const tax = calculateTax(); // IVA calculado según configuración
      const couponDiscount = calculateCouponDiscount(); // Descuento por cupón
      const effectiveShipping = isFreeShippingCoupon ? 0 : shippingCost; // Envío (0 si cupón envío gratis)
      const shipping = effectiveShipping; // Costo de envío efectivo
      // CRITICAL: Use total BEFORE gift card deduction for pending order flows.
      // The downstream pages (CardPaymentPage, RevolutPaymentPage, PaymentInstructions)
      // will read the gift card from sessionStorage and apply the deduction themselves.
      const totalBeforeGiftCard = Number(Math.max(0, subtotal - couponDiscount + tax + shipping).toFixed(2));
      const total = calculateTotal(); // subtotal - couponDiscount + IVA + envío - gift card

      // NUEVO FLUJO: Transferencia bancaria, tarjeta y Revolut - CREAR PEDIDO Y FACTURA PRIMERO
      if (method === "bank_transfer") {
        // Get or create persistent order number from checkout session
        const sessionId = sessionStorage.getItem("checkout_session_id");
        let orderNumber = null;
        
        if (sessionId) {
          orderNumber = await getOrCreateOrderNumber(sessionId);
        }
        
        // If we couldn't get order number from session, generate one now
        if (!orderNumber) {
          orderNumber = generateOrderNumber();
        }

        // CRITICAL: Create order FIRST before redirecting
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert([{
            user_id: user.id,
            order_number: orderNumber,
            status: "pending",
            payment_status: "pending",
            payment_method: "bank_transfer",
            subtotal: subtotal,
            shipping: shipping,
            tax: tax,
            discount: couponDiscount, // Only coupon discount, gift card is NOT processed yet for bank transfer
            total: totalBeforeGiftCard,
            shipping_info: shippingInfo,
            notes: appliedCoupon ? `Cupón aplicado: ${appliedCoupon.code}` : null
          }])
          .select()
          .single();

        if (orderError) {
          logger.error('[BANK TRANSFER] Error creating order:', orderError);
          toast.error("Error al crear el pedido. Por favor, intenta nuevamente.");
          setProcessing(false);
          return;
        }

        logger.log('[BANK TRANSFER] Order created:', order.id);

        // Create order items
        const orderItems = convertCartToOrderItems(cartItems, order.id);
        const insertedItems = await createOrderItems(orderItems);
        
        if (insertedItems.length === 0) {
          logger.error('[BANK TRANSFER] Error creating order items');
          // Rollback: delete order
          await supabase.from("orders").delete().eq("id", order.id);
          toast.error("Error al crear los items del pedido.");
          setProcessing(false);
          return;
        }

        // CRITICAL: Create invoice automatically
        const invoice = await createInvoiceForOrder(order.id, {
          order_number: orderNumber,
          user_id: user.id,
          subtotal: subtotal,
          tax: tax,
          total: totalBeforeGiftCard,
          shipping: shipping,
          discount: couponDiscount,
          payment_status: 'pending',
          payment_method: 'bank_transfer',
          coupon_code: appliedCoupon?.code || null,
          coupon_discount: couponDiscount,
          notes: `Pedido pendiente de pago por transferencia bancaria`
        });

        if (!invoice) {
          logger.error('[BANK TRANSFER] Warning: Invoice creation failed');
          toast.warning("Pedido creado. La factura se generará manualmente.");
        }

        // Update coupon usage if applied
        if (appliedCoupon) {
          try {
            await supabase
              .from("coupons")
              .update({ times_used: (appliedCoupon.times_used || 0) + 1 })
              .eq("id", appliedCoupon.id);
          } catch (couponError) {
            logger.error('[BANK TRANSFER] Error updating coupon usage:', couponError);
          }
        }

        // Clean up
        localStorage.removeItem("cart");
        sessionStorage.removeItem("applied_coupon");
        if (sessionId) {
          await supabase.from('checkout_sessions').delete().eq('id', sessionId);
          sessionStorage.removeItem("checkout_session_id");
        }

        toast.success("Pedido creado. Procede con el pago por transferencia.");
        
        navigate("/pago-instrucciones", { 
          state: { 
            orderNumber: orderNumber,
            method: "bank_transfer",
            total: totalBeforeGiftCard,
            isPending: true, // FIXED: Actually pending until payment confirmed
            orderId: order.id
          } 
        });
        
        setProcessing(false);
        return;
      }

      // Tarjeta de crédito: Crear pedido y factura PRIMERO, luego redirigir
      if (method === "card") {
        // Get or create persistent order number from checkout session
        const sessionId = sessionStorage.getItem("checkout_session_id");
        let orderNumber = null;
        
        if (sessionId) {
          orderNumber = await getOrCreateOrderNumber(sessionId);
        }
        
        // If we couldn't get order number from session, generate one now
        if (!orderNumber) {
          orderNumber = generateOrderNumber();
        }

        // CRITICAL: Create order FIRST before redirecting
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert([{
            user_id: user.id,
            order_number: orderNumber,
            status: "pending",
            payment_status: "pending",
            payment_method: "card",
            subtotal: subtotal,
            shipping: shipping,
            tax: tax,
            discount: couponDiscount, // Only coupon discount, gift card handled separately
            total: totalBeforeGiftCard,
            shipping_info: shippingInfo,
            notes: appliedCoupon ? `Cupón aplicado: ${appliedCoupon.code}` : null
          }])
          .select()
          .single();

        if (orderError) {
          logger.error('[CARD PAYMENT] Error creating order:', orderError);
          toast.error("Error al crear el pedido. Por favor, intenta nuevamente.");
          setProcessing(false);
          return;
        }

        logger.log('[CARD PAYMENT] Order created:', order.id);

        // Create order items
        const orderItems = convertCartToOrderItems(cartItems, order.id);
        const insertedItems = await createOrderItems(orderItems);
        
        if (insertedItems.length === 0) {
          logger.error('[CARD PAYMENT] Error creating order items');
          // Rollback: delete order
          await supabase.from("orders").delete().eq("id", order.id);
          toast.error("Error al crear los items del pedido.");
          setProcessing(false);
          return;
        }

        // CRITICAL: Create invoice automatically
        const invoice = await createInvoiceForOrder(order.id, {
          order_number: orderNumber,
          user_id: user.id,
          subtotal: subtotal,
          tax: tax,
          total: totalBeforeGiftCard,
          shipping: shipping,
          discount: couponDiscount,
          payment_status: 'pending',
          payment_method: 'card',
          coupon_code: appliedCoupon?.code || null,
          coupon_discount: couponDiscount,
          notes: `Pedido pendiente de pago con tarjeta`
        });

        if (!invoice) {
          logger.error('[CARD PAYMENT] Warning: Invoice creation failed');
          toast.warning("Pedido creado. La factura se generará manualmente.");
        }

        // Update coupon usage if applied
        if (appliedCoupon) {
          try {
            await supabase
              .from("coupons")
              .update({ times_used: (appliedCoupon.times_used || 0) + 1 })
              .eq("id", appliedCoupon.id);
          } catch (couponError) {
            logger.error('[CARD PAYMENT] Error updating coupon usage:', couponError);
          }
        }

        // Clean up cart but keep gift card info for card payment page
        localStorage.removeItem("cart");
        sessionStorage.removeItem("applied_coupon");
        if (sessionId) {
          await supabase.from('checkout_sessions').delete().eq('id', sessionId);
          sessionStorage.removeItem("checkout_session_id");
        }

        // Store order info for card payment page
        sessionStorage.setItem("pending_card_order", JSON.stringify({
          orderId: order.id,
          orderNumber: orderNumber,
          total: totalBeforeGiftCard,
          subtotal,
          tax,
          shipping
        }));

        // No mostrar toast aquí - se mostrará en la página de pago con tarjeta
        navigate("/pago-tarjeta");
        
        setProcessing(false);
        return;
      }

      // Revolut: Crear pedido y factura PRIMERO, luego redirigir
      if (method === "revolut") {
        // Get or create persistent order number from checkout session
        const sessionId = sessionStorage.getItem("checkout_session_id");
        let orderNumber = null;
        
        if (sessionId) {
          orderNumber = await getOrCreateOrderNumber(sessionId);
        }
        
        // If we couldn't get order number from session, generate one now
        if (!orderNumber) {
          orderNumber = generateOrderNumber();
        }

        // CRITICAL: Create order FIRST before redirecting
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert([{
            user_id: user.id,
            order_number: orderNumber,
            status: "pending",
            payment_status: "pending",
            payment_method: "revolut",
            subtotal: subtotal,
            shipping: shipping,
            tax: tax,
            discount: couponDiscount, // Only coupon discount, gift card handled separately
            total: totalBeforeGiftCard,
            shipping_info: shippingInfo,
            notes: appliedCoupon ? `Cupón aplicado: ${appliedCoupon.code}` : null
          }])
          .select()
          .single();

        if (orderError) {
          logger.error('[REVOLUT PAYMENT] Error creating order:', orderError);
          toast.error("Error al crear el pedido. Por favor, intenta nuevamente.");
          setProcessing(false);
          return;
        }

        logger.log('[REVOLUT PAYMENT] Order created:', order.id);

        // Create order items
        const orderItems = convertCartToOrderItems(cartItems, order.id);
        const insertedItems = await createOrderItems(orderItems);
        
        if (insertedItems.length === 0) {
          logger.error('[REVOLUT PAYMENT] Error creating order items');
          // Rollback: delete order
          await supabase.from("orders").delete().eq("id", order.id);
          toast.error("Error al crear los items del pedido.");
          setProcessing(false);
          return;
        }

        // CRITICAL: Create invoice automatically
        const invoice = await createInvoiceForOrder(order.id, {
          order_number: orderNumber,
          user_id: user.id,
          subtotal: subtotal,
          tax: tax,
          total: totalBeforeGiftCard,
          shipping: shipping,
          discount: couponDiscount,
          payment_status: 'pending',
          payment_method: 'revolut',
          coupon_code: appliedCoupon?.code || null,
          coupon_discount: couponDiscount,
          notes: `Pedido pendiente de pago con Revolut`
        });

        if (!invoice) {
          logger.error('[REVOLUT PAYMENT] Warning: Invoice creation failed');
          toast.warning("Pedido creado. La factura se generará manualmente.");
        }

        // Update coupon usage if applied
        if (appliedCoupon) {
          try {
            await supabase
              .from("coupons")
              .update({ times_used: (appliedCoupon.times_used || 0) + 1 })
              .eq("id", appliedCoupon.id);
          } catch (couponError) {
            logger.error('[REVOLUT PAYMENT] Error updating coupon usage:', couponError);
          }
        }

        // Clean up cart but keep gift card info for revolut payment page
        localStorage.removeItem("cart");
        sessionStorage.removeItem("applied_coupon");
        if (sessionId) {
          await supabase.from('checkout_sessions').delete().eq('id', sessionId);
          sessionStorage.removeItem("checkout_session_id");
        }

        // Store order info for revolut payment page
        sessionStorage.setItem("pending_revolut_order", JSON.stringify({
          orderId: order.id,
          orderNumber: orderNumber,
          total: totalBeforeGiftCard,
          subtotal,
          tax,
          shipping
        }));

        // No mostrar toast aquí - se mostrará en la página de pago con Revolut
        navigate("/pago-revolut");
        
        setProcessing(false);
        return;
      }

      // PayPal: Crear pedido inmediatamente y redirigir (SOLO PARA PAYPAL)
      if (method === "paypal") {
        // Get saved gift card from cart if applied
        const savedGiftCard = sessionStorage.getItem("applied_gift_card");
        let giftCardDiscount = 0;
        let giftCardData = null;
        
        if (savedGiftCard) {
          giftCardData = JSON.parse(savedGiftCard);
          // CRITICAL: Use totalBeforeGiftCard to correctly calculate how much the gift card covers
          giftCardDiscount = Number(Math.min(giftCardData.current_balance, Math.max(0, totalBeforeGiftCard)).toFixed(2));
        }

        const finalTotal = Number(Math.max(0, totalBeforeGiftCard - giftCardDiscount).toFixed(2));

        // Preparar notas del pedido
        const orderNotes = generateOrderNotes(cartItems, giftCardData, giftCardDiscount);

        // Create order - SIEMPRE con payment_status: "pending"
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            subtotal,
            tax,
            shipping,
            discount: couponDiscount + giftCardDiscount,
            total: finalTotal,
            payment_method: "paypal",
            payment_status: "pending", // CRÍTICO: SIEMPRE pending
            shipping_address: JSON.stringify(shippingInfo),
            billing_address: JSON.stringify(shippingInfo),
            notes: orderNotes
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Update gift card balance if used
        if (giftCardData && giftCardDiscount > 0) {
          await updateGiftCardBalance(
            giftCardData.id,
            Number(Math.max(0, giftCardData.current_balance - giftCardDiscount).toFixed(2))
          );
          sessionStorage.removeItem("applied_gift_card");
        }

        // Create order items using utility function
        const orderItemsData = convertCartToOrderItems(cartItems, order.id);
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

        // Create invoice automatically
        try {
          await supabase.from("invoices").insert({
            invoice_number: order.order_number,
            user_id: user.id,
            order_id: order.id,
            subtotal: subtotal,
            tax: tax,
            shipping: shipping,
            discount: couponDiscount + giftCardDiscount,
            coupon_discount: isFreeShippingCoupon ? 0 : couponDiscount,
            coupon_code: appliedCoupon?.code || null,
            gift_card_code: giftCardData?.code || null,
            gift_card_amount: giftCardDiscount || 0,
            total: finalTotal,
            payment_method: "paypal",
            payment_status: "pending", // CRÍTICO: SIEMPRE pending
            issue_date: new Date().toISOString(),
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            notes: `Factura generada automáticamente para el pedido ${order.order_number}`
          });
        } catch (invoiceError) {
          logger.error('Error creating invoice:', invoiceError);
        }

        // Actualizar uso del cupón
        if (appliedCoupon) {
          try {
            await supabase
              .from("coupons")
              .update({ times_used: (appliedCoupon.times_used || 0) + 1 })
              .eq("id", appliedCoupon.id);
          } catch (couponError) {
            logger.error('Error updating coupon usage:', couponError);
          }
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
                  shipping: shipping,
                  discount: couponDiscount + giftCardDiscount,
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
        sessionStorage.removeItem("applied_coupon");
        const sessionId = sessionStorage.getItem("checkout_session_id");
        if (sessionId) {
          await supabase.from('checkout_sessions').delete().eq('id', sessionId);
          sessionStorage.removeItem("checkout_session_id");
        }

        toast.success(t('payment:messages.orderCreated'));

        // Get PayPal config and redirect
        const { data: paypalConfig } = await supabase
          .from("site_settings")
          .select("setting_value")
          .eq("setting_key", "paypal_email")
          .single();
        
        if (paypalConfig?.setting_value) {
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

        setProcessing(false);
        return;
      }
      
      // Si llegamos aquí, es un método no válido
      toast.error(t('payment:messages.invalidPaymentMethod'));
      setProcessing(false);
    } catch (error) {
      logger.error("Error creating order:", error);
      toast.error(t('payment:messages.errorProcessingOrder'));
    } finally {
      setProcessing(false);
    }
  };

  if (!shippingInfo) {
    return <div className="page-section">{t('common:loading')}</div>;
  }

  // Check if this is an invoice payment
  const isInvoicePayment = shippingInfo.isInvoicePayment;

  return (
    <div className="medium-container py-6 md:py-10 pb-24 md:pb-12">
      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6">{t('payment:title')}</h1>
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 md:gap-6">
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
                    {appliedCoupon && !isFreeShippingCoupon && (
                      <div className="flex justify-between text-green-600">
                        <span className="flex items-center gap-1">
                          <Gift className="h-4 w-4" />
                          {t('cart:summary.discount')} ({appliedCoupon.code})
                        </span>
                        <span className="font-semibold">-€{calculateCouponDiscount().toFixed(2)}</span>
                      </div>
                    )}
                    {appliedGiftCard && (
                      <div className="flex justify-between text-blue-600">
                        <span className="flex items-center gap-1">
                          <Gift className="h-4 w-4" />
                          Tarjeta de Regalo
                        </span>
                        <span className="font-semibold">-€{calculateGiftCardAmount().toFixed(2)}</span>
                      </div>
                    )}
                    {isFreeShippingCoupon ? (
                      <div className="flex justify-between text-green-600">
                        <span>{t('cart:summary.shipping', 'Envío')} ({appliedCoupon.code})</span>
                        <span className="font-semibold">{t('cart:freeShipping', 'Envío Gratis')}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Envío</span>
                        <span>€{shippingCost.toFixed(2)}</span>
                      </div>
                    )}
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
          {/* Gift Card Section - Allow for both regular checkout and invoice payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Tarjeta de Regalo
              </CardTitle>
              <CardDescription>
                {isInvoicePayment 
                  ? "¿Tienes una tarjeta de regalo? Úsala para pagar tu factura"
                  : "¿Tienes una tarjeta de regalo? Aplícala aquí para usar su saldo"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {appliedGiftCard ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{appliedGiftCard.code}</p>
                      <p className="text-xs text-muted-foreground">
                        Saldo: €{appliedGiftCard.current_balance.toFixed(2)}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={removeGiftCard} className="ml-2">
                      Quitar
                    </Button>
                  </div>
                  {calculateRemainingBalance() <= 0 && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        ✓ Tu tarjeta de regalo cubre el total {isInvoicePayment ? "de la factura" : "de la compra"}
                      </p>
                      <Button
                        onClick={() => isInvoicePayment ? processInvoiceGiftCardPayment() : processGiftCardOnlyPayment()}
                        disabled={processing}
                        className="w-full mt-3"
                      >
                        {processing ? "Procesando..." : (isInvoicePayment ? "Pagar Factura" : "Completar Pedido")}
                      </Button>
                    </div>
                  )}
                  {calculateRemainingBalance() > 0 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Saldo restante a pagar: €{calculateRemainingBalance().toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Selecciona un método de pago para el saldo restante
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Código de Tarjeta de Regalo</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: GIFT-XXXX-XXXX"
                      value={giftCardCode}
                      onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                      disabled={giftCardLoading}
                    />
                    <Button onClick={applyGiftCard} disabled={giftCardLoading} variant="outline">
                      {giftCardLoading ? "Validando..." : "Aplicar"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
          
          {/* Only show payment methods if there's an amount to pay */}
          {calculateRemainingBalance() > 0 && (
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
                  className="w-full h-auto min-h-[3.5rem] py-3 px-4"
                  variant="outline"
                >
                  <Banknote className="h-5 w-5 mr-3 flex-shrink-0" />
                  <div className="text-left min-w-0 flex-1">
                    <div className="font-semibold text-sm">{t('payment:methods.bankTransfer')}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{t('payment:methodDescriptions.bankTransfer')}</div>
                  </div>
                </Button>
              )}

              {paymentConfig.card_enabled && (
                <Button
                  onClick={() => handlePayment("card")}
                  disabled={processing}
                  className="w-full h-auto min-h-[3.5rem] py-3 px-4"
                  variant="outline"
                >
                  <CreditCard className="h-5 w-5 mr-3 flex-shrink-0" />
                  <div className="text-left min-w-0 flex-1">
                    <div className="font-semibold text-sm">{t('payment:methods.creditCard')}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{t('payment:methodDescriptions.creditCard')}</div>
                  </div>
                </Button>
              )}

              {paymentConfig.paypal_enabled && paymentConfig.paypal_email && (
                <Button
                  onClick={() => handlePayment("paypal")}
                  disabled={processing}
                  className="w-full h-auto min-h-[3.5rem] py-3 px-4"
                  variant="outline"
                >
                  <svg className="h-5 w-5 mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.68l-.04.22-.63 3.993-.028.15a.806.806 0 01-.795.68H8.934c-.414 0-.629-.29-.535-.67l.105-.67.629-3.99.04-.22a.806.806 0 01.794-.68h.5c3.238 0 5.774-1.314 6.514-5.12.256-1.313.192-2.447-.3-3.327z"/>
                    <path d="M19.107 5.663c-.382-.636-1.016-1.04-1.922-1.04H9.772C9.274 4.623 8.9 5.05 8.817 5.584L6.456 20.883c-.1.536.22.977.756.977h4.124l1.035-6.572-.032.202c.083-.534.457-.96.955-.96h1.99c3.904 0 6.96-1.586 7.85-6.172.025-.127.048-.251.068-.374.258-1.656-.006-2.78-.745-3.76-.236-.313-.516-.58-.85-.797z"/>
                  </svg>
                  <div className="text-left min-w-0 flex-1">
                    <div className="font-semibold text-sm">{t('payment:methods.paypal')}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{t('payment:methodDescriptions.paypal')}</div>
                  </div>
                </Button>
              )}

              {paymentConfig.revolut_enabled && paymentConfig.revolut_link && (
                <Button
                  onClick={() => handlePayment("revolut")}
                  disabled={processing}
                  className="w-full h-auto min-h-[3.5rem] py-3 px-4"
                  variant="outline"
                >
                  <svg className="h-5 w-5 mr-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
                  </svg>
                  <div className="text-left min-w-0 flex-1">
                    <div className="font-semibold text-sm">{t('payment:methods.revolut')}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{t('payment:methodDescriptions.revolut')}</div>
                  </div>
                </Button>
              )}

              {!paymentConfig.bank_transfer_enabled && !paymentConfig.card_enabled && !paymentConfig.paypal_enabled && !paymentConfig.revolut_enabled && (
                <p className="text-center text-muted-foreground py-8">
                  {t('payment:noPaymentMethods', 'No payment methods available at this time. Please contact support.')}
                </p>
              )}

              <p className="text-xs text-muted-foreground text-center pt-4">
                {t('payment:secureInfo', 'Your information is secure. We use SSL encryption.')}
              </p>
            </CardContent>
          </Card>
          )}

          {/* QR Codes Display */}
          {paymentImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('payment:qrCodes')}</CardTitle>
                <CardDescription>{t('payment:qrCodesDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentImages.map((img, index) => (
                    <div key={index} className="border border-border rounded-lg p-4 space-y-3 bg-card">
                      <img 
                        src={img} 
                        alt={t('payment:qrCodeAlt', { number: index + 1 })}
                        className="w-full h-56 object-contain rounded"
                      />
                      <div className="text-center space-y-1">
                        <p className="font-medium text-sm text-foreground">
                          {index === 0 ? t('payment:qrBankTransfer', 'QR Bank Transfer') : 
                           index === 1 ? t('payment:qrRevolut', 'QR Revolut') : 
                           t('payment:qrCodeAlt', { number: index + 1 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {index === 0 ? t('payment:qrBankTransferDesc', 'Scan for direct transfer') : 
                           index === 1 ? t('payment:qrRevolutDesc', 'Fast payment with Revolut') : 
                           t('payment:qrAlternative', 'Alternative payment method')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
