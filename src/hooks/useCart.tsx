import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
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
}

const CART_STORAGE_KEY = 'cart';
const SESSION_ID_KEY = 'cart_session_id';

// Generate or retrieve session ID for anonymous users
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
};

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Sync cart with database when user logs in
  useEffect(() => {
    if (userId) {
      syncCartToDatabase();
    }
  }, [userId]);

  const syncCartToDatabase = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      // First, load cart from localStorage
      const localCart = localStorage.getItem(CART_STORAGE_KEY);
      const localItems: CartItem[] = localCart ? JSON.parse(localCart) : [];

      // Load cart from database
      const { data: dbCartItems, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      // Merge local cart with database cart
      const mergedCart: CartItem[] = [];
      const dbItemsMap = new Map(dbCartItems?.map(item => [item.product_id, item]) || []);

      // Add items from local storage
      for (const localItem of localItems) {
        const dbItem = dbItemsMap.get(localItem.productId);
        
        if (dbItem) {
          // Item exists in both - keep higher quantity
          mergedCart.push({
            ...localItem,
            quantity: Math.max(localItem.quantity, dbItem.quantity)
          });
          dbItemsMap.delete(localItem.productId);
        } else {
          // Item only in local storage
          mergedCart.push(localItem);
          
          // Save to database
          await supabase.from('cart_items').insert({
            user_id: userId,
            product_id: localItem.productId,
            quantity: localItem.quantity,
            selected_color: localItem.colorId,
            selected_material: localItem.materialId,
            custom_text: localItem.customText,
            customization_selections: localItem.colorSelections ? JSON.parse(JSON.stringify(localItem.colorSelections)) : null
          });
        }
      }

      // Add remaining items from database
      for (const [_, dbItem] of dbItemsMap) {
        // Fetch product details
        const { data: product } = await supabase
          .from('products')
          .select('name, price, tax_enabled')
          .eq('id', dbItem.product_id)
          .single();

        if (product) {
          mergedCart.push({
            id: dbItem.id,
            productId: dbItem.product_id,
            name: product.name,
            price: Number(product.price),
            quantity: dbItem.quantity,
            materialId: dbItem.selected_material,
            colorId: dbItem.selected_color,
            customText: dbItem.custom_text || undefined,
            tax_enabled: product.tax_enabled,
            colorSelections: dbItem.customization_selections as ColorSelection[] || undefined
          });
        }
      }

      // Update state and localStorage
      setCartItems(mergedCart);
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(mergedCart));
      
      logger.info('Cart synced with database', { itemCount: mergedCart.length });
    } catch (error) {
      logger.error('Error syncing cart to database:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      
      if (userId) {
        // User is authenticated - load from database
        await syncCartToDatabase();
      } else {
        // User is not authenticated - load from localStorage
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          setCartItems(Array.isArray(parsed) ? parsed : []);
        }
      }
    } catch (error) {
      logger.error('Error loading cart:', error);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId, syncCartToDatabase]);

  // Load cart from localStorage on mount
  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const saveCart = useCallback(async (items: CartItem[]) => {
    try {
      // Always save to localStorage
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      setCartItems(items);

      // If user is authenticated, also save to database
      if (userId) {
        // Delete all existing cart items for user
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', userId);

        // Insert new cart items
        if (items.length > 0) {
          const dbItems = items.map(item => ({
            user_id: userId,
            product_id: item.productId,
            quantity: item.quantity,
            selected_color: item.colorId,
            selected_material: item.materialId,
            custom_text: item.customText,
            customization_selections: item.colorSelections ? JSON.parse(JSON.stringify(item.colorSelections)) : null
          }));

          await supabase.from('cart_items').insert(dbItems);
        }
      }
    } catch (error) {
      logger.error('Error saving cart:', error);
      toast.error('Error al guardar el carrito');
    }
  }, [userId]);

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
        toast.success('Cantidad actualizada en el carrito');
      } else {
        newCart = [...cartItems, { ...item, id: `${item.productId}-${Date.now()}` }];
        toast.success('Producto añadido al carrito');
      }

      saveCart(newCart);
    } catch (error) {
      logger.error('Error adding item to cart:', error);
      toast.error('Error al añadir producto');
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
    toast.success('Producto eliminado del carrito');
  }, [cartItems, saveCart]);

  const clearCart = useCallback(async () => {
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      setCartItems([]);

      // If user is authenticated, also clear from database
      if (userId) {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', userId);
      }

      toast.success('Carrito vaciado');
    } catch (error) {
      logger.error('Error clearing cart:', error);
      toast.error('Error al vaciar el carrito');
    }
  }, [userId]);

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
