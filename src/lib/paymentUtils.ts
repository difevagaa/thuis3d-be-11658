import { supabase } from "@/integrations/supabase/client";
import { CartItem } from "@/hooks/useCart";
import { logger } from "@/lib/logger";
import { triggerNotificationRefresh } from "@/lib/notificationUtils";

/**
 * Interface for shipping info stored in checkout sessions
 */
export interface ShippingInfoWithOrderNumber {
  orderNumber?: string;
  [key: string]: any;
}

/**
 * Generates a unique order number in the same format as the database function
 * Format: Letter-Number-Letter-Number-Letter-Number (e.g., X4H8S9, A1B2C3)
 * This ensures order numbers are consistent throughout the payment flow
 * 
 * Note: This mirrors the database function generate_order_number() defined in
 * supabase/migrations/20251204000000_fix_order_invoice_number_format.sql
 * Any changes to the format should be synchronized between both implementations.
 */
export const generateOrderNumber = (): string => {
  const letter1 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const letter2 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const letter3 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  
  const num1 = Math.floor(Math.random() * 10);
  const num2 = Math.floor(Math.random() * 10);
  const num3 = Math.floor(Math.random() * 10);
  
  return `${letter1}${num1}${letter2}${num2}${letter3}${num3}`;
};

/**
 * Gets or generates a persistent order number for the current checkout session
 * Stores the order number in the checkout session to keep it consistent
 */
export const getOrCreateOrderNumber = async (sessionId: string): Promise<string | null> => {
  try {
    // Get the checkout session
    const { data: session, error } = await supabase
      .from('checkout_sessions')
      .select('shipping_info')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      logger.error('Error loading checkout session:', error);
      return null;
    }

    // Check if order number already exists in session
    const shippingInfo = session.shipping_info as ShippingInfoWithOrderNumber;
    if (shippingInfo?.orderNumber) {
      return shippingInfo.orderNumber;
    }

    // Generate new order number
    const orderNumber = generateOrderNumber();

    // Update session with order number
    const { error: updateError } = await supabase
      .from('checkout_sessions')
      .update({
        shipping_info: {
          ...shippingInfo,
          orderNumber
        }
      })
      .eq('id', sessionId);

    if (updateError) {
      logger.error('Error updating checkout session with order number:', updateError);
      return null;
    }

    return orderNumber;
  } catch (error) {
    logger.error('Error in getOrCreateOrderNumber:', error);
    return null;
  }
};

export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  [key: string]: string | undefined;
}

export interface OrderData {
  userId?: string | null;
  orderNumber?: string | null;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: 'paid' | 'pending' | 'cancelled';
  shippingAddress: Address;
  billingAddress?: Address;
  notes?: string | null;
}

export interface OrderItemData {
  orderId: string;
  productId: string | null; // Allow null for gift cards
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedMaterial?: string | null;
  selectedColor?: string | null;
  customText?: string | null;
  customizationSelections?: any[];
}

/**
 * Creates an order in the database
 * Returns the created order or null if error
 */
