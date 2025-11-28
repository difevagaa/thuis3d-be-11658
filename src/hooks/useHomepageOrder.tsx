import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

// Component type definitions for homepage ordering
export type HomepageComponentType = 
  | 'quick_access_card' 
  | 'feature_card' 
  | 'section' 
  | 'featured_products'
  | 'why_us'
  | 'banners';

export interface HomepageComponentOrder {
  id: string;
  type: HomepageComponentType;
  displayOrder: number;
  isActive: boolean;
  label: string;
}

export interface HomepageOrderConfig {
  components: HomepageComponentOrder[];
  version: number;
  updatedAt: string;
}

const SETTING_KEY = 'homepage_component_order';
const SETTING_GROUP = 'homepage';

// Default order for components when no configuration exists
const getDefaultOrder = (
  sections: any[],
  quickAccessCards: any[],
  features: any[]
): HomepageComponentOrder[] => {
  const components: HomepageComponentOrder[] = [];
  let order = 0;

  // Add featured_products section first (if exists in sections)
  const featuredSection = sections.find(s => s.section_key === 'featured_products');
  if (featuredSection) {
    components.push({
      id: featuredSection.id,
      type: 'featured_products',
      displayOrder: order++,
      isActive: featuredSection.is_active !== false,
      label: featuredSection.title || 'Productos Destacados'
    });
  }

  // Add quick_access section (all cards grouped)
  const quickAccessSection = sections.find(s => s.section_key === 'quick_access');
  if (quickAccessSection) {
    components.push({
      id: quickAccessSection.id,
      type: 'quick_access_card',
      displayOrder: order++,
      isActive: quickAccessSection.is_active !== false,
      label: quickAccessSection.title || 'Accesos Rápidos'
    });
  } else if (quickAccessCards.length > 0) {
    // If no section but cards exist, create a virtual entry
    components.push({
      id: 'virtual_quick_access',
      type: 'quick_access_card',
      displayOrder: order++,
      isActive: true,
      label: 'Tarjetas de Acceso Rápido'
    });
  }

  // Add why_us section (features grouped)
  const whyUsSection = sections.find(s => s.section_key === 'why_us');
  if (whyUsSection) {
    components.push({
      id: whyUsSection.id,
      type: 'why_us',
      displayOrder: order++,
      isActive: whyUsSection.is_active !== false,
      label: whyUsSection.title || '¿Por Qué Elegirnos?'
    });
  } else if (features.length > 0) {
    // If no section but features exist, create a virtual entry
    components.push({
      id: 'virtual_why_us',
      type: 'why_us',
      displayOrder: order++,
      isActive: true,
      label: '¿Por Qué Elegirnos?'
    });
  }

  // Add other custom sections
  sections
    .filter(s => !['featured_products', 'quick_access', 'why_us'].includes(s.section_key))
    .forEach(section => {
      components.push({
        id: section.id,
        type: 'section',
        displayOrder: order++,
        isActive: section.is_active !== false,
        label: section.title
      });
    });

  return components;
};

export function useHomepageOrder() {
  const [orderConfig, setOrderConfig] = useState<HomepageOrderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadOrderConfig = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("site_settings")
        .select("setting_value")
        .eq("setting_key", SETTING_KEY)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data?.setting_value) {
        try {
          const parsed = JSON.parse(data.setting_value) as HomepageOrderConfig;
          setOrderConfig(parsed);
        } catch (parseError) {
          logger.error('[useHomepageOrder] Error parsing order config:', parseError);
          setOrderConfig(null);
        }
      } else {
        setOrderConfig(null);
      }
    } catch (err) {
      logger.error('[useHomepageOrder] Error loading order config:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveOrderConfig = useCallback(async (components: HomepageComponentOrder[]) => {
    try {
      const config: HomepageOrderConfig = {
        components: components.map((c, index) => ({ ...c, displayOrder: index })),
        version: (orderConfig?.version || 0) + 1,
        updatedAt: new Date().toISOString()
      };

      const { error: upsertError } = await supabase
        .from("site_settings")
        .upsert(
          {
            setting_key: SETTING_KEY,
            setting_value: JSON.stringify(config),
            setting_group: SETTING_GROUP,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'setting_key' }
        );

      if (upsertError) throw upsertError;

      setOrderConfig(config);
      return { success: true };
    } catch (err) {
      logger.error('[useHomepageOrder] Error saving order config:', err);
      return { success: false, error: err };
    }
  }, [orderConfig?.version]);

  useEffect(() => {
    loadOrderConfig();

    // Subscribe to changes
    const channel = supabase
      .channel('homepage-order-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'site_settings',
        filter: `setting_key=eq.${SETTING_KEY}`
      }, loadOrderConfig)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrderConfig]);

  return {
    orderConfig,
    loading,
    error,
    saveOrderConfig,
    reloadOrderConfig: loadOrderConfig,
    getDefaultOrder
  };
}

// Hook for the frontend to get ordered components
export function useHomepageOrderedComponents() {
  const { orderConfig, loading } = useHomepageOrder();
  const [sections, setSections] = useState<any[]>([]);
  const [quickAccessCards, setQuickAccessCards] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [componentsLoading, setComponentsLoading] = useState(true);

  useEffect(() => {
    const loadComponents = async () => {
      try {
        // Load all component data in parallel
        const [sectionsRes, cardsRes, featuresRes] = await Promise.all([
          supabase
            .from("homepage_sections")
            .select("*")
            .neq("is_active", false)
            .order("display_order", { ascending: true, nullsFirst: false }),
          supabase
            .from("homepage_quick_access_cards")
            .select("*")
            .neq("is_active", false)
            .order("display_order", { ascending: true, nullsFirst: false }),
          supabase
            .from("homepage_features")
            .select("*")
            .neq("is_active", false)
            .order("display_order", { ascending: true, nullsFirst: false })
        ]);

        if (sectionsRes.error) throw sectionsRes.error;
        if (cardsRes.error) throw cardsRes.error;
        if (featuresRes.error) throw featuresRes.error;

        setSections(sectionsRes.data || []);
        setQuickAccessCards(cardsRes.data || []);
        setFeatures(featuresRes.data || []);
      } catch (err) {
        logger.error('[useHomepageOrderedComponents] Error loading components:', err);
      } finally {
        setComponentsLoading(false);
      }
    };

    loadComponents();
  }, []);

  // Determine the order of components to render
  const getOrderedComponents = useCallback((): HomepageComponentOrder[] => {
    if (!orderConfig?.components || orderConfig.components.length === 0) {
      // Use default order based on existing data
      return getDefaultOrder(sections, quickAccessCards, features);
    }

    // Validate and filter the saved order against current data
    return orderConfig.components
      .filter(component => {
        // Keep virtual entries
        if (component.id.startsWith('virtual_')) return true;
        
        // Validate that the component still exists
        switch (component.type) {
          case 'featured_products':
          case 'quick_access_card':
          case 'why_us':
          case 'section':
            return sections.some(s => s.id === component.id) || component.id.startsWith('virtual_');
          default:
            return true;
        }
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [orderConfig, sections, quickAccessCards, features]);

  return {
    orderedComponents: getOrderedComponents(),
    sections,
    quickAccessCards,
    features,
    loading: loading || componentsLoading
  };
}
