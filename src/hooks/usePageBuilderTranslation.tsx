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
      let newContent = { ...originalContent };
      let newName = originalName;

      data?.forEach(translation => {
        if (translation.field_name === 'section_name') {
          newName = translation.translated_text || originalName;
        } else if (translation.field_name === 'title') {
          newContent.title = translation.translated_text || originalContent?.title;
        } else if (translation.field_name === 'subtitle') {
          newContent.subtitle = translation.translated_text || originalContent?.subtitle;
        } else if (translation.field_name === 'description') {
          newContent.description = translation.translated_text || originalContent?.description;
        } else if (translation.field_name === 'buttonText') {
          newContent.buttonText = translation.translated_text || originalContent?.buttonText;
        } else if (translation.field_name === 'text') {
          newContent.text = translation.translated_text || originalContent?.text;
        } else if (translation.field_name.startsWith('items_')) {
          // Handle array items (e.g., items_0_title, items_1_description)
          const match = translation.field_name.match(/items_(\d+)_(\w+)/);
          if (match) {
            const index = parseInt(match[1]);
            const field = match[2];
            if (!newContent.items) newContent.items = [...(originalContent?.items || [])];
            if (newContent.items[index]) {
              newContent.items[index] = {
                ...newContent.items[index],
                [field]: translation.translated_text
              };
            }
          }
        } else if (translation.field_name.startsWith('cards_')) {
          // Handle card items
          const match = translation.field_name.match(/cards_(\d+)_(\w+)/);
          if (match) {
            const index = parseInt(match[1]);
            const field = match[2];
            if (!newContent.cards) newContent.cards = [...(originalContent?.cards || [])];
            if (newContent.cards[index]) {
              newContent.cards[index] = {
                ...newContent.cards[index],
                [field]: translation.translated_text
              };
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
 */
export const getSectionTranslatableFields = (sectionType: string, content: any): { field: string; value: string }[] => {
  const fields: { field: string; value: string }[] = [];

  // Common fields
  if (content?.title) fields.push({ field: 'title', value: content.title });
  if (content?.subtitle) fields.push({ field: 'subtitle', value: content.subtitle });
  if (content?.description) fields.push({ field: 'description', value: content.description });
  if (content?.buttonText) fields.push({ field: 'buttonText', value: content.buttonText });
  if (content?.text) fields.push({ field: 'text', value: content.text });

  // Array items (features, cards, etc.)
  if (content?.items && Array.isArray(content.items)) {
    content.items.forEach((item: any, index: number) => {
      if (item?.title) fields.push({ field: `items_${index}_title`, value: item.title });
      if (item?.description) fields.push({ field: `items_${index}_description`, value: item.description });
      if (item?.text) fields.push({ field: `items_${index}_text`, value: item.text });
      if (item?.buttonText) fields.push({ field: `items_${index}_buttonText`, value: item.buttonText });
    });
  }

  // Cards
  if (content?.cards && Array.isArray(content.cards)) {
    content.cards.forEach((card: any, index: number) => {
      if (card?.title) fields.push({ field: `cards_${index}_title`, value: card.title });
      if (card?.description) fields.push({ field: `cards_${index}_description`, value: card.description });
      if (card?.buttonText) fields.push({ field: `cards_${index}_buttonText`, value: card.buttonText });
    });
  }

  return fields;
};
