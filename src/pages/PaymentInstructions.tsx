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
        toast.error("No se encontró información del pedido");
        navigate("/");
        return;
      }

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
    toast.success("Copiado al portapapeles");
  };

  if (!orderNumber) {
    return null;
  }

  if (creatingOrder) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg">Creando tu pedido...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl">
            {isInvoicePayment ? '¡Pago de Factura!' : '¡Pedido Recibido!'}
          </CardTitle>
          <CardDescription>
            {isInvoicePayment ? (
              <>Tu número de factura es: <strong>{realOrderNumber}</strong></>
            ) : (
              <>Tu número de pedido es: <strong>{realOrderNumber}</strong></>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {method === "bank_transfer" && paymentConfig && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Instrucciones para Transferencia Bancaria
                </h3>
                
                {/* MONTO A TRANSFERIR - DESTACADO */}
                {total && (
                  <div className="bg-white border-2 border-primary rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Monto a Transferir:</p>
                    <p className="text-3xl font-bold text-primary">€{Number(total).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">IVA incluido</p>
                  </div>
                )}
                
                <div className="space-y-3 text-sm">
                  {paymentConfig.company_info && (
                    <div>
                      <p className="font-medium text-muted-foreground">Información de la Empresa:</p>
                      <p className="whitespace-pre-line">{paymentConfig.company_info}</p>
                    </div>
                  )}
                  
                  {paymentConfig.bank_name && (
                    <div>
                      <p className="font-medium text-muted-foreground">Banco:</p>
                      <p>{paymentConfig.bank_name}</p>
                    </div>
                  )}
                  
                  {paymentConfig.bank_account_name && (
                    <div>
                      <p className="font-medium text-muted-foreground">Titular de la Cuenta:</p>
                      <p>{paymentConfig.bank_account_name}</p>
                    </div>
                  )}
                  
                  {paymentConfig.bank_account_number && (
                    <div>
                      <p className="font-medium text-muted-foreground">IBAN:</p>
                      <div className="flex items-center gap-2">
                        <code className="bg-white px-3 py-2 rounded border flex-1">
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
                    <p className="font-medium text-muted-foreground">Concepto de la Transferencia:</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-white px-3 py-2 rounded border flex-1">
                        Pedido {realOrderNumber}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(`Pedido ${realOrderNumber}`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {paymentConfig.bank_instructions && (
                    <div>
                      <p className="font-medium text-muted-foreground">Instrucciones Adicionales:</p>
                      <p className="whitespace-pre-line text-muted-foreground">
                        {paymentConfig.bank_instructions}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {paymentImages.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Códigos QR y Referencias de Pago</h4>
                  <p className="text-sm text-muted-foreground">
                    Escanea cualquiera de estos códigos QR para realizar el pago
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paymentImages.map((img, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3 bg-white">
                        <img 
                          src={img} 
                          alt={`Código QR ${index + 1}`}
                          className="w-full h-56 object-contain rounded"
                        />
                        <div className="text-center space-y-1">
                          <p className="font-medium text-sm">
                            {index === 0 ? "QR Transferencia Bancaria" : 
                             index === 1 ? "QR Revolut" : 
                             `Código QR ${index + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {index === 0 ? "Escanea para transferencia directa" : 
                             index === 1 ? "Pago rápido con Revolut" : 
                             "Método de pago alternativo"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <p className="text-sm font-medium text-warning-foreground">
                  ⚠️ Tu pedido estará en estado pendiente hasta que recibamos el pago.
                </p>
                <p className="text-sm text-warning-foreground/80 mt-1">
                  Por favor, incluye el número de pedido <strong>{realOrderNumber}</strong> en el concepto de la transferencia.
                </p>
              </div>
            </div>
          )}

          {method === "card" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm">
                ✅ Tu pago con tarjeta ha sido procesado exitosamente.
                Recibirás una confirmación por correo electrónico en breve.
              </p>
            </div>
          )}

          {method === "paypal" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pago con PayPal
                </h3>
                <p className="text-sm mb-3">
                  Tu pedido está siendo procesado. Si completaste el pago en PayPal, 
                  recibirás una confirmación pronto.
                </p>
                <p className="text-sm font-medium">
                  Número de pedido: <strong>{orderNumber}</strong>
                </p>
              </div>
              
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <p className="text-sm font-medium text-warning-foreground">
                  ⚠️ Tu pedido estará en estado pendiente hasta que confirmemos el pago.
                </p>
              </div>
            </div>
          )}

          {method === "revolut" && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pago con Revolut
                </h3>
                <p className="text-sm mb-3">
                  Tu pedido está siendo procesado. Si completaste el pago en Revolut, 
                  recibirás una confirmación pronto.
                </p>
                <p className="text-sm font-medium">
                  Número de pedido: <strong>{orderNumber}</strong>
                </p>
              </div>
              
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <p className="text-sm font-medium text-warning-foreground">
                  ⚠️ Tu pedido estará en estado pendiente hasta que confirmemos el pago.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button onClick={() => navigate("/")} className="flex-1">
              Volver al Inicio
            </Button>
            <Button onClick={() => navigate("/mi-cuenta")} variant="outline" className="flex-1">
              Ver Mis Pedidos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
