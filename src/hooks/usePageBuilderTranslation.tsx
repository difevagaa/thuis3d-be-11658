import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to translate Page Builder section content based on current language
 * Handles all translatable arrays: features, items, cards, testimonials, benefits, steps, plans
 */
export const usePageBuilderTranslation = (sectionId: string, originalContent: any, originalName: string) => {
  const { i18n } = useTranslation();
  const [translatedContent, setTranslatedContent] = useState<any>(originalContent);
  const [translatedName, setTranslatedName] = useState<string>(originalName);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTranslations();
  }, [i18n.language, sectionId, JSON.stringify(originalContent), originalName]);

  const loadTranslations = async () => {
    const baseLang = i18n.language.split('-')[0];

    // If Spanish, use original content
    if (baseLang === 'es') {
      setTranslatedContent(originalContent);
      setTranslatedName(originalName);
      return;
    }

    if (!sectionId) {
      setTranslatedContent(originalContent);
      setTranslatedName(originalName);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('translations')
        .select('field_name, translated_text')
        .eq('entity_type', 'page_builder_sections')
        .eq('entity_id', sectionId)
        .eq('language', baseLang);

      if (error) throw error;

      // Apply translations to content
      const newContent = JSON.parse(JSON.stringify(originalContent || {}));
      let newName = originalName;

      const ensureArrayItem = (key: string, index: number) => {
        if (!newContent[key]) {
          newContent[key] = [...(originalContent?.[key] || [])];
        }
        return newContent[key]?.[index];
      };

      const setArrayField = (key: string, index: number, field: string, value: string) => {
        if (!ensureArrayItem(key, index)) return;
        newContent[key][index] = {
          ...newContent[key][index],
          [field]: value
        };
      };

      // Process translations
      data?.forEach((translation) => {
        const fieldName = translation.field_name;
        const value = translation.translated_text;

        if (!value) return;

        if (fieldName === 'section_name') {
          newName = value;
          return;
        }

        // Top-level known fields
        const topLevelFields = [
          'title', 'subtitle', 'description', 'buttonText', 'text',
          'headline', 'subheadline', 'label', 'tagline', 'message',
          'placeholder', 'emailPlaceholder'
        ];

        if (topLevelFields.includes(fieldName)) {
          newContent[fieldName] = value;
          return;
        }

        // Pricing plans features (plans_0_features_1)
        const planFeatureMatch = fieldName.match(/^plans_(\d+)_features_(\d+)$/);
        if (planFeatureMatch) {
          const planIndex = parseInt(planFeatureMatch[1]);
          const featureIndex = parseInt(planFeatureMatch[2]);
          if (ensureArrayItem('plans', planIndex)) {
            const existingFeatures = Array.isArray(newContent.plans[planIndex]?.features)
              ? [...newContent.plans[planIndex].features]
              : [...(originalContent?.plans?.[planIndex]?.features || [])];
            existingFeatures[featureIndex] = value;
            newContent.plans[planIndex] = {
              ...newContent.plans[planIndex],
              features: existingFeatures
            };
          }
          return;
        }

        // Pricing plans other fields (plans_0_name, plans_0_buttonText)
        const planFieldMatch = fieldName.match(/^plans_(\d+)_(\w+)$/);
        if (planFieldMatch) {
          const planIndex = parseInt(planFieldMatch[1]);
          const field = planFieldMatch[2];
          if (ensureArrayItem('plans', planIndex)) {
            newContent.plans[planIndex] = {
              ...newContent.plans[planIndex],
              [field]: value
            };
          }
          return;
        }

        // Handle array fields: features, items, cards, testimonials, benefits, steps
        const arrayPatterns = [
          { prefix: 'features_', key: 'features' },
          { prefix: 'items_', key: 'items' },
          { prefix: 'cards_', key: 'cards' },
          { prefix: 'testimonials_', key: 'testimonials' },
          { prefix: 'benefits_', key: 'benefits' },
          { prefix: 'steps_', key: 'steps' }
        ];

        for (const pattern of arrayPatterns) {
          if (fieldName.startsWith(pattern.prefix)) {
            const match = fieldName.match(new RegExp(`${pattern.prefix}(\\d+)_(\\w+)`));
            if (match) {
              const index = parseInt(match[1]);
              const field = match[2];
              setArrayField(pattern.key, index, field, value);
            }
            break;
          }
        }
      });

      setTranslatedContent(newContent);
      setTranslatedName(newName);
    } catch (error) {
      console.error('Error loading page builder translations:', error);
      setTranslatedContent(originalContent);
      setTranslatedName(originalName);
    } finally {
      setLoading(false);
    }
  };

  return { translatedContent, translatedName, loading };
};

/**
 * Utility function to get all translatable fields from a section
 * Extended to support all array types including pricing plans
 */
export const getSectionTranslatableFields = (sectionType: string, content: any): { field: string; value: string }[] => {
  const fields: { field: string; value: string }[] = [];

  // Common top-level fields
  const topLevelFields = [
    'title', 'subtitle', 'description', 'buttonText', 'text',
    'headline', 'subheadline', 'label', 'tagline', 'message',
    'placeholder', 'emailPlaceholder'
  ];

  topLevelFields.forEach(fieldName => {
    if (content?.[fieldName] && typeof content[fieldName] === 'string') {
      fields.push({ field: fieldName, value: content[fieldName] });
    }
  });

  // Array fields to process
  const arrayConfigs = [
    { key: 'items', fields: ['title', 'description', 'text', 'buttonText', 'name', 'content'] },
    { key: 'cards', fields: ['title', 'description', 'buttonText', 'name', 'content'] },
    { key: 'features', fields: ['title', 'description', 'text', 'buttonText'] },
    { key: 'testimonials', fields: ['title', 'description', 'text', 'quote', 'author', 'name', 'content'] },
    { key: 'benefits', fields: ['title', 'description', 'text'] },
    { key: 'steps', fields: ['title', 'description', 'text', 'content'] }
  ];

  arrayConfigs.forEach(({ key, fields: itemFields }) => {
    if (content?.[key] && Array.isArray(content[key])) {
      content[key].forEach((item: any, index: number) => {
        itemFields.forEach(fieldName => {
          if (item?.[fieldName] && typeof item[fieldName] === 'string') {
            fields.push({ field: `${key}_${index}_${fieldName}`, value: item[fieldName] });
          }
        });
      });
    }
  });

  // Pricing plans (plans + plan.features[])
  if (content?.plans && Array.isArray(content.plans)) {
    content.plans.forEach((plan: any, planIndex: number) => {
      ['name', 'period', 'buttonText', 'description'].forEach((fieldName) => {
        if (plan?.[fieldName] && typeof plan[fieldName] === 'string') {
          fields.push({ field: `plans_${planIndex}_${fieldName}`, value: plan[fieldName] });
        }
      });

      if (Array.isArray(plan?.features)) {
        plan.features.forEach((feature: any, featureIndex: number) => {
          if (typeof feature === 'string' && feature.trim()) {
            fields.push({ field: `plans_${planIndex}_features_${featureIndex}`, value: feature });
          }
        });
      }
    });
  }

  return fields;
};
