import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Session Recovery Hook - Best Practices 2024
 * 
 * This hook handles common issues when users have stale cookies/cache:
 * 1. Detects when session tokens are corrupted or expired
 * 2. Clears stale session data that causes connection issues
 * 3. Attempts to recover or gracefully degrades to unauthenticated state
 * 4. Ensures products and data load even when session is problematic
 * 5. Handles storage quota errors gracefully
 */
export function useSessionRecovery() {
  const recoveryAttempted = useRef(false);
  const lastCheck = useRef<number>(0);
  const isValidating = useRef(false);
  const CHECK_INTERVAL = 60000; // 60 seconds between checks (reduced frequency)

  /**
   * Validates the current session and clears if corrupted
   */
  const validateSession = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    
    // Throttle checks to avoid excessive API calls
    if (now - lastCheck.current < CHECK_INTERVAL || isValidating.current) {
      return true;
    }
    
    isValidating.current = true;
    lastCheck.current = now;

    try {
      // First, try to get the session from local storage
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logger.warn('[SessionRecovery] Error getting session:', error);
        
        // If there's an error with the session, it might be corrupted
        if (error.message?.includes('invalid') || 
            error.message?.includes('expired') ||
            error.message?.includes('token') ||
            error.message?.includes('malformed')) {
          await clearCorruptedSession();
          return false;
        }
      }
      
      // If there's a session, validate it's still active
      if (session?.access_token) {
        try {
          // Make a lightweight API call to verify the session is still valid
          const { error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            logger.warn('[SessionRecovery] Session validation failed:', userError);
            
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
        } catch (validationError) {
          // Don't clear session on network errors, just continue
          logger.debug('[SessionRecovery] Network error during validation (ignoring):', validationError);
        }
      }
      
      return true;
    } catch (error) {
      logger.error('[SessionRecovery] Unexpected error during session validation:', error);
      return true; // Don't clear session on unexpected errors
    } finally {
      isValidating.current = false;
    }
  }, []);

  /**
   * Clears corrupted session data from storage
   */
  const clearCorruptedSession = useCallback(async () => {
    if (recoveryAttempted.current) {
      return; // Only attempt recovery once per session
    }
    recoveryAttempted.current = true;

    logger.info('[SessionRecovery] Clearing corrupted session data...');
    
    try {
      // Sign out to clear the Supabase session properly
      await supabase.auth.signOut({ scope: 'local' });
      
      // Clear any cached session data that might be corrupted
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('supabase') ||
          key.includes('sb-') ||
          key.includes('auth-token') ||
          key.includes('supabase.auth')
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore removal errors
        }
      });
      
      // Also clear sessionStorage
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('sb-'))) {
            sessionStorage.removeItem(key);
          }
        }
      } catch {
        // Ignore sessionStorage errors
      }
      
      logger.info('[SessionRecovery] Session data cleared successfully');
      
      // Reload the page to reset the application state
      // Use a small delay to ensure cleanup is complete
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      logger.error('[SessionRecovery] Error clearing session:', error);
    }
  }, []);

  /**
   * Recovers from storage quota exceeded errors
   */
  const handleStorageError = useCallback(() => {
    logger.warn('[SessionRecovery] Storage error detected, cleaning up...');
    
    try {
      // Clear non-essential cached data
      const keysToKeep = ['theme', 'i18nextLng', 'cookie-consent', 'supabase.auth.token'];
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToKeep.some(k => key.includes(k))) {
          // Remove non-essential items
          if (key.includes('cache') || key.includes('temp') || key.includes('draft')) {
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore individual removal errors
        }
      });
      
      logger.info('[SessionRecovery] Storage cleanup complete');
    } catch (error) {
      logger.error('[SessionRecovery] Storage cleanup failed:', error);
    }
  }, []);

  /**
   * Ensures data loads even without valid session
   * This prevents the "blank page" issue
   */
  const ensureDataLoading = useCallback(() => {
    // Dispatch custom event to notify components to reload data
    window.dispatchEvent(new CustomEvent('session-recovered'));
  }, []);

  // Set up session validation on mount and periodically
  useEffect(() => {
    // Initial validation with small delay to let app initialize
    const initTimer = setTimeout(() => {
      validateSession().then(isValid => {
        if (isValid) {
          ensureDataLoading();
        }
      });
    }, 1000);

    // Set up auth state change listener for recovery
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, _session) => {
      if (event === 'TOKEN_REFRESHED') {
        logger.debug('[SessionRecovery] Token refreshed successfully');
        recoveryAttempted.current = false; // Reset recovery flag
      } else if (event === 'SIGNED_OUT') {
        logger.debug('[SessionRecovery] User signed out');
        recoveryAttempted.current = false;
      } else if (event === 'SIGNED_IN') {
        logger.debug('[SessionRecovery] User signed in');
        recoveryAttempted.current = false;
        ensureDataLoading();
      }
    });

    // Validate session periodically (less frequently)
    const intervalId = setInterval(() => {
      validateSession();
    }, CHECK_INTERVAL);

    // Listen for storage changes from other tabs
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key && (event.key.includes('supabase') || event.key.includes('sb-'))) {
        // Session storage was modified externally (another tab)
        // Reload to sync state
        if (event.oldValue && !event.newValue) {
          // Session was cleared in another tab
          window.location.reload();
        }
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    // Listen for visibility changes to validate when user returns
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User returned to tab - validate session after a short delay
        setTimeout(() => validateSession(), 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for online/offline events
    const handleOnline = () => {
      logger.debug('[SessionRecovery] Network restored, validating session...');
      validateSession();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      clearTimeout(initTimer);
      subscription.unsubscribe();
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageEvent);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [validateSession, ensureDataLoading]);

  // Listen for storage quota errors
  useEffect(() => {
    const originalSetItem = localStorage.setItem.bind(localStorage);
    
    localStorage.setItem = function(key: string, value: string) {
      try {
        originalSetItem(key, value);
      } catch (e) {
        if (e instanceof Error && (e.name === 'QuotaExceededError' || e.message.includes('quota'))) {
          handleStorageError();
          // Retry after cleanup
          try {
            originalSetItem(key, value);
          } catch {
            // Give up on this item
            logger.warn('[SessionRecovery] Could not save item after cleanup:', key);
          }
        } else {
          throw e;
        }
      }
    };

    return () => {
      localStorage.setItem = originalSetItem;
    };
  }, [handleStorageError]);

  return {
    validateSession,
    clearCorruptedSession,
    handleStorageError
  };
}
