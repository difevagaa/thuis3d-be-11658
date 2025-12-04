import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Global Connection State Manager
 * 
 * This is the SINGLE SOURCE OF TRUTH for connection state.
 * All other hooks and components should use this state.
 * 
 * Design Principles:
 * 1. Simple and predictable
 * 2. No race conditions
 * 3. Timeouts always respected
 * 4. Clear state transitions
 * 5. One responsibility: manage connection state
 */

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'failed';

// Global state (shared across all component instances)
let globalConnectionStatus: ConnectionStatus = 'connecting';
let globalListeners: Set<(status: ConnectionStatus) => void> = new Set();
let globalTestInProgress = false;
let globalLastSuccessfulTest = 0;

// Connection configuration
const CONNECTION_TIMEOUT_MS = 5000; // 5 seconds
const MIN_TIME_BETWEEN_TESTS_MS = 2000; // Don't test more than once per 2 seconds
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Test if Supabase connection is alive
 * Returns true if connected, false otherwise
 * ALWAYS completes within CONNECTION_TIMEOUT_MS
 */
async function testConnection(): Promise<boolean> {
  // Prevent concurrent tests
  if (globalTestInProgress) {
    logger.debug('[ConnectionState] Test already in progress, skipping');
    return globalConnectionStatus === 'connected';
  }

  // Rate limiting - don't test too frequently
  const now = Date.now();
  if (now - globalLastSuccessfulTest < MIN_TIME_BETWEEN_TESTS_MS) {
    logger.debug('[ConnectionState] Too soon since last test, using cached result');
    return globalConnectionStatus === 'connected';
  }

  globalTestInProgress = true;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT_MS);

    const { error } = await supabase
      .from('products')
      .select('id')
      .limit(1)
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);

    if (!error) {
      globalLastSuccessfulTest = now;
      setGlobalStatus('connected');
      return true;
    } else {
      logger.warn('[ConnectionState] Connection test failed:', error.message);
      return false;
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      logger.warn('[ConnectionState] Connection test timed out');
    } else {
      logger.error('[ConnectionState] Connection test error:', err);
    }
    return false;
  } finally {
    globalTestInProgress = false;
  }
}

/**
 * Update global status and notify all listeners
 */
function setGlobalStatus(status: ConnectionStatus) {
  if (globalConnectionStatus === status) return;
  
  logger.info(`[ConnectionState] Status changed: ${globalConnectionStatus} -> ${status}`);
  globalConnectionStatus = status;
  
  // Notify all listeners
  globalListeners.forEach(listener => {
    try {
      listener(status);
    } catch (err) {
      logger.error('[ConnectionState] Error in listener:', err);
    }
  });
}

/**
 * Attempt to connect with retries
 * ALWAYS completes - either succeeds or fails definitively
 */
async function connect(): Promise<boolean> {
  setGlobalStatus('connecting');

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    logger.info(`[ConnectionState] Connection attempt ${attempt}/${MAX_RETRY_ATTEMPTS}`);
    
    const success = await testConnection();
    
    if (success) {
      setGlobalStatus('connected');
      return true;
    }

    // Wait before retry (exponential backoff)
    if (attempt < MAX_RETRY_ATTEMPTS) {
      const delay = Math.min(1000 * attempt, 3000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All attempts failed
  logger.error('[ConnectionState] All connection attempts failed');
  setGlobalStatus('failed');
  return false;
}

/**
 * React hook to use connection state
 */
export function useConnectionState() {
  const [status, setStatus] = useState<ConnectionStatus>(globalConnectionStatus);
  const listenerRef = useRef<(status: ConnectionStatus) => void>();

  useEffect(() => {
    // Create listener
    const listener = (newStatus: ConnectionStatus) => {
      setStatus(newStatus);
    };
    listenerRef.current = listener;

    // Subscribe
    globalListeners.add(listener);

    // Set initial state
    setStatus(globalConnectionStatus);

    // Cleanup
    return () => {
      if (listenerRef.current) {
        globalListeners.delete(listenerRef.current);
      }
    };
  }, []);

  const reconnect = useCallback(async () => {
    return await connect();
  }, []);

  const checkConnection = useCallback(async () => {
    return await testConnection();
  }, []);

  return {
    status,
    isConnecting: status === 'connecting',
    isConnected: status === 'connected',
    isDisconnected: status === 'disconnected',
    isFailed: status === 'failed',
    reconnect,
    checkConnection
  };
}

/**
 * Initialize connection on app start
 * Call this once in App.tsx
 */
export async function initializeConnection() {
  logger.info('[ConnectionState] Initializing connection...');
  return await connect();
}

/**
 * Force reconnect (for visibility changes, etc.)
 */
export async function forceReconnect() {
  logger.info('[ConnectionState] Force reconnecting...');
  setGlobalStatus('disconnected');
  return await connect();
}

/**
 * Get current connection status (synchronous)
 */
export function getConnectionStatus(): ConnectionStatus {
  return globalConnectionStatus;
}

/**
 * Check if connected (synchronous)
 */
export function isConnected(): boolean {
  return globalConnectionStatus === 'connected';
}
