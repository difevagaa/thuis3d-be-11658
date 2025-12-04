import { useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

/**
 * Hook for data loading with retry - FIXED VERSION
 * 
 * This hook wraps any data loading function and adds:
 * - Timeout handling
 * - Automatic retry with exponential backoff
 * - Guaranteed state cleanup
 * - ONLY RUNS ONCE on mount (no dependency issues)
 * 
 * CRITICAL FIX:
 * - Previous version had loadWithTimeout in useEffect deps
 * - This caused the effect to re-run when loadDataFn changed
 * - loadDataFn changes on every render in some components
 * - Result: Data loaded multiple times or not at all
 * 
 * NEW APPROACH:
 * - Store loadDataFn in a ref
 * - Effect has no dependencies (runs only once)
 * - Manually trigger reload when needed
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
    maxRetries = 2,
    onError
  } = options;

  const loadDataFnRef = useRef(loadDataFn);
  const retryCountRef = useRef(0);
  const isLoadingRef = useRef(false);
  const isMountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update ref when loadDataFn changes (but don't trigger reload)
  useEffect(() => {
    loadDataFnRef.current = loadDataFn;
  }, [loadDataFn]);

  /**
   * Load data with timeout
   */
  const loadWithTimeout = async () => {
    // Don't load if component unmounted
    if (!isMountedRef.current) {
      return;
    }

    // Don't start new load if already loading
    if (isLoadingRef.current) {
      logger.debug('[DataWithRecovery] Already loading, skipping');
      return;
    }

    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    isLoadingRef.current = true;

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Data load timeout after ${timeout}ms`));
        }, timeout);
      });

      // Race between data load and timeout
      await Promise.race([
        loadDataFnRef.current(),
        timeoutPromise
      ]);

      // Success - reset retry count
      retryCountRef.current = 0;
      isLoadingRef.current = false;
      logger.debug('[DataWithRecovery] Load successful');

    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      logger.warn('[DataWithRecovery] Load failed:', errorMessage);

      // Retry if we haven't exceeded max retries
      if (retryCountRef.current < maxRetries && isMountedRef.current) {
        retryCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 10000);
        
        logger.info(`[DataWithRecovery] Retrying in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);

        retryTimeoutRef.current = setTimeout(() => {
          retryTimeoutRef.current = null;
          isLoadingRef.current = false;
          loadWithTimeout();
        }, delay);

      } else {
        // Max retries exceeded or unmounted
        isLoadingRef.current = false;
        logger.error('[DataWithRecovery] Max retries exceeded or component unmounted');

        if (onError && isMountedRef.current) {
          try {
            onError(error);
          } catch (callbackError) {
            logger.error('[DataWithRecovery] Error in error callback:', callbackError);
          }
        }
      }
    }
  };

  // Initial load - ONLY ONCE on mount
  useEffect(() => {
    isMountedRef.current = true;
    
    // Load data immediately
    loadWithTimeout();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      isLoadingRef.current = false;
      logger.debug('[DataWithRecovery] Cleanup completed');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // EMPTY DEPS - only run once on mount

  return {
    reload: loadWithTimeout
  };
}
