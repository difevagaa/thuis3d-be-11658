import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { sessionManager } from '@/lib/supabaseSessionManager';

/**
 * Session Recovery Hook - FIXED VERSION FOR ISSUE #12
 * 
 * CRITICAL FIX: Prevents page reload and session loss on tab switching
 * 
 * PREVIOUS PROBLEMS:
 * - Page reloaded when switching tabs
 * - Session appeared lost after tab switch
 * - Products didn't load after returning to tab
 * - Login state not recognized
 * 
 * NEW APPROACH:
 * - Uses SessionManager to maintain session across visibility changes
 * - Only reloads on ACTUAL sign out, not token refresh
 * - Validates session intelligently without disrupting user experience
 * - Never loses session state on tab switch
 * 
 * Design Principles:
 * 1. Maintain session state during visibility changes
 * 2. NO reloads unless absolutely necessary (actual sign out)
 * 3. Graceful error handling without disrupting UX
 * 4. No infinite loops or stuck states
 */

export function useSessionRecovery() {
  const recoveryAttemptedRef = useRef(false);
  const lastValidationRef = useRef<number>(0);
  const isValidatingRef = useRef(false);
  const isPageVisible = useRef(true);
  
  const VALIDATION_INTERVAL_MS = 300000; // 5 minutes (reduced from 1 minute)
  const MIN_TIME_BETWEEN_VALIDATIONS_MS = 30000; // 30 seconds (increased from 10 seconds)

  /**
   * Validate the current session
   * FIXED: Don't validate when page is hidden to prevent issues during tab switching
   */
  const validateSession = useCallback(async (forceCheck = false): Promise<boolean> => {
    const now = Date.now();

    // CRITICAL FIX: Don't validate when page is hidden (prevents tab switch issues)
    if (!isPageVisible.current && !forceCheck) {
      logger.debug('[SessionRecovery] Skipping validation - page is hidden');
      return true;
    }

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
      // Use session manager instead of direct Supabase call
      const isValid = await sessionManager.validateSession(forceCheck);
      
      if (!isValid) {
        const sessionState = sessionManager.getSessionState();
        // Only clear if there was a session that became invalid
        if (sessionState.lastCheck > 0 && !sessionState.isValid) {
          logger.warn('[SessionRecovery] Session became invalid');
          await clearCorruptedSession();
          return false;
        }
      }

      return isValid;
    } catch (error) {
      logger.error('[SessionRecovery] Unexpected error:', error);
      // Don't clear session on unexpected errors - might be network issue
      return true;
    } finally {
      isValidatingRef.current = false;
    }
  }, []);

  /**
   * Clear corrupted session data
   * FIXED: More conservative - only clear on real corruption, not on tab switches
   */
  const clearCorruptedSession = useCallback(async () => {
    if (recoveryAttemptedRef.current) {
      logger.debug('[SessionRecovery] Recovery already attempted, skipping');
      return;
    }
    recoveryAttemptedRef.current = true;

    logger.info('[SessionRecovery] Clearing corrupted session data...');

    try {
      // Sign out locally only
      await supabase.auth.signOut({ scope: 'local' });

      // Clear session manager state
      sessionManager.clearSession();

      // Only remove Supabase-related items, keep other localStorage data
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('supabase.auth') ||
          key.includes('sb-') && key.includes('-auth-token')
        )) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          logger.debug('[SessionRecovery] Removed:', key);
        } catch {
          // Ignore
        }
      });

      // CRITICAL: Only reload if we're not on auth page
      // Users on auth page don't need reload
      if (!window.location.pathname.includes('/auth')) {
        setTimeout(() => {
          window.location.href = '/auth';
        }, 500);
      }
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

  // Set up periodic validation and visibility tracking
  useEffect(() => {
    // Track page visibility
    const updateVisibility = () => {
      isPageVisible.current = document.visibilityState === 'visible';
      
      // When page becomes visible, validate session after a delay
      if (isPageVisible.current) {
        logger.info('[SessionRecovery] Page became visible, validating session...');
        setTimeout(() => {
          validateSession(true);
        }, 1000);
      }
    };

    // Set initial visibility
    isPageVisible.current = document.visibilityState === 'visible';
    
    // Initial validation (delayed to let page load)
    const initTimer = setTimeout(() => {
      if (isPageVisible.current) {
        validateSession();
      }
    }, 2000);

    // Listen for visibility changes
    document.addEventListener('visibilitychange', updateVisibility);

    // Auth state change listener - CRITICAL: No event dispatching, no reloads
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.info('[SessionRecovery] Auth state changed:', event);
      
      if (event === 'SIGNED_OUT') {
        // User explicitly signed out - clear session and redirect
        sessionManager.clearSession();
        recoveryAttemptedRef.current = false;
        
        if (!window.location.pathname.includes('/auth')) {
          window.location.href = '/auth';
        }
      } else if (event === 'SIGNED_IN') {
        // User signed in - reset recovery flag
        recoveryAttemptedRef.current = false;
        // Update session manager
        if (session) {
          sessionManager.validateSession(true);
        }
      } else if (event === 'TOKEN_REFRESHED') {
        // Token refreshed - this is normal, just update session manager
        recoveryAttemptedRef.current = false;
        if (session) {
          sessionManager.validateSession(true);
        }
      }
    });

    // Periodic validation (only when page is visible)
    const intervalId = setInterval(() => {
      if (isPageVisible.current) {
        validateSession();
      }
    }, VALIDATION_INTERVAL_MS);

    // FIXED: Storage event handler - only reload on EXPLICIT sign out
    const handleStorageEvent = (event: StorageEvent) => {
      // CRITICAL FIX: Only reload on actual sign out, not on token refresh
      // Problem: Supabase updates localStorage when refreshing tokens on tab switch
      // This was causing unnecessary page reloads that cleared app state
      if (event.key && (event.key.includes('supabase') || event.key.includes('sb-'))) {
        // Only reload if session was explicitly removed (sign out in another tab)
        // Don't reload on token refresh or session updates
        if (event.oldValue && !event.newValue) {
          try {
            const oldData = JSON.parse(event.oldValue);
            // Check if this was an actual session (had access_token)
            if (oldData && (oldData.access_token || oldData.currentSession)) {
              logger.info('[SessionRecovery] Session removed in another tab, redirecting...');
              sessionManager.clearSession();
              // Redirect instead of reload to preserve state
              window.location.href = '/auth';
            }
          } catch (error) {
            // If we can't parse the old value, it wasn't a valid session
            // Don't reload in this case
            logger.warn('[SessionRecovery] Could not parse storage event data:', error);
          }
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
      document.removeEventListener('visibilitychange', updateVisibility);
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
