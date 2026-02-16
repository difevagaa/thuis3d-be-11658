import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Copy, Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";
import { 
  createOrder, 
  createOrderItems, 
  convertCartToOrderItems,
  generateOrderNotes,
  updateGiftCardBalance
} from "@/lib/paymentUtils";
import { generateTransactionId, checkTransactionExists, registerTransaction } from "@/lib/transactionIdempotency";

export default function RevolutPaymentPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['payment', 'common']);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showRedirectOverlay, setShowRedirectOverlay] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [paymentImages, setPaymentImages] = useState<string[]>([]);
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [pendingOrderInfo, setPendingOrderInfo] = useState<{ orderNumber: string; total: number; isInvoicePayment: boolean } | null>(null);

  const loadOrderData = useCallback(() => {
    // Check for invoice payment first
    const pendingInvoiceStr = sessionStorage.getItem("pending_revolut_invoice");
    const pendingOrderStr = sessionStorage.getItem("pending_revolut_order");
    
    if (pendingInvoiceStr) {
      // This is an invoice payment
      try {
        const data = JSON.parse(pendingInvoiceStr);
        setOrderData(data);
        setOrderNumber(data.invoiceNumber || "");
        setLoading(false);
      } catch (error) {
        logger.error("Error parsing invoice data:", error);
        // Silent error - navigate away
        navigate("/pago");
      }
    } else if (pendingOrderStr) {
      // This is a normal order payment
      try {
        const data = JSON.parse(pendingOrderStr);
        setOrderData(data);
        // Use the order number from the session data
        setOrderNumber(data.orderNumber || "");
        setLoading(false);
      } catch (error) {
        logger.error("Error parsing order data:", error);
        // Silent error - navigate away
        navigate("/pago");
      }
    } else {
      // Silent error - navigate away
      navigate("/pago");
      return;
    }
  }, [navigate]);

  const loadPaymentConfig = useCallback(async () => {
    try {
      const settingKeys = ['revolut_link', 'payment_images'];
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
          } else {
            settings[setting.setting_key] = setting.setting_value;
          }
        });
        setPaymentConfig(settings);
      }
    } catch (error) {
      logger.error("Error loading payment config:", error);
    }
  }, []);

  useEffect(() => {
    loadOrderData();
    loadPaymentConfig();
  }, [loadOrderData, loadPaymentConfig]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Silent copy - no toast
  };

  // Después de mostrar overlay 4s, abrir pestaña con URL y navegar a /pago-en-proceso
  useEffect(() => {
    if (showRedirectOverlay && pendingOrderInfo) {
      const timer = setTimeout(() => {
        // Abrir la pestaña de pago con la URL configurada
        const gatewayUrl = paymentConfig?.revolut_link;
        if (gatewayUrl) {
          window.open(gatewayUrl, '_blank', 'noopener,noreferrer');
        }
        
        // Navegar a página de pago en proceso
        navigate("/pago-en-proceso", {
          state: {
            orderNumber: pendingOrderInfo.orderNumber,
            total: pendingOrderInfo.total,
            paymentMethod: "revolut",
            isInvoicePayment: pendingOrderInfo.isInvoicePayment,
          },
        });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showRedirectOverlay, pendingOrderInfo, navigate, paymentConfig]);

  const handleProceedToPayment = async () => {
    setProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error(t('payment:messages.loginRequired'));
        navigate("/auth");
        return;
      }

      if (orderData.isInvoicePayment) {
        const { invoiceId, invoiceNumber, total } = orderData;
        
        const transactionId = generateTransactionId();
        const duplicateCheck = await checkTransactionExists(transactionId);
        if (duplicateCheck.exists) {
          toast.error('Transacción duplicada');
          return;
        }
        
        await registerTransaction(transactionId, {
          invoiceId,
          amount: total,
          currency: 'EUR',
          userId: user.id,
          metadata: { method: 'revolut', type: 'invoice' }
        });
        
        const { error: updateError } = await supabase
          .from("invoices")
          .update({
            payment_status: "processing",
            payment_method: "revolut"
          })
          .eq("id", invoiceId)
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        // Clear invoice payment data
        sessionStorage.removeItem("pending_revolut_invoice");

        // Mostrar overlay - la pestaña se abrirá después de 4s desde useEffect
        if (paymentConfig?.revolut_link) {
          setPendingOrderInfo({ orderNumber: invoiceNumber, total, isInvoicePayment: true });
          setShowRedirectOverlay(true);
        } else {
          // If no gateway configured, go to instructions page
          navigate("/pago-instrucciones", {
            state: {
              orderNumber: invoiceNumber,
              method: "revolut",
              total: total,
              isPending: false,
              isInvoicePayment: true
            }
          });
        }
        return;
      }

      // Normal order payment flow
      const { cartItems, shippingInfo, total, subtotal, tax, shipping, orderNumber: persistedOrderNumber } = orderData;

      // Get saved gift card if applied
      const savedGiftCard = sessionStorage.getItem("applied_gift_card");
      let giftCardDiscount = 0;
      let giftCardData = null;
      
      if (savedGiftCard) {
        giftCardData = JSON.parse(savedGiftCard);
        giftCardDiscount = Number(Math.min(giftCardData.current_balance, total).toFixed(2));
      }

      // Get saved coupon if applied
      const savedCoupon = sessionStorage.getItem("applied_coupon");
      let couponData = null;
      let couponDiscount = 0;
      
      if (savedCoupon) {
        try {
          couponData = JSON.parse(savedCoupon);
          if (couponData.discount_type === "percentage") {
            couponDiscount = subtotal * (couponData.discount_value / 100);
          } else if (couponData.discount_type === "fixed") {
            couponDiscount = Math.min(couponData.discount_value, subtotal);
          }
          // free_shipping: couponDiscount stays 0, shipping already adjusted in Payment.tsx
          couponDiscount = Number(couponDiscount.toFixed(2));
        } catch (e) {
          logger.error("Error parsing coupon:", e);
        }
      }

      const finalTotal = Number(Math.max(0, total - giftCardDiscount).toFixed(2));

      const transactionId = generateTransactionId();
      const duplicateCheck = await checkTransactionExists(transactionId);
      if (duplicateCheck.exists) {
        toast.error('Transacción duplicada');
        return;
      }
      
      await registerTransaction(transactionId, {
        amount: finalTotal,
        currency: 'EUR',
        userId: user.id,
        metadata: { method: 'revolut', type: 'order' }
      });

      const orderNotes = `${generateOrderNotes(cartItems, giftCardData, giftCardDiscount)}\n\nTransaction ID: ${transactionId}`;

      const order = await createOrder({
        userId: user.id,
        orderNumber: persistedOrderNumber || null,
        subtotal,
        tax,
        shipping,
        discount: couponDiscount + giftCardDiscount,
        total: finalTotal,
        paymentMethod: "revolut",
        paymentStatus: "processing",
        shippingAddress: shippingInfo,
        billingAddress: shippingInfo,
        notes: orderNotes
      });

      if (!order) {
        throw new Error(t('payment:messages.errorProcessingOrder'));
      }

      // Update gift card balance if used
      if (giftCardData && giftCardDiscount > 0) {
        await updateGiftCardBalance(
          giftCardData.id,
          Number(Math.max(0, giftCardData.current_balance - giftCardDiscount).toFixed(2))
        );
        sessionStorage.removeItem("applied_gift_card");
      }

      // Create order items
      const orderItemsData = convertCartToOrderItems(cartItems, order.id);
      const insertedItems = await createOrderItems(orderItemsData);

      if (!insertedItems || insertedItems.length === 0) {
        throw new Error(t('payment:messages.errorCreatingOrderItems'));
      }

      // Create invoice
      try {
        await supabase.from("invoices").insert({
          invoice_number: order.order_number,
          user_id: user.id,
          order_id: order.id,
          subtotal: subtotal,
          tax: tax,
          shipping: shipping,
          discount: couponDiscount + giftCardDiscount,
          coupon_discount: couponData?.discount_type === "free_shipping" ? 0 : couponDiscount,
          coupon_code: couponData?.code || null,
          total: finalTotal,
          payment_method: "revolut",
          payment_status: "processing",
          issue_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notes: `Factura generada para el pedido ${order.order_number}`
        });
      } catch (invoiceError) {
        logger.error('Error creating invoice:', invoiceError);
      }

      // Update coupon usage
      if (couponData) {
        try {
          await supabase
            .from("coupons")
            .update({ times_used: (couponData.times_used || 0) + 1 })
            .eq("id", couponData.id);
        } catch (couponError) {
          logger.error('Error updating coupon usage:', couponError);
        }
      }

      // Send notifications
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
        logger.error('Error sending order confirmation:', emailError);
      }

      // Clear cart and session
      localStorage.removeItem("cart");
      sessionStorage.removeItem("pending_revolut_order");
      sessionStorage.removeItem("applied_coupon");
      const sessionId = sessionStorage.getItem("checkout_session_id");
      if (sessionId) {
        await supabase.from('checkout_sessions').delete().eq('id', sessionId);
        sessionStorage.removeItem("checkout_session_id");
      }

      // Show redirect overlay - la pestaña se abrirá después de 4s desde useEffect
      if (paymentConfig?.revolut_link) {
        setPendingOrderInfo({ orderNumber: order.order_number, total: finalTotal, isInvoicePayment: false });
        setShowRedirectOverlay(true);
      } else {
        // Silent error - navigate away
        navigate("/mi-cuenta", { state: { activeTab: 'orders' } });
      }
    } catch (error) {
      logger.error("Error creating order:", error);
      toast.error(t('payment:messages.errorProcessingOrder'));
      setProcessing(false);
    }
  };

  // Redirect overlay
  if (showRedirectOverlay) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center space-y-6 p-8 max-w-md">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {t('payment:redirect.title', 'Estamos redirigiéndote a la página de pago...')}
          </h2>
          <p className="text-muted-foreground">
            {t('payment:redirect.message', 'Cuando verifiquemos tu pago, el estado de tu pedido cambiará automáticamente.')}
          </p>
          <div className="flex justify-center gap-1">
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg">{t('common:loading')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orderData) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
            </svg>
          </div>
          <CardTitle className="text-2xl">{t('payment:revolutPayment.title', 'Revolut Payment')}</CardTitle>
          <CardDescription>
            {t('payment:revolutPayment.description', 'You will be redirected to the Revolut payment platform')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order/Invoice Information */}
          <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-purple-900 dark:text-purple-100">
              {orderData.isInvoicePayment ? t('payment:invoiceInfo', 'Invoice Information') : t('payment:orderInfo', 'Order Information')}
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="bg-white dark:bg-slate-900 border-2 border-primary rounded-lg p-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('payment:amountToPay', 'Amount to Pay')}:</p>
                <p className="text-3xl font-bold text-primary">€{Number(orderData.total).toFixed(2)}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('payment:vatIncluded', 'VAT included')}</p>
              </div>

              <div>
                <p className="font-medium text-purple-900 dark:text-purple-100">
                  {orderData.isInvoicePayment ? t('payment:referenceNumber', 'Reference Number') : t('payment:orderNumber', 'Order Number')}:
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 rounded border border-slate-300 dark:border-slate-600 flex-1 font-mono">
                    {orderNumber}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(orderNumber)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="pt-3 border-t border-purple-200 dark:border-purple-700">
                <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">{t('payment:paymentDetails', 'Payment Details')}:</h4>
                <div className="space-y-1 text-purple-900 dark:text-purple-50">
                  <div className="flex justify-between">
                    <span>{t('payment:subtotal', 'Subtotal')}:</span>
                    <span>€{Number(orderData.subtotal).toFixed(2)}</span>
                  </div>
                  {orderData.shipping > 0 && (
                    <div className="flex justify-between">
                      <span>{t('payment:shipping', 'Shipping')}:</span>
                      <span>€{Number(orderData.shipping).toFixed(2)}</span>
                    </div>
                  )}
                  {orderData.tax > 0 && (
                    <div className="flex justify-between">
                      <span>{t('payment:vat', 'VAT')}:</span>
                      <span>€{Number(orderData.tax).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-amber-900 dark:text-amber-100">{t('payment:importantInstructions', 'Important Instructions')}</h3>
            <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>{t('payment:revolutInstruction1', 'By clicking "Proceed to Payment", you will be redirected to the Revolut payment platform.')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>{t('payment:revolutInstruction2', { amount: Number(orderData.total).toFixed(2), defaultValue: 'Enter the exact amount of €{{amount}} on the platform.' })}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>{t('payment:revolutInstruction3', 'In the payment concept or note, include the order number provided.')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <span>{t('payment:revolutInstruction4', 'Your order will remain in pending status until we confirm the payment.')}</span>
              </li>
            </ul>
          </div>

          {/* QR Codes if available */}
          {paymentImages.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">{t('payment:qrCodes', 'Payment QR Codes')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('payment:qrCodesDescription', 'You can also scan these QR codes to make the payment')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentImages.map((img, index) => (
                  <div key={index} className="border border-border rounded-lg p-4 space-y-3 bg-card">
                    <img 
                      src={img} 
                      alt={t('payment:qrCodeAlt', { number: index + 1, defaultValue: 'QR Code' })}
                      className="w-full h-56 object-contain rounded"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={() => navigate("/pago")} 
              variant="outline"
              className="flex-1"
              disabled={processing}
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button 
              onClick={handleProceedToPayment} 
              className="flex-1"
              disabled={processing}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {processing ? t('common:processing', 'Processing...') : t('payment:proceedToPayment', 'Proceed to Payment')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
