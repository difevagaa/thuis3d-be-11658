import { useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

/**
 * Hook for data loading with automatic recovery
 * 
 * This hook wraps any data loading function and adds:
 * - Automatic retry logic with exponential backoff
 * - Reconnection event listening
 * - Timeout handling
 * - Error recovery
 * - Prevents infinite loading states
 * 
 * @param loadDataFn - Function that loads data
 * @param options - Configuration options
 */
export function useDataWithRecovery(
  loadDataFn: () => Promise<void>,
  options: {
    timeout?: number;
    maxRetries?: number;
    onError?: (error: unknown) => void;
  } = {}
) {
  const {
    timeout = 15000,
    maxRetries = 3,
    onError
  } = options;

  const retryCountRef = useRef(0);
  const loadingRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load data with timeout and retry logic
   */
  const loadWithTimeout = useCallback(async () => {
    // Skip if already loading
    if (loadingRef.current) {
      logger.debug('[DataWithRecovery] Already loading, skipping');
      return;
    }

    // Clear any pending retry timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    loadingRef.current = true;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), timeout);
      });

      // Race between data loading and timeout
      await Promise.race([
        loadDataFn(),
        timeoutPromise
      ]);

      // Success - reset retry count
      retryCountRef.current = 0;
      logger.info('[DataWithRecovery] Data loaded successfully');

    } catch (error) {
      logger.error('[DataWithRecovery] Error loading data:', error);

      // Handle timeout or connection errors with retry
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
        
        logger.info(`[DataWithRecovery] Retrying in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
        
        // Schedule retry - keep loading state true during delay to prevent race conditions
        // Note: Recursive call is safe here as maxRetries is typically 3, preventing stack overflow
        retryTimeoutRef.current = setTimeout(() => {
          retryTimeoutRef.current = null;
          loadingRef.current = false; // Reset just before retry
          loadWithTimeout();
        }, delay);
        
        return; // Exit early, don't call onError yet
      } else {
        // Max retries reached - notify error handler
        logger.error('[DataWithRecovery] Max retries reached');
        loadingRef.current = false;
        
        if (onError) {
          try {
            onError(error);
          } catch (callbackError) {
            logger.error('[DataWithRecovery] Error in onError callback:', callbackError);
          }
        }
        return;
      }
    }
    
    // Only set to false if we succeeded (not retrying)
    loadingRef.current = false;
  }, [loadDataFn, timeout, maxRetries, onError]);

  /**
   * Handle connection recovery event
   */
  const handleConnectionRecovered = useCallback(() => {
    logger.info('[DataWithRecovery] Connection recovered, reloading data');
    retryCountRef.current = 0; // Reset retry count
    loadingRef.current = false; // Reset loading flag
    loadWithTimeout();
  }, [loadWithTimeout]);

  // Set up listeners and initial load
  useEffect(() => {
    // Initial load
    loadWithTimeout();

    // Listen for connection recovery
    window.addEventListener('connection-recovered', handleConnectionRecovered);

    return () => {
      // Cleanup
      window.removeEventListener('connection-recovered', handleConnectionRecovered);
      
      // Clear any pending retry timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Reset loading state
      loadingRef.current = false;
    };
  }, [loadWithTimeout, handleConnectionRecovered]);

  return {
    reload: loadWithTimeout
  };
}

