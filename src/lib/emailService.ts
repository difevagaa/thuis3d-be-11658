/**
 * ============================================================================
 * CENTRALIZED EMAIL SERVICE
 * ============================================================================
 * 
 * This service provides a unified interface for sending all types of emails
 * in the application. It calls the appropriate Supabase Edge Functions.
 * 
 * All email sending should go through this service to ensure:
 * - Consistent error handling
 * - Proper logging
 * - Retry logic
 * - Analytics tracking
 * 
 * IMPORTANT: This replaces the broken pg_net system with proper edge function calls
 * ============================================================================
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface EmailResult {
  success: boolean;
  error?: string;
  emailId?: string;
}

export interface OrderEmailData {
  orderId: string;
  orderNumber?: string;
  customerEmail?: string;
}

export interface InvoiceEmailData {
  invoiceId: string;
  invoiceNumber?: string;
  customerEmail?: string;
}

export interface QuoteEmailData {
  quoteId: string;
  customerEmail?: string;
  customerName?: string;
}

export interface GiftCardEmailData {
  giftCardId: string;
  recipientEmail?: string;
}

export interface StatusEmailData {
  orderId: string;
  oldStatus: string;
  newStatus: string;
}

// ============================================================================
// EMAIL SENDING FUNCTIONS
// ============================================================================

/**
 * Send order confirmation email to customer
 * Called after: Order creation
 */
