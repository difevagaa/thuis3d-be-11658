import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { 
  syncInvoiceStatusWithOrder, 
  syncOrderStatusWithInvoice 
} from "@/lib/paymentUtils";
import { triggerNotificationRefresh } from "@/lib/notificationUtils";

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'cancelled' | 'refunded';

export interface PaymentConfirmationData {
  orderId?: string;
  invoiceId?: string;
  status: PaymentStatus;
  paymentMethod?: string;
  transactionId?: string;
  userId?: string;
}

/**
 * Main payment confirmation callback
 * Handles status updates, synchronization, and notifications
 */
export const onPaymentConfirmed = async (
  data: PaymentConfirmationData
): Promise<{ success: boolean; error?: string }> => {
  try {
    logger.log('Payment confirmation callback triggered:', data);

    if (!data.orderId && !data.invoiceId) {
      return { success: false, error: 'Order ID or Invoice ID is required' };
    }

    if (!data.status) {
      return { success: false, error: 'Payment status is required' };
    }

    // Handle order payment confirmation
    if (data.orderId) {
      const orderResult = await handleOrderPaymentConfirmation(data);
      if (!orderResult.success) {
        return orderResult;
      }
    }

    // Handle invoice payment confirmation
    if (data.invoiceId) {
      const invoiceResult = await handleInvoicePaymentConfirmation(data);
      if (!invoiceResult.success) {
        return invoiceResult;
      }
    }

    // Send notification if user is provided
    if (data.userId && data.status === 'paid') {
      await sendPaymentConfirmationNotification(data);
    }

    logger.log('Payment confirmation processed successfully');
    return { success: true };
  } catch (error) {
    logger.error('Error in payment confirmation callback:', error);
    return { success: false, error: 'Error processing payment confirmation' };
  }
};

/**
 * Handle order payment confirmation
 */
const handleOrderPaymentConfirmation = async (
  data: PaymentConfirmationData
): Promise<{ success: boolean; error?: string }> => {
  if (!data.orderId) {
    return { success: false, error: 'Order ID is required' };
  }

  try {
    // Update order status
    const updateData: any = {
      payment_status: data.status,
      updated_at: new Date().toISOString()
    };

    if (data.transactionId) {
      updateData.transaction_id = data.transactionId;
    }

    const { error: orderError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', data.orderId);

    if (orderError) {
      logger.error('Error updating order status:', orderError);
      return { success: false, error: 'Failed to update order status' };
    }

    // Sync invoice status
    const syncSuccess = await syncInvoiceStatusWithOrder(data.orderId, data.status);
    if (!syncSuccess) {
      logger.warn('Invoice sync failed but order was updated');
    }

    logger.log(`Order ${data.orderId} payment status updated to ${data.status}`);
    return { success: true };
  } catch (error) {
    logger.error('Exception in handleOrderPaymentConfirmation:', error);
    return { success: false, error: 'Error processing order payment' };
  }
};

/**
 * Handle invoice payment confirmation
 */
const handleInvoicePaymentConfirmation = async (
  data: PaymentConfirmationData
): Promise<{ success: boolean; error?: string }> => {
  if (!data.invoiceId) {
    return { success: false, error: 'Invoice ID is required' };
  }

  try {
    // Get invoice to find associated order
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('order_id')
      .eq('id', data.invoiceId)
      .single();

    if (fetchError || !invoice) {
      logger.error('Error fetching invoice:', fetchError);
      return { success: false, error: 'Invoice not found' };
    }

    // Update invoice status
    const { error: invoiceError } = await supabase
      .from('invoices')
      .update({
        payment_status: data.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.invoiceId);

    if (invoiceError) {
      logger.error('Error updating invoice status:', invoiceError);
      return { success: false, error: 'Failed to update invoice status' };
    }

    // Sync order status if order exists
    if (invoice.order_id) {
      const syncSuccess = await syncOrderStatusWithInvoice(invoice.order_id, data.status);
      if (!syncSuccess) {
        logger.warn('Order sync failed but invoice was updated');
      }
    }

    logger.log(`Invoice ${data.invoiceId} payment status updated to ${data.status}`);
    return { success: true };
  } catch (error) {
    logger.error('Exception in handleInvoicePaymentConfirmation:', error);
    return { success: false, error: 'Error processing invoice payment' };
  }
};

/**
 * Send payment confirmation notification to user
 */
const sendPaymentConfirmationNotification = async (
  data: PaymentConfirmationData
): Promise<void> => {
  if (!data.userId) return;

  try {
    const title = data.status === 'paid' 
      ? '✅ Pago Confirmado' 
      : data.status === 'failed'
      ? '❌ Pago Fallido'
      : '⏳ Estado de Pago Actualizado';

    const message = data.status === 'paid'
      ? 'Tu pago ha sido confirmado exitosamente'
      : data.status === 'failed'
      ? 'Hubo un problema con tu pago. Por favor intenta nuevamente'
      : `El estado de tu pago ha sido actualizado a: ${data.status}`;

    const link = data.orderId 
      ? `/mi-cuenta?tab=orders` 
      : data.invoiceId
      ? `/mi-cuenta?tab=invoices`
      : '/mi-cuenta';

    await supabase.rpc('send_notification', {
      p_user_id: data.userId,
      p_type: 'payment_status',
      p_title: title,
      p_message: message,
      p_link: link
    });

    await triggerNotificationRefresh(data.userId);
    logger.log('Payment confirmation notification sent to user:', data.userId);
  } catch (error) {
    logger.error('Error sending payment confirmation notification:', error);
  }
};

/**
 * Callback for failed payments
 */
export const onPaymentFailed = async (
  orderId: string,
  userId?: string,
  reason?: string
): Promise<void> => {
  await onPaymentConfirmed({
    orderId,
    userId,
    status: 'failed'
  });

  logger.warn(`Payment failed for order ${orderId}: ${reason || 'Unknown reason'}`);
};

/**
 * Callback for cancelled payments
 */
export const onPaymentCancelled = async (
  orderId: string,
  userId?: string
): Promise<void> => {
  await onPaymentConfirmed({
    orderId,
    userId,
    status: 'cancelled'
  });

  logger.log(`Payment cancelled for order ${orderId}`);
};
