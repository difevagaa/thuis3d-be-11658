import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, CreditCard, Building2, Info, QrCode, AlertTriangle, ShieldCheck } from "lucide-react";
import { i18nToast } from "@/lib/i18nToast";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { handleSupabaseError } from "@/lib/errorHandler";
import { createOrder, createOrderItems, convertCartToOrderItems, generateOrderNotes } from "@/lib/paymentUtils";

export default function PaymentInstructions() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['payment', 'common']);
  const { orderNumber, method, total, isPending, isInvoicePayment } = location.state || {};
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [paymentImages, setPaymentImages] = useState<string[]>([]);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [realOrderNumber, setRealOrderNumber] = useState(orderNumber);


  const createPendingOrder = async () => {
    // Prevent duplicate order creation
    if (creatingOrder || orderCreated) {
      logger.debug('[PaymentInstructions] Order creation already in progress or completed');
      return;
    }
    
    // Check if pending_order exists in sessionStorage
    const pendingOrderStr = sessionStorage.getItem("pending_order");
    if (!pendingOrderStr) {
      // Order might have already been created and sessionStorage cleared
      // This is normal flow when returning to this page after order was created
      logger.debug('[PaymentInstructions] No pending_order in sessionStorage - order may have been created already');
      return;
    }
    
    try {
      setCreatingOrder(true);

      const pendingOrder = JSON.parse(pendingOrderStr);
      const { 
        cartItems, 
        shippingInfo, 
        total, 
        method, 
        subtotal: orderSubtotal, 
        tax: orderTax, 
        shipping: orderShipping,
        couponDiscount: orderCouponDiscount,
        appliedCoupon 
      } = pendingOrder;
      
      // Asegurar valores numéricos por defecto para evitar NaN
      // Usar verificación explícita de null/undefined antes de Number()
      const safeShipping = orderShipping != null ? Number(orderShipping) : 0;
      const safeCouponDiscount = orderCouponDiscount != null ? Number(orderCouponDiscount) : 0;

      // CRÍTICO: Permitir checkout sin autenticación
      const { data: { user } } = await supabase.auth.getUser();
      
      // Si NO hay usuario autenticado, crear pedido como invitado
      const isGuestCheckout = !user;
      
      if (isGuestCheckout) {
        logger.info('[PaymentInstructions] Guest checkout - creating order without authentication');
      }

      // Generate order notes using utility function, including coupon info
      let orderNotes = generateOrderNotes(cartItems);
      if (appliedCoupon && safeCouponDiscount > 0) {
        orderNotes = `Cupón aplicado: ${appliedCoupon.code} (-€${safeCouponDiscount.toFixed(2)})\n${orderNotes || ''}`;
      }
      
      // Create order using utility function
      // CRÍTICO: Usar el costo de envío y descuento del pendingOrder
      const order = await createOrder({
        userId: user?.id || null, // Permitir user_id = null para invitados
        subtotal: orderSubtotal,
        tax: orderTax,
        shipping: safeShipping, // CRÍTICO: Usar shipping del pending_order
        discount: safeCouponDiscount,
        total: total,
        paymentMethod: method,
        paymentStatus: "pending",
        shippingAddress: shippingInfo,
        billingAddress: shippingInfo,
        notes: orderNotes?.trim() || null
      });

      if (!order) {
        throw new Error(t('payment:messages.errorProcessingOrder'));
      }

      // Increment coupon usage counter if coupon was applied
      if (appliedCoupon && safeCouponDiscount > 0) {
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

      // Create order items using utility functions
      const orderItemsData = convertCartToOrderItems(cartItems, order.id);
      const insertedItems = await createOrderItems(orderItemsData);

      if (!insertedItems || insertedItems.length === 0) {
        throw new Error(t('payment:messages.errorCreatingOrderItems'));
      }

      logger.info('Order items created:', insertedItems.length);

      // Create invoice - CRÍTICO: Número de factura = número de pedido
      // CRÍTICO: Incluir el costo de envío y cupón correcto
      const { error: invoiceError } = await supabase.from("invoices").insert({
        invoice_number: order.order_number, // Usar el mismo número del pedido
        user_id: user?.id || null, // Permitir user_id = null para invitados
        order_id: order.id,
        subtotal: orderSubtotal,
        tax: orderTax,
        shipping: safeShipping, // CRÍTICO: Incluir shipping correcto
        discount: safeCouponDiscount,
        coupon_code: appliedCoupon?.code || null,
        coupon_discount: safeCouponDiscount > 0 ? safeCouponDiscount : null,
        total: total,
        payment_method: method,
        payment_status: "pending",
        issue_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        notes: `Factura para el pedido ${order.order_number}`
      });

      if (invoiceError) {
        logger.error("Invoice creation failed:", invoiceError);
      }

      // Send notification to admins
      try {
        await supabase.functions.invoke('send-admin-notification', {
          body: {
            type: 'order',
            subject: 'Nuevo Pedido',
            message: `Nuevo pedido por €${total.toFixed(2)}`,
            order_number: order.order_number,
            customer_name: shippingInfo.fullName || shippingInfo.full_name,
            customer_email: shippingInfo.email,
            link: '/admin/pedidos'
          }
        });
      } catch (notifError) {
        logger.error("Admin notification failed:", notifError);
      }

      // Send order confirmation email to customer
      try {
        let customerEmail = shippingInfo.email;
        let customerName = shippingInfo.fullName || shippingInfo.full_name || 'Cliente';
        
        // Si hay usuario autenticado, intentar obtener datos del perfil
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', user.id)
            .single();
          
          if (profile) {
            customerEmail = profile.email || customerEmail;
            customerName = profile.full_name || customerName;
          }
        }

        if (customerEmail) {
          // CRÍTICO: Incluir shipping en el email de confirmación
          await supabase.functions.invoke('send-order-confirmation', {
            body: {
              to: customerEmail,
              order_number: order.order_number,
              subtotal: orderSubtotal,
              tax: orderTax,
              shipping: safeShipping, // CRÍTICO: Usar shipping correcto
              discount: 0,
              total: total,
              customer_name: customerName,
              items: cartItems.map(item => ({
                product_name: item.name,
                quantity: item.quantity,
                unit_price: item.price
              }))
            }
          });
        }
      } catch (emailError) {
        logger.error("Order confirmation email failed:", emailError);
      }

      // Clear cart and session
      localStorage.removeItem("cart");
      sessionStorage.removeItem("pending_order");
      const sessionId = sessionStorage.getItem("checkout_session_id");
      if (sessionId) {
        await supabase.from('checkout_sessions').delete().eq('id', sessionId);
        sessionStorage.removeItem("checkout_session_id");
      }

      setRealOrderNumber(order.order_number);
      setOrderCreated(true);
      i18nToast.success("success.orderCreated");
    } catch (error) {
      handleSupabaseError(error, {
        toastMessage: t('payment:messages.errorProcessingOrder'),
        context: "Create Pending Order"
      });
      navigate("/");
    } finally {
      setCreatingOrder(false);
    }
  };

  useEffect(() => {
    if (!orderNumber || !method) {
      navigate("/");
      return;
    }
    loadPaymentConfig();
    
    // For bank_transfer, create order immediately when showing bank info
    // For card payment, order will be created when user clicks "Go to bank" button
    if (isPending && method === "bank_transfer" && !isInvoicePayment) {
      createPendingOrder();
    }
  }, [orderNumber, method, navigate, isPending, isInvoicePayment]);

  const loadPaymentConfig = async () => {
    try {
      // Load all relevant payment configuration keys
      const settingKeys = [
        'bank_account_number', 'bank_account_name', 'bank_name', 'bank_instructions',
        'company_info', 'payment_images', 'card_payment_link', 'revolut_link', 'paypal_email'
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
          } else {
            settings[setting.setting_key] = setting.setting_value;
          }
        });

        setPaymentConfig(settings);
      }
    } catch (error) {
      logger.error("Error loading payment config:", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    i18nToast.success("success.copiedToClipboard");
  };

  // Handler for "Go to bank/card" button
  // Creates the order first (if pending), then opens the payment link
  const handleGoToPayment = async () => {
    // If order is pending and not yet created, create it first
    if (isPending && !orderCreated && !isInvoicePayment) {
      await createPendingOrder();
    }

    // Open the appropriate payment link based on method
    if (method === "card") {
      const cardLink = paymentConfig?.card_payment_link || paymentConfig?.revolut_link;
      if (cardLink) {
        window.open(cardLink, '_blank');
      } else {
        i18nToast.error("payment:messages.cardPaymentNotConfigured");
      }
    } else if (method === "paypal") {
      const paypalEmail = paymentConfig?.paypal_email;
      if (paypalEmail) {
        // Extract username from email (if email) or use as-is (if username)
        // PayPal.me uses username, not email. If admin entered email, extract username part
        const paypalUsername = paypalEmail.includes('@') 
          ? paypalEmail.split('@')[0] 
          : paypalEmail;
        const paypalUrl = `https://www.paypal.com/paypalme/${paypalUsername}/${Number(total).toFixed(2)}EUR`;
        window.open(paypalUrl, '_blank');
      } else {
        i18nToast.error("payment:messages.paypalNotConfigured");
      }
    } else if (method === "revolut") {
      const revolutLink = paymentConfig?.revolut_link;
      if (revolutLink) {
        window.open(revolutLink, '_blank');
      } else {
        i18nToast.error("payment:messages.revolutNotConfigured");
      }
    }
  };

  if (!orderNumber) {
    return null;
  }

  if (creatingOrder) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg">{t('payment:creatingOrder')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Card className="shadow-lg">
        <CardHeader className="text-center bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-t-lg">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl text-green-800 dark:text-green-200">
            {isInvoicePayment ? t('payment:instructions.invoicePaymentTitle') : t('payment:instructions.orderReceived')}
          </CardTitle>
          <CardDescription className="text-green-700 dark:text-green-300">
            {isInvoicePayment ? (
              <>{t('payment:instructions.invoiceNumber')}: <strong className="text-green-800 dark:text-green-200">{realOrderNumber}</strong></>
            ) : (
              <>{t('payment:instructions.orderNumber')}: <strong className="text-green-800 dark:text-green-200">{realOrderNumber}</strong></>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {method === "bank_transfer" && paymentConfig && (
            <div className="space-y-6">
              {/* MONTO A TRANSFERIR - DESTACADO */}
              {total && (
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary rounded-xl p-6 text-center">
                  <p className="text-sm font-medium text-foreground/70 mb-2">{t('payment:instructions.amountToTransfer')}:</p>
                  <p className="text-4xl font-bold text-primary">€{Number(total).toFixed(2)}</p>
                  <p className="text-xs text-foreground/60 mt-2">{t('payment:instructions.vatIncluded')}</p>
                </div>
              )}

              {/* INFORMACIÓN BANCARIA - FONDO OSCURO PARA MEJOR CONTRASTE */}
              <div className="bg-slate-800 dark:bg-slate-900 text-white rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-white border-b border-slate-600 pb-3">
                  <Building2 className="h-5 w-5" />
                  {t('payment:instructions.bankTransferTitle')}
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
                        {realOrderNumber}
                      </code>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyToClipboard(realOrderNumber)}
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

              <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {t('payment:instructions.pendingWarning')}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {t('payment:instructions.includeOrderNumber')} <strong>{realOrderNumber}</strong> {t('payment:instructions.inTransferReference')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {method === "card" && paymentConfig && (
            <div className="space-y-6">
              {/* Amount to Pay - Highlighted */}
              {total && (
                <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/5 border-2 border-blue-500 rounded-xl p-6 text-center">
                  <p className="text-sm font-medium text-foreground/70 mb-2">{t('payment:instructions.amountToPay')}:</p>
                  <p className="text-4xl font-bold text-blue-600">€{Number(total).toFixed(2)}</p>
                  <p className="text-xs text-foreground/60 mt-2">{t('payment:instructions.vatIncluded')}</p>
                </div>
              )}

              {/* Order Information - Highlighted Background */}
              <div className="bg-blue-800 dark:bg-blue-900 text-white rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-white border-b border-blue-600 pb-3">
                  <CreditCard className="h-5 w-5" />
                  {t('payment:instructions.cardPaymentTitle')}
                </h3>
                
                <div className="grid gap-4">
                  <div className="bg-blue-700/50 rounded-lg p-4">
                    <p className="font-medium text-blue-200 text-sm mb-1">{t('payment:instructions.orderNumber')}:</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="bg-white text-blue-900 px-4 py-3 rounded-lg flex-1 font-mono text-lg font-bold">
                        {realOrderNumber}
                      </code>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyToClipboard(realOrderNumber)}
                        className="h-12 px-4"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-blue-700/50 rounded-lg p-4">
                    <p className="font-medium text-blue-200 text-sm mb-1">{t('payment:instructions.amountToPay')}:</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="bg-white text-blue-900 px-4 py-3 rounded-lg flex-1 font-mono text-lg font-bold">
                        €{Number(total).toFixed(2)}
                      </code>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyToClipboard(`€${Number(total).toFixed(2)}`)}
                        className="h-12 px-4"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Instructions */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  {t('payment:instructions.importantInstructions')}
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-300">
                  <li>{t('payment:instructions.step1ClickButton')} <strong>"{t('payment:openPaymentLink')}"</strong>, {t('payment:instructions.step1Redirect')}</li>
                  <li>{t('payment:instructions.step2Amount')} <strong>€{Number(total).toFixed(2)}</strong></li>
                  <li>{t('payment:instructions.step3Reference')} <strong>{realOrderNumber}</strong></li>
                  <li>{t('payment:instructions.step4Complete')}</li>
                </ol>
              </div>

              {/* Security Notice - We don't store payment data */}
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
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

              {/* Go to Payment Button */}
              <Button 
                onClick={handleGoToPayment}
                disabled={creatingOrder}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-6 text-lg" 
                size="lg"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                {creatingOrder ? t('payment:creatingOrder') : t('payment:openPaymentLink')}
              </Button>

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
                    {t('payment:instructions.paymentPendingWarning')}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {t('payment:instructions.includeOrderNumber')} <strong>{realOrderNumber}</strong> {t('payment:instructions.inTransferReference')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {method === "paypal" && paymentConfig && (
            <div className="space-y-6">
              {/* Amount to Pay - Highlighted */}
              {total && (
                <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/5 border-2 border-blue-500 rounded-xl p-6 text-center">
                  <p className="text-sm font-medium text-foreground/70 mb-2">{t('payment:instructions.amountToPay')}:</p>
                  <p className="text-4xl font-bold text-blue-600">€{Number(total).toFixed(2)}</p>
                  <p className="text-xs text-foreground/60 mt-2">{t('payment:instructions.vatIncluded')}</p>
                </div>
              )}

              {/* PayPal Payment Information */}
              <div className="bg-[#003087] text-white rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-white border-b border-blue-400 pb-3">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.68l-.04.22-.63 3.993-.028.15a.806.806 0 01-.795.68H8.934c-.414 0-.629-.29-.535-.67l.105-.67.629-3.99.04-.22a.806.806 0 01.794-.68h.5c3.238 0 5.774-1.314 6.514-5.12.256-1.313.192-2.447-.3-3.327z"/>
                    <path d="M19.107 5.663c-.382-.636-1.016-1.04-1.922-1.04H9.772C9.274 4.623 8.9 5.05 8.817 5.584L6.456 20.883c-.1.536.22.977.756.977h4.124l1.035-6.572-.032.202c.083-.534.457-.96.955-.96h1.99c3.904 0 6.96-1.586 7.85-6.172.025-.127.048-.251.068-.374.258-1.656-.006-2.78-.745-3.76-.236-.313-.516-.58-.85-.797z"/>
                  </svg>
                  {t('payment:instructions.paypalPaymentTitle')}
                </h3>
                
                <div className="grid gap-4">
                  <div className="bg-blue-800/50 rounded-lg p-4">
                    <p className="font-medium text-blue-200 text-sm mb-1">{t('payment:instructions.orderNumber')}:</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="bg-white text-blue-900 px-4 py-3 rounded-lg flex-1 font-mono text-lg font-bold">
                        {realOrderNumber}
                      </code>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyToClipboard(realOrderNumber)}
                        className="h-12 px-4"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-blue-800/50 rounded-lg p-4">
                    <p className="font-medium text-blue-200 text-sm mb-1">{t('payment:instructions.amountToPay')}:</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="bg-white text-blue-900 px-4 py-3 rounded-lg flex-1 font-mono text-lg font-bold">
                        €{Number(total).toFixed(2)}
                      </code>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyToClipboard(`€${Number(total).toFixed(2)}`)}
                        className="h-12 px-4"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Instructions */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  {t('payment:instructions.importantInstructions')}
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-300">
                  <li>{t('payment:instructions.step1ClickButton')} <strong>"{t('payment:goToPaypal')}"</strong></li>
                  <li>{t('payment:instructions.step2Amount')} <strong>€{Number(total).toFixed(2)}</strong></li>
                  <li>{t('payment:instructions.step3Reference')} <strong>{realOrderNumber}</strong></li>
                  <li>{t('payment:instructions.step4Complete')}</li>
                </ol>
              </div>

              {/* Go to PayPal Button */}
              <Button 
                onClick={handleGoToPayment}
                disabled={creatingOrder}
                className="w-full bg-[#003087] hover:bg-[#002570] text-white py-6 text-lg" 
                size="lg"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.68l-.04.22-.63 3.993-.028.15a.806.806 0 01-.795.68H8.934c-.414 0-.629-.29-.535-.67l.105-.67.629-3.99.04-.22a.806.806 0 01.794-.68h.5c3.238 0 5.774-1.314 6.514-5.12.256-1.313.192-2.447-.3-3.327z"/>
                  <path d="M19.107 5.663c-.382-.636-1.016-1.04-1.922-1.04H9.772C9.274 4.623 8.9 5.05 8.817 5.584L6.456 20.883c-.1.536.22.977.756.977h4.124l1.035-6.572-.032.202c.083-.534.457-.96.955-.96h1.99c3.904 0 6.96-1.586 7.85-6.172.025-.127.048-.251.068-.374.258-1.656-.006-2.78-.745-3.76-.236-.313-.516-.58-.85-.797z"/>
                </svg>
                {creatingOrder ? t('payment:creatingOrder') : t('payment:goToPaypal')}
              </Button>

              {/* Warning */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {t('payment:instructions.paymentPendingWarning')}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {t('payment:instructions.includeOrderNumber')} <strong>{realOrderNumber}</strong> {t('payment:instructions.inPaypalNote')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {method === "revolut" && paymentConfig && (
            <div className="space-y-6">
              {/* Amount to Pay - Highlighted */}
              {total && (
                <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/5 border-2 border-purple-500 rounded-xl p-6 text-center">
                  <p className="text-sm font-medium text-foreground/70 mb-2">{t('payment:instructions.amountToPay')}:</p>
                  <p className="text-4xl font-bold text-purple-600">€{Number(total).toFixed(2)}</p>
                  <p className="text-xs text-foreground/60 mt-2">{t('payment:instructions.vatIncluded')}</p>
                </div>
              )}

              {/* Revolut Payment Information */}
              <div className="bg-[#0075EB] text-white rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2 text-white border-b border-blue-300 pb-3">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
                  </svg>
                  {t('payment:instructions.revolutPaymentTitle')}
                </h3>
                
                <div className="grid gap-4">
                  <div className="bg-blue-600/50 rounded-lg p-4">
                    <p className="font-medium text-blue-100 text-sm mb-1">{t('payment:instructions.orderNumber')}:</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="bg-white text-blue-900 px-4 py-3 rounded-lg flex-1 font-mono text-lg font-bold">
                        {realOrderNumber}
                      </code>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyToClipboard(realOrderNumber)}
                        className="h-12 px-4"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-blue-600/50 rounded-lg p-4">
                    <p className="font-medium text-blue-100 text-sm mb-1">{t('payment:instructions.amountToPay')}:</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="bg-white text-blue-900 px-4 py-3 rounded-lg flex-1 font-mono text-lg font-bold">
                        €{Number(total).toFixed(2)}
                      </code>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyToClipboard(`€${Number(total).toFixed(2)}`)}
                        className="h-12 px-4"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Instructions */}
              <div className="bg-purple-50 dark:bg-purple-950/30 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-4 space-y-3">
                <h4 className="font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  {t('payment:instructions.importantInstructions')}
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-purple-700 dark:text-purple-300">
                  <li>{t('payment:instructions.step1ClickButton')} <strong>"{t('payment:goToRevolut')}"</strong></li>
                  <li>{t('payment:instructions.step2Amount')} <strong>€{Number(total).toFixed(2)}</strong></li>
                  <li>{t('payment:instructions.step3Reference')} <strong>{realOrderNumber}</strong></li>
                  <li>{t('payment:instructions.step4Complete')}</li>
                </ol>
              </div>

              {/* Go to Revolut Button */}
              <Button 
                onClick={handleGoToPayment}
                disabled={creatingOrder}
                className="w-full bg-[#0075EB] hover:bg-[#0066CC] text-white py-6 text-lg" 
                size="lg"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
                </svg>
                {creatingOrder ? t('payment:creatingOrder') : t('payment:goToRevolut')}
              </Button>

              {/* Warning */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {t('payment:instructions.paymentPendingWarning')}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {t('payment:instructions.includeOrderNumber')} <strong>{realOrderNumber}</strong> {t('payment:instructions.inRevolutNote')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
            <Button onClick={() => navigate("/")} className="flex-1" size="lg">
              {t('payment:instructions.backToHome')}
            </Button>
            <Button onClick={() => navigate("/mi-cuenta")} variant="outline" className="flex-1" size="lg">
              {t('payment:instructions.viewMyOrders')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
