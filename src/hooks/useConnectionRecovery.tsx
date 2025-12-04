import { useEffect, useRef } from 'react';
import { forceReconnect, initializeConnection, getConnectionStatus } from './useConnectionState';
import { logger } from '@/lib/logger';

/**
 * Global Connection Recovery Hook - REWRITTEN FOR RELIABILITY
 * 
 * This hook is the PRIMARY handler for all connection events:
 * - Initial connection on app start
 * - Tab visibility changes
 * - Network online/offline events
 * - Page restoration from browser cache
 * 
 * Design Principles:
 * 1. Single responsibility: detect events and trigger reconnection
 * 2. Delegates connection logic to useConnectionState (no duplication)
 * 3. Dispatches 'connection-recovered' event when reconnection succeeds
 * 4. Simple, predictable, no race conditions
 */

export const CONNECTION_TIMEOUT = 5000; // 5 seconds for connection test
export const HEARTBEAT_INTERVAL = 30000; // 30 seconds heartbeat
export const MAX_RECONNECT_ATTEMPTS = 3;

export function useConnectionRecovery() {
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wasInBackgroundRef = useRef(false);
  const initializedRef = useRef(false);

  // Set up all event listeners and initial connection
  useEffect(() => {
    /**
     * Initialize connection on mount
     */
    const initialize = async () => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      logger.info('[ConnectionRecovery] Initializing connection...');
      const success = await initializeConnection();

      if (success) {
        logger.info('[ConnectionRecovery] Initial connection established');
        window.dispatchEvent(new CustomEvent('connection-ready'));
        window.dispatchEvent(new CustomEvent('connection-recovered'));
        startHeartbeat();
      } else {
        logger.error('[ConnectionRecovery] Initial connection failed');
        window.dispatchEvent(new CustomEvent('connection-failed'));
      }
    };

    /**
     * Start heartbeat to keep connection alive
     */
    const startHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      heartbeatIntervalRef.current = setInterval(async () => {
        // Only reconnect if status shows we're disconnected
        const status = getConnectionStatus();
        if (status !== 'connected') {
          logger.warn('[ConnectionRecovery] Heartbeat detected disconnection, reconnecting...');
          const success = await forceReconnect();
          if (success) {
            window.dispatchEvent(new CustomEvent('connection-recovered'));
          }
        } else {
          logger.debug('[ConnectionRecovery] Heartbeat: connection OK');
        }
      }, HEARTBEAT_INTERVAL);

      logger.info('[ConnectionRecovery] Heartbeat started');
    };

    /**
     * Handle tab visibility changes
     */
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        if (wasInBackgroundRef.current) {
          logger.info('[ConnectionRecovery] App returned from background, reconnecting...');
          wasInBackgroundRef.current = false;
          
          const success = await forceReconnect();
          if (success) {
            window.dispatchEvent(new CustomEvent('connection-recovered'));
          }
          
          startHeartbeat();
        }
      } else {
        wasInBackgroundRef.current = true;
        logger.info('[ConnectionRecovery] App going to background');
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      }
    };

    /**
     * Handle page restoration from browser cache
     */
    const handlePageShow = async (event: PageTransitionEvent) => {
      if (event.persisted) {
        logger.info('[ConnectionRecovery] Page restored from bfcache, reconnecting...');
        const success = await forceReconnect();
        if (success) {
          window.dispatchEvent(new CustomEvent('connection-recovered'));
        }
      }
    };

    /**
     * Handle network coming back online
     */
    const handleOnline = async () => {
      logger.info('[ConnectionRecovery] Network restored, reconnecting...');
      const success = await forceReconnect();
      if (success) {
        window.dispatchEvent(new CustomEvent('connection-recovered'));
      }
    };

    // Initialize connection
    initialize();

    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('online', handleOnline);

    // Cleanup
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return {};
}
