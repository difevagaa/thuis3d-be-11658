import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

export interface ContextualHelp {
  id: string;
  help_type: 'tooltip' | 'info_box' | 'tutorial' | 'warning' | 'best_practice' | 'example' | 'tip' | 'faq';
  title: string;
  content: string;
  icon: string;
  color: string;
  position: 'top' | 'right' | 'bottom' | 'left' | 'center';
  trigger_on: 'hover' | 'click' | 'auto' | 'focus';
  auto_show: boolean;
  dismissible: boolean;
  related_docs_url?: string;
  related_video_url?: string;
}

/**
 * Hook para cargar y gestionar ayudas contextuales
 * Carga ayudas específicas para cada sección del panel admin
 */
export const useContextualHelp = (section: string, context?: string) => {
  const { i18n } = useTranslation();
  const [helps, setHelps] = useState<ContextualHelp[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoShowHelps, setAutoShowHelps] = useState<ContextualHelp[]>([]);

  /**
   * Carga las ayudas contextuales para la sección actual
   */
  const loadHelps = useCallback(async () => {
    try {
      setLoading(true);

      // Obtener el idioma actual (es, en, nl)
      const language = i18n.language?.substring(0, 2) || 'es';

      const { data, error } = await supabase.rpc('get_contextual_help', {
        p_section: section,
        p_context: context || null,
        p_language: language
      });

      if (error) throw error;

      const helpData = (data || []) as ContextualHelp[];
      setHelps(helpData);

      // Filtrar las que deben mostrarse automáticamente
      const autoShow = helpData.filter(h => h.auto_show);
      setAutoShowHelps(autoShow);

    } catch (error) {
      console.error('Error loading contextual help:', error);
      setHelps([]);
    } finally {
      setLoading(false);
    }
  }, [section, context, i18n.language]);

  useEffect(() => {
    loadHelps();
  }, [loadHelps]);

  /**
   * Registra que el usuario vio una ayuda
   */
  const trackHelpViewed = useCallback(async (helpId: string) => {
    try {
      await supabase.rpc('track_help_interaction', {
        p_help_message_id: helpId,
        p_event_type: 'viewed',
        p_section: section,
        p_context: context || null
      });
    } catch (error) {
      console.error('Error tracking help view:', error);
    }
  }, [section, context]);

  /**
   * Registra que el usuario hizo clic en una ayuda
   */
  const trackHelpClicked = useCallback(async (helpId: string) => {
    try {
      await supabase.rpc('track_help_interaction', {
        p_help_message_id: helpId,
        p_event_type: 'clicked',
        p_section: section,
        p_context: context || null
      });
    } catch (error) {
      console.error('Error tracking help click:', error);
    }
  }, [section, context]);

  /**
   * Registra que el usuario cerró/descartó una ayuda
   */
  const trackHelpDismissed = useCallback(async (helpId: string) => {
    try {
      await supabase.rpc('track_help_interaction', {
        p_help_message_id: helpId,
        p_event_type: 'dismissed',
        p_section: section,
        p_context: context || null
      });
    } catch (error) {
      console.error('Error tracking help dismiss:', error);
    }
  }, [section, context]);

  /**
   * Registra que el usuario marcó la ayuda como útil
   */
  const trackHelpHelpful = useCallback(async (helpId: string, isHelpful: boolean) => {
    try {
      await supabase.rpc('track_help_interaction', {
        p_help_message_id: helpId,
        p_event_type: isHelpful ? 'helpful' : 'not_helpful',
        p_section: section,
        p_context: context || null
      });
    } catch (error) {
      console.error('Error tracking help feedback:', error);
    }
  }, [section, context]);

  /**
   * Obtiene ayudas por tipo específico
   */
  const getHelpsByType = useCallback((type: ContextualHelp['help_type']) => {
    return helps.filter(h => h.help_type === type);
  }, [helps]);

  /**
   * Obtiene una ayuda por contexto específico
   */
  const getHelpByContext = useCallback((specificContext: string) => {
    // Aquí asumimos que el contexto está en algún campo que lo identifique
    // Podríamos necesitar hacer otra query si queremos ser más específicos
    return helps.find(h => h.title.toLowerCase().includes(specificContext.toLowerCase()));
  }, [helps]);

  return {
    helps,
    loading,
    autoShowHelps,
    trackHelpViewed,
    trackHelpClicked,
    trackHelpDismissed,
    trackHelpHelpful,
    getHelpsByType,
    getHelpByContext,
    reload: loadHelps
  };
};
