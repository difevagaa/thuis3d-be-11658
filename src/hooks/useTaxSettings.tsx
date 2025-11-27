import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface TaxSettings {
  enabled: boolean;
  rate: number;
}

export const useTaxSettings = () => {
  const [taxSettings, setTaxSettings] = useState<TaxSettings>({
    enabled: true,
    rate: 21
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTaxSettings();
  }, []);

  const loadTaxSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["tax_enabled", "tax_rate"]);

      if (error) throw error;

      const settings: TaxSettings = { enabled: true, rate: 21 };
      
      data?.forEach(setting => {
        if (setting.setting_key === "tax_enabled") {
          settings.enabled = setting.setting_value === "true";
        } else if (setting.setting_key === "tax_rate") {
          settings.rate = parseFloat(setting.setting_value) || 21;
        }
      });

      setTaxSettings(settings);
    } catch (error) {
      logger.error("Error loading tax settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTax = (amount: number, productTaxEnabled: boolean = true) => {
    if (!taxSettings.enabled || !productTaxEnabled) return 0;
    return amount * (taxSettings.rate / 100);
  };

  return { taxSettings, loading, calculateTax };
};
