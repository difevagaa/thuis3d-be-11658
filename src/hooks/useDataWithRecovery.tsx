import { useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

/**
 * Hook for data loading with retry - SIMPLIFIED VERSION
 * 
 * This hook wraps any data loading function and adds:
 * - Timeout handling
 * - Automatic retry with exponential backoff
 * - Guaranteed state cleanup
 * 
 * NO EVENT LISTENING - just loads data once on mount.
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

  const retryCountRef = useRef(0);
  const isLoadingRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load data with timeout
   */
  const loadWithTimeout = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    isLoadingRef.current = true;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Timeout after ${timeout}ms`));
        }, timeout);
      });

      await Promise.race([
        loadDataFn(),
        timeoutPromise
      ]);

      retryCountRef.current = 0;
      isLoadingRef.current = false;

    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      logger.warn('[DataWithRecovery] Load failed:', errorMessage);

      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);

        retryTimeoutRef.current = setTimeout(() => {
          retryTimeoutRef.current = null;
          isLoadingRef.current = false;
          loadWithTimeout();
        }, delay);

      } else {
        isLoadingRef.current = false;

        if (onError) {
          try {
            onError(error);
          } catch (callbackError) {
            logger.error('[DataWithRecovery] Error in callback:', callbackError);
          }
        }
      }
    }
  }, [loadDataFn, timeout, maxRetries, onError]);

  // Initial load - ONCE
  useEffect(() => {
    loadWithTimeout();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      isLoadingRef.current = false;
    };
  }, [loadWithTimeout]);

  return {
    reload: loadWithTimeout
  };
}
