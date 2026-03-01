import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, CreditCard } from "lucide-react";
import { toast } from "sonner";
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
  const [realOrderNumber, setRealOrderNumber] = useState(orderNumber);


  const createPendingOrder = async () => {
    try {
      setCreatingOrder(true);
      
      const pendingOrderStr = sessionStorage.getItem("pending_order");
      if (!pendingOrderStr) {
        toast.error(t('payment:instructions.noOrderInfo'));
        navigate("/");
        return;
      }

      const pendingOrder = JSON.parse(pendingOrderStr);
      const { cartItems, shippingInfo, total, method, subtotal: orderSubtotal, tax: orderTax, shipping: orderShipping, orderNumber: persistedOrderNumber } = pendingOrder;
      
      // Asegurar valores numéricos por defecto para evitar NaN
      // Usar verificación explícita de null/undefined antes de Number()
      const safeShipping = orderShipping != null ? Number(orderShipping) : 0;

      // CRÍTICO: Permitir checkout sin autenticación
      const { data: { user } } = await supabase.auth.getUser();
      
      // Si NO hay usuario autenticado, crear pedido como invitado
      const isGuestCheckout = !user;
      
      if (isGuestCheckout) {
        logger.info('[PaymentInstructions] Guest checkout - creating order without authentication');
      }

      // Generate order notes using utility function
      const orderNotes = generateOrderNotes(cartItems, null, 0);
      
      // Create order using utility function with persistent order number
      // CRÍTICO: Usar el costo de envío del pendingOrder
      const order = await createOrder({
        userId: user?.id || null, // Permitir user_id = null para invitados
        orderNumber: persistedOrderNumber || null,
        subtotal: orderSubtotal,
        tax: orderTax,
        shipping: safeShipping, // CRÍTICO: Usar shipping del pending_order
        discount: 0,
        total: total,
        paymentMethod: method,
        paymentStatus: "pending",
        shippingAddress: shippingInfo,
        billingAddress: shippingInfo,
        notes: orderNotes
      });

      if (!order) {
        throw new Error(t('payment:messages.errorProcessingOrder'));
      }

      // Create order items using utility functions
      const orderItemsData = convertCartToOrderItems(cartItems, order.id);
      const insertedItems = await createOrderItems(orderItemsData);

      if (!insertedItems || insertedItems.length === 0) {
        throw new Error(t('payment:messages.errorCreatingOrderItems'));
      }

      logger.info('Order items created:', insertedItems.length);

      // Create invoice - CRÍTICO: Número de factura = número de pedido
      // CRÍTICO: Incluir el costo de envío correcto
      const { error: invoiceError } = await supabase.from("invoices").insert({
        invoice_number: order.order_number, // Usar el mismo número del pedido
        user_id: user?.id || null, // Permitir user_id = null para invitados
        order_id: order.id,
        subtotal: orderSubtotal,
        tax: orderTax,
        shipping: safeShipping, // CRÍTICO: Incluir shipping correcto
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
      toast.success(t('payment:messages.orderCreated'));
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
    
    // Only create pending order for NEW purchases, NOT for invoice payments
    if (isPending && method === "bank_transfer" && !isInvoicePayment) {
      createPendingOrder();
    }
  }, [orderNumber, method, navigate, isPending, isInvoicePayment]);

  const loadPaymentConfig = async () => {
    try {
      // Leer solo las claves de configuración de pago relevantes, igual que en el panel admin
      const settingKeys = [
        'bank_account_number', 'bank_account_name', 'bank_name', 'bank_instructions',
        'company_info', 'payment_images'
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
    toast.success(t('payment:instructions.copied'));
  };

  if (!orderNumber) {
    return null;
  }

  if (creatingOrder) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg">{t('payment:instructions.creatingOrder')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-12 pb-24 md:pb-12 max-w-3xl">
      <Card>
        <CardHeader className="text-center px-4 md:px-6">
          <div className="mx-auto w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-full flex items-center justify-center mb-3 md:mb-4">
            <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
          </div>
          <CardTitle className="text-xl md:text-2xl">
            {t('payment:instructions.received')}
          </CardTitle>
          <CardDescription className="text-sm md:text-base">
            {t('payment:instructions.referenceIs')} <strong className="break-all">{realOrderNumber}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {method === "bank_transfer" && paymentConfig && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                   <CreditCard className="h-5 w-5" />
                   {t('payment:instructions.bankTransferTitle')}
                 </h3>
                
                {/* MONTO A TRANSFERIR - DESTACADO */}
                {total && (
                  <div className="bg-white dark:bg-slate-900 border-2 border-primary rounded-lg p-4 mb-4">
                     <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('payment:instructions.amountToTransfer')}</p>
                     <p className="text-3xl font-bold text-primary">€{Number(total).toFixed(2)}</p>
                     <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{t('payment:vatIncluded')}</p>
                  </div>
                )}
                
                <div className="space-y-3 text-sm">
                  {paymentConfig.company_info && (
                     <div>
                       <p className="font-medium text-blue-900 dark:text-blue-100">{t('payment:instructions.companyInfoLabel')}</p>
                      <p className="whitespace-pre-line text-blue-900 dark:text-blue-50">{paymentConfig.company_info}</p>
                    </div>
                  )}
                  
                  {paymentConfig.bank_name && (
                     <div>
                       <p className="font-medium text-blue-900 dark:text-blue-100">{t('payment:instructions.bankLabel')}</p>
                      <p className="text-blue-900 dark:text-blue-50">{paymentConfig.bank_name}</p>
                    </div>
                  )}
                  
                  {paymentConfig.bank_account_name && (
                     <div>
                       <p className="font-medium text-blue-900 dark:text-blue-100">{t('payment:instructions.accountHolder')}</p>
                      <p className="text-blue-900 dark:text-blue-50">{paymentConfig.bank_account_name}</p>
                    </div>
                  )}
                  
                  {paymentConfig.bank_account_number && (
                     <div>
                       <p className="font-medium text-blue-900 dark:text-blue-100">{t('payment:instructions.ibanLabel')}</p>
                      <div className="flex items-center gap-2">
                        <code className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 rounded border border-slate-300 dark:border-slate-600 flex-1 font-mono">
                          {paymentConfig.bank_account_number}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(paymentConfig.bank_account_number)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                   <div>
                     <p className="font-medium text-blue-900 dark:text-blue-100">{t('payment:instructions.transferConcept')}</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 rounded border border-slate-300 dark:border-slate-600 flex-1 font-mono">
                        {realOrderNumber}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(realOrderNumber)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                   {paymentConfig.bank_instructions && (
                     <div>
                       <p className="font-medium text-blue-900 dark:text-blue-100">{t('payment:instructions.additionalInstructions')}</p>
                      <p className="whitespace-pre-line text-blue-900 dark:text-blue-50">
                        {paymentConfig.bank_instructions}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {paymentImages.length > 0 && (
               <div className="space-y-3">
                   <h4 className="font-semibold text-foreground">{t('payment:instructions.qrTitle')}</h4>
                   <p className="text-sm text-muted-foreground">
                     {t('payment:instructions.qrDescription')}
                   </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paymentImages.map((img, index) => (
                      <div key={index} className="border border-border rounded-lg p-4 space-y-3 bg-card">
                        <img 
                          src={img} 
                          alt={`Código QR ${index + 1}`}
                          className="w-full h-56 object-contain rounded"
                        />
                         <div className="text-center space-y-1">
                           <p className="font-medium text-sm text-foreground">
                             {index === 0 ? t('payment:instructions.qrBankTransfer') : 
                              index === 1 ? t('payment:instructions.qrRevolut') : 
                              `${t('payment:instructions.qrAlternative')} ${index + 1}`}
                           </p>
                           <p className="text-xs text-muted-foreground">
                             {index === 0 ? t('payment:instructions.qrBankTransferDesc') : 
                              index === 1 ? t('payment:instructions.qrRevolutDesc') : 
                              t('payment:instructions.qrAlternativeDesc')}
                           </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

               <div className="bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
                 <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                   ⚠️ {t('payment:instructions.pendingWarning')}
                 </p>
                 <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                   {t('payment:instructions.includeReference', { ref: realOrderNumber })}
                 </p>
              </div>
            </div>
          )}

          {method === "card" && (
             <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
               <p className="text-sm text-green-900 dark:text-green-100">
                 ✅ {t('payment:instructions.cardSuccess')}
               </p>
             </div>
          )}

          {method === "paypal" && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <CreditCard className="h-5 w-5" />
                  PayPal
                </h3>
                 <p className="text-sm mb-3 text-blue-900 dark:text-blue-50">
                   {t('payment:instructions.paypalProcessing')}
                 </p>
                 <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                   {t('payment:referenceNumber')}: <strong>{orderNumber}</strong>
                 </p>
              </div>
              
               <div className="bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
                 <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                   ⚠️ {t('payment:instructions.pendingTransaction')}
                 </p>
              </div>
            </div>
          )}

          {method === "revolut" && (
            <div className="space-y-4">
              <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2 text-purple-900 dark:text-purple-100">
                  <CreditCard className="h-5 w-5" />
                  Revolut
                </h3>
                 <p className="text-sm mb-3 text-purple-900 dark:text-purple-50">
                   {t('payment:instructions.revolutProcessing')}
                 </p>
                 <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                   {t('payment:referenceNumber')}: <strong>{orderNumber}</strong>
                 </p>
              </div>
              
               <div className="bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
                 <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                   ⚠️ {t('payment:instructions.pendingTransaction')}
                 </p>
               </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
             <Button onClick={() => navigate("/")} className="flex-1">
               {t('payment:instructions.backHome')}
             </Button>
             <Button onClick={() => navigate("/mi-cuenta")} variant="outline" className="flex-1">
               {t('payment:instructions.viewAccount')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
