import { useState, useEffect, useCallback } from 'react';
import { i18nToast } from '@/lib/i18nToast';
import { logger } from '@/lib/logger';

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
}

const CART_STORAGE_KEY = 'cart';

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

  const addItem = useCallback((item: CartItem) => {
    setLoading(true);
    try {
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
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
        i18nToast.success("success.quantityUpdated");
      } else {
        newCart = [...cartItems, { ...item, id: `${item.productId}-${Date.now()}` }];
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

  const removeItem = useCallback((id: string) => {
    const newCart = cartItems.filter(item => item.id !== id);
    saveCart(newCart);
    i18nToast.success("success.removedFromCart");
  }, [cartItems, saveCart]);

  const clearCart = useCallback(() => {
    localStorage.removeItem(CART_STORAGE_KEY);
    setCartItems([]);
    i18nToast.success("success.cartCleared");
  }, []);

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
