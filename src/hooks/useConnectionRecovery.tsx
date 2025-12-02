import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Global Connection Recovery Hook
 * Manages app-wide reconnection, heartbeat, and event dispatching
 * 
 * This hook ensures that when the app returns from background or network issues,
 * all data is properly reloaded and the Supabase connection is restored.
 */
export function useConnectionRecovery() {
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const wasInBackground = useRef(false);

  /**
   * Test if Supabase connection is alive
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase.from('products').select('id').limit(1);
      if (error) {
        logger.warn('[ConnectionRecovery] Connection test failed:', error);
        return false;
      }
      return true;
    } catch (error) {
      logger.error('[ConnectionRecovery] Connection test error:', error);
      return false;
    }
  }, []);

  /**
   * Force reconnect and reload all data
   */
  const forceReconnect = useCallback(async () => {
    logger.info('[ConnectionRecovery] Forcing reconnection...');
    
    try {
      // Test connection first
      const isConnected = await testConnection();
      
      if (!isConnected) {
        reconnectAttemptsRef.current++;
        
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          logger.info(`[ConnectionRecovery] Retrying in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          
          setTimeout(() => {
            forceReconnect();
          }, delay);
          return;
        } else {
          logger.error('[ConnectionRecovery] Max reconnection attempts reached');
          // Dispatch failed event
          window.dispatchEvent(new CustomEvent('connection-recovery-failed'));
          return;
        }
      }
      
      // Connection successful - reset attempts
      reconnectAttemptsRef.current = 0;
      
      // Dispatch reload event for all components
      window.dispatchEvent(new CustomEvent('connection-recovered'));
      logger.info('[ConnectionRecovery] Connection recovered successfully');
      
    } catch (error) {
      logger.error('[ConnectionRecovery] Reconnection error:', error);
      
      // Retry with backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
        setTimeout(() => forceReconnect(), delay);
      }
    }
  }, [testConnection]);

  /**
   * Heartbeat to keep connection alive
   */
  const startHeartbeat = useCallback(() => {
    // Clear existing heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // Ping every 30 seconds to keep connection alive
    heartbeatIntervalRef.current = setInterval(async () => {
      const isConnected = await testConnection();
      if (!isConnected) {
        logger.warn('[ConnectionRecovery] Heartbeat failed, forcing reconnect');
        forceReconnect();
      }
    }, 30000);
    
    logger.info('[ConnectionRecovery] Heartbeat started');
  }, [testConnection, forceReconnect]);

  /**
   * Handle visibility change (app going to/from background)
   */
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      if (wasInBackground.current) {
        logger.info('[ConnectionRecovery] App returned from background');
        // Small delay to ensure network is ready
        setTimeout(() => {
          forceReconnect();
        }, 500);
      }
      wasInBackground.current = false;
      startHeartbeat();
    } else {
      // Going to background
      wasInBackground.current = true;
      logger.info('[ConnectionRecovery] App going to background');
      // Stop heartbeat to save resources
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    }
  }, [forceReconnect, startHeartbeat]);

  /**
   * Handle page show (bfcache restoration)
   */
  const handlePageShow = useCallback((event: PageTransitionEvent) => {
    if (event.persisted) {
      logger.info('[ConnectionRecovery] Page restored from bfcache');
      forceReconnect();
    }
  }, [forceReconnect]);

  /**
   * Handle online event
   */
  const handleOnline = useCallback(() => {
    logger.info('[ConnectionRecovery] Network restored');
    forceReconnect();
  }, [forceReconnect]);

  /**
   * Handle focus event (additional mobile support)
   */
  const handleFocus = useCallback(() => {
    if (wasInBackground.current) {
      logger.info('[ConnectionRecovery] Window focused after background');
      setTimeout(() => forceReconnect(), 500);
      wasInBackground.current = false;
    }
  }, [forceReconnect]);

  // Set up all event listeners
  useEffect(() => {
    // Initial connection test and start heartbeat
    testConnection().then(isConnected => {
      if (isConnected) {
        logger.info('[ConnectionRecovery] Initial connection OK');
        startHeartbeat();
      } else {
        logger.warn('[ConnectionRecovery] Initial connection failed, attempting recovery');
        forceReconnect();
      }
    });

    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);

    return () => {
      // Cleanup
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
    };
  }, [testConnection, startHeartbeat, forceReconnect, handleVisibilityChange, handlePageShow, handleOnline, handleFocus]);

  return {
    forceReconnect,
    testConnection
  };
}
