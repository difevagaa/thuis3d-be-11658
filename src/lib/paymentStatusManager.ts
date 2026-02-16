/**
 * Payment Status Manager
 * Gestión centralizada y robusta de estados de pago
 * Sincroniza automáticamente órdenes, facturas y notificaciones
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export interface PaymentStatusUpdate {
  orderId?: string;
  invoiceId?: string;
  newStatus: PaymentStatus;
  transactionId?: string;
  paymentMethod?: string;
  metadata?: Record<string, unknown>;
  reason?: string;
}

export interface PaymentAuditLog {
  id: string;
  order_id?: string;
  invoice_id?: string;
  old_status: PaymentStatus;
  new_status: PaymentStatus;
  transaction_id?: string;
  payment_method?: string;
  metadata?: Record<string, unknown>;
  reason?: string;
  created_at: string;
  created_by?: string;
}

/**
 * Actualiza el estado de pago de una orden y sincroniza con factura
 */
export async function updateOrderPaymentStatus(
  orderId: string,
  newStatus: PaymentStatus,
  options: {
    transactionId?: string;
    paymentMethod?: string;
    metadata?: Record<string, unknown>;
    reason?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[PaymentStatus] Updating order payment status', {
      orderId,
      newStatus,
      ...options
    });

    // 1. Obtener orden actual
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, invoices(id, payment_status)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      logger.error('[PaymentStatus] Order not found', { orderId, orderError });
      return { success: false, error: 'Order not found' };
    }

    const oldStatus = order.payment_status as PaymentStatus;

    // 2. Validar transición de estado
    if (!isValidStatusTransition(oldStatus, newStatus)) {
      logger.warn('[PaymentStatus] Invalid status transition', {
        orderId,
        oldStatus,
        newStatus
      });
      return {
        success: false,
        error: `Invalid transition from ${oldStatus} to ${newStatus}`
      };
    }

    // 3. Actualizar orden
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: newStatus,
        payment_method: options.paymentMethod || order.payment_method,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      logger.error('[PaymentStatus] Error updating order', { orderId, updateError });
      return { success: false, error: 'Failed to update order' };
    }

    // 4. Sincronizar con factura si existe
    if (order.invoices && order.invoices.length > 0) {
      const invoice = order.invoices[0];
      await syncInvoicePaymentStatus(invoice.id, newStatus, {
        orderId,
        ...options
      });
    }

    // 5. Registrar en log de auditoría
    await logPaymentStatusChange({
      orderId,
      oldStatus,
      newStatus,
      transactionId: options.transactionId,
      paymentMethod: options.paymentMethod,
      metadata: options.metadata,
      reason: options.reason
    });

    // 6. Enviar notificaciones si el pago fue exitoso
    if (newStatus === 'paid') {
      await notifyPaymentSuccess(orderId, order);
    } else if (newStatus === 'failed') {
      await notifyPaymentFailure(orderId, order, options.reason);
    }

    logger.info('[PaymentStatus] Order payment status updated successfully', {
      orderId,
      oldStatus,
      newStatus
    });

    return { success: true };
  } catch (error) {
    logger.error('[PaymentStatus] Exception updating order payment status', {
      orderId,
      error
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Actualiza el estado de pago de una factura
 */
export async function updateInvoicePaymentStatus(
  invoiceId: string,
  newStatus: PaymentStatus,
  options: {
    transactionId?: string;
    paymentMethod?: string;
    metadata?: Record<string, unknown>;
    reason?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[PaymentStatus] Updating invoice payment status', {
      invoiceId,
      newStatus,
      ...options
    });

    // 1. Obtener factura actual
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      logger.error('[PaymentStatus] Invoice not found', { invoiceId, invoiceError });
      return { success: false, error: 'Invoice not found' };
    }

    const oldStatus = invoice.payment_status as PaymentStatus;

    // 2. Validar transición
    if (!isValidStatusTransition(oldStatus, newStatus)) {
      return {
        success: false,
        error: `Invalid transition from ${oldStatus} to ${newStatus}`
      };
    }

    // 3. Actualizar factura
    const updateData: Record<string, unknown> = {
      payment_status: newStatus,
      updated_at: new Date().toISOString()
    };

    // Si se marca como pagada, registrar fecha de pago
    if (newStatus === 'paid') {
      updateData.paid_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId);

    if (updateError) {
      logger.error('[PaymentStatus] Error updating invoice', { invoiceId, updateError });
      return { success: false, error: 'Failed to update invoice' };
    }

    // 4. Registrar en auditoría
    await logPaymentStatusChange({
      invoiceId,
      oldStatus,
      newStatus,
      transactionId: options.transactionId,
      paymentMethod: options.paymentMethod,
      metadata: options.metadata,
      reason: options.reason
    });

    logger.info('[PaymentStatus] Invoice payment status updated successfully', {
      invoiceId,
      oldStatus,
      newStatus
    });

    return { success: true };
  } catch (error) {
    logger.error('[PaymentStatus] Exception updating invoice payment status', {
      invoiceId,
      error
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sincroniza el estado de pago de la factura con la orden
 */
async function syncInvoicePaymentStatus(
  invoiceId: string,
  newStatus: PaymentStatus,
  options: {
    orderId?: string;
    transactionId?: string;
    paymentMethod?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await updateInvoicePaymentStatus(invoiceId, newStatus, {
      ...options,
      reason: `Synced from order ${options.orderId || 'unknown'}`
    });
  } catch (error) {
    logger.error('[PaymentStatus] Error syncing invoice payment status', {
      invoiceId,
      error
    });
    // No lanzar error - la sincronización es no-bloqueante
  }
}

/**
 * Valida si una transición de estado es permitida
 */
function isValidStatusTransition(
  oldStatus: PaymentStatus,
  newStatus: PaymentStatus
): boolean {
  // Transiciones permitidas
  const allowedTransitions: Record<PaymentStatus, PaymentStatus[]> = {
    pending: ['processing', 'paid', 'failed', 'cancelled'],
    processing: ['paid', 'failed', 'cancelled'],
    paid: ['refunded'], // Solo se puede reembolsar si ya está pagado
    failed: ['pending', 'cancelled'], // Puede reintentar o cancelar
    refunded: [], // Estado final
    cancelled: [] // Estado final
  };

  const allowed = allowedTransitions[oldStatus] || [];
  return allowed.includes(newStatus);
}

/**
 * Registra cambio de estado en log de auditoría
 */
async function logPaymentStatusChange(data: {
  orderId?: string;
  invoiceId?: string;
  oldStatus: PaymentStatus;
  newStatus: PaymentStatus;
  transactionId?: string;
  paymentMethod?: string;
  metadata?: Record<string, unknown>;
  reason?: string;
}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Intentar insertar en tabla de auditoría si existe
    // Si no existe, solo loggear
    const { error } = await supabase
      .from('payment_audit_logs')
      .insert({
        order_id: data.orderId,
        invoice_id: data.invoiceId,
        old_status: data.oldStatus,
        new_status: data.newStatus,
        transaction_id: data.transactionId,
        payment_method: data.paymentMethod,
        metadata: data.metadata,
        reason: data.reason,
        created_by: user?.id,
        created_at: new Date().toISOString()
      });

    if (error) {
      // Si la tabla no existe, solo loggear - no es crítico
      logger.info('[PaymentStatus] Audit log (table may not exist)', data);
    }
  } catch (error) {
    // Auditoría no debe bloquear la operación principal
    logger.warn('[PaymentStatus] Could not log audit trail', { error, data });
  }
}

/**
 * Notifica al cliente que el pago fue exitoso
 */
async function notifyPaymentSuccess(orderId: string, order: any): Promise<void> {
  try {
    // Enviar notificación in-app
    if (order.user_id) {
      await supabase.from('notifications').insert({
        user_id: order.user_id,
        type: 'payment_success',
        title: '✅ Pago Confirmado',
        message: `Tu pago para el pedido ${order.order_number} ha sido confirmado exitosamente.`,
        link: `/mi-cuenta?tab=orders`,
        is_read: false
      });
    }

    // Enviar email (si está configurado)
    if (order.user_id) {
      try {
        await supabase.functions.invoke('send-payment-confirmation-email', {
          body: {
            orderId,
            orderNumber: order.order_number
          }
        });
      } catch (error) {
        logger.warn('[PaymentStatus] Email notification failed (non-blocking)', {
          orderId,
          error
        });
      }
    }

    logger.info('[PaymentStatus] Payment success notifications sent', { orderId });
  } catch (error) {
    logger.error('[PaymentStatus] Error sending payment success notifications', {
      orderId,
      error
    });
  }
}

/**
 * Notifica al cliente que el pago falló
 */
async function notifyPaymentFailure(
  orderId: string,
  order: any,
  reason?: string
): Promise<void> {
  try {
    if (order.user_id) {
      await supabase.from('notifications').insert({
        user_id: order.user_id,
        type: 'payment_failed',
        title: '❌ Pago Fallido',
        message: `El pago para el pedido ${order.order_number} no pudo ser procesado. ${reason || 'Por favor, intenta nuevamente.'}`,
        link: `/mi-cuenta?tab=orders`,
        is_read: false
      });
    }

    logger.info('[PaymentStatus] Payment failure notifications sent', { orderId });
  } catch (error) {
    logger.error('[PaymentStatus] Error sending payment failure notifications', {
      orderId,
      error
    });
  }
}

/**
 * Obtiene el historial de cambios de estado de una orden
 */
export async function getPaymentStatusHistory(
  orderId: string
): Promise<PaymentAuditLog[]> {
  try {
    const { data, error } = await supabase
      .from('payment_audit_logs')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.warn('[PaymentStatus] Could not fetch history (table may not exist)', {
        orderId,
        error
      });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('[PaymentStatus] Exception fetching payment status history', {
      orderId,
      error
    });
    return [];
  }
}
