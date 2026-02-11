import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Handles order refunds and automatically restores gift card balance if applicable
 * @param orderId The ID of the order to refund
 * @param reason Optional refund reason
 * @returns Success status and details
 */
export async function processOrderRefund(orderId: string, reason?: string): Promise<{
  success: boolean;
  message: string;
  giftCardRestored?: boolean;
  restoredAmount?: number;
}> {
  try {
    console.log('[REFUND] Processing refund for order:', orderId);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, invoices(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.error('[REFUND] Order not found:', orderError);
      return {
        success: false,
        message: 'Pedido no encontrado'
      };
    }

    // Check if order was already refunded
    if (order.payment_status === 'refunded') {
      console.log('[REFUND] Order already refunded');
      return {
        success: false,
        message: 'Este pedido ya fue reembolsado anteriormente'
      };
    }

    // Get invoice data to check for gift card payment
    const invoice = Array.isArray(order.invoices) ? order.invoices[0] : order.invoices;
    let giftCardRestored = false;
    let restoredAmount = 0;

    if (invoice && invoice.gift_card_code && invoice.gift_card_amount) {
      console.log('[REFUND] Gift card payment detected:', {
        code: invoice.gift_card_code,
        amount: invoice.gift_card_amount
      });

      // Get gift card
      const { data: giftCard, error: giftCardError } = await supabase
        .from('gift_cards')
        .select('*')
        .eq('code', invoice.gift_card_code)
        .maybeSingle();

      if (giftCardError || !giftCard) {
        console.error('[REFUND] Gift card not found:', giftCardError);
        toast.error('No se pudo encontrar la tarjeta de regalo para restaurar el saldo');
      } else {
        // Restore gift card balance
        const currentBalance = Number(giftCard.current_balance);
        const amountToRestore = Number(invoice.gift_card_amount);
        const newBalance = currentBalance + amountToRestore;
        
        const { error: updateError } = await supabase
          .from('gift_cards')
          .update({ 
            current_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', giftCard.id);

        if (updateError) {
          console.error('[REFUND] Error restoring gift card balance:', updateError);
          toast.error('Error al restaurar el saldo de la tarjeta de regalo');
        } else {
          giftCardRestored = true;
          restoredAmount = Number(invoice.gift_card_amount);
          console.log('[REFUND] Gift card balance restored:', {
            previousBalance: giftCard.current_balance,
            restoredAmount,
            newBalance
          });

          // Create notification for gift card owner if they have a user account
          if (giftCard.recipient_email) {
            // Try to find user by email
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', giftCard.recipient_email)
              .maybeSingle();

            if (profile) {
              await supabase
                .from('notifications')
                .insert({
                  user_id: profile.id,
                  type: 'gift_card',
                  title: '💳 Saldo de Tarjeta Regalo Restaurado',
                  message: `Se ha restaurado €${restoredAmount.toFixed(2)} a tu tarjeta de regalo ${invoice.gift_card_code} debido a un reembolso del pedido ${order.order_number}.`,
                  is_read: false
                });
            }
          }
        }
      }
    }

    // Update order status to refunded
    const updateData: any = {
      payment_status: 'refunded',
      updated_at: new Date().toISOString()
    };

    if (reason) {
      const timestamp = new Date().toLocaleString('es-ES');
      const refundNote = `[REEMBOLSO] ${timestamp}: ${reason}`;
      const currentNotes = order.notes || '';
      updateData.notes = currentNotes ? `${currentNotes}\n\n${refundNote}` : refundNote;
    }

    const { error: updateOrderError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (updateOrderError) {
      console.error('[REFUND] Error updating order:', updateOrderError);
      return {
        success: false,
        message: 'Error al actualizar el estado del pedido'
      };
    }

    // Update invoice status if exists
    if (invoice) {
      await supabase
        .from('invoices')
        .update({ 
          payment_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id);
    }

    // Notify customer if they have an account
    if (order.user_id) {
      const giftCardMessage = giftCardRestored 
        ? ` Se ha restaurado €${restoredAmount.toFixed(2)} a tu tarjeta de regalo.`
        : '';

      await supabase
        .from('notifications')
        .insert({
          user_id: order.user_id,
          type: 'order_refunded',
          title: '💰 Pedido Reembolsado',
          message: `Tu pedido ${order.order_number} ha sido reembolsado.${giftCardMessage}`,
          link: `/mi-cuenta?tab=orders`,
          is_read: false
        });
    }

    // Notify admins
    const { data: adminUsers } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminUsers && adminUsers.length > 0) {
      const giftCardInfo = giftCardRestored 
        ? ` Se restauró €${restoredAmount.toFixed(2)} a la tarjeta ${invoice.gift_card_code}.`
        : '';

      const adminNotifications = adminUsers.map(admin => ({
        user_id: admin.user_id,
        type: 'system',
        title: '🔄 Pedido Reembolsado',
        message: `El pedido ${order.order_number} ha sido marcado como reembolsado.${giftCardInfo}`,
        link: `/admin/pedidos/${orderId}`,
        is_read: false
      }));

      await supabase.from('notifications').insert(adminNotifications);
    }

    console.log('[REFUND] Refund processed successfully');

    let successMessage = `Pedido ${order.order_number} reembolsado exitosamente.`;
    if (giftCardRestored) {
      successMessage += ` Se restauraron €${restoredAmount.toFixed(2)} a la tarjeta de regalo.`;
    }

    return {
      success: true,
      message: successMessage,
      giftCardRestored,
      restoredAmount
    };

  } catch (error: any) {
    console.error('[REFUND] Unexpected error:', error);
    return {
      success: false,
      message: `Error al procesar reembolso: ${error.message}`
    };
  }
}

/**
 * Check if an order is eligible for refund
 * @param orderId The order ID to check
 * @returns Whether the order can be refunded and reason if not
 */
export async function canRefundOrder(orderId: string): Promise<{
  canRefund: boolean;
  reason?: string;
}> {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) {
      return {
        canRefund: false,
        reason: 'Pedido no encontrado'
      };
    }

    if (order.payment_status === 'refunded') {
      return {
        canRefund: false,
        reason: 'Este pedido ya fue reembolsado'
      };
    }

    if (order.payment_status !== 'paid') {
      return {
        canRefund: false,
        reason: 'Solo se pueden reembolsar pedidos pagados'
      };
    }

    return {
      canRefund: true
    };

  } catch (error) {
    return {
      canRefund: false,
      reason: 'Error al verificar el pedido'
    };
  }
}