export const createOrder = async (orderData: OrderData) => {
  try {
    const insertData: any = {
      user_id: orderData.userId || null,
      subtotal: orderData.subtotal,
      tax: orderData.tax,
      shipping: orderData.shipping,
      discount: orderData.discount,
      total: orderData.total,
      payment_method: orderData.paymentMethod,
      payment_status: orderData.paymentStatus,
      shipping_address: JSON.stringify(orderData.shippingAddress),
      billing_address: orderData.billingAddress ? JSON.stringify(orderData.billingAddress) : JSON.stringify(orderData.shippingAddress),
      notes: orderData.notes || null
    };

    // If order number is provided, use it instead of auto-generated one
    if (orderData.orderNumber) {
      insertData.order_number = orderData.orderNumber;
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(insertData)
      .select()
      .single();

    if (orderError) throw orderError;
    return order;
  } catch (error) {
    logger.error("Error creating order:", error);
    return null;
  }
};

/**
 * Creates order items in bulk
 * Returns inserted items array or empty array on error
 */
export const createOrderItems = async (items: OrderItemData[]) => {
  try {
    if (items.length === 0) {
      logger.error("No items to insert");
      return [];
    }

    const { data: insertedItems, error } = await supabase
      .from("order_items")
      .insert(
        items.map(item => ({
          order_id: item.orderId,
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          selected_material: item.selectedMaterial || null,
          selected_color: item.selectedColor || null,
          custom_text: item.customText || null,
          customization_selections: item.customizationSelections || null
        }))
      )
      .select();

    if (error) throw error;
    return insertedItems || [];
  } catch (error) {
    logger.error("Error creating order items:", error);
    return [];
  }
};

/**
 * Updates gift card balance after use with optimistic locking
 * Returns true if successful, false if balance was already modified (race condition)
 */
export const updateGiftCardBalance = async (
  giftCardId: string,
  newBalance: number,
  expectedCurrentBalance?: number
) => {
  try {
    let query = supabase
      .from("gift_cards")
      .update({ 
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      }, { count: 'exact' })
      .eq("id", giftCardId);

    // Add optimistic locking if expected balance provided
    if (expectedCurrentBalance !== undefined) {
      query = query.eq("current_balance", expectedCurrentBalance);
    }

    const { error, count } = await query;

    if (error) throw error;
    
    // If optimistic locking was used and no rows updated, balance changed
    if (expectedCurrentBalance !== undefined && count === 0) {
      logger.warn("Gift card balance changed by another transaction");
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Error updating gift card balance:", error);
    return false;
  }
};

/**
 * Converts cart items to order items format
 * Consolidates items with same product, material, color, and customizations
 */
export const convertCartToOrderItems = (
  cartItems: CartItem[],
  orderId: string
): OrderItemData[] => {
  // Create a map to consolidate duplicate items
  const itemsMap = new Map<string, OrderItemData>();

  cartItems.forEach(item => {
    // For special items (gift cards), product_id can be null
    const productId = item.isGiftCard ? null : (item.productId || item.id || null);
    
    // Create a unique key based on product, material, color, and customizations
    const customizationsKey = JSON.stringify(item.colorSelections || []);
    const uniqueKey = `${productId}-${item.materialId}-${item.colorId}-${customizationsKey}`;
    
    const existingItem = itemsMap.get(uniqueKey);
    
    if (existingItem) {
      // Item already exists, increment quantity
      existingItem.quantity += item.quantity;
      existingItem.totalPrice = existingItem.unitPrice * existingItem.quantity;
    } else {
      // New item, add to map
      itemsMap.set(uniqueKey, {
        orderId,
        productId: productId || null, // Use null explicitly for gift cards, not empty string
        productName: item.name,
        quantity: item.quantity,
        unitPrice: Number(item.price) || 0, // Ensure number type
        totalPrice: (Number(item.price) || 0) * item.quantity,
        selectedMaterial: item.materialId || null,
        selectedColor: item.colorId || null,
        customText: item.customText || null,
        customizationSelections: item.colorSelections || null
      });
    }
  });

  return Array.from(itemsMap.values());
};

/**
 * Calculates order totals considering tax, discounts, and shipping.
 * Coupon discount is applied proportionally to the taxable amount before calculating tax.
 * Fixed coupon discounts are capped at the subtotal to prevent negative intermediates.
 * All calculations use proper number coercion to prevent string concatenation issues.
 */
export const calculateOrderTotals = (
  cartItems: CartItem[],
  taxRate: number = 0.21,
  giftCardDiscount: number = 0,
  couponDiscount: number = 0,
  shippingCost: number = 0
) => {
  // Ensure all inputs are numbers and calculate subtotal
  const subtotal = Number(cartItems.reduce(
    (sum, item) => sum + (Number(item.price) * Number(item.quantity)),
    0
  ).toFixed(2));

  // Cap coupon discount at subtotal to avoid negative intermediates
  const cappedCouponDiscount = Math.min(Number(couponDiscount), subtotal);
  const discount = Number((Number(giftCardDiscount) + cappedCouponDiscount).toFixed(2));

  // Calculate taxable amount (excluding gift cards and non-taxable items)
  const taxableAmount = Number(cartItems
    .filter(item => !item.isGiftCard && (item.tax_enabled ?? true))
    .reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0).toFixed(2));

  // Apply coupon discount proportionally to the taxable amount before calculating tax
  const discountRatio = subtotal > 0 ? taxableAmount / subtotal : 0;
  const taxableAfterDiscount = Math.max(0, taxableAmount - (cappedCouponDiscount * discountRatio));
  const tax = Number((taxableAfterDiscount * Number(taxRate)).toFixed(2));

  const shipping = Number(Number(shippingCost).toFixed(2));
  const total = Math.max(0, subtotal + tax + shipping - discount);

  return {
    subtotal,
    tax,
    shipping,
    discount,
    total: Number(total.toFixed(2))
  };
};

/**
 * Generates order notes including gift card and coupon info
 */
export const generateOrderNotes = (
  cartItems: CartItem[],
  giftCardData?: { code: string; current_balance?: number } | null,
  giftCardDiscount?: number
): string | null => {
  const notes: string[] = [];

  // Add gift card note
  if (giftCardData && giftCardDiscount) {
    notes.push(
      `Tarjeta de regalo aplicada: ${giftCardData.code} (-€${giftCardDiscount.toFixed(2)})`
    );
  }

  // Add gift card purchase note
  const giftCardItem = cartItems.find(item => item.isGiftCard);
  if (giftCardItem) {
    notes.push(
      `Tarjeta Regalo: ${giftCardItem.giftCardCode}\nPara: ${giftCardItem.giftCardRecipient}\nDe: ${giftCardItem.giftCardSender}${giftCardItem.giftCardMessage ? '\nMensaje: ' + giftCardItem.giftCardMessage : ''}`
    );
  }

  return notes.length > 0 ? notes.join('\n\n') : null;
};

/**
 * Sends in-app notification to gift card recipient
 * @param recipientEmail - The email of the gift card recipient
 * @param giftCardData - Gift card data including amount and sender name
 */
export const sendGiftCardActivationNotification = async (
  recipientEmail: string,
  giftCardData: { initial_amount: number; sender_name?: string }
): Promise<void> => {
  try {
    const { data: recipientProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', recipientEmail)
      .single();
    
    if (recipientProfile) {
      await supabase.rpc('send_notification', {
        p_user_id: recipientProfile.id,
        p_type: 'gift_card_activated',
        p_title: '🎁 ¡Tu Tarjeta Regalo ha sido activada!',
        p_message: `Has recibido una tarjeta regalo de €${giftCardData.initial_amount} de ${giftCardData.sender_name || 'un amigo'}. ¡Ya puedes usarla en tus compras!`,
        p_link: '/mi-cuenta?tab=giftcards'
      });
      
      // Trigger a broadcast for immediate notification update
      await triggerNotificationRefresh(recipientProfile.id);
      
      logger.log('In-app notification sent to recipient:', recipientProfile.id);
    }
  } catch (error) {
    logger.error('Error sending gift card activation notification:', error);
  }
};

/**
 * Updates invoice status to paid when associated order is paid
 * @param orderId - The order ID
 */
export const updateInvoiceStatusOnOrderPaid = async (orderId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from("invoices")
      .update({ payment_status: 'paid' })
      .eq("order_id", orderId);
    
    if (error) {
      logger.error('Error updating invoice status:', error);
    } else {
      logger.log('Invoice status updated to paid for order:', orderId);
    }
  } catch (error) {
    logger.error('Error updating invoice status:', error);
  }
};

/**
 * Creates an invoice automatically for an order
 * This ensures ALL orders have corresponding invoices for customer payment tracking
 * 
 * @param orderId - The order ID
 * @param orderData - Order details (subtotal, tax, total, payment_status, etc)
 * @returns The created invoice or null if error
 */
export const createInvoiceForOrder = async (
  orderId: string,
  orderData: {
    order_number?: string;
    user_id: string;
    subtotal: number;
    tax: number;
    total: number;
    shipping?: number;
    discount?: number;
    payment_status: string;
    payment_method?: string;
    gift_card_code?: string;
    gift_card_amount?: number;
    coupon_code?: string;
    coupon_discount?: number;
    notes?: string;
  }
): Promise<any> => {
  try {
    logger.log('[CREATE INVOICE] Creating invoice for order:', orderId);

    // Check if invoice already exists for this order
    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("id, invoice_number")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existingInvoice) {
      logger.log('[CREATE INVOICE] Invoice already exists:', existingInvoice.invoice_number);
      return existingInvoice;
    }

    // Generate invoice number (use order number as base or generate new)
    const invoiceNumber = orderData.order_number || generateOrderNumber();

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        order_id: orderId,
        user_id: orderData.user_id,
        issue_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        payment_status: orderData.payment_status || 'pending',
        payment_method: orderData.payment_method || null,
        subtotal: orderData.subtotal,
        tax: orderData.tax || 0,
        total: orderData.total,
        shipping: orderData.shipping || 0,
        discount: orderData.discount || 0,
        gift_card_code: orderData.gift_card_code || null,
        gift_card_amount: orderData.gift_card_amount || 0,
        coupon_code: orderData.coupon_code || null,
        coupon_discount: orderData.coupon_discount || 0,
        notes: orderData.notes || `Factura generada automáticamente para pedido ${orderData.order_number || orderId}`
      })
      .select()
      .single();

    if (invoiceError) {
      logger.error('[CREATE INVOICE] Error creating invoice:', invoiceError);
      return null;
    }

    logger.log('[CREATE INVOICE] Invoice created successfully:', invoice.invoice_number);

    // Send notification to user
    if (orderData.user_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: orderData.user_id,
          type: 'invoice_created',
          title: '📄 Factura Generada',
          message: `Se ha generado la factura ${invoiceNumber} para tu pedido. Total: €${orderData.total.toFixed(2)}`,
          link: `/mi-cuenta?tab=invoices`,
          is_read: false
        });
        await triggerNotificationRefresh(orderData.user_id);
      } catch (notifError) {
        logger.error('[CREATE INVOICE] Error creating notification:', notifError);
        // Don't fail invoice creation for notification errors
      }
    }

    return invoice;
  } catch (error) {
    logger.error('[CREATE INVOICE] Unexpected error:', error);
    return null;
  }
};

