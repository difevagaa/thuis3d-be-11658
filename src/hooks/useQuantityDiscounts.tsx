import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface DiscountTier {
  id: string;
  tier_name: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface DiscountApplication {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  tierName: string;
  tierDescription: string;
}

export const useQuantityDiscounts = () => {
  const [tiers, setTiers] = useState<DiscountTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('quantity_discount_tiers')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setTiers(data || []);
      logger.debug('[QUANTITY DISCOUNTS] Loaded active tiers:', data?.length || 0);
    } catch (error) {
      logger.error('[QUANTITY DISCOUNTS] Error loading tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDiscount = (quantity: number, originalPrice: number): DiscountApplication | null => {
    if (quantity <= 0 || originalPrice <= 0 || tiers.length === 0) {
      return null;
    }

    // Buscar el tier aplicable (el de mayor display_order que cumpla condiciones)
    const applicableTier = tiers
      .filter(tier => {
        const meetsMin = quantity >= tier.min_quantity;
        const meetsMax = tier.max_quantity === null || quantity <= tier.max_quantity;
        return meetsMin && meetsMax;
      })
      .sort((a, b) => b.display_order - a.display_order)[0];

    if (!applicableTier) {
      logger.debug('[QUANTITY DISCOUNTS] No applicable tier for quantity:', quantity);
      return null;
    }

    let discountAmount = 0;
    let finalPrice = originalPrice;

    if (applicableTier.discount_type === 'percentage') {
      // Descuento porcentual
      discountAmount = (originalPrice * applicableTier.discount_value) / 100;
      finalPrice = originalPrice - discountAmount;
    } else {
      // Descuento de monto fijo
      discountAmount = applicableTier.discount_value;
      finalPrice = Math.max(0, originalPrice - discountAmount);
    }

    const tierDescription = applicableTier.discount_type === 'percentage'
      ? `${applicableTier.discount_value}% de descuento`
      : `€${applicableTier.discount_value.toFixed(2)} de descuento`;

    logger.info(`[QUANTITY DISCOUNTS] Applied "${applicableTier.tier_name}" for ${quantity} units: €${originalPrice.toFixed(2)} → €${finalPrice.toFixed(2)} (saved €${discountAmount.toFixed(2)})`);

    return {
      originalPrice: Number(originalPrice.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      finalPrice: Number(finalPrice.toFixed(2)),
      tierName: applicableTier.tier_name,
      tierDescription
    };
  };

  return {
    tiers,
    loading,
    calculateDiscount,
    reloadTiers: loadTiers
  };
};
