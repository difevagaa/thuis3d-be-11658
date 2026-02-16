import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

// Default shipping cost fallback when no configuration exists
const DEFAULT_SHIPPING_COST = 5.00;

interface ShippingSettings {
  free_shipping_threshold: number;
  default_shipping_cost: number;
  is_enabled: boolean;
  free_shipping_products_only?: boolean;
  enable_shipping_for_quotes?: boolean;
  quotes_default_shipping_cost?: number | null;
  quotes_free_shipping_threshold?: number | null;
}

interface ShippingCalculation {
  cost: number;
  isFree: boolean;
  country: string;
}

export type ShippingContext = 'products' | 'quotes';

// Helper function to check if an item applies to a given shipping context
const appliesToShippingContext = (
  item: { applies_to_products?: boolean | null; applies_to_quotes?: boolean | null },
  context: ShippingContext
): boolean => {
  if (context === 'quotes') {
    return item.applies_to_quotes !== false; // true or null = applies
  }
  return item.applies_to_products !== false; // true or null = applies
};

export const useShippingCalculator = () => {
  const [settings, setSettings] = useState<ShippingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("shipping_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      logger.error("Error loading shipping settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateShipping = async (
    countryCode: string,
    postalCode: string,
    cartTotal: number,
    productIds: string[] = []
  ): Promise<ShippingCalculation> => {
    logger.debug('[SHIPPING CALCULATOR] START', { productIds, cartTotal, countryCode, postalCode });

    // CRÍTICO: Si no hay productos (solo tarjetas de regalo), envío gratis
    if (!productIds || productIds.length === 0) {
      logger.info('No physical products (gift cards only) - FREE SHIPPING');
      return { cost: 0, isFree: true, country: countryCode };
    }

    // CRÍTICO: Cargar settings frescos cada vez para evitar problemas de timing
    const { data: currentSettings, error: settingsError } = await supabase
      .from("shipping_settings")
      .select("*")
      .maybeSingle();

    if (settingsError) {
      logger.error('Error loading shipping settings:', settingsError);
    }

    if (!currentSettings) {
      logger.warn('No shipping settings found, using defaults');
      return { cost: 0, isFree: true, country: countryCode };
    }

    logger.debug('Current Settings:', {
      enabled: currentSettings.is_enabled,
      threshold: currentSettings.free_shipping_threshold,
      defaultCost: currentSettings.default_shipping_cost
    });

    // PASO 1: Verificar configuración de productos (MÁXIMA PRIORIDAD)
    let hasStandardShipping = false;
    
    if (productIds.length > 0) {
      logger.debug('Fetching product shipping configurations...');
      
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, shipping_type, custom_shipping_cost")
        .in("id", productIds);

      if (productsError) {
        logger.error('Error loading products:', productsError);
      }

      if (products && products.length > 0) {
        logger.debug('Products loaded:', products);

        // Verificar si TODOS los productos tienen envío gratuito
        const allFreeShipping = products.every(p => p.shipping_type === 'free');
        if (allFreeShipping) {
          logger.info('All products have FREE shipping');
          return { cost: 0, isFree: true, country: countryCode };
        }

        // Verificar si TODOS los productos tienen envío deshabilitado
        const allDisabledShipping = products.every(p => p.shipping_type === 'disabled');
        if (allDisabledShipping) {
          logger.info('All products have DISABLED shipping (no cost)');
          return { cost: 0, isFree: true, country: countryCode };
        }

        // Si algún producto tiene costo de envío CUSTOM, usar el más alto
        const customCosts = products
          .filter(p => {
            const isCustomType = p.shipping_type === 'custom';
            const hasCustomCost = p.custom_shipping_cost != null && p.custom_shipping_cost > 0;
            if (!isCustomType && hasCustomCost) {
              logger.warn(`Product "${p.name}" has custom_shipping_cost but type is "${p.shipping_type}". Ignoring custom cost.`);
            }
            return isCustomType && hasCustomCost;
          })
          .map(p => Number(p.custom_shipping_cost));

        if (customCosts.length > 0) {
          const maxCustomCost = Math.max(...customCosts);
          logger.info(`Using CUSTOM shipping cost: €${maxCustomCost}`);
          return { cost: maxCustomCost, isFree: false, country: countryCode };
        }

        // Si llegamos aquí, hay productos con envío STANDARD
        hasStandardShipping = products.some(p => p.shipping_type === 'standard');
        if (hasStandardShipping) {
          logger.debug('Products use STANDARD shipping, applying global rules...');
        }
      }
    }

    // PASO 2: Verificar si el sistema de envíos está habilitado
    if (!hasStandardShipping && !currentSettings.is_enabled) {
      logger.warn('Shipping system is DISABLED globally (no standard products)');
      return { cost: 0, isFree: true, country: countryCode };
    }

    logger.debug('Applying global shipping rules');

    // PASO 3: Verificar umbral de envío gratis
    if (currentSettings.free_shipping_threshold && currentSettings.free_shipping_threshold > 0 && cartTotal >= currentSettings.free_shipping_threshold) {
      logger.info(`FREE shipping by threshold: €${cartTotal} >= €${currentSettings.free_shipping_threshold}`);
      return { cost: 0, isFree: true, country: countryCode };
    }

    // PASO 4: Buscar tarifa por código postal
    // CRÍTICO: Filtrar por applies_to_products ya que este método es para productos
    logger.debug('Checking postal code specific rate...');
    const { data: postalCodeRate } = await supabase
      .from("shipping_postal_codes")
      .select("shipping_cost, applies_to_products")
      .eq("country_code", countryCode)
      .eq("postal_code", postalCode)
      .eq("is_enabled", true)
      .maybeSingle();

    // Solo usar la tarifa si aplica a productos
    if (postalCodeRate && postalCodeRate.applies_to_products !== false) {
      const cost = Number(postalCodeRate.shipping_cost);
      logger.info(`Using POSTAL CODE rate: €${cost}`);
      return { cost, isFree: false, country: countryCode };
    }

    // PASO 5: CRÍTICO - Buscar en zonas de envío por peso (PRIORIDAD sobre tarifa simple de país)
    logger.debug('Checking shipping zones by weight...');
    
    // Obtener el país completo para buscar en zonas
    const { data: countryData } = await supabase
      .from("shipping_countries")
      .select("country_name")
      .eq("country_code", countryCode)
      .maybeSingle();
    
    const countryName = countryData?.country_name || 'Bélgica';
    
    // Calcular peso total del carrito (si hay productos)
    let totalWeight = 0;
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("weight")
        .in("id", productIds);
      
      if (products && products.length > 0) {
        totalWeight = products.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
        logger.debug(`Total cart weight: ${totalWeight}g`);
      }
    }
    
    // Usar la función de cálculo por zona si existe peso o código postal
    // CRÍTICO: Filtrar por applies_to_products ya que este método es para productos
    const { data: zones, error: zonesError } = await supabase
      .from('shipping_zones')
      .select('*')
      .eq('country', countryName)
      .eq('is_active', true)
      .order('postal_code_prefix', { ascending: false });
    
    // Filtrar zonas que aplican a productos
    const productZones = zones?.filter(zone => zone.applies_to_products !== false) || [];
    
    if (!zonesError && productZones.length > 0) {
      logger.debug(`Found ${productZones.length} shipping zones for ${countryName} (products)`);
      
      // Buscar zona que coincida con el código postal
      let matchedZone = productZones.find(zone => 
        zone.postal_code_prefix && 
        zone.postal_code_prefix.length > 0 &&
        postalCode.startsWith(zone.postal_code_prefix)
      );
      
      // Si no hay match por prefijo, buscar zona predeterminada
      if (!matchedZone) {
        matchedZone = productZones.find(zone => zone.is_default === true);
      }
      
      // Si no hay zona predeterminada, usar zona sin prefijo
      if (!matchedZone) {
        matchedZone = productZones.find(zone => !zone.postal_code_prefix || zone.postal_code_prefix === '');
      }
      
      // Si aún no hay match, usar la primera zona
      if (!matchedZone) {
        matchedZone = productZones[0];
      }
      
      if (matchedZone) {
        const baseCost = Number(matchedZone.base_cost) || 0;
        const costPerKg = Number(matchedZone.cost_per_kg) || 0;
        const weightCost = totalWeight > 0 ? (totalWeight / 1000) * costPerKg : 0;
        const calculatedCost = baseCost + weightCost;
        
        // Aplicar precio mínimo de la zona
        const zoneMinimum = Number(matchedZone.minimum_cost) || Number(currentSettings.default_shipping_cost) || 0;
        const finalCost = Math.max(calculatedCost, zoneMinimum);
        
        logger.info(`Using ZONE shipping: "${matchedZone.zone_name}", Base=€${baseCost}, Weight=${totalWeight}g (+€${weightCost.toFixed(2)}), Calculated=€${calculatedCost.toFixed(2)}, Minimum=€${zoneMinimum}, FINAL=€${finalCost.toFixed(2)}`);
        return { cost: Number(finalCost.toFixed(2)), isFree: false, country: countryCode };
      }
    }

    // PASO 6: Fallback a tarifa simple por país (solo si no hay zonas configuradas)
    logger.debug('No zones found, checking country flat rate...');
    const { data: countryRate } = await supabase
      .from("shipping_countries")
      .select("shipping_cost")
      .eq("country_code", countryCode)
      .eq("is_enabled", true)
      .maybeSingle();

    if (countryRate && countryRate.shipping_cost != null) {
      const cost = Number(countryRate.shipping_cost);
      logger.info(`Using COUNTRY flat rate: €${cost}`);
      return { cost, isFree: false, country: countryCode };
    }

    // PASO 7: Último fallback - tarifa por defecto global
    const defaultCost = Number(currentSettings.default_shipping_cost) || 0;
    logger.info(`Using DEFAULT shipping cost (fallback): €${defaultCost}`);
    return { cost: defaultCost, isFree: false, country: countryCode };
  };

  const getAvailableCountries = async () => {
    try {
      const { data, error } = await supabase
        .from("shipping_countries")
        .select("id, country_name, country_code, shipping_cost")
        .eq("is_enabled", true)
        .order("country_name");

      if (error) {
        logger.error("Error loading countries:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error("Error in getAvailableCountries:", error);
      return [];
    }
  };

  const calculateShippingByPostalCode = async (
    postalCode: string,
    weight: number = 0,
    country: string = 'Bélgica',
    context: ShippingContext = 'products',
    orderTotal: number = 0
  ): Promise<{ cost: number; zoneName: string }> => {
    logger.debug('[SHIPPING CALCULATOR] Calculating shipping', { postalCode, weight, country, context, orderTotal });

    try {
      // PASO 1: Cargar configuración global
      const { data: globalSettings, error: settingsError } = await supabase
        .from('shipping_settings')
        .select('*')
        .maybeSingle();

      if (settingsError) {
        logger.error('Error loading shipping settings:', settingsError);
      }

      // Determinar costos según contexto (productos vs cotizaciones)
      const isQuote = context === 'quotes';
      
      // Si estamos calculando para cotizaciones, verificar si está habilitado
      if (isQuote && globalSettings?.enable_shipping_for_quotes === false) {
        logger.info('[QUOTES] Shipping disabled for quotes');
        return { cost: 0, zoneName: 'Envío deshabilitado para cotizaciones' };
      }

      // CRÍTICO: Verificar umbral de envío gratis para cotizaciones
      if (isQuote && globalSettings?.quotes_free_shipping_threshold != null && globalSettings.quotes_free_shipping_threshold > 0) {
        const threshold = Number(globalSettings.quotes_free_shipping_threshold);
        if (orderTotal >= threshold) {
          // Envío GRATIS cuando se supera el umbral de cotizaciones
          logger.info(`[QUOTES] FREE shipping by threshold: €${orderTotal} >= €${threshold}`);
          return { cost: 0, zoneName: `Envío gratis (compra > €${threshold})` };
        }
      }

      // Verificar umbral de envío gratis para productos
      if (!isQuote && globalSettings?.free_shipping_threshold != null && globalSettings.free_shipping_threshold > 0) {
        const threshold = Number(globalSettings.free_shipping_threshold);
        if (orderTotal >= threshold) {
          logger.info(`[PRODUCTS] FREE shipping by threshold: €${orderTotal} >= €${threshold}`);
          return { cost: 0, zoneName: `Envío gratis (compra > €${threshold})` };
        }
      }

      // Usar configuración específica para cotizaciones si está disponible
      const minimumShippingCost = isQuote && globalSettings?.quotes_default_shipping_cost != null
        ? Number(globalSettings.quotes_default_shipping_cost)
        : (globalSettings?.default_shipping_cost 
            ? Number(globalSettings.default_shipping_cost) 
            : DEFAULT_SHIPPING_COST);

      logger.debug('Minimum shipping cost from settings:', minimumShippingCost, 'context:', context);

      // PASO 2: Verificar códigos postales especiales
      const { data: specialPostalCode, error: specialError } = await supabase
        .from('shipping_postal_codes')
        .select('*')
        .eq('postal_code', postalCode)
        .eq('is_enabled', true)
        .maybeSingle();

      if (specialError) {
        logger.error('Error checking special postal codes:', specialError);
      }

      if (specialPostalCode) {
        // Verificar si aplica según el contexto usando helper
        if (appliesToShippingContext(specialPostalCode, context)) {
          // Usar costo específico para cotizaciones si está disponible
          const specialCost = isQuote && specialPostalCode.quotes_shipping_cost != null
            ? Number(specialPostalCode.quotes_shipping_cost)
            : Number(specialPostalCode.shipping_cost);
          
          logger.info(`✅ FOUND SPECIAL POSTAL CODE for ${context}: ${postalCode} = €${specialCost.toFixed(2)}`);
          return {
            cost: Number(specialCost.toFixed(2)),
            zoneName: `Código Postal Especial (${postalCode})`
          };
        } else {
          logger.info(`Special postal code ${postalCode} does not apply to ${context}, checking zones...`);
        }
      }

      logger.debug('No applicable special postal code found, checking zones...');

      // PASO 3: Buscar zonas de envío
      const { data: zones, error } = await supabase
        .from('shipping_zones')
        .select('*')
        .eq('country', country)
        .eq('is_active', true)
        .order('postal_code_prefix', { ascending: false });

      if (error) throw error;

      if (!zones || zones.length === 0) {
        logger.warn('No shipping zones found, using minimum cost');
        return { cost: minimumShippingCost, zoneName: 'Costo mínimo' };
      }

      // Filtrar zonas según contexto usando helper
      const applicableZones = zones.filter(zone => appliesToShippingContext(zone, context));

      if (applicableZones.length === 0) {
        logger.warn(`No shipping zones applicable for ${context}, using minimum cost`);
        return { cost: minimumShippingCost, zoneName: 'Costo mínimo' };
      }

      let matchedZone = null;

      // Buscar código postal exacto
      matchedZone = applicableZones.find(zone => 
        zone.postal_code_prefix && zone.postal_code_prefix === postalCode
      );

      if (matchedZone) {
        logger.info(`Found EXACT postal code match: "${matchedZone.zone_name}" for ${postalCode}`);
      }

      // Buscar por prefijo
      if (!matchedZone) {
        matchedZone = applicableZones.find(zone => 
          zone.postal_code_prefix && 
          zone.postal_code_prefix.length > 0 &&
          postalCode.startsWith(zone.postal_code_prefix)
        );

        if (matchedZone) {
          logger.info(`Found PREFIX match: "${matchedZone.zone_name}" for ${postalCode} (prefix: ${matchedZone.postal_code_prefix})`);
        }
      }

      // Buscar zona predeterminada
      if (!matchedZone) {
        matchedZone = applicableZones.find(zone => zone.is_default === true);
        
        if (matchedZone) {
          logger.info(`Using DEFAULT zone (marked): "${matchedZone.zone_name}"`);
        }
      }

      // Buscar zona sin prefijo
      if (!matchedZone) {
        matchedZone = applicableZones.find(zone => !zone.postal_code_prefix || zone.postal_code_prefix === '');
        
        if (matchedZone) {
          logger.info(`Using zone without prefix: "${matchedZone.zone_name}"`);
        }
      }

      // Fallback a la primera zona
      if (!matchedZone) {
        matchedZone = applicableZones[0];
        logger.warn(`No match found, using first available zone: "${matchedZone.zone_name}"`);
      }

      // Calcular costo según contexto
      const baseCost = isQuote && matchedZone.quotes_base_cost != null
        ? Number(matchedZone.quotes_base_cost)
        : Number(matchedZone.base_cost) || 0;
      
      const costPerKg = isQuote && matchedZone.quotes_cost_per_kg != null
        ? Number(matchedZone.quotes_cost_per_kg)
        : Number(matchedZone.cost_per_kg) || 0;
      
      const weightCost = weight > 0 ? (weight / 1000) * costPerKg : 0;
      const calculatedCost = baseCost + weightCost;

      // Aplicar precio mínimo según contexto
      const zoneMinimum = isQuote && matchedZone.quotes_minimum_cost != null
        ? Number(matchedZone.quotes_minimum_cost)
        : (matchedZone.minimum_cost ? Number(matchedZone.minimum_cost) : minimumShippingCost);
      
      const finalCost = Math.max(calculatedCost, zoneMinimum);

      logger.info(`[${context.toUpperCase()}] Shipping calculated: Zone="${matchedZone.zone_name}", Base=€${baseCost}, Weight=${weight}g (€${weightCost.toFixed(2)}), Calculated=€${calculatedCost.toFixed(2)}, Minimum=€${zoneMinimum}, FINAL=€${finalCost.toFixed(2)}`);

      return {
        cost: Number(finalCost.toFixed(2)),
        zoneName: matchedZone.zone_name
      };
    } catch (error) {
      logger.error('Error calculating shipping:', error);
      
      // En caso de error, usar el mínimo global si está disponible
      const fallbackCost = settings?.default_shipping_cost 
        ? Number(settings.default_shipping_cost) 
        : DEFAULT_SHIPPING_COST;
      
      return { cost: fallbackCost, zoneName: 'Error (costo mínimo)' };
    }
  };

  return {
    settings,
    loading,
    calculateShipping,
    calculateShippingByPostalCode,
    getAvailableCountries
  };
};