import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Session Recovery Hook - SIMPLIFIED VERSION
 * 
 * This hook handles session validation and cleanup.
 * It does NOT dispatch events that cause other components to reload.
 * 
 * Design Principles:
 * 1. Simple session validation logic
 * 2. NO dispatching events that cause reloads
 * 3. Graceful error handling
 * 4. No infinite loops or stuck states
 */

export function useSessionRecovery() {
  const recoveryAttemptedRef = useRef(false);
  const lastValidationRef = useRef<number>(0);
  const isValidatingRef = useRef(false);
  
  const VALIDATION_INTERVAL_MS = 60000; // 60 seconds between validations
  const MIN_TIME_BETWEEN_VALIDATIONS_MS = 10000; // Don't validate more than once per 10 seconds

  /**
   * Validate the current session
   */
  const validateSession = useCallback(async (forceCheck = false): Promise<boolean> => {
    const now = Date.now();

    // Throttle validations (unless forced)
    if (!forceCheck) {
      if (isValidatingRef.current) {
        return true;
      }
      if (now - lastValidationRef.current < MIN_TIME_BETWEEN_VALIDATIONS_MS) {
        return true;
      }
    }

    isValidatingRef.current = true;
    lastValidationRef.current = now;

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        logger.warn('[SessionRecovery] Error getting session:', error.message);
        
        if (error.message?.includes('invalid') || 
            error.message?.includes('expired') ||
            error.message?.includes('token') ||
            error.message?.includes('malformed')) {
          await clearCorruptedSession();
          return false;
        }
      }

      if (session?.access_token) {
        const { error: userError } = await supabase.auth.getUser();

        if (userError) {
          if (userError.message?.includes('invalid') ||
              userError.message?.includes('expired') ||
              userError.message?.includes('JWT') ||
              userError.status === 401 ||
              userError.status === 403) {
            await clearCorruptedSession();
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      logger.error('[SessionRecovery] Unexpected error:', error);
      return true;
    } finally {
      isValidatingRef.current = false;
    }
  }, []);

  /**
   * Clear corrupted session data
   */
  const clearCorruptedSession = useCallback(async () => {
    if (recoveryAttemptedRef.current) {
      return;
    }
    recoveryAttemptedRef.current = true;

    logger.info('[SessionRecovery] Clearing corrupted session data...');

    try {
      await supabase.auth.signOut({ scope: 'local' });

      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('supabase') ||
          key.includes('sb-') ||
          key.includes('auth-token')
        )) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore
        }
      });

      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      logger.error('[SessionRecovery] Error clearing session:', error);
    }
  }, []);

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

  // Set up periodic validation
  useEffect(() => {
    // Initial validation
    const initTimer = setTimeout(() => {
      validateSession();
    }, 2000);

    // Auth state change listener - NO EVENT DISPATCHING
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, _session) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
        recoveryAttemptedRef.current = false;
      }
    });

    // Periodic validation
    const intervalId = setInterval(() => {
      validateSession();
    }, VALIDATION_INTERVAL_MS);

    // Listen for storage changes from other tabs
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key && (event.key.includes('supabase') || event.key.includes('sb-'))) {
        if (event.oldValue && !event.newValue) {
          window.location.reload();
        }
      }
    };

    window.addEventListener('storage', handleStorageEvent);

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
      clearTimeout(initTimer);
      subscription.unsubscribe();
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('error', handleGlobalError);
    };
  }, [validateSession, handleStorageError]);

  return {
    validateSession,
    clearCorruptedSession,
    handleStorageError
  };
}
