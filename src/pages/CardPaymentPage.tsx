import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, ExternalLink, Copy } from "lucide-react";
import { logger } from "@/lib/logger";
import { 
  createOrder, 
  createOrderItems, 
  convertCartToOrderItems,
  generateOrderNotes,
  updateGiftCardBalance 
} from "@/lib/paymentUtils";

export default function CardPaymentPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['payment', 'common']);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [paymentImages, setPaymentImages] = useState<string[]>([]);

  useEffect(() => {
    loadOrderData();
    loadPaymentConfig();
  }, []);

  const loadOrderData = () => {
    const pendingOrderStr = sessionStorage.getItem("pending_card_order");
    if (!pendingOrderStr) {
      toast.error("No se encontró información del pedido");
      navigate("/pago");
      return;
    }

    try {
      const data = JSON.parse(pendingOrderStr);
      setOrderData(data);
      setLoading(false);
    } catch (error) {
      logger.error("Error parsing order data:", error);
      toast.error("Error al cargar información del pedido");
      navigate("/pago");
    }
  };

  const loadPaymentConfig = async () => {
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
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  const handleProceedToPayment = async () => {
    setProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error(t('payment:messages.loginRequired'));
        navigate("/auth");
        return;
      }

      const { cartItems, shippingInfo, total, subtotal, tax, shipping } = orderData;

      // Get saved gift card if applied
      const savedGiftCard = sessionStorage.getItem("applied_gift_card");
      let giftCardDiscount = 0;
      let giftCardData = null;
      
      if (savedGiftCard) {
        giftCardData = JSON.parse(savedGiftCard);
        giftCardDiscount = Number(Math.min(giftCardData.current_balance, total).toFixed(2));
      }

      const finalTotal = Number(Math.max(0, total - giftCardDiscount).toFixed(2));

      // Generate order notes
      const orderNotes = generateOrderNotes(cartItems, giftCardData, giftCardDiscount);

      // Create order
      const order = await createOrder({
        userId: user.id,
        subtotal,
        tax,
        shipping,
        discount: giftCardDiscount,
        total: finalTotal,
        paymentMethod: "card",
        paymentStatus: "pending",
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
          giftCardData.current_balance - giftCardDiscount
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
          total: finalTotal,
          payment_method: "card",
          payment_status: "pending",
          issue_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notes: `Factura generada para el pedido ${order.order_number}`
        });
      } catch (invoiceError) {
        logger.error('Error creating invoice:', invoiceError);
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
              discount: giftCardDiscount,
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
      sessionStorage.removeItem("pending_card_order");
      const sessionId = sessionStorage.getItem("checkout_session_id");
      if (sessionId) {
        await supabase.from('checkout_sessions').delete().eq('id', sessionId);
        sessionStorage.removeItem("checkout_session_id");
      }

      toast.success(t('payment:messages.orderCreated'));

      // Redirect to payment gateway
      if (paymentConfig?.revolut_link) {
        window.location.href = paymentConfig.revolut_link;
      } else {
        toast.error("Configuración de pago no disponible");
        navigate("/mi-cuenta", { state: { activeTab: 'orders' } });
      }
    } catch (error) {
      logger.error("Error creating order:", error);
      toast.error(t('payment:messages.errorProcessingOrder'));
      setProcessing(false);
    }
  };

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
          <CardTitle className="text-2xl">Pago con Tarjeta de Crédito/Débito</CardTitle>
          <CardDescription>
            Vas a ser redirigido a la plataforma de pago segura
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Information */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-foreground">Información del Pedido</h3>
            
            <div className="space-y-3 text-sm">
              <div className="bg-white dark:bg-slate-900 border-2 border-primary rounded-lg p-4">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Monto a Pagar:</p>
                <p className="text-3xl font-bold text-primary">€{Number(orderData.total).toFixed(2)}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">IVA incluido</p>
              </div>

              <div>
                <p className="font-medium text-slate-700 dark:text-slate-300">Número de Pedido (Temporal):</p>
                <div className="flex items-center gap-2 mt-1">
                  <code className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 rounded border border-slate-300 dark:border-slate-600 flex-1">
                    {`TEMP-${Date.now()}`}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(`TEMP-${Date.now()}`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  *Se generará el número de pedido final al confirmar el pago
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Detalles del Pago:</h4>
                <div className="space-y-1 text-slate-900 dark:text-slate-100">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>€{Number(orderData.subtotal).toFixed(2)}</span>
                  </div>
                  {orderData.shipping > 0 && (
                    <div className="flex justify-between">
                      <span>Envío:</span>
                      <span>€{Number(orderData.shipping).toFixed(2)}</span>
                    </div>
                  )}
                  {orderData.tax > 0 && (
                    <div className="flex justify-between">
                      <span>IVA:</span>
                      <span>€{Number(orderData.tax).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-amber-900 dark:text-amber-100">Instrucciones Importantes</h3>
            <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
              <li className="flex items-start gap-2">
                <span className="font-bold">1.</span>
                <span>Al hacer clic en "Proceder al Pago", serás redirigido a nuestra plataforma de pago segura.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">2.</span>
                <span>Podrás pagar con <strong>Bancontact, Apple Pay, Google Pay</strong> y tarjetas de crédito/débito.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">3.</span>
                <span>Introduce el monto exacto de <strong>€{Number(orderData.total).toFixed(2)}</strong> en la plataforma de pago.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">4.</span>
                <span>Tu pedido quedará en estado <strong>pendiente</strong> hasta que confirmemos el pago.</span>
              </li>
            </ul>
          </div>

          {/* QR Codes if available */}
          {paymentImages.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold">Códigos QR de Pago</h4>
              <p className="text-sm text-muted-foreground">
                También puedes escanear estos códigos QR para realizar el pago
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentImages.map((img, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 bg-white dark:bg-slate-900">
                    <img 
                      src={img} 
                      alt={`Código QR ${index + 1}`}
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
              Cancelar
            </Button>
            <Button 
              onClick={handleProceedToPayment} 
              className="flex-1"
              disabled={processing}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {processing ? "Procesando..." : "Proceder al Pago"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
