/**
 * Centralized Supabase Channel Manager
 * 
 * CRITICAL: This prevents memory leaks and infinite loading states caused by:
 * 1. Orphaned realtime subscriptions
 * 2. Duplicate channel creation
 * 3. Failed channel cleanup on navigation
 * 
 * All pages MUST use this manager instead of creating channels directly.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Global registry of all active channels
const activeChannels = new Map<string, RealtimeChannel>();

// Track channel creation for debugging
const channelStats = {
  created: 0,
  removed: 0,
  active: () => activeChannels.size
};

/**
 * Create or reuse a realtime channel
 * Returns existing channel if one with the same name exists
 */
export function createChannel(channelName: string): RealtimeChannel {
  // Check if channel already exists
  if (activeChannels.has(channelName)) {
    logger.debug(`[ChannelManager] Reusing existing channel: ${channelName}`);
    return activeChannels.get(channelName)!;
  }

  // Create new channel
  logger.info(`[ChannelManager] Creating channel: ${channelName}`);
  const channel = supabase.channel(channelName);
  
  activeChannels.set(channelName, channel);
  channelStats.created++;
  
  return channel;
}

/**
 * Remove a channel and clean up
 * ALWAYS call this in useEffect cleanup
 */
export async function removeChannel(channelName: string): Promise<void> {
  const channel = activeChannels.get(channelName);
  
  if (!channel) {
    logger.debug(`[ChannelManager] Channel not found: ${channelName}`);
    return;
  }

  logger.info(`[ChannelManager] Removing channel: ${channelName}`);
  
  try {
    // Unsubscribe from the channel
    await supabase.removeChannel(channel);
    
    // Remove from registry
    activeChannels.delete(channelName);
    channelStats.removed++;
    
    logger.debug(`[ChannelManager] Active channels: ${activeChannels.size}`);
  } catch (error) {
    logger.error(`[ChannelManager] Error removing channel ${channelName}:`, error);
  }
}

/**
 * Remove multiple channels at once
 * Useful for pages with multiple subscriptions
 */
export async function removeChannels(channelNames: string[]): Promise<void> {
  await Promise.all(channelNames.map(name => removeChannel(name)));
}

/**
 * Force cleanup of ALL channels
 * Use only in emergency situations or on app unmount
 */
export async function cleanupAllChannels(): Promise<void> {
  logger.warn(`[ChannelManager] Cleaning up ALL ${activeChannels.size} channels`);
  
  const channelNames = Array.from(activeChannels.keys());
  await removeChannels(channelNames);
}

/**
 * Get channel statistics for debugging
 */
export function getChannelStats() {
  return {
    ...channelStats,
    active: activeChannels.size,
    channels: Array.from(activeChannels.keys())
  };
}

// Health check configuration
const HEALTH_CHECK_THRESHOLDS = {
  WARNING: 20,
  CRITICAL: 50
};

/**
 * Check if we have too many channels (potential memory leak)
 */
export function checkChannelHealth(): { healthy: boolean; message: string } {
  const activeCount = activeChannels.size;
  
  if (activeCount > HEALTH_CHECK_THRESHOLDS.CRITICAL) {
    return {
      healthy: false,
      message: `CRITICAL: ${activeCount} active channels detected. Possible memory leak!`
    };
  }
  
  if (activeCount > HEALTH_CHECK_THRESHOLDS.WARNING) {
    return {
      healthy: false,
      message: `WARNING: ${activeCount} active channels. Consider cleanup.`
    };
  }
  
  return {
    healthy: true,
    message: `OK: ${activeCount} active channels`
  };
}

// Health check interval ID for cleanup
let healthCheckInterval: NodeJS.Timeout | null = null;

// Health check interval - warn if too many channels
if (typeof window !== 'undefined') {
  healthCheckInterval = setInterval(() => {
    const health = checkChannelHealth();
    if (!health.healthy) {
      logger.warn(`[ChannelManager] ${health.message}`);
      logger.warn(`[ChannelManager] Active channels:`, Array.from(activeChannels.keys()));
    }
  }, 30000); // Check every 30 seconds
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  const cleanupHandler = () => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
      healthCheckInterval = null;
    }
    cleanupAllChannels();
  };
  
  window.addEventListener('beforeunload', cleanupHandler);
  
  // Export cleanup function for manual cleanup if needed
  if (typeof window !== 'undefined') {
    (window as any).__cleanupChannelManager = () => {
      window.removeEventListener('beforeunload', cleanupHandler);
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
      }
    };
  }
}