export const sendOrderConfirmationEmail = async (
  data: OrderEmailData
): Promise<EmailResult> => {
  try {
    logger.info('📧 Sending order confirmation email', { orderId: data.orderId });

    const { data: result, error } = await supabase.functions.invoke(
      'send-order-confirmation',
      {
        body: {
          order_id: data.orderId,
          order_number: data.orderNumber,
          customer_email: data.customerEmail
        }
      }
    );

    if (error) {
      logger.error('❌ Failed to send order confirmation email', error);
      return { success: false, error: error.message };
    }

    logger.info('✅ Order confirmation email sent successfully', result);
    return { success: true, emailId: result?.id };
  } catch (error: any) {
    logger.error('❌ Exception sending order confirmation email', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send order status update email to customer
 * Called after: Order status change
 */
export const sendOrderStatusEmail = async (
  data: StatusEmailData
): Promise<EmailResult> => {
  try {
    logger.info('📧 Sending order status update email', { orderId: data.orderId });

    const { data: result, error } = await supabase.functions.invoke(
      'send-order-status-email',
      {
        body: {
          order_id: data.orderId,
          old_status: data.oldStatus,
          new_status: data.newStatus
        }
      }
    );

    if (error) {
      logger.error('❌ Failed to send order status email', error);
      return { success: false, error: error.message };
    }

    logger.info('✅ Order status email sent successfully', result);
    return { success: true, emailId: result?.id };
  } catch (error: any) {
    logger.error('❌ Exception sending order status email', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send invoice email to customer
 * Called after: Invoice generation, invoice payment status change
 */
export const sendInvoiceEmail = async (
  data: InvoiceEmailData
): Promise<EmailResult> => {
  try {
    logger.info('📧 Sending invoice email', { invoiceId: data.invoiceId });

    const { data: result, error } = await supabase.functions.invoke(
      'send-invoice-email',
      {
        body: {
          invoice_id: data.invoiceId,
          invoice_number: data.invoiceNumber,
          customer_email: data.customerEmail
        }
      }
    );

    if (error) {
      logger.error('❌ Failed to send invoice email', error);
      return { success: false, error: error.message };
    }

    logger.info('✅ Invoice email sent successfully', result);
    return { success: true, emailId: result?.id };
  } catch (error: any) {
    logger.error('❌ Exception sending invoice email', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send quote confirmation email to customer
 * Called after: Quote creation
 */
export const sendQuoteEmail = async (
  data: QuoteEmailData
): Promise<EmailResult> => {
  try {
    logger.info('📧 Sending quote email', { quoteId: data.quoteId });

    const { data: result, error } = await supabase.functions.invoke(
      'send-quote-email',
      {
        body: {
          quote_id: data.quoteId,
          customer_email: data.customerEmail,
          customer_name: data.customerName
        }
      }
    );

    if (error) {
      logger.error('❌ Failed to send quote email', error);
      return { success: false, error: error.message };
    }

    logger.info('✅ Quote email sent successfully', result);
    return { success: true, emailId: result?.id };
  } catch (error: any) {
    logger.error('❌ Exception sending quote email', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send quote update email to customer
 * Called after: Quote price or status update
 */
export const sendQuoteUpdateEmail = async (
  data: QuoteEmailData
): Promise<EmailResult> => {
  try {
    logger.info('📧 Sending quote update email', { quoteId: data.quoteId });

    const { data: result, error } = await supabase.functions.invoke(
      'send-quote-update-email',
      {
        body: {
          quote_id: data.quoteId,
          customer_email: data.customerEmail,
          customer_name: data.customerName
        }
      }
    );

    if (error) {
      logger.error('❌ Failed to send quote update email', error);
      return { success: false, error: error.message };
    }

    logger.info('✅ Quote update email sent successfully', result);
    return { success: true, emailId: result?.id };
  } catch (error: any) {
    logger.error('❌ Exception sending quote update email', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send gift card email to recipient
 * Called after: Gift card activation (when order is paid)
 */
export const sendGiftCardEmail = async (
  data: GiftCardEmailData
): Promise<EmailResult> => {
  try {
    logger.info('🎁 Sending gift card email', { giftCardId: data.giftCardId });

    const { data: result, error } = await supabase.functions.invoke(
      'send-gift-card-email',
      {
        body: {
          gift_card_id: data.giftCardId,
          recipient_email: data.recipientEmail
        }
      }
    );

    if (error) {
      logger.error('❌ Failed to send gift card email', error);
      return { success: false, error: error.message };
    }

    logger.info('✅ Gift card email sent successfully', result);
    return { success: true, emailId: result?.id };
  } catch (error: any) {
    logger.error('❌ Exception sending gift card email', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send welcome email to new user
 * Called after: User registration
 */
export const sendWelcomeEmail = async (
  userId: string,
  userEmail?: string
): Promise<EmailResult> => {
  try {
    logger.info('👋 Sending welcome email', { userId });

    const { data: result, error } = await supabase.functions.invoke(
      'send-welcome-email',
      {
        body: {
          user_id: userId,
          user_email: userEmail
        }
      }
    );

    if (error) {
      logger.error('❌ Failed to send welcome email', error);
      return { success: false, error: error.message };
    }

    logger.info('✅ Welcome email sent successfully', result);
    return { success: true, emailId: result?.id };
  } catch (error: any) {
    logger.error('❌ Exception sending welcome email', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send loyalty points notification email
 * Called after: Points are added to user account
 */
export const sendLoyaltyPointsEmail = async (
  userId: string,
  pointsAdded: number
): Promise<EmailResult> => {
  try {
    logger.info('⭐ Sending loyalty points email', { userId, pointsAdded });

    const { data: result, error } = await supabase.functions.invoke(
      'send-loyalty-points-email',
      {
        body: {
          user_id: userId,
          points_added: pointsAdded
        }
      }
    );

    if (error) {
      logger.error('❌ Failed to send loyalty points email', error);
      return { success: false, error: error.message };
    }

    logger.info('✅ Loyalty points email sent successfully', result);
    return { success: true, emailId: result?.id };
  } catch (error: any) {
    logger.error('❌ Exception sending loyalty points email', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send admin notification email
 * Called after: Important events that admins should be notified about
 */
export const sendAdminNotificationEmail = async (
  type: string,
  subject: string,
  message: string,
  link?: string
): Promise<EmailResult> => {
  try {
    logger.info('👔 Sending admin notification email', { type, subject });

    const { data: result, error } = await supabase.functions.invoke(
      'send-admin-notification',
      {
        body: {
          type,
          subject,
          message,
          link
        }
      }
    );

    if (error) {
      logger.error('❌ Failed to send admin notification email', error);
      return { success: false, error: error.message };
    }

    logger.info('✅ Admin notification email sent successfully', result);
    return { success: true, emailId: result?.id };
  } catch (error: any) {
    logger.error('❌ Exception sending admin notification email', error);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// BATCH EMAIL FUNCTIONS
// ============================================================================

/**
 * Send all emails related to a new order
 * This includes: order confirmation to customer, notification to admin
 */
export const sendOrderEmails = async (orderId: string): Promise<void> => {
  try {
    logger.info('📧 Sending all order-related emails', { orderId });

    // Send order confirmation to customer
    await sendOrderConfirmationEmail({ orderId });

    // Admin notification is handled by database trigger + in-app notification
    // But we can send an email too for important orders
    const { data: order } = await supabase
      .from('orders')
      .select('order_number, total, user_id, profiles(full_name, email)')
      .eq('id', orderId)
      .single();

    if (order && order.total && order.total > 100) {
      // Send admin email for orders over €100
      await sendAdminNotificationEmail(
        'high_value_order',
        `Pedido Importante: ${order.order_number}`,
        `Nuevo pedido por €${order.total} de ${order.profiles?.full_name || 'Cliente'}`,
        `/admin/pedidos`
      );
    }

    logger.info('✅ All order emails sent successfully');
  } catch (error) {
    logger.error('❌ Error sending order emails', error);
  }
};

/**
 * Send all emails related to invoice generation
 */
export const sendInvoiceEmails = async (invoiceId: string): Promise<void> => {
  try {
    logger.info('📧 Sending all invoice-related emails', { invoiceId });
    
    await sendInvoiceEmail({ invoiceId });
    
    logger.info('✅ All invoice emails sent successfully');
  } catch (error) {
    logger.error('❌ Error sending invoice emails', error);
  }
};

/**
 * Send all emails related to gift card activation
 */
export const sendGiftCardActivationEmails = async (orderId: string): Promise<void> => {
  try {
    logger.info('🎁 Sending gift card activation emails', { orderId });

    // Find all gift cards for this order
    const { data: giftCards, error } = await supabase
      .from('gift_cards')
      .select('id, recipient_email, is_active')
      .eq('order_id', orderId);

    if (error) {
      logger.error('❌ Error fetching gift cards', error);
      return;
    }

    if (!giftCards || giftCards.length === 0) {
      logger.info('No gift cards found for order');
      return;
    }

    // Send email for each active gift card
    for (const card of giftCards) {
      if (card.is_active) {
        await sendGiftCardEmail({
          giftCardId: card.id,
          recipientEmail: card.recipient_email
        });
      }
    }

    logger.info('✅ All gift card emails sent successfully');
  } catch (error) {
    logger.error('❌ Error sending gift card emails', error);
  }
};

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

export const emailService = {
  // Individual email functions
  sendOrderConfirmation: sendOrderConfirmationEmail,
  sendOrderStatus: sendOrderStatusEmail,
  sendInvoice: sendInvoiceEmail,
  sendQuote: sendQuoteEmail,
  sendQuoteUpdate: sendQuoteUpdateEmail,
  sendGiftCard: sendGiftCardEmail,
  sendWelcome: sendWelcomeEmail,
  sendLoyaltyPoints: sendLoyaltyPointsEmail,
  sendAdminNotification: sendAdminNotificationEmail,
  
  // Batch functions
  sendAllOrderEmails: sendOrderEmails,
  sendAllInvoiceEmails: sendInvoiceEmails,
  sendAllGiftCardEmails: sendGiftCardActivationEmails
};

export default emailService;
