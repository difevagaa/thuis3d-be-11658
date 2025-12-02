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
    deps?: React.DependencyList;
  } = {}
) {
  const {
    timeout = 15000,
    maxRetries = 3,
    onError,
    deps = []
  } = options;

  const retryCountRef = useRef(0);
  const loadingRef = useRef(false);

  /**
   * Load data with timeout and retry logic
   */
  const loadWithTimeout = useCallback(async () => {
    if (loadingRef.current) {
      logger.debug('[DataWithRecovery] Already loading, skipping');
      return;
    }

    loadingRef.current = true;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
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
        
        setTimeout(() => {
          loadingRef.current = false;
          loadWithTimeout();
        }, delay);
      } else {
        // Max retries reached
        logger.error('[DataWithRecovery] Max retries reached');
        if (onError) {
          onError(error);
        }
      }
    } finally {
      loadingRef.current = false;
    }
  }, [loadDataFn, timeout, maxRetries, onError]);

  /**
   * Handle connection recovery event
   */
  const handleConnectionRecovered = useCallback(() => {
    logger.info('[DataWithRecovery] Connection recovered, reloading data');
    retryCountRef.current = 0; // Reset retry count
    loadWithTimeout();
  }, [loadWithTimeout]);

  // Set up listeners and initial load
  useEffect(() => {
    // Initial load
    loadWithTimeout();

    // Listen for connection recovery
    window.addEventListener('connection-recovered', handleConnectionRecovered);

    return () => {
      window.removeEventListener('connection-recovered', handleConnectionRecovered);
    };
  }, [loadWithTimeout, handleConnectionRecovered, ...deps]);

  return {
    reload: loadWithTimeout
  };
}
