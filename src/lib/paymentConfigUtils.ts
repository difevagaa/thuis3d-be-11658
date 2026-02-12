import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Payment configuration settings
 */
export interface PaymentConfig {
  bank_transfer_enabled: boolean;
  card_enabled: boolean;
  paypal_enabled: boolean;
  revolut_enabled: boolean;
  paypal_email: string;
  revolut_link: string;
  card_payment_link?: string;
  company_info: string;
}

/**
 * Result of loading payment configuration
 */
export interface LoadPaymentConfigResult {
  config: PaymentConfig;
  images: string[];
}

/**
 * Loads payment configuration from site_settings table
 * This includes enabled payment methods, payment links, and payment images
 * 
 * @param includeImages - Whether to include payment_images in the result (default: true)
 * @returns Payment configuration and images
 */
export async function loadPaymentConfig(includeImages: boolean = true): Promise<LoadPaymentConfigResult> {
  try {
    // Setting keys to fetch
    const settingKeys = [
      'bank_transfer_enabled',
      'card_enabled', 
      'paypal_enabled',
      'revolut_enabled',
      'paypal_email',
      'revolut_link',
      'card_payment_link',
      'company_info'
    ];
    
    // Add payment_images if requested
    if (includeImages) {
      settingKeys.push('payment_images');
    }

    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .in("setting_key", settingKeys);

    if (error) {
      logger.error('[PAYMENT CONFIG] Error loading payment settings:', error);
      throw error;
    }

    // Parse settings into config object
    const config: PaymentConfig = {
      bank_transfer_enabled: true, // Default values
      card_enabled: true,
      paypal_enabled: false,
      revolut_enabled: false,
      paypal_email: "",
      revolut_link: "",
      card_payment_link: "",
      company_info: ""
    };

    let images: string[] = [];

    if (data && data.length > 0) {
      data.forEach((setting) => {
        const key = setting.setting_key;
        const value = setting.setting_value;

        // Parse payment_images as JSON array
        if (key === 'payment_images') {
          try {
            images = JSON.parse(value);
          } catch (e) {
            logger.error('[PAYMENT CONFIG] Error parsing payment_images:', e);
            images = [];
          }
        }
        // Parse boolean settings - use explicit key checks
        else if (key === 'bank_transfer_enabled' || key === 'card_enabled' || 
                 key === 'paypal_enabled' || key === 'revolut_enabled') {
          config[key] = value === "true" || value === true;
        }
        // Parse string settings - use explicit key checks
        else if (key === 'paypal_email' || key === 'revolut_link' || 
                 key === 'card_payment_link' || key === 'company_info') {
          config[key] = value || "";
        }
      });
    }

    logger.log('[PAYMENT CONFIG] Loaded payment configuration:', config);

    return {
      config,
      images
    };
  } catch (error) {
    logger.error('[PAYMENT CONFIG] Unexpected error loading payment config:', error);
    
    // Return default configuration on error
    return {
      config: {
        bank_transfer_enabled: true,
        card_enabled: true,
        paypal_enabled: false,
        revolut_enabled: false,
        paypal_email: "",
        revolut_link: "",
        card_payment_link: "",
        company_info: ""
      },
      images: []
    };
  }
}

/**
 * Loads only specific payment setting keys
 * Useful when you only need a subset of payment configuration
 * 
 * @param keys - Array of setting keys to load
 * @returns Object with requested settings
 */
export async function loadSpecificPaymentSettings(keys: string[]): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .in("setting_key", keys);

    if (error) {
      logger.error('[PAYMENT CONFIG] Error loading specific settings:', error);
      throw error;
    }

    const settings: Record<string, any> = {};

    if (data && data.length > 0) {
      data.forEach((setting) => {
        const key = setting.setting_key;
        const value = setting.setting_value;

        // Try to parse as JSON first
        try {
          settings[key] = JSON.parse(value);
        } catch {
          // If not JSON, treat as string or boolean
          if (key.includes('enabled')) {
            settings[key] = value === "true" || value === true;
          } else {
            settings[key] = value;
          }
        }
      });
    }

    return settings;
  } catch (error) {
    logger.error('[PAYMENT CONFIG] Error loading specific settings:', error);
    return {};
  }
}
