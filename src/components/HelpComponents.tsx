import { HelpCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HelpTooltipProps {
  content: string;
  className?: string;
}

/**
 * A simple tooltip with a help icon for inline help
 */
export function HelpTooltip({ content, className = "" }: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className={`h-4 w-4 text-muted-foreground cursor-help ${className}`} />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface HelpAlertProps {
  title: string;
  description: string;
  variant?: "default" | "destructive";
  className?: string;
}

/**
 * A prominent help alert box for important information
 */
export function HelpAlert({ title, description, variant = "default", className = "" }: HelpAlertProps) {
  return (
    <Alert variant={variant} className={className}>
      <Info className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="text-sm">
        {description}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Predefined help messages for common admin scenarios
 */
export const HELP_MESSAGES = {
  // Quotation management
  quoteApproval: {
    title: "Aprobación de Cotizaciones",
    description: "Cuando un cliente aprueba una cotización desde su panel, automáticamente se genera una factura y un pedido. El cliente recibirá una notificación por email con los detalles. Si cambias el estado a 'Aprobada' manualmente, el mismo proceso se ejecutará automáticamente."
  },
  quoteRejection: {
    title: "Rechazo de Cotizaciones",
    description: "Si un cliente rechaza una cotización, el estado cambiará automáticamente a 'Rechazada' y recibirás una notificación. Puedes ver los comentarios del cliente en los detalles de la cotización."
  },
  quoteResponseHistory: {
    title: "Historial de Respuestas",
    description: "Todas las interacciones del cliente (aprobaciones, rechazos, comentarios) quedan registradas con fecha y hora. Puedes ver el historial completo en los detalles de cada cotización."
  },

  // Order management
  orderRefund: {
    title: "Reembolso de Pedidos",
    description: "Al marcar un pedido como 'Reembolsado', el sistema automáticamente: 1) Actualiza el estado del pedido y la factura, 2) Si el pedido fue pagado con tarjeta de regalo, restaura el saldo a esa tarjeta, 3) Notifica al cliente y a los administradores. Solo se pueden reembolsar pedidos que estén en estado 'Pagado'."
  },
  giftCardRefund: {
    title: "Reembolsos con Tarjetas de Regalo",
    description: "Cuando un pedido pagado con tarjeta de regalo es reembolsado, el sistema automáticamente devuelve el importe a la tarjeta. El cliente recibirá una notificación indicando que su tarjeta ha sido recargada."
  },

  // Invoice management
  invoiceGeneration: {
    title: "Generación Automática de Facturas",
    description: "Las facturas se generan automáticamente cuando: 1) Una cotización es aprobada (por admin o cliente), 2) Un pedido se marca como pagado. No necesitas crear facturas manualmente en estos casos."
  },
  invoicePaymentTracking: {
    title: "Seguimiento de Pagos",
    description: "El sistema sincroniza automáticamente los estados de pago entre pedidos y facturas. Cuando marcas un pedido como pagado, la factura asociada también se actualiza."
  },

  // General automation
  automation: {
    title: "Automatizaciones del Sistema",
    description: "El sistema incluye múltiples automatizaciones para facilitar tu trabajo: generación de facturas y pedidos, sincronización de estados de pago, notificaciones automáticas, y gestión de tarjetas de regalo. Estas automatizaciones se ejecutan en segundo plano sin necesidad de intervención manual."
  }
};
