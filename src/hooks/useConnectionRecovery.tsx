import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Global Connection Recovery Hook
 * Manages app-wide reconnection, heartbeat, and event dispatching
 * 
 * CRITICAL: This hook dispatches 'connection-ready' when connection is confirmed
 * Components should wait for this event before loading data on initial mount
 */

// Standardized timeout configuration
const CONNECTION_TIMEOUT = 5000; // 5 seconds for connection test
const HEARTBEAT_INTERVAL = 30000; // 30 seconds heartbeat
const MAX_RECONNECT_ATTEMPTS = 5;

export function useConnectionRecovery() {
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const wasInBackground = useRef(false);
  const connectionReadyRef = useRef(false);
  const initialCheckDoneRef = useRef(false);

  /**
   * Test if Supabase connection is alive with timeout
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);
      
      const { error } = await supabase
        .from('products')
        .select('id')
        .limit(1)
        .abortSignal(controller.signal);
      
      clearTimeout(timeoutId);
      
      if (error) {
        logger.warn('[ConnectionRecovery] Connection test failed:', error);
        return false;
      }
      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.warn('[ConnectionRecovery] Connection test timed out');
      } else {
        logger.error('[ConnectionRecovery] Connection test error:', error);
      }
      return false;
    }
  }, []);

  /**
   * Dispatch connection ready event
   */
  const dispatchConnectionReady = useCallback(() => {
    if (!connectionReadyRef.current) {
      connectionReadyRef.current = true;
      logger.info('[ConnectionRecovery] Dispatching connection-ready event');
      window.dispatchEvent(new CustomEvent('connection-ready'));
    }
  }, []);

  /**
   * Force reconnect and reload all data
   */
  const forceReconnect = useCallback(async () => {
    logger.info('[ConnectionRecovery] Forcing reconnection...');
    connectionReadyRef.current = false;
    
    try {
      const isConnected = await testConnection();
      
      if (!isConnected) {
        reconnectAttemptsRef.current++;
        
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(500 * Math.pow(2, reconnectAttemptsRef.current), 8000);
          logger.info(`[ConnectionRecovery] Retrying in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          
          setTimeout(() => {
            forceReconnect();
          }, delay);
          return;
        } else {
          logger.error('[ConnectionRecovery] Max reconnection attempts reached');
          window.dispatchEvent(new CustomEvent('connection-recovery-failed'));
          return;
        }
      }
      
      // Connection successful
      reconnectAttemptsRef.current = 0;
      dispatchConnectionReady();
      
      // Also dispatch recovery event for data reload
      window.dispatchEvent(new CustomEvent('connection-recovered'));
      logger.info('[ConnectionRecovery] Connection recovered successfully');
      
    } catch (error) {
      logger.error('[ConnectionRecovery] Reconnection error:', error);
      
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(500 * Math.pow(2, reconnectAttemptsRef.current), 8000);
        setTimeout(() => forceReconnect(), delay);
      }
    }
  }, [testConnection, dispatchConnectionReady]);

  /**
   * Initial connection check - critical for first load
   */
  const initialConnectionCheck = useCallback(async () => {
    if (initialCheckDoneRef.current) return;
    initialCheckDoneRef.current = true;
    
    logger.info('[ConnectionRecovery] Starting initial connection check...');
    
    const maxAttempts = 5;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const isConnected = await testConnection();
      
      if (isConnected) {
        logger.info(`[ConnectionRecovery] Initial connection OK (attempt ${attempt})`);
        dispatchConnectionReady();
        return;
      }
      
      logger.warn(`[ConnectionRecovery] Initial connection attempt ${attempt} failed`);
      
      if (attempt < maxAttempts) {
        const delay = 500 * attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    logger.error('[ConnectionRecovery] All initial connection attempts failed');
    window.dispatchEvent(new CustomEvent('connection-failed'));
  }, [testConnection, dispatchConnectionReady]);

  /**
   * Heartbeat to keep connection alive
   */
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(async () => {
      const isConnected = await testConnection();
      if (!isConnected) {
        logger.warn('[ConnectionRecovery] Heartbeat failed, forcing reconnect');
        connectionReadyRef.current = false;
        forceReconnect();
      }
    }, HEARTBEAT_INTERVAL);
    
    logger.info('[ConnectionRecovery] Heartbeat started');
  }, [testConnection, forceReconnect]);

  /**
   * Handle visibility change
   */
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      if (wasInBackground.current) {
        logger.info('[ConnectionRecovery] App returned from background');
        connectionReadyRef.current = false;
        setTimeout(() => forceReconnect(), 300);
      }
      wasInBackground.current = false;
      startHeartbeat();
    } else {
      wasInBackground.current = true;
      logger.info('[ConnectionRecovery] App going to background');
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    }
  }, [forceReconnect, startHeartbeat]);

  /**
   * Handle page show (bfcache)
   */
  const handlePageShow = useCallback((event: PageTransitionEvent) => {
    if (event.persisted) {
      logger.info('[ConnectionRecovery] Page restored from bfcache');
      connectionReadyRef.current = false;
      forceReconnect();
    }
  }, [forceReconnect]);

  /**
   * Handle online event
   */
  const handleOnline = useCallback(() => {
    logger.info('[ConnectionRecovery] Network restored');
    connectionReadyRef.current = false;
    forceReconnect();
  }, [forceReconnect]);

  /**
   * Handle focus event
   */
  const handleFocus = useCallback(() => {
    if (wasInBackground.current) {
      logger.info('[ConnectionRecovery] Window focused after background');
      connectionReadyRef.current = false;
      setTimeout(() => forceReconnect(), 300);
      wasInBackground.current = false;
    }
  }, [forceReconnect]);

  // Set up all event listeners
  useEffect(() => {
    // Run initial connection check immediately
    initialConnectionCheck().then(() => {
      startHeartbeat();
    });

    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
    };
  }, [initialConnectionCheck, startHeartbeat, handleVisibilityChange, handlePageShow, handleOnline, handleFocus]);

  return {
    forceReconnect,
    testConnection
  };
}
