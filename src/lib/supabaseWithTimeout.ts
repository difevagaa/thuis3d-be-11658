/**
 * Supabase Wrapper with Automatic Timeouts
 * 
 * CRITICAL FIX for infinite loading issue affecting entire site.
 * 
 * PROBLEM:
 * - Supabase operations can hang indefinitely if network is slow or connection lost
 * - No built-in timeout mechanism in Supabase client
 * - User experiences infinite loading spinners across the entire site
 * - Affects: Login, data loading, mutations, realtime subscriptions
 * 
 * SOLUTION:
 * - Wrap ALL Supabase operations with automatic timeouts
 * - Default 15 seconds for queries, 30 seconds for auth
 * - Force reject promise if operation doesn't complete
 * - Consistent error handling and logging
 */

import { supabase as originalSupabase } from '@/integrations/supabase/client';
import { logger } from './logger';

// Default timeouts in milliseconds
const DEFAULT_QUERY_TIMEOUT = 15000; // 15 seconds for regular queries
const DEFAULT_AUTH_TIMEOUT = 30000;  // 30 seconds for auth operations
const DEFAULT_MUTATION_TIMEOUT = 20000; // 20 seconds for write operations

/**
 * Wrap a promise with a timeout
 * If the promise doesn't resolve within the timeout, it will be rejected
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string = 'Supabase operation'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const error = new Error(`${operationName} timed out after ${timeoutMs}ms`);
      logger.error(`[SupabaseTimeout] ${error.message}`);
      reject(error);
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Enhanced Supabase client with automatic timeouts
 * 
 * Usage - exactly like regular Supabase client:
 * 
 * // Queries (15s timeout)
 * const { data, error } = await supabase.from('users').select('*');
 * 
 * // Auth (30s timeout)
 * const { data, error } = await supabase.auth.signInWithPassword({...});
 * 
 * // Custom timeout
 * const { data, error } = await supabase.from('large_table')
 *   .select('*')
 *   .timeout(60000); // 60 seconds
 */

// Create a proxy to intercept all Supabase calls
const createTimeoutProxy = (target: any, timeoutMs: number, operationPath: string = 'supabase'): any => {
  return new Proxy(target, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      const newPath = `${operationPath}.${String(prop)}`;

      // If it's a function, wrap it
      if (typeof value === 'function') {
        return function (...args: any[]) {
          const result = value.apply(target, args);
          
          // If result is a Promise, add timeout
          if (result && typeof result.then === 'function') {
            return withTimeout(result, timeoutMs, newPath);
          }
          
          // If result is an object (query builder), proxy it too
          if (result && typeof result === 'object') {
            return createTimeoutProxy(result, timeoutMs, newPath);
          }
          
          return result;
        };
      }
      
      // If it's an object (like .from() result), proxy it
      if (value && typeof value === 'object' && !(value instanceof Promise)) {
        return createTimeoutProxy(value, timeoutMs, newPath);
      }
      
      return value;
    }
  });
};

/**
 * Supabase client with automatic timeouts for all operations
 */
export const supabaseWithTimeout = {
  // Auth operations (30s timeout)
  auth: createTimeoutProxy(originalSupabase.auth, DEFAULT_AUTH_TIMEOUT, 'supabase.auth'),
  
  // Query operations (15s timeout)
  from: (table: string) => createTimeoutProxy(
    originalSupabase.from(table), 
    DEFAULT_QUERY_TIMEOUT, 
    `supabase.from(${table})`
  ),
  
  // RPC operations (15s timeout)
  rpc: (fn: string, params?: any) => withTimeout(
    originalSupabase.rpc(fn, params),
    DEFAULT_QUERY_TIMEOUT,
    `supabase.rpc(${fn})`
  ),
  
  // Storage operations (20s timeout)
  storage: createTimeoutProxy(
    originalSupabase.storage,
    DEFAULT_MUTATION_TIMEOUT,
    'supabase.storage'
  ),
  
  // Realtime (no timeout, managed separately)
  channel: originalSupabase.channel.bind(originalSupabase),
  removeChannel: originalSupabase.removeChannel.bind(originalSupabase),
  removeAllChannels: originalSupabase.removeAllChannels.bind(originalSupabase),
  getChannels: originalSupabase.getChannels.bind(originalSupabase),
};

/**
 * Helper function to execute any async operation with timeout
 * 
 * Usage:
 * const result = await withOperationTimeout(
 *   () => someAsyncOperation(),
 *   10000,
 *   'My Operation'
 * );
 */
export async function withOperationTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT,
  operationName: string = 'Operation'
): Promise<T> {
  return withTimeout(operation(), timeoutMs, operationName);
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: any): boolean {
  return error && (
    error.message?.includes('timed out') ||
    error.message?.includes('timeout') ||
    error.name === 'TimeoutError'
  );
}

/**
 * Get user-friendly timeout error message
 */
export function getTimeoutErrorMessage(t: (key: string) => string): string {
  return t('errors.timeout') || 
         'La operación tardó demasiado. Por favor, verifica tu conexión e intenta de nuevo.';
}

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).__supabaseTimeout = {
    DEFAULT_QUERY_TIMEOUT,
    DEFAULT_AUTH_TIMEOUT,
    DEFAULT_MUTATION_TIMEOUT,
  };
}
