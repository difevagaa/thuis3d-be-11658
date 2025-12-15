import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

interface TranslatedSection {
  section_name: string;
  content: Record<string, any>;
}

interface TranslationCache {
  [key: string]: TranslatedSection;
}

/**
 * Hook to translate Page Builder section content based on current language
 * Handles all translatable arrays: features, items, cards, testimonials, benefits, steps
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
      let newContent = JSON.parse(JSON.stringify(originalContent || {}));
      let newName = originalName;

      // Process translations
      data?.forEach(translation => {
        const fieldName = translation.field_name;
        const value = translation.translated_text;
        
        if (!value) return;

        if (fieldName === 'section_name') {
          newName = value;
        } else if (fieldName === 'title') {
          newContent.title = value;
        } else if (fieldName === 'subtitle') {
          newContent.subtitle = value;
        } else if (fieldName === 'description') {
          newContent.description = value;
        } else if (fieldName === 'buttonText') {
          newContent.buttonText = value;
        } else if (fieldName === 'text') {
          newContent.text = value;
        } else if (fieldName === 'headline') {
          newContent.headline = value;
        } else if (fieldName === 'subheadline') {
          newContent.subheadline = value;
        } else if (fieldName === 'label') {
          newContent.label = value;
        } else if (fieldName === 'tagline') {
          newContent.tagline = value;
        } else if (fieldName === 'message') {
          newContent.message = value;
        } else if (fieldName === 'placeholder') {
          newContent.placeholder = value;
        } else {
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
                
                // Initialize array if not exists
                if (!newContent[pattern.key]) {
                  newContent[pattern.key] = [...(originalContent?.[pattern.key] || [])];
                }
                
                // Ensure the item exists
                if (newContent[pattern.key][index]) {
                  newContent[pattern.key][index] = {
                    ...newContent[pattern.key][index],
                    [field]: value
                  };
                }
              }
              break;
            }
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
 * Extended to support all array types
 */
export const getSectionTranslatableFields = (sectionType: string, content: any): { field: string; value: string }[] => {
  const fields: { field: string; value: string }[] = [];

  // Common top-level fields
  const topLevelFields = ['title', 'subtitle', 'description', 'buttonText', 'text', 'headline', 'subheadline', 'label', 'tagline', 'message', 'placeholder'];
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

  return fields;
};
