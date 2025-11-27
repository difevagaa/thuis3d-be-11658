import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

interface TranslatedContent {
  [key: string]: string;
}

export const useTranslatedContent = (
  entityType: string,
  entityId: string,
  fields: string[],
  originalContent: any
) => {
  const { i18n } = useTranslation();
  const [content, setContent] = useState<TranslatedContent>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTranslations();
    // We intentionally depend on the base language code to avoid issues with
    // regional variants like "en-US", "nl-BE", etc.
  }, [i18n.language, entityId, entityType, JSON.stringify(originalContent)]);

  const loadTranslations = async () => {
    // Normalise language code so that "en-US" → "en", "nl-BE" → "nl", etc.
    const baseLang = i18n.language.split('-')[0];

    // If the language is Spanish, use original content
    if (baseLang === 'es') {
      const originalData: TranslatedContent = {};
      fields.forEach(field => {
        originalData[field] = originalContent?.[field] || '';
      });
      setContent(originalData);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('translations')
        .select('field_name, translated_text')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('language', baseLang)
        .in('field_name', fields);

      if (error) throw error;

      const translatedData: TranslatedContent = {};
      
      // Mapear traducciones obtenidas
      data?.forEach(translation => {
        translatedData[translation.field_name] = translation.translated_text;
      });

      // Para campos sin traducción, usar contenido original como fallback
      fields.forEach(field => {
        if (!translatedData[field]) {
          translatedData[field] = originalContent?.[field] || '';
        }
      });

      setContent(translatedData);
    } catch (error) {
      console.error('Error loading translations:', error);
      // Fallback al contenido original
      const fallbackData: TranslatedContent = {};
      fields.forEach(field => {
        fallbackData[field] = originalContent?.[field] || '';
      });
      setContent(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  return { content, loading };
};
