import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { ContextualHelp } from './useContextualHelp';

/**
 * Hook for searching contextual help messages
 * Allows searching across all sections and contexts
 */
export const useHelpSearch = () => {
  const { i18n } = useTranslation();
  const [results, setResults] = useState<ContextualHelp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Search help messages by query string
   * Searches in title and content fields
   */
  const searchHelp = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const language = i18n.language?.substring(0, 2) || 'es';
      const searchTerm = `%${query.toLowerCase()}%`;

      // Build the query based on language
      let titleColumn = 'title_es';
      let contentColumn = 'content_es';

      if (language === 'en') {
        titleColumn = 'COALESCE(title_en, title_es)';
        contentColumn = 'COALESCE(content_en, content_es)';
      } else if (language === 'nl') {
        titleColumn = 'COALESCE(title_nl, title_es)';
        contentColumn = 'COALESCE(content_nl, content_es)';
      }

      // Search using ilike for case-insensitive search
      const { data, error: searchError } = await supabase
        .from('contextual_help_messages')
        .select('*')
        .eq('is_active', true)
        .or(`title_es.ilike.${searchTerm},title_en.ilike.${searchTerm},title_nl.ilike.${searchTerm},content_es.ilike.${searchTerm},content_en.ilike.${searchTerm},content_nl.ilike.${searchTerm},section.ilike.${searchTerm},context.ilike.${searchTerm}`)
        .order('priority', { ascending: false })
        .limit(20);

      if (searchError) throw searchError;

      // Transform to ContextualHelp format with language-specific fields
      const helpData: ContextualHelp[] = (data || []).map((item: any) => ({
        id: item.id,
        help_type: item.help_type,
        title: language === 'en' 
          ? (item.title_en || item.title_es)
          : language === 'nl'
          ? (item.title_nl || item.title_es)
          : item.title_es,
        content: language === 'en'
          ? (item.content_en || item.content_es)
          : language === 'nl'
          ? (item.content_nl || item.content_es)
          : item.content_es,
        icon: item.icon,
        color: item.color,
        position: item.position,
        trigger_on: item.trigger_on,
        auto_show: item.auto_show,
        dismissible: item.dismissible,
        related_docs_url: item.related_docs_url,
        related_video_url: item.related_video_url
      }));

      setResults(helpData);
    } catch (err: any) {
      console.error('Error searching help:', err);
      setError(err.message || 'Error al buscar ayuda');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [i18n.language]);

  /**
   * Clear search results
   */
  const clearSearch = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    searchHelp,
    clearSearch
  };
};
