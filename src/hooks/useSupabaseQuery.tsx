import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const CACHE_KEY_PREFIX = 'supabase_cache_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Hook for robust Supabase queries with wake-up, retry, and cache
 * 
 * This hook solves the "blank page" problem by:
 * 1. Waking up dormant Supabase connections before querying
 * 2. Retrying failed queries with exponential backoff
 * 3. Caching successful results for instant fallback display
 */
export function useSupabaseQuery() {
  const connectionVerifiedRef = useRef(false);
  const wakeUpInProgressRef = useRef(false);
  const wakeUpPromiseRef = useRef<Promise<boolean> | null>(null);

  /**
   * Wake up Supabase connection with retries
   * This is called ONCE before any batch of queries
   */
  const wakeUpSupabase = useCallback(async (): Promise<boolean> => {
    // If already verified recently, skip
    if (connectionVerifiedRef.current) {
      return true;
    }

    // If wake-up is in progress, wait for it
    if (wakeUpInProgressRef.current && wakeUpPromiseRef.current) {
      return wakeUpPromiseRef.current;
    }

    wakeUpInProgressRef.current = true;
    
    const maxAttempts = 5;
    const baseDelay = 500;

    wakeUpPromiseRef.current = (async () => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          logger.info(`[SupabaseQuery] Wake-up attempt ${attempt}/${maxAttempts}`);
          
          // Simple ping with short timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const { error } = await supabase
            .from('products')
            .select('id')
            .limit(1)
            .abortSignal(controller.signal);
          
          clearTimeout(timeoutId);
          
          if (!error) {
            logger.info('[SupabaseQuery] Connection verified successfully');
            connectionVerifiedRef.current = true;
            wakeUpInProgressRef.current = false;
            
            // Reset verified status after 2 minutes
            setTimeout(() => {
              connectionVerifiedRef.current = false;
            }, 2 * 60 * 1000);
            
            // Dispatch event for other components
            window.dispatchEvent(new CustomEvent('connection-ready'));
            return true;
          }
          
          logger.warn(`[SupabaseQuery] Wake-up attempt ${attempt} failed:`, error);
        } catch (error: any) {
          if (error.name === 'AbortError') {
            logger.warn(`[SupabaseQuery] Wake-up attempt ${attempt} timed out`);
          } else {
            logger.warn(`[SupabaseQuery] Wake-up attempt ${attempt} error:`, error);
          }
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          logger.info(`[SupabaseQuery] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      logger.error('[SupabaseQuery] All wake-up attempts failed');
      wakeUpInProgressRef.current = false;
      window.dispatchEvent(new CustomEvent('connection-failed'));
      return false;
    })();

    return wakeUpPromiseRef.current;
  }, []);

  /**
   * Execute a query with automatic retry on failure
   */
  const queryWithRetry = useCallback(async <T,>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    cacheKey?: string,
    maxRetries: number = 3
  ): Promise<{ data: T | null; error: any; fromCache?: boolean }> => {
    const retryDelays = [500, 1000, 2000];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Create timeout wrapper
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout')), 8000);
        });

        const result = await Promise.race([queryFn(), timeoutPromise]) as { data: T | null; error: any };

        if (!result.error && result.data !== null) {
          // Success - cache the result
          if (cacheKey) {
            saveToCache(cacheKey, result.data);
          }
          return result;
        }

        if (result.error) {
          logger.warn(`[SupabaseQuery] Query attempt ${attempt + 1} failed:`, result.error);
        }
      } catch (error: any) {
        logger.warn(`[SupabaseQuery] Query attempt ${attempt + 1} exception:`, error.message);
      }

      // Wait before retry
      if (attempt < maxRetries) {
        const delay = retryDelays[attempt] || 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries failed - try to return cached data
    if (cacheKey) {
      const cached = getFromCache<T>(cacheKey);
      if (cached) {
        logger.info(`[SupabaseQuery] Returning cached data for ${cacheKey}`);
        return { data: cached, error: null, fromCache: true };
      }
    }

    return { data: null, error: new Error('All query attempts failed') };
  }, []);

  /**
   * Load data with wake-up + retry pattern
   * This is the main function to use for loading data
   */
  const loadWithRecovery = useCallback(async <T,>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    cacheKey?: string
  ): Promise<{ data: T | null; error: any; fromCache?: boolean }> => {
    // First, ensure connection is awake
    const isAwake = await wakeUpSupabase();
    
    if (!isAwake) {
      // Connection failed - try cache
      if (cacheKey) {
        const cached = getFromCache<T>(cacheKey);
        if (cached) {
          logger.info(`[SupabaseQuery] Connection failed, using cache for ${cacheKey}`);
          return { data: cached, error: null, fromCache: true };
        }
      }
      return { data: null, error: new Error('Connection failed') };
    }

    // Connection is good - execute query with retry
    return queryWithRetry(queryFn, cacheKey);
  }, [wakeUpSupabase, queryWithRetry]);

  /**
   * Reset connection verified status (force re-verification)
   */
  const resetConnection = useCallback(() => {
    connectionVerifiedRef.current = false;
    wakeUpInProgressRef.current = false;
    wakeUpPromiseRef.current = null;
  }, []);

  return {
    wakeUpSupabase,
    queryWithRetry,
    loadWithRecovery,
    resetConnection
  };
}

// Cache utilities
function saveToCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(entry));
  } catch (error) {
    logger.warn('[SupabaseQuery] Failed to save to cache:', error);
  }
}

function getFromCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!raw) return null;
    
    const entry: CacheEntry<T> = JSON.parse(raw);
    
    // Check if cache is still valid
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY_PREFIX + key);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    return null;
  }
}

/**
 * Clear all Supabase cache
 */
export function clearSupabaseCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_KEY_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
    logger.info('[SupabaseQuery] Cache cleared');
  } catch (error) {
    logger.warn('[SupabaseQuery] Failed to clear cache:', error);
  }
}
