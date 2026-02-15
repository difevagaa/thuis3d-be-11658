import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TransitionRule {
  id: string;
  suggests_status_type: string;
  suggests_status_value: string;
  prompt_type: string;
  prompt_title: string;
  prompt_message: string;
  options: Array<{
    value: string;
    label_es: string;
    label_en?: string;
    label_nl?: string;
    action: string;
    status?: string;
    variant?: string;
  }>;
  is_mandatory: boolean;
}

export interface StatusChangeResult {
  shouldPrompt: boolean;
  rules: TransitionRule[];
  appliedChanges?: Record<string, any>;
}

/**
 * Hook para manejar reglas de transición de estados inteligentes
 * Detecta cambios de estado y sugiere acciones relacionadas
 */
export const useStatusTransitionRules = () => {
  const [loading, setLoading] = useState(false);

  /**
   * Obtiene las reglas aplicables para una transición de estado
   */
  const getApplicableRules = useCallback(async (
    entityType: string,
    fromStatusType: string,
    fromStatusValue: string
  ): Promise<TransitionRule[]> => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_applicable_transition_rules', {
        p_entity_type: entityType,
        p_from_status_type: fromStatusType,
        p_from_status_value: fromStatusValue
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting transition rules:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Aplica una acción sugerida por una regla
   */
  const applyRuleAction = useCallback(async (
    entityId: string,
    tableName: string,
    action: string,
    statusType: string,
    statusValue: string,
    ruleId?: string
  ): Promise<boolean> => {
    try {
      if (action === 'none') return true;

      // Actualizar el estado correspondiente
      const updateField = statusType === 'payment_status' ? 'payment_status' : 'status_id';
      
      let updateData: Record<string, any> = {};
      
      if (statusType === 'payment_status') {
        updateData.payment_status = statusValue;
      } else if (statusType === 'order_status') {
        // Si es order_status, necesitamos buscar el ID del status por su nombre
        const { data: statusData, error: statusError } = await supabase
          .from('order_statuses')
          .select('id')
          .eq('name', statusValue)
          .is('deleted_at', null)
          .single();

        if (statusError) {
          console.error('Error finding status:', statusError);
          // Si no encontramos el status por nombre, intentamos con el valor directo
          updateData.status_id = statusValue;
        } else {
          updateData.status_id = statusData.id;
        }
      } else {
        updateData[statusType] = statusValue;
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', entityId);

      if (error) throw error;

      // Registrar analytics de la regla aplicada
      if (ruleId) {
        await trackRuleInteraction(ruleId, 'completed');
      }

      return true;
    } catch (error) {
      console.error('Error applying rule action:', error);
      toast.error('Error al aplicar la acción sugerida');
      return false;
    }
  }, []);

  /**
   * Registra interacción con una regla en analytics
   */
  const trackRuleInteraction = useCallback(async (
    ruleId: string,
    eventType: 'viewed' | 'completed' | 'ignored' | 'dismissed'
  ) => {
    try {
      await supabase.rpc('track_help_interaction', {
        p_transition_rule_id: ruleId,
        p_event_type: eventType
      });
    } catch (error) {
      console.error('Error tracking rule interaction:', error);
    }
  }, []);

  /**
   * Verifica si hay reglas aplicables y las devuelve
   */
  const checkTransition = useCallback(async (
    entityType: string,
    entityId: string,
    tableName: string,
    oldValue: any,
    newValue: any,
    statusType: string
  ): Promise<StatusChangeResult> => {
    try {
      // Si no cambió el valor, no hay reglas que aplicar
      if (oldValue === newValue) {
        return { shouldPrompt: false, rules: [] };
      }

      // Obtener reglas aplicables
      const rules = await getApplicableRules(entityType, statusType, newValue);

      if (rules.length === 0) {
        return { shouldPrompt: false, rules: [] };
      }

      // Registrar que vimos las reglas
      for (const rule of rules) {
        await trackRuleInteraction(rule.id, 'viewed');
      }

      return {
        shouldPrompt: true,
        rules
      };
    } catch (error) {
      console.error('Error checking transition:', error);
      return { shouldPrompt: false, rules: [] };
    }
  }, [getApplicableRules, trackRuleInteraction]);

  return {
    getApplicableRules,
    applyRuleAction,
    trackRuleInteraction,
    checkTransition,
    loading
  };
};