/**
 * Unified function to process gift card payment with proper validation and optimistic locking
 * 
 * @param giftCardId - The gift card ID from sessionStorage/state
 * @param giftCardAmount - Amount to deduct from gift card
 * @param context - Context for logging (e.g., 'INVOICE_PAYMENT', 'CART_PAYMENT')
 * @returns Object with success status and optional error details
 */
export const processGiftCardPayment = async (
  giftCardId: string,
  giftCardAmount: number,
  context: string = 'PAYMENT'
): Promise<{
  success: boolean;
  error?: string;
  errorType?: 'INVALID_CARD' | 'INSUFFICIENT_BALANCE' | 'RACE_CONDITION' | 'EXPIRED' | 'DATABASE_ERROR';
  freshBalance?: number;
}> => {
  try {
    logger.log(`[${context}] Processing gift card payment:`, { giftCardId, amount: giftCardAmount });

    // STEP 1: Re-validate gift card from database (FRESH DATA)
    const { data: freshGiftCard, error: fetchError } = await supabase
      .from("gift_cards")
      .select("*")
      .eq("id", giftCardId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (fetchError) {
      logger.error(`[${context}] Error fetching gift card:`, fetchError);
      return {
        success: false,
        error: 'Error de base de datos al validar la tarjeta',
        errorType: 'DATABASE_ERROR'
      };
    }

    if (!freshGiftCard) {
      logger.error(`[${context}] Gift card not found or inactive`);
      return {
        success: false,
        error: 'Tarjeta de regalo no válida o inactiva',
        errorType: 'INVALID_CARD'
      };
    }

    // STEP 2: Check expiration
    if (freshGiftCard.expires_at && new Date(freshGiftCard.expires_at) < new Date()) {
      logger.error(`[${context}] Gift card expired:`, freshGiftCard.expires_at);
      return {
        success: false,
        error: 'La tarjeta de regalo ha expirado',
        errorType: 'EXPIRED'
      };
    }

    // STEP 3: Check sufficient balance
    const currentBalance = Number(freshGiftCard.current_balance);
    if (currentBalance < giftCardAmount) {
      logger.error(`[${context}] Insufficient balance:`, { current: currentBalance, required: giftCardAmount });
      return {
        success: false,
        error: `Saldo insuficiente. Disponible: €${currentBalance.toFixed(2)}, Requerido: €${giftCardAmount.toFixed(2)}`,
        errorType: 'INSUFFICIENT_BALANCE',
        freshBalance: currentBalance
      };
    }

    // STEP 4: Calculate new balance
    const newBalance = Number(Math.max(0, currentBalance - giftCardAmount).toFixed(2));

    // STEP 5: Update with optimistic locking
    const { error: updateError, count } = await supabase
      .from("gift_cards")
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      }, { count: 'exact' })
      .eq("id", freshGiftCard.id)
      .eq("current_balance", currentBalance); // Optimistic lock

    if (updateError) {
      logger.error(`[${context}] Error updating gift card:`, updateError);
      return {
        success: false,
        error: 'Error al actualizar el saldo de la tarjeta',
        errorType: 'DATABASE_ERROR'
      };
    }

    // STEP 6: Check if optimistic locking prevented update
    if (count === 0) {
      logger.error(`[${context}] Optimistic locking failed - balance changed`);
      return {
        success: false,
        error: 'El saldo de la tarjeta ha cambiado. Por favor, vuelve a aplicar la tarjeta',
        errorType: 'RACE_CONDITION'
      };
    }

    logger.log(`[${context}] Gift card balance updated successfully:`, { oldBalance: currentBalance, newBalance });

    return {
      success: true,
      freshBalance: newBalance
    };
  } catch (error) {
    logger.error(`[${context}] Unexpected error processing gift card:`, error);
    return {
      success: false,
      error: 'Error inesperado al procesar la tarjeta de regalo',
      errorType: 'DATABASE_ERROR'
    };
  }
};

