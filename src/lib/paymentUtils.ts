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
  productId: string;
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
        productId: productId || '', // Safely handle null - empty string for gift cards
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
