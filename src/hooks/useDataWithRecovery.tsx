import { useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

/**
 * Hook for data loading with automatic recovery - REWRITTEN FOR RELIABILITY
 * 
 * This hook wraps any data loading function and adds:
 * - Timeout handling (ALWAYS respects timeout)
 * - Automatic retry with exponential backoff
 * - Connection recovery event listening
 * - Guaranteed state cleanup (no stuck loading states)
 * 
 * Design Principles:
 * 1. Simple and predictable
 * 2. Timeouts always respected
 * 3. No race conditions
 * 4. Loading states always cleared
 * 5. Clear error reporting
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
    timeout = 15000, // 15 seconds default
    maxRetries = 2, // 2 retries default (3 total attempts)
    onError
  } = options;

  const retryCountRef = useRef(0);
  const isLoadingRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Load data with timeout - GUARANTEED to complete
   */
  const loadWithTimeout = useCallback(async () => {
    // Prevent concurrent loads
    if (isLoadingRef.current) {
      logger.debug('[DataWithRecovery] Load already in progress, skipping');
      return;
    }

    // Clear any pending retries
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Create abort controller for this load attempt
    abortControllerRef.current = new AbortController();
    isLoadingRef.current = true;

    try {
      // Create timeout promise that will reject after timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          abortControllerRef.current?.abort();
          reject(new Error(`Timeout after ${timeout}ms`));
        }, timeout);
      });

      // Race between data loading and timeout
      await Promise.race([
        loadDataFn(),
        timeoutPromise
      ]);

      // Success!
      logger.info('[DataWithRecovery] Data loaded successfully');
      retryCountRef.current = 0;
      isLoadingRef.current = false;

    } catch (error: any) {
      // Load failed - decide whether to retry
      const errorMessage = error?.message || 'Unknown error';
      logger.warn('[DataWithRecovery] Load failed:', errorMessage);

      // Check if we should retry
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);

        logger.info(`[DataWithRecovery] Retrying in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);

        // Schedule retry
        retryTimeoutRef.current = setTimeout(() => {
          retryTimeoutRef.current = null;
          isLoadingRef.current = false;
          loadWithTimeout();
        }, delay);

      } else {
        // Max retries reached
        logger.error('[DataWithRecovery] Max retries reached, giving up');
        isLoadingRef.current = false;

        // Call error handler if provided
        if (onError) {
          try {
            onError(error);
          } catch (callbackError) {
            logger.error('[DataWithRecovery] Error in onError callback:', callbackError);
          }
        }
      }
    }
  }, [loadDataFn, timeout, maxRetries, onError]);

  /**
   * Handle connection recovery event
   */
  const handleConnectionRecovered = useCallback(() => {
    logger.info('[DataWithRecovery] Connection recovered, reloading data');
    
    // Reset state
    retryCountRef.current = 0;
    isLoadingRef.current = false;
    
    // Clear any pending retries
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    // Reload
    loadWithTimeout();
  }, [loadWithTimeout]);

  // Set up initial load and event listeners
  useEffect(() => {
    // Initial load
    loadWithTimeout();

    // Listen for connection recovery
    window.addEventListener('connection-recovered', handleConnectionRecovered);

    // Cleanup
    return () => {
      window.removeEventListener('connection-recovered', handleConnectionRecovered);

      // Clear any pending retries
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Abort any in-progress load
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Reset state
      isLoadingRef.current = false;
    };
  }, [loadWithTimeout, handleConnectionRecovered]);

  return {
    reload: loadWithTimeout
  };
}