/**
 * Rolls back a gift card payment transaction
 * Reverts the balance deduction made by processGiftCardPayment
 * 
 * @param giftCardId - UUID of the gift card
 * @param amountToRestore - Amount to restore to the gift card balance
 * @param context - Context string for logging purposes
 * @returns Promise<boolean> - true if rollback successful, false otherwise
 */
export const rollbackGiftCardPayment = async (
  giftCardId: string,
  amountToRestore: number,
  context: string = 'ROLLBACK'
): Promise<boolean> => {
  try {
    logger.warn(`[${context}] Rolling back gift card payment: ${giftCardId}, restoring €${amountToRestore.toFixed(2)}`);
    
    // Fetch current balance with locking
    const { data: freshGiftCard, error: fetchError } = await supabase
      .from('gift_cards')
      .select('id, current_balance, initial_balance, is_active, expiry_date, deleted_at')
      .eq('id', giftCardId)
      .single();

    if (fetchError || !freshGiftCard) {
      logger.error(`[${context}] Gift card not found for rollback:`, fetchError);
      return false;
    }

    // Calculate new balance (current + amount to restore)
    const newBalance = Number(Math.min(
      freshGiftCard.initial_balance,
      freshGiftCard.current_balance + amountToRestore
    ).toFixed(2));

    // Update with optimistic locking
    const { error: updateError } = await supabase
      .from('gift_cards')
      .update({ current_balance: newBalance })
      .eq('id', giftCardId)
      .eq('current_balance', freshGiftCard.current_balance); // Optimistic lock

    if (updateError) {
      logger.error(`[${context}] Failed to rollback gift card:`, updateError);
      return false;
    }

    logger.log(`[${context}] Gift card rollback successful: ${giftCardId}, new balance: €${newBalance.toFixed(2)}`);
    return true;
  } catch (error) {
    logger.error(`[${context}] Unexpected error during gift card rollback:`, error);
    return false;
  }
};

