/**
 * Supabase Reconnect Hook - CRITICAL FIX FOR ISSUE #15
 * 
 * PROBLEM:
 * - User opens another tab (music, etc.)
 * - Returns to the page
 * - Text, logo, options load fine
 * - But products, gallery, login - EVERYTHING from database doesn't load
 * - Stuck in infinite loading
 * 
 * ROOT CAUSE:
 * - Supabase Realtime connections go into "paused" state when tab is hidden
 * - When tab becomes visible, connections don't resume automatically
 * - React Query queries timeout or fail
 * - Channels are stuck in invalid state
 * 
 * SOLUTION:
 * - Detect when page becomes visible after being hidden
 * - Force reconnect all Supabase channels
 * - Invalidate and refetch all React Query queries
 * - Restore full database connectivity
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export function useSupabaseReconnect() {
  const queryClient = useQueryClient();
  const wasHiddenRef = useRef(false);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isReconnectingRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      const isVisible = document.visibilityState === 'visible';
      
      if (isVisible && wasHiddenRef.current && !isReconnectingRef.current) {
        // Page became visible after being hidden
        isReconnectingRef.current = true;
        
        logger.info('[SupabaseReconnect] Page became visible, initiating reconnection...');
        
        // Clear any pending reconnect
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        // Wait a moment for the browser to fully restore the tab
        reconnectTimeoutRef.current = window.setTimeout(async () => {
          try {
            // Step 1: Verify session is still valid
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
              logger.error('[SupabaseReconnect] Session error:', error);
            } else if (session) {
              logger.info('[SupabaseReconnect] Session valid, reconnecting...');
            }
            
            // Step 2: Get all Supabase realtime channels and reconnect them
            const channels = supabase.getChannels();
            logger.info(`[SupabaseReconnect] Found ${channels.length} channels to reconnect`);
            
            for (const channel of channels) {
              try {
                // Unsubscribe and resubscribe to force reconnection
                logger.debug(`[SupabaseReconnect] Reconnecting channel: ${channel.topic}`);
                await channel.unsubscribe();
                await channel.subscribe();
              } catch (channelError) {
                logger.error(`[SupabaseReconnect] Error reconnecting channel ${channel.topic}:`, channelError);
              }
            }
            
            // Step 3: Invalidate ALL React Query queries to force refetch
            logger.info('[SupabaseReconnect] Invalidating all queries...');
            await queryClient.invalidateQueries();
            
            // Step 4: Refetch queries that are currently being observed
            logger.info('[SupabaseReconnect] Refetching active queries...');
            await queryClient.refetchQueries({
              type: 'active',
              stale: true,
            });
            
            logger.info('[SupabaseReconnect] ✅ Reconnection complete!');
            
            // Dispatch custom event to notify components
            window.dispatchEvent(new CustomEvent('supabase-reconnected'));
            
          } catch (error) {
            logger.error('[SupabaseReconnect] Reconnection failed:', error);
          } finally {
            isReconnectingRef.current = false;
          }
        }, 500); // Small delay to let browser fully restore
        
      }
      
      wasHiddenRef.current = !isVisible;
    };

    // Initial state
    wasHiddenRef.current = document.visibilityState !== 'visible';
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also listen for focus events as a fallback
    const handleFocus = () => {
      if (wasHiddenRef.current) {
        handleVisibilityChange();
      }
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [queryClient]);
}
