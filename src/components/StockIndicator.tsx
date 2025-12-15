import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useStockReservation } from '@/hooks/useStockReservation';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface StockIndicatorProps {
  productId: string;
  trackStock?: boolean;
  stockQuantity?: number | null;
  quantity?: number;
  showWaitlistButton?: boolean;
  className?: string;
  compact?: boolean;
}

export function StockIndicator({
  productId,
  trackStock = false,
  stockQuantity,
  quantity = 1,
  showWaitlistButton = true,
  className,
  compact = false
}: StockIndicatorProps) {
  const { t } = useTranslation(['products']);
  const { getAvailableStock, joinWaitlist, isInWaitlist, leaveWaitlist, loading } = useStockReservation();
  const [availableStock, setAvailableStock] = useState<number | null>(stockQuantity ?? null);
  const [inWaitlist, setInWaitlist] = useState(false);

  // Cargar stock inicial
  const loadStock = useCallback(async () => {
    if (trackStock) {
      const stock = await getAvailableStock(productId);
      if (stock !== null) setAvailableStock(stock);
      
      const waitlistStatus = await isInWaitlist(productId);
      setInWaitlist(waitlistStatus);
    }
  }, [productId, trackStock, getAvailableStock, isInWaitlist]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  // Suscripción a cambios en tiempo real
  useEffect(() => {
    if (!trackStock) return;

    // Suscribirse a cambios en stock_reservations
    const reservationsChannel = supabase
      .channel(`stock-reservations-${productId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_reservations',
          filter: `product_id=eq.${productId}`
        },
        () => {
          // Recargar stock cuando hay cambios en reservas
          loadStock();
        }
      )
      .subscribe();

    // Suscribirse a cambios en products (para actualizaciones directas de stock)
    const productsChannel = supabase
      .channel(`products-stock-${productId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `id=eq.${productId}`
        },
        (payload) => {
          if (payload.new && 'stock_quantity' in payload.new) {
            // Actualizar stock directo y recargar disponibilidad
            loadStock();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(reservationsChannel);
      supabase.removeChannel(productsChannel);
    };
  }, [productId, trackStock, loadStock]);

  // Si no se rastrea stock, no mostrar nada
  if (!trackStock) {
    return null;
  }

  const isOutOfStock = availableStock !== null && availableStock <= 0;
  const isLowStock = availableStock !== null && availableStock > 0 && availableStock <= 5;
  const hasEnoughStock = availableStock === null || availableStock >= quantity;

  const handleWaitlistToggle = async () => {
    if (inWaitlist) {
      const success = await leaveWaitlist(productId);
      if (success) setInWaitlist(false);
    } else {
      const success = await joinWaitlist(productId, quantity);
      if (success) setInWaitlist(true);
    }
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {isOutOfStock ? (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            {t('products:stock.outOfStock')}
          </Badge>
        ) : isLowStock ? (
          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            {t('products:stock.lowStock', { count: availableStock })}
          </Badge>
        ) : availableStock !== null ? (
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t('products:stock.inStock', { count: availableStock })}
          </Badge>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Indicador de stock */}
      <div className="flex items-center gap-2">
        {isOutOfStock ? (
          <>
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-destructive font-medium">
              {t('products:stock.outOfStock')}
            </span>
          </>
        ) : isLowStock ? (
          <>
            <Clock className="h-5 w-5 text-amber-500" />
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              {t('products:stock.lowStock', { count: availableStock })}
            </span>
          </>
        ) : availableStock !== null ? (
          <>
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-green-600 dark:text-green-400 font-medium">
              {t('products:stock.inStock', { count: availableStock })}
            </span>
          </>
        ) : null}
      </div>

      {/* Mensaje de cantidad insuficiente */}
      {!hasEnoughStock && !isOutOfStock && (
        <p className="text-sm text-muted-foreground">
          {t('products:stock.onlyAvailable', { count: availableStock })}
        </p>
      )}

      {/* Botón de lista de espera */}
      {showWaitlistButton && isOutOfStock && (
        <Button
          variant={inWaitlist ? "outline" : "secondary"}
          size="sm"
          onClick={handleWaitlistToggle}
          disabled={loading}
          className="w-full"
        >
          {inWaitlist ? (
            <>
              <BellOff className="h-4 w-4 mr-2" />
              {t('products:stock.leaveWaitlist')}
            </>
          ) : (
            <>
              <Bell className="h-4 w-4 mr-2" />
              {t('products:stock.joinWaitlist')}
            </>
          )}
        </Button>
      )}

      {inWaitlist && (
        <p className="text-xs text-muted-foreground text-center">
          {t('products:stock.waitlistNote')}
        </p>
      )}

      {/* Mensaje de reserva temporal */}
      {!isOutOfStock && availableStock !== null && availableStock > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('products:stock.reservationNote')}
        </p>
      )}
    </div>
  );
}
