import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface CarouselSettings {
  productRefreshInterval: number; // seconds - how often to rotate products
  imageRotationInterval: number;  // milliseconds - how often to rotate images in each product
  maxVisibleProducts: number;     // how many products to show
}

const DEFAULT_SETTINGS: CarouselSettings = {
  productRefreshInterval: 60,     // 60 seconds default
  imageRotationInterval: 4000,    // 4 seconds default
  maxVisibleProducts: 4,          // 4 products default
};

const SETTING_KEYS = {
  productRefreshInterval: 'carousel_product_refresh_interval',
  imageRotationInterval: 'carousel_image_rotation_interval',
  maxVisibleProducts: 'carousel_max_visible_products',
};

export function useCarouselSettings() {
  const [settings, setSettings] = useState<CarouselSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', Object.values(SETTING_KEYS));

      if (error) {
        logger.warn('[CarouselSettings] Error loading settings:', error);
        return;
      }

      if (data && data.length > 0) {
        const newSettings = { ...DEFAULT_SETTINGS };
        
        data.forEach((item) => {
          const value = parseInt(item.setting_value, 10);
          if (!isNaN(value) && value > 0) {
            if (item.setting_key === SETTING_KEYS.productRefreshInterval) {
              newSettings.productRefreshInterval = value;
            } else if (item.setting_key === SETTING_KEYS.imageRotationInterval) {
              newSettings.imageRotationInterval = value;
            } else if (item.setting_key === SETTING_KEYS.maxVisibleProducts) {
              newSettings.maxVisibleProducts = value;
            }
          }
        });

        setSettings(newSettings);
        logger.debug('[CarouselSettings] Loaded settings:', newSettings);
      }
    } catch (error) {
      logger.error('[CarouselSettings] Exception loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (newSettings: Partial<CarouselSettings>) => {
    try {
      const updates: { setting_key: string; setting_value: string; setting_group: string }[] = [];

      if (newSettings.productRefreshInterval !== undefined) {
        updates.push({
          setting_key: SETTING_KEYS.productRefreshInterval,
          setting_value: String(newSettings.productRefreshInterval),
          setting_group: 'carousel',
        });
      }
      if (newSettings.imageRotationInterval !== undefined) {
        updates.push({
          setting_key: SETTING_KEYS.imageRotationInterval,
          setting_value: String(newSettings.imageRotationInterval),
          setting_group: 'carousel',
        });
      }
      if (newSettings.maxVisibleProducts !== undefined) {
        updates.push({
          setting_key: SETTING_KEYS.maxVisibleProducts,
          setting_value: String(newSettings.maxVisibleProducts),
          setting_group: 'carousel',
        });
      }

      for (const update of updates) {
        const { error } = await supabase
          .from('site_settings')
          .upsert(update, { onConflict: 'setting_key' });

        if (error) {
          logger.error('[CarouselSettings] Error saving setting:', update.setting_key, error);
          throw error;
        }
      }

      // Update local state
      setSettings(prev => ({ ...prev, ...newSettings }));
      logger.info('[CarouselSettings] Settings saved successfully');
      return true;
    } catch (error) {
      logger.error('[CarouselSettings] Exception saving settings:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    saveSettings,
    reloadSettings: loadSettings,
  };
}
