import { useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

/**
 * Loading Timeout Protection Hook
 * 
 * CRITICAL: Prevents infinite loading states by forcing cleanup after a maximum time.
 * 
 * This is a SAFETY NET that ensures loading states never get stuck forever.
 * Even if something goes wrong, the loading will be cleared after the timeout.
 * 
 * Usage:
 * ```tsx
 * const [isLoading, setIsLoading] = useState(false);
 * useLoadingTimeout(isLoading, setIsLoading, 30000); // 30 seconds max
 * ```
 */
export function useLoadingTimeout(
  isLoading: boolean,
  setLoading: (loading: boolean) => void,
  maxTimeout: number = 30000 // 30 seconds default
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isLoading) {
      // Start the timer
      startTimeRef.current = Date.now();
      
      timeoutRef.current = setTimeout(() => {
        const elapsed = Date.now() - startTimeRef.current;
        logger.warn(`[LoadingTimeout] Force clearing loading state after ${elapsed}ms`);
        setLoading(false);
      }, maxTimeout);
      
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }
  }, [isLoading, setLoading, maxTimeout]);
}