/**
 * Rolls back a complete order transaction including:
 * - Deletes order items
 * - Deletes the order itself
 * - Optionally restores gift card balance
 * 
 * This ensures no orphaned records remain in the database
 * 
 * @param orderId - UUID of the order to rollback
 * @param giftCardInfo - Optional gift card info to rollback {id: string, amount: number}
 * @param context - Context string for logging purposes
 * @returns Promise<boolean> - true if rollback successful, false otherwise
 */
export const rollbackOrderTransaction = async (
  orderId: string,
  giftCardInfo?: { id: string; amount: number },
  context: string = 'ROLLBACK'
): Promise<boolean> => {
  try {
    logger.warn(`[${context}] Rolling back order transaction: ${orderId}`);
    
    let rollbackSuccess = true;

    // Step 1: Delete order items first (foreign key constraint)
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (itemsError) {
      logger.error(`[${context}] Failed to delete order items:`, itemsError);
      rollbackSuccess = false;
    } else {
      logger.log(`[${context}] Order items deleted successfully`);
    }

    // Step 2: Delete the order
    const { error: orderError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (orderError) {
      logger.error(`[${context}] Failed to delete order:`, orderError);
      rollbackSuccess = false;
    } else {
      logger.log(`[${context}] Order deleted successfully`);
    }

    // Step 3: Rollback gift card if applicable
    if (giftCardInfo && giftCardInfo.amount > 0) {
      const giftCardRollback = await rollbackGiftCardPayment(
        giftCardInfo.id,
        giftCardInfo.amount,
        context
      );
      if (!giftCardRollback) {
        logger.error(`[${context}] Failed to rollback gift card payment`);
        rollbackSuccess = false;
      }
    }

    if (rollbackSuccess) {
      logger.log(`[${context}] Complete order rollback successful`);
    } else {
      logger.error(`[${context}] Order rollback completed with errors`);
    }

    return rollbackSuccess;
  } catch (error) {
    logger.error(`[${context}] Unexpected error during order rollback:`, error);
    return false;
  }
};

/**
 * Interface for payment validation results
 */
export interface PaymentValidationResult {
  valid: boolean;
  error?: string;
  errorKey?: string;
}

/**
 * Validates common payment prerequisites:
 * - User is authenticated
 * - Cart has items
 * - Shipping info is valid
 * - Numeric values are valid (no NaN, no negatives)
 * 
 * This consolidates duplicate validation logic across payment methods
 * 
 * @param user - Authenticated user object
 * @param cartItems - Array of cart items
 * @param shippingInfo - Shipping information object
 * @param financials - Object containing subtotal, tax, shipping, discount
 * @returns PaymentValidationResult with validation status and error details
 */
export const validatePaymentPrerequisites = (
  user: any,
  cartItems: any[],
  shippingInfo: any,
  financials: { subtotal: number; tax: number; shipping: number; discount: number }
): PaymentValidationResult => {
  // Validate user authentication
  if (!user || !user.id) {
    return {
      valid: false,
      error: 'User authentication required',
      errorKey: 'payment:messages.loginRequired'
    };
  }

  // Validate cart is not empty
  if (!cartItems || cartItems.length === 0) {
    return {
      valid: false,
      error: 'Cart is empty',
      errorKey: 'cart:messages.cartEmpty'
    };
  }

  // Validate shipping info structure
  if (!shippingInfo || !shippingInfo.address || !shippingInfo.city || !shippingInfo.postal_code) {
    return {
      valid: false,
      error: 'Invalid shipping information',
      errorKey: 'payment:messages.invalidShippingInfo'
    };
  }

  // Validate numeric values are not NaN
  if (
    isNaN(financials.subtotal) ||
    isNaN(financials.tax) ||
    isNaN(financials.shipping) ||
    isNaN(financials.discount)
  ) {
    return {
      valid: false,
      error: 'Invalid numeric values in calculation',
      errorKey: 'payment:messages.calculationError'
    };
  }

  // Validate numeric values are not negative
  if (financials.subtotal < 0 || financials.tax < 0 || financials.shipping < 0) {
    return {
      valid: false,
      error: 'Negative values detected',
      errorKey: 'payment:messages.invalidPrices'
    };
  }

  return { valid: true };
};
