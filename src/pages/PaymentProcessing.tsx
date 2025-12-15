import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink, Clock, Package } from "lucide-react";

interface LocationState {
  orderNumber: string;
  total: number;
  paymentMethod: string;
  isInvoicePayment?: boolean;
}

export default function PaymentProcessing() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(['payment', 'common']);
  
  const state = location.state as LocationState | null;

  useEffect(() => {
    // If no state, redirect to home
    if (!state) {
      navigate("/");
    }
  }, [state, navigate]);

  if (!state) {
    return null;
  }

  const { orderNumber, total, paymentMethod, isInvoicePayment } = state;

  const getPaymentMethodLabel = () => {
    switch (paymentMethod) {
      case 'card': return t('payment:methods.creditCard');
      case 'revolut': return t('payment:methods.revolut');
      default: return paymentMethod;
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">
            {t('payment:processing.title', '¡Pago en Proceso!')}
          </CardTitle>
          <CardDescription>
            {t('payment:processing.subtitle', 'Se ha abierto la página de pago en una nueva pestaña')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Info */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {isInvoicePayment 
                ? t('payment:processing.referenceNumber', 'Número de Referencia')
                : t('payment:processing.orderNumber', 'Número de Pedido')}
            </p>
            <p className="text-3xl font-bold text-primary mb-4">{orderNumber}</p>
            
            <div className="flex items-center justify-center gap-2 text-lg">
              <span className="text-muted-foreground">{t('payment:processing.totalAmount', 'Total a pagar')}:</span>
              <span className="font-bold text-foreground">€{Number(total).toFixed(2)}</span>
            </div>
            
            <div className="mt-3 text-sm text-muted-foreground">
              {t('payment:processing.paymentMethod', 'Método')}: {getPaymentMethodLabel()}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ExternalLink className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                  {t('payment:processing.newTabTitle', 'Página de pago abierta')}
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {t('payment:processing.newTabMessage', 'Hemos abierto la página de pago en una nueva pestaña. Por favor, completa el pago allí. Si la pestaña no se abrió, haz clic en el botón de abajo.')}
                </p>
              </div>
            </div>
          </div>

          {/* Status Info */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  {t('payment:processing.pendingTitle', 'Estado del Pedido')}
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {t('payment:processing.pendingMessage', 'Tu pedido ha sido creado y está en estado PENDIENTE. Una vez recibamos la confirmación del pago, actualizaremos el estado automáticamente.')}
                </p>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">
              {t('payment:processing.nextSteps', '¿Qué sigue?')}
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs">1</div>
                <span>{t('payment:processing.step1', 'Completa el pago en la pestaña que se ha abierto')}</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs">2</div>
                <span>{t('payment:processing.step2', 'Recibirás un email de confirmación cuando verifiquemos el pago')}</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs">3</div>
                <span>{t('payment:processing.step3', 'Podrás seguir el estado de tu pedido en "Mi Cuenta"')}</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              onClick={() => navigate("/mi-cuenta", { state: { activeTab: isInvoicePayment ? 'invoices' : 'orders' } })}
              className="flex-1"
            >
              <Package className="h-4 w-4 mr-2" />
              {isInvoicePayment 
                ? t('payment:processing.viewInvoices', 'Ver Mis Facturas')
                : t('payment:processing.viewOrders', 'Ver Mis Pedidos')}
            </Button>
            <Button 
              onClick={() => navigate("/")}
              variant="outline"
              className="flex-1"
            >
              {t('payment:processing.continueShopping', 'Seguir Comprando')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
