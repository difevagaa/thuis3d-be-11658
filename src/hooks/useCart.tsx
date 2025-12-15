import { useState, useEffect, useCallback } from 'react';
import { i18nToast } from '@/lib/i18nToast';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';

export interface ColorSelection {
  section_id: string;
  section_name: string;
  selection_type: 'color' | 'image';
  // Para selecciones de color
  color_id?: string;
  color_name?: string;
  color_hex?: string;
  // Para selecciones de imagen
  image_id?: string;
  image_name?: string;
  image_url?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  materialId?: string | null;
  materialName?: string | null;
  colorId?: string | null;
  colorName?: string | null;
  customText?: string;
  isGiftCard?: boolean;
  tax_enabled?: boolean;
  giftCardCode?: string;
  giftCardRecipient?: string;
  giftCardSender?: string;
  giftCardMessage?: string;
  // Para productos con personalización por secciones
  colorSelections?: ColorSelection[];
  // Para reservas de stock
  reservationId?: string;
  reservationExpiresAt?: string;
}

const CART_STORAGE_KEY = 'cart';
const SESSION_ID_KEY = 'cart_session_id';

// Generar o recuperar ID de sesión para reservas
const getSessionId = (): string => {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
};

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCart = useCallback(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        setCartItems(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      logger.error('Error loading cart:', error);
      setCartItems([]);
    }
  }, []);

  // Load cart from localStorage on mount
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const saveCart = useCallback((items: CartItem[]) => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      setCartItems(items);
    } catch (error) {
      logger.error('Error saving cart:', error);
      i18nToast.error("error.savingFailed");
    }
  }, []);

  const addItem = useCallback(async (item: CartItem) => {
    setLoading(true);
    try {
      // Intentar crear reserva de stock
      const sessionId = getSessionId();
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: reservationResult, error: reservationError } = await supabase.rpc('create_stock_reservation', {
        p_product_id: item.productId,
        p_quantity: item.quantity,
        p_user_id: user?.id || null,
        p_session_id: sessionId
      });
      
      if (reservationError) {
        logger.error('Error creating stock reservation:', reservationError);
      }
      
      const result = reservationResult as unknown as { 
        success: boolean; 
        error?: string; 
        available?: number;
        reservation_id?: string;
        expires_at?: string;
        unlimited?: boolean;
      } | null;
      
      // Si no hay stock suficiente, mostrar error
      if (result && !result.success && result.error === 'insufficient_stock') {
        i18nToast.error("products:stock.insufficientTitle");
        setLoading(false);
        return;
      }
      
      // Añadir info de reserva al item si aplica
      const itemWithReservation = {
        ...item,
        reservationId: result?.reservation_id,
        reservationExpiresAt: result?.expires_at
      };
      
      // Comparar también colorSelections para productos con personalización por secciones
      const existingItemIndex = cartItems.findIndex(i => {
        const sameProduct = i.productId === item.productId;
        const sameMaterial = i.materialId === item.materialId;
        const sameColor = i.colorId === item.colorId;
        
        // Si tiene colorSelections, comparar también esas
        if (item.colorSelections && item.colorSelections.length > 0) {
          const sameSelections = JSON.stringify(i.colorSelections) === JSON.stringify(item.colorSelections);
          return sameProduct && sameMaterial && sameSelections;
        }
        
        return sameProduct && sameMaterial && sameColor;
      });

      let newCart: CartItem[];
      if (existingItemIndex >= 0) {
        newCart = cartItems.map((i, index) =>
          index === existingItemIndex
            ? { ...i, quantity: i.quantity + item.quantity, ...itemWithReservation }
            : i
        );
        i18nToast.success("success.quantityUpdated");
      } else {
        newCart = [...cartItems, { ...itemWithReservation, id: `${item.productId}-${Date.now()}` }];
        i18nToast.success("success.addedToCart");
      }

      saveCart(newCart);
    } catch (error) {
      logger.error('Error adding item to cart:', error);
      i18nToast.error("error.general");
    } finally {
      setLoading(false);
    }
  }, [cartItems, saveCart]);

  const updateQuantity = useCallback((id: string, delta: number) => {
    const newCart = cartItems.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    saveCart(newCart);
  }, [cartItems, saveCart]);

  const removeItem = useCallback(async (id: string) => {
    // Cancelar reserva de stock
    const itemToRemove = cartItems.find(item => item.id === id);
    if (itemToRemove) {
      try {
        const sessionId = getSessionId();
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase.rpc('cancel_stock_reservation', {
          p_product_id: itemToRemove.productId,
          p_user_id: user?.id || null,
          p_session_id: sessionId
        });
      } catch (error) {
        logger.error('Error cancelling stock reservation:', error);
      }
    }
    
    const newCart = cartItems.filter(item => item.id !== id);
    saveCart(newCart);
    i18nToast.success("success.removedFromCart");
  }, [cartItems, saveCart]);

  const clearCart = useCallback(async () => {
    // Cancelar todas las reservas de stock
    const sessionId = getSessionId();
    const { data: { user } } = await supabase.auth.getUser();
    
    for (const item of cartItems) {
      try {
        await supabase.rpc('cancel_stock_reservation', {
          p_product_id: item.productId,
          p_user_id: user?.id || null,
          p_session_id: sessionId
        });
      } catch (error) {
        logger.error('Error cancelling stock reservation:', error);
      }
    }
    
    localStorage.removeItem(CART_STORAGE_KEY);
    setCartItems([]);
    i18nToast.success("success.cartCleared");
  }, [cartItems]);

  const calculateSubtotal = useCallback(() => {
    return cartItems.reduce((sum, item) => {
      const itemPrice = Number(item.price) || 0;
      const itemQuantity = Number(item.quantity) || 1;
      return sum + (itemPrice * itemQuantity);
    }, 0);
  }, [cartItems]);

  const calculateTax = useCallback((taxRate: number = 0.21) => {
    const taxableAmount = cartItems
      .filter(item => !item.isGiftCard && (item.tax_enabled ?? true))
      .reduce((sum, item) => {
        const itemPrice = Number(item.price) || 0;
        const itemQuantity = Number(item.quantity) || 1;
        return sum + (itemPrice * itemQuantity);
      }, 0);
    return Number((taxableAmount * taxRate).toFixed(2));
  }, [cartItems]);

  const calculateTotal = useCallback((taxRate: number = 0.21) => {
    return Number((calculateSubtotal() + calculateTax(taxRate)).toFixed(2));
  }, [calculateSubtotal, calculateTax]);

  const hasOnlyGiftCards = useCallback(() => {
    return cartItems.length > 0 && cartItems.every(item => item.isGiftCard);
  }, [cartItems]);

  const hasGiftCards = useCallback(() => {
    return cartItems.some(item => item.isGiftCard);
  }, [cartItems]);

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cartItems,
    loading,
    itemCount,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    loadCart,
    calculateSubtotal,
    calculateTax,
    calculateTotal,
    hasOnlyGiftCards,
    hasGiftCards
  };
};
