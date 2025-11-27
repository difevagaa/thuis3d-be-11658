import { supabase } from "@/integrations/supabase/client";
import { CartItem } from "@/hooks/useCart";
import { logger } from "@/lib/logger";

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
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
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
      })
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
 * Updates gift card balance after use
 */
export const updateGiftCardBalance = async (
  giftCardId: string,
  newBalance: number
) => {
  try {
    const { error } = await supabase
      .from("gift_cards")
      .update({ current_balance: newBalance })
      .eq("id", giftCardId);

    if (error) throw error;
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
        productId: productId as string,
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
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
 * Calculates order totals considering tax and discounts
 */
export const calculateOrderTotals = (
  cartItems: CartItem[],
  taxRate: number = 0.21,
  giftCardDiscount: number = 0,
  couponDiscount: number = 0
) => {
  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0
  );

  const taxableAmount = cartItems
    .filter(item => !item.isGiftCard && (item.tax_enabled ?? true))
    .reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const tax = Number((taxableAmount * taxRate).toFixed(2));
  const shipping = 0; // Always 0 as per business logic
  const discount = giftCardDiscount + couponDiscount;
  const total = Math.max(0, subtotal + tax + shipping - discount);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax,
    shipping,
    discount: Number(discount.toFixed(2)),
    total: Number(total.toFixed(2))
  };
};

/**
 * Generates order notes including gift card and coupon info
 */
export const generateOrderNotes = (
  cartItems: CartItem[],
  appliedGiftCard?: { code: string; amount?: number },
  appliedCoupon?: { code: string; discount_type: string; discount_value: number }
): string | null => {
  const notes: string[] = [];

  // Add gift card note
  if (appliedGiftCard) {
    notes.push(
      `Tarjeta de regalo aplicada: ${appliedGiftCard.code} (-€${appliedGiftCard.amount?.toFixed(2) || '0.00'})`
    );
  }

  // Add coupon note
  if (appliedCoupon) {
    notes.push(
      `Cupón aplicado: ${appliedCoupon.code} (-${appliedCoupon.discount_type === 'percentage' ? appliedCoupon.discount_value + '%' : '€' + appliedCoupon.discount_value})`
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
