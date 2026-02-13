import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { i18nToast } from "@/lib/i18nToast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, ExternalLink, Copy, Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";
import { 
  processGiftCardPayment
} from "@/lib/paymentUtils";
import { loadSpecificPaymentSettings } from "@/lib/paymentConfigUtils";

export default function CardPaymentPage() {
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
    const pendingInvoiceStr = sessionStorage.getItem("pending_card_invoice");
    const pendingOrderStr = sessionStorage.getItem("pending_card_order");
    
    if (pendingInvoiceStr) {
      // This is an invoice payment
      try {
        const data = JSON.parse(pendingInvoiceStr);
        setOrderData(data);
        setOrderNumber(data.invoiceNumber || "");
        setLoading(false);
      } catch (error) {
        logger.error("Error parsing invoice data:", error);
        i18nToast.error("error.loadingFailed");
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
        i18nToast.error("error.loadingFailed");
        navigate("/pago");
      }
    } else {
      i18nToast.error("error.loadingFailed");
      navigate("/pago");
      return;
    }
  }, [navigate]);

  const loadPaymentConfig = useCallback(async () => {
    try {
      const settings = await loadSpecificPaymentSettings(['revolut_link', 'card_payment_link', 'payment_images']);
      setPaymentConfig({
        card_payment_link: settings.card_payment_link || '',
        revolut_link: settings.revolut_link || ''
      });
      setPaymentImages(settings.payment_images || []);
    } catch (error) {
      logger.error("Error loading payment config:", error);
    }
  }, []); // No dependencies needed

  useEffect(() => {
    loadOrderData();
    loadPaymentConfig();
  }, [loadOrderData, loadPaymentConfig]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    i18nToast.success("success.copiedToClipboard");
  };

  // Después de mostrar overlay 4s, abrir pestaña con URL y navegar a /pago-en-proceso
  useEffect(() => {
    if (showRedirectOverlay && pendingOrderInfo) {
      const timer = setTimeout(() => {
        // Abrir la pestaña de pago con la URL configurada
        const gatewayUrl = paymentConfig?.card_payment_link;
        if (gatewayUrl) {
          window.open(gatewayUrl, '_blank', 'noopener,noreferrer');
        }
        
        // Navegar a página de pago en proceso
        navigate("/pago-en-proceso", {
          state: {
            orderNumber: pendingOrderInfo.orderNumber,
            total: pendingOrderInfo.total,
            paymentMethod: "card",
            isInvoicePayment: pendingOrderInfo.isInvoicePayment,
          },
        });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showRedirectOverlay, pendingOrderInfo, navigate, paymentConfig]);

  const handleProceedToPayment = async () => {
    // Prevent double-clicking
    if (processing) {
      logger.log('[CARD PAYMENT] Already processing, ignoring duplicate click');
      return;
    }
    
    setProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        i18nToast.error("error.unauthorized");
        navigate("/auth");
        return;
      }

      // Check if this is an invoice payment
      if (orderData.isInvoicePayment) {
        // Invoice payment flow - just update the invoice and redirect
        const { invoiceId, invoiceNumber, total } = orderData;
        
        // Update invoice payment status and method
        const { error: updateError } = await supabase
          .from("invoices")
          .update({
            payment_status: "pending",
            payment_method: "card"
          })
          .eq("id", invoiceId)
          .eq("user_id", user.id);

        if (updateError) throw updateError;

        // Clear invoice payment data
        sessionStorage.removeItem("pending_card_invoice");

        // Mostrar overlay - la pestaña se abrirá después de 4s desde useEffect
        if (paymentConfig?.card_payment_link) {
          setPendingOrderInfo({ orderNumber: invoiceNumber, total, isInvoicePayment: true });
          setShowRedirectOverlay(true);
        } else {
          // If no gateway configured, go to instructions page
          navigate("/pago-instrucciones", {
            state: {
              orderNumber: invoiceNumber,
              method: "card",
              total: total,
              isPending: false,
              isInvoicePayment: true
            }
          });
        }
        return;
      }

      // ==================================================================================
      // Normal order payment flow
      // NOTE: Order and invoice were already created in Payment.tsx
      // We just need to process gift card payment (if applicable) and redirect to gateway
      // ==================================================================================
      
      const { orderId, orderNumber: persistedOrderNumber, total } = orderData;
      
      logger.log('[CARD PAYMENT] Order already exists:', { orderId, orderNumber: persistedOrderNumber, total });

      // Get saved gift card if applied
      const savedGiftCard = sessionStorage.getItem("applied_gift_card");
      let giftCardDiscount = 0;
      let giftCardData = null;
      
      if (savedGiftCard) {
        giftCardData = JSON.parse(savedGiftCard);
        giftCardDiscount = Number(Math.min(giftCardData.current_balance, total).toFixed(2));
      }

      // Process gift card payment if applicable
      if (giftCardData && giftCardDiscount > 0) {
        logger.log('[CARD PAYMENT] Processing gift card payment:', { cardId: giftCardData.id, discount: giftCardDiscount });
        
        const giftCardResult = await processGiftCardPayment(
          giftCardData.id,
          giftCardDiscount,
          'CARD_PAYMENT'
        );

        if (!giftCardResult.success) {
          logger.error('[CARD PAYMENT] Gift card processing failed:', giftCardResult);
          i18nToast.error("error.giftCardProcessing");
          setProcessing(false);
          return;
        }
        
        logger.log('[CARD PAYMENT] Gift card processed successfully');
        
        // Update order with gift card info
        try {
          const { error: updateError } = await supabase
            .from("orders")
            .update({
              discount: giftCardDiscount,
              total: Math.max(0, total - giftCardDiscount),
              notes: `Tarjeta de regalo aplicada: ${giftCardData.code} (-€${giftCardDiscount.toFixed(2)})`
            })
            .eq("id", orderId);
          
          if (updateError) {
            logger.error('[CARD PAYMENT] Error updating order with gift card:', updateError);
          }

          // Update invoice with gift card info
          const { error: invoiceUpdateError } = await supabase
            .from("invoices")
            .update({
              gift_card_code: giftCardData.code,
              gift_card_amount: giftCardDiscount,
              discount: giftCardDiscount,
              total: Math.max(0, total - giftCardDiscount)
            })
            .eq("order_id", orderId);
          
          if (invoiceUpdateError) {
            logger.error('[CARD PAYMENT] Error updating invoice with gift card:', invoiceUpdateError);
          }
        } catch (updateError) {
          logger.error('[CARD PAYMENT] Error updating order/invoice:', updateError);
        }
        
        sessionStorage.removeItem("applied_gift_card");
      }

      const finalTotal = giftCardDiscount > 0 ? Math.max(0, total - giftCardDiscount) : total;

      // Clear session storage
      sessionStorage.removeItem("pending_card_order");

      // Show redirect overlay - la pestaña se abrirá después de 4s desde useEffect
      if (paymentConfig?.card_payment_link) {
        setPendingOrderInfo({ orderNumber: persistedOrderNumber, total: finalTotal, isInvoicePayment: false });
        setShowRedirectOverlay(true);
      } else {
        i18nToast.error("error.general");
        navigate("/mi-cuenta", { state: { activeTab: 'orders' } });
      }
    } catch (error) {
      logger.error("[CARD PAYMENT] Error processing payment:", error);
      i18nToast.error("error.general");
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
          <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">{t('payment:cardPayment.title', 'Card Payment')}</CardTitle>
          <CardDescription>
            {t('payment:cardPayment.description', 'You will be redirected to the secure payment platform')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order/Invoice Information */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-blue-900 dark:text-blue-100">
              {orderData.isInvoicePayment ? t('payment:invoiceInfo', 'Invoice Information') : t('payment:orderInfo', 'Order Information')}
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="bg-white dark:bg-slate-900 border-2 border-primary rounded-lg p-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('payment:amountToPay', 'Amount to Pay')}:</p>
                <p className="text-3xl font-bold text-primary">€{Number(orderData.total).toFixed(2)}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('payment:vatIncluded', 'VAT included')}</p>
              </div>

              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
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

              <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">{t('payment:paymentDetails', 'Payment Details')}:</h4>
                <div className="space-y-1 text-blue-900 dark:text-blue-50">
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
                <span>{t('payment:cardInstruction1', 'By clicking "Proceed to Payment", you will be redirected to our secure payment platform.')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>{t('payment:cardInstruction2', 'You can pay with Bancontact, Apple Pay, Google Pay and credit/debit cards.')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>{t('payment:cardInstruction3', { amount: Number(orderData.total).toFixed(2), defaultValue: 'Enter the exact amount of €{{amount}} on the payment platform.' })}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <span>{t('payment:cardInstruction4', 'Your order will remain in pending status until we confirm the payment.')}</span>
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
