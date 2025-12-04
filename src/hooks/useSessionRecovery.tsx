import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Session Recovery Hook - AMAZON-STYLE SIMPLICITY
 * 
 * PRINCIPLE: Do as little as possible, be invisible to the user
 * 
 * This hook ONLY:
 * 1. Listens for auth state changes (sign in/out)
 * 2. Cleans up localStorage if quota is exceeded
 * 3. NEVER interrupts the user experience
 * 4. NEVER reloads the page
 * 
 * React Query handles all data fetching automatically
 */

export function useSessionRecovery() {
  const hasInitialized = useRef(false);

  /**
   * Handle storage quota errors
   */
  const handleStorageError = useCallback(() => {
    logger.warn('[SessionRecovery] Storage quota exceeded, cleaning up...');

    try {
      const keysToKeep = ['theme', 'i18nextLng', 'cookie-consent'];
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToKeep.some(k => key.includes(k))) {
          if (key.includes('cache') || key.includes('temp') || key.includes('draft')) {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore
        }
      });
    } catch (error) {
      logger.error('[SessionRecovery] Storage cleanup failed:', error);
    }
  }, []);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Listen for auth state changes - just log them
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      logger.info('[SessionRecovery] Auth event:', event);
      // That's it - React Query will handle data updates automatically
    });

    // Listen for storage errors
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.error?.name === 'QuotaExceededError' ||
          event.message?.includes('QuotaExceededError') ||
          event.message?.includes('quota')) {
        handleStorageError();
      }
    };

    window.addEventListener('error', handleGlobalError);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('error', handleGlobalError);
    };
  }, [handleStorageError]);

  return {
    handleStorageError
  };
}
