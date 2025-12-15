import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface StockReservationResult {
  success: boolean;
  error?: string;
  available?: number;
  reservation_id?: string;
  expires_at?: string;
  unlimited?: boolean;
}

export function useStockReservation() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation(['products', 'cart']);

  // Obtener stock disponible para un producto
  const getAvailableStock = useCallback(async (productId: string): Promise<number | null> => {
    const { data, error } = await supabase.rpc('get_available_stock', {
      p_product_id: productId
    });
    
    if (error) {
      console.error('Error getting available stock:', error);
      return null;
    }
    
    return data;
  }, []);

  // Crear reserva de stock al añadir al carrito
  const createReservation = useCallback(async (
    productId: string,
    quantity: number,
    sessionId?: string
  ): Promise<StockReservationResult> => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc('create_stock_reservation', {
        p_product_id: productId,
        p_quantity: quantity,
        p_user_id: user?.id || null,
        p_session_id: sessionId || null
      });
      
      if (error) {
        console.error('Error creating reservation:', error);
        return { success: false, error: error.message };
      }
      
      const result = data as unknown as StockReservationResult;
      
      if (!result.success && result.error === 'insufficient_stock') {
        toast({
          title: t('products:stock.insufficientTitle'),
          description: t('products:stock.insufficientDescription', { available: result.available }),
          variant: 'destructive'
        });
      }
      
      return result;
    } catch (err) {
      console.error('Error in createReservation:', err);
      return { success: false, error: 'Unknown error' };
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  // Completar reserva al pagar
  const completeReservation = useCallback(async (
    productId: string,
    sessionId?: string
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc('complete_stock_reservation', {
        p_product_id: productId,
        p_user_id: user?.id || null,
        p_session_id: sessionId || null
      });
      
      if (error) {
        console.error('Error completing reservation:', error);
        return false;
      }
      
      return data === true;
    } catch (err) {
      console.error('Error in completeReservation:', err);
      return false;
    }
  }, []);

  // Cancelar reserva
  const cancelReservation = useCallback(async (
    productId: string,
    sessionId?: string
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.rpc('cancel_stock_reservation', {
        p_product_id: productId,
        p_user_id: user?.id || null,
        p_session_id: sessionId || null
      });
      
      if (error) {
        console.error('Error cancelling reservation:', error);
        return false;
      }
      
      return data === true;
    } catch (err) {
      console.error('Error in cancelReservation:', err);
      return false;
    }
  }, []);

  // Unirse a lista de espera
  const joinWaitlist = useCallback(async (
    productId: string,
    quantity: number = 1
  ): Promise<boolean> => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: t('cart:loginRequired'),
          variant: 'destructive'
        });
        return false;
      }
      
      const { data, error } = await supabase.rpc('join_stock_waitlist', {
        p_product_id: productId,
        p_user_id: user.id,
        p_email: user.email || '',
        p_quantity: quantity
      });
      
      if (error) {
        console.error('Error joining waitlist:', error);
        toast({
          title: t('products:stock.waitlistError'),
          variant: 'destructive'
        });
        return false;
      }
      
      const result = data as { success: boolean };
      
      if (result.success) {
        toast({
          title: t('products:stock.waitlistSuccess'),
          description: t('products:stock.waitlistDescription')
        });
      }
      
      return result.success;
    } catch (err) {
      console.error('Error in joinWaitlist:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  // Verificar si usuario está en lista de espera
  const isInWaitlist = useCallback(async (productId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return false;
      
      const { data, error } = await supabase
        .from('stock_waitlist')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .eq('status', 'waiting')
        .maybeSingle();
      
      if (error) {
        console.error('Error checking waitlist:', error);
        return false;
      }
      
      return !!data;
    } catch (err) {
      console.error('Error in isInWaitlist:', err);
      return false;
    }
  }, []);

  // Salir de lista de espera
  const leaveWaitlist = useCallback(async (productId: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return false;
      
      const { error } = await supabase
        .from('stock_waitlist')
        .delete()
        .eq('product_id', productId)
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error leaving waitlist:', error);
        return false;
      }
      
      toast({
        title: t('products:stock.leftWaitlist')
      });
      
      return true;
    } catch (err) {
      console.error('Error in leaveWaitlist:', err);
      return false;
    }
  }, [toast, t]);

  return {
    loading,
    getAvailableStock,
    createReservation,
    completeReservation,
    cancelReservation,
    joinWaitlist,
    isInWaitlist,
    leaveWaitlist
  };
}
