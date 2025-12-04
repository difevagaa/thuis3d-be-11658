import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Session Recovery Hook - REWRITTEN FOR RELIABILITY
 * 
 * This hook handles session validation and cleanup:
 * 1. Validates sessions periodically
 * 2. Clears corrupted session data
 * 3. Handles storage quota errors
 * 4. Responds to connection recovery events
 * 
 * Design Principles:
 * 1. Simple session validation logic
 * 2. No duplicate connection handling (delegated to useConnectionRecovery)
 * 3. Graceful error handling
 * 4. No infinite loops or stuck states
 */

export function useSessionRecovery() {
  const recoveryAttemptedRef = useRef(false);
  const lastValidationRef = useRef<number>(0);
  const isValidatingRef = useRef(false);
  
  const VALIDATION_INTERVAL_MS = 30000; // 30 seconds between validations
  const MIN_TIME_BETWEEN_VALIDATIONS_MS = 5000; // Don't validate more than once per 5 seconds

  /**
   * Validate the current session
   * Returns true if session is valid or no session exists
   * Returns false only if session is corrupted
   */
  const validateSession = useCallback(async (forceCheck = false): Promise<boolean> => {
    const now = Date.now();

    // Throttle validations (unless forced)
    if (!forceCheck) {
      if (isValidatingRef.current) {
        logger.debug('[SessionRecovery] Validation already in progress');
        return true;
      }
      if (now - lastValidationRef.current < MIN_TIME_BETWEEN_VALIDATIONS_MS) {
        logger.debug('[SessionRecovery] Too soon since last validation');
        return true;
      }
    }

    isValidatingRef.current = true;
    lastValidationRef.current = now;

    try {
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();

      // If error getting session, it might be corrupted
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

      // If there's a session, verify it's still valid
      if (session?.access_token) {
        const { error: userError } = await supabase.auth.getUser();

        if (userError) {
          logger.warn('[SessionRecovery] Session validation failed:', userError.message);

          // Session exists but is invalid - clear it
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
      logger.error('[SessionRecovery] Unexpected error during validation:', error);
      return true; // Don't clear session on unexpected errors
    } finally {
      isValidatingRef.current = false;
    }
  }, []);

  /**
   * Clear corrupted session data
   */
  const clearCorruptedSession = useCallback(async () => {
    if (recoveryAttemptedRef.current) {
      logger.debug('[SessionRecovery] Recovery already attempted');
      return;
    }
    recoveryAttemptedRef.current = true;

    logger.info('[SessionRecovery] Clearing corrupted session data...');

    try {
      // Sign out locally
      await supabase.auth.signOut({ scope: 'local' });

      // Clear localStorage items related to auth
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
          // Ignore errors
        }
      });

      // Clear sessionStorage items
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('sb-'))) {
            sessionStorage.removeItem(key);
          }
        }
      } catch {
        // Ignore errors
      }

      logger.info('[SessionRecovery] Session data cleared, reloading page...');

      // Reload page after a short delay
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
      // Keep essential items, remove cache/temp items
      const keysToKeep = ['theme', 'i18nextLng', 'cookie-consent', 'supabase.auth.token'];
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
          // Ignore errors
        }
      });

      logger.info('[SessionRecovery] Storage cleanup complete');
    } catch (error) {
      logger.error('[SessionRecovery] Storage cleanup failed:', error);
    }
  }, []);

  // Set up periodic validation and event listeners
  useEffect(() => {
    // Initial validation (delayed to allow app initialization)
    const initTimer = setTimeout(() => {
      validateSession();
    }, 1000);

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, _session) => {
      if (event === 'TOKEN_REFRESHED') {
        logger.debug('[SessionRecovery] Token refreshed');
        recoveryAttemptedRef.current = false;
      } else if (event === 'SIGNED_OUT') {
        logger.debug('[SessionRecovery] User signed out');
        recoveryAttemptedRef.current = false;
      } else if (event === 'SIGNED_IN') {
        logger.debug('[SessionRecovery] User signed in');
        recoveryAttemptedRef.current = false;
        window.dispatchEvent(new CustomEvent('session-recovered'));
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
          // Session was cleared in another tab
          window.location.reload();
        }
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    // Listen for connection recovery - validate session when connection recovers
    const handleConnectionRecovered = () => {
      logger.info('[SessionRecovery] Connection recovered, validating session...');
      validateSession(true).then(isValid => {
        if (isValid) {
          window.dispatchEvent(new CustomEvent('session-recovered'));
        }
      });
    };

    window.addEventListener('connection-recovered', handleConnectionRecovered);

    // Listen for storage errors
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.error?.name === 'QuotaExceededError' ||
          event.message?.includes('QuotaExceededError') ||
          event.message?.includes('quota')) {
        handleStorageError();
      }
    };

    window.addEventListener('error', handleGlobalError);

    // Cleanup
    return () => {
      clearTimeout(initTimer);
      subscription.unsubscribe();
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('connection-recovered', handleConnectionRecovered);
      window.removeEventListener('error', handleGlobalError);
    };
  }, [validateSession, handleStorageError]);

  return {
    validateSession,
    clearCorruptedSession,
    handleStorageError
  };
}
