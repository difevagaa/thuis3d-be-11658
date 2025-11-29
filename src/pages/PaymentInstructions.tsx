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
    
    // Only create pending order for NEW purchases (bank_transfer or card), NOT for invoice payments
    if (isPending && (method === "bank_transfer" || method === "card") && !isInvoicePayment) {
      createPendingOrder();
    }
  }, [orderNumber, method, navigate, isPending, isInvoicePayment]);

  const loadPaymentConfig = async () => {
    try {
      // Leer solo las claves de configuración de pago relevantes, igual que en el panel admin
      const settingKeys = [
        'bank_account_number', 'bank_account_name', 'bank_name', 'bank_instructions',
        'company_info', 'payment_images', 'card_payment_link', 'revolut_link'
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
                        {t('payment:instructions.order')} {realOrderNumber}
                      </code>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyToClipboard(`${t('payment:instructions.order')} ${realOrderNumber}`)}
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
                onClick={() => {
                  const cardLink = paymentConfig.card_payment_link || paymentConfig.revolut_link;
                  if (cardLink) {
                    window.open(cardLink, '_blank');
                  } else {
                    i18nToast.error("payment:messages.cardPaymentNotConfigured");
                  }
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-6 text-lg" 
                size="lg"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                {t('payment:openPaymentLink')}
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

          {method === "paypal" && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <CreditCard className="h-5 w-5" />
                  PayPal
                </h3>
                <p className="text-sm mb-3 text-blue-700 dark:text-blue-300">
                  {t('payment:instructions.paypalProcessing')}
                </p>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {t('payment:instructions.orderNumber')}: <strong>{orderNumber}</strong>
                </p>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {t('payment:instructions.paymentPendingWarning')}
                </p>
              </div>
            </div>
          )}

          {method === "revolut" && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <CreditCard className="h-5 w-5" />
                  Revolut
                </h3>
                <p className="text-sm mb-3 text-blue-700 dark:text-blue-300">
                  {t('payment:instructions.revolutProcessing')}
                </p>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {t('payment:instructions.orderNumber')}: <strong>{orderNumber}</strong>
                </p>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {t('payment:instructions.paymentPendingWarning')}
                </p>
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
