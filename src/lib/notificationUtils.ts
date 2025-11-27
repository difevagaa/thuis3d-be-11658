import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Utility functions for sending notifications with real-time broadcast support.
 * These functions ensure notifications are delivered immediately without page refresh.
 */

/**
 * Sends a notification to a user and triggers a broadcast for immediate UI update.
 * This function uses the database RPC function and also broadcasts to the user's channel.
 * 
 * @param userId - The ID of the user to notify
 * @param type - Type of notification (e.g., 'order', 'invoice', 'quote_update')
 * @param title - Title of the notification
 * @param message - Message body of the notification
 * @param link - Optional link to navigate to when clicking the notification
 * @returns Promise<boolean> - True if notification was sent successfully
 */
export const sendNotificationWithBroadcast = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  link?: string
): Promise<boolean> => {
  try {
    // First, create the notification in the database using the RPC function
    const { error: rpcError } = await supabase.rpc('send_notification', {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_message: message,
      p_link: link
    });

    if (rpcError) {
      logger.error('Error sending notification via RPC:', rpcError);
      throw rpcError;
    }

    // Then, broadcast to the user's channel for immediate update
    // This ensures the UI updates without waiting for postgres_changes
    try {
      const userChannel = supabase.channel(`user-notifications-broadcast-${userId}`);
      await userChannel.send({
        type: 'broadcast',
        event: 'new-notification',
        payload: { type, title, message, link, timestamp: new Date().toISOString() }
      });
      // Clean up the channel after sending
      supabase.removeChannel(userChannel);
    } catch (broadcastError) {
      // Broadcast failure is not critical, the notification is already in the database
      logger.debug('Broadcast notification skipped (channel may not be active):', broadcastError);
    }

    logger.debug('📬 Notification sent successfully:', { userId, type, title });
    return true;
  } catch (error) {
    logger.error('Error sending notification:', error);
    return false;
  }
};

/**
 * Sends a notification to all admin users and broadcasts for immediate UI update.
 * 
 * @param type - Type of notification (e.g., 'order', 'new_message')
 * @param title - Title of the notification
 * @param message - Message body of the notification
 * @param link - Optional link to navigate to when clicking the notification
 * @returns Promise<boolean> - True if notifications were sent successfully
 */
export const notifyAdminsWithBroadcast = async (
  type: string,
  title: string,
  message: string,
  link?: string
): Promise<boolean> => {
  try {
    // Use the database function to notify all admins
    const { error: rpcError } = await supabase.rpc('notify_all_admins', {
      p_type: type,
      p_title: title,
      p_message: message,
      p_link: link
    });

    if (rpcError) {
      logger.error('Error notifying admins via RPC:', rpcError);
      throw rpcError;
    }

    // Get admin user IDs to broadcast to their channels
    try {
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles && adminRoles.length > 0) {
        // Broadcast to each admin's channel
        for (const adminRole of adminRoles) {
          try {
            const adminChannel = supabase.channel(`admin-notifications-broadcast-${adminRole.user_id}`);
            await adminChannel.send({
              type: 'broadcast',
              event: 'new-notification',
              payload: { type, title, message, link, timestamp: new Date().toISOString() }
            });
            supabase.removeChannel(adminChannel);
          } catch (e) {
            // Individual broadcast failure is not critical
            logger.debug(`Broadcast to admin ${adminRole.user_id} skipped`);
          }
        }
      }
    } catch (broadcastError) {
      // Broadcast failure is not critical
      logger.debug('Admin broadcast skipped:', broadcastError);
    }

    logger.debug('📬 Admin notifications sent successfully:', { type, title });
    return true;
  } catch (error) {
    logger.error('Error notifying admins:', error);
    return false;
  }
};

/**
 * Triggers a refresh of notifications for a specific user via broadcast.
 * This can be called after any operation that creates a notification
 * to ensure immediate UI update.
 * 
 * @param userId - The ID of the user whose notifications should refresh
 */
export const triggerNotificationRefresh = async (userId: string): Promise<void> => {
  try {
    const userChannel = supabase.channel(`user-notifications-broadcast-${userId}`);
    await userChannel.send({
      type: 'broadcast',
      event: 'new-notification',
      payload: { refresh: true, timestamp: new Date().toISOString() }
    });
    supabase.removeChannel(userChannel);
    logger.debug('📬 Notification refresh triggered for user:', userId);
  } catch (error) {
    logger.debug('Notification refresh broadcast skipped:', error);
  }
};
