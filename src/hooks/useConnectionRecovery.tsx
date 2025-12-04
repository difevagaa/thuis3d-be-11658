import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Simple Connection Recovery Hook - COMPLETELY REWRITTEN
 * 
 * Design: When the page becomes visible after being in background,
 * ALWAYS dispatch recovery event to trigger data reload.
 * Don't wait for connection test - just reload.
 * 
 * The data loading functions themselves handle timeouts and errors.
 */

export function useConnectionRecovery() {
  const wasInBackgroundRef = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Dispatch recovery on mount (initial load)
    if (!initializedRef.current) {
      initializedRef.current = true;
      logger.info('[ConnectionRecovery] Dispatching initial connection-recovered');
      // Small delay to ensure components are mounted
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('connection-recovered'));
      }, 100);
    }

    /**
     * Handle tab visibility changes - SIMPLE version
     * Just dispatch recovery event, let data loaders handle the rest
     */
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (wasInBackgroundRef.current) {
          logger.info('[ConnectionRecovery] Page visible again, dispatching recovery');
          wasInBackgroundRef.current = false;
          
          // Dispatch recovery event immediately - data loaders will retry if needed
          window.dispatchEvent(new CustomEvent('connection-recovered'));
        }
      } else {
        wasInBackgroundRef.current = true;
        logger.debug('[ConnectionRecovery] Page going to background');
      }
    };

    /**
     * Handle page restoration from browser cache
     */
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        logger.info('[ConnectionRecovery] Page restored from bfcache, dispatching recovery');
        window.dispatchEvent(new CustomEvent('connection-recovered'));
      }
    };

    /**
     * Handle network coming back online
     */
    const handleOnline = () => {
      logger.info('[ConnectionRecovery] Network online, dispatching recovery');
      window.dispatchEvent(new CustomEvent('connection-recovered'));
    };

    /**
     * Handle window focus
     */
    const handleFocus = () => {
      if (wasInBackgroundRef.current) {
        logger.info('[ConnectionRecovery] Window focused, dispatching recovery');
        wasInBackgroundRef.current = false;
        window.dispatchEvent(new CustomEvent('connection-recovered'));
      }
    };

    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  return {};
}

// Export simple utility to test if we can reach Supabase
export async function testSupabaseConnection(timeoutMs = 3000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const { error } = await supabase
      .from('products')
      .select('id')
      .limit(1)
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);
    return !error;
  } catch {
    return false;
  }
}
