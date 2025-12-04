/**
 * Reconnecting Toast - Visual feedback for database reconnection
 * 
 * Shows a toast notification when the app is reconnecting to the database
 * after user returns from another tab.
 */

import { useEffect } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export function useReconnectNotification() {
  useEffect(() => {
    let reconnectToastId: string | number | undefined;
    let reconnectStartTime: number = 0;

    const handleReconnectStart = () => {
      reconnectStartTime = Date.now();
      logger.info('[ReconnectNotification] Showing reconnect toast');
      
      reconnectToastId = toast.loading('Reconectando con la base de datos...', {
        description: 'Recuperando tus datos',
        duration: Infinity, // Don't auto-dismiss
      });
    };

    const handleReconnectComplete = () => {
      const duration = Date.now() - reconnectStartTime;
      logger.info(`[ReconnectNotification] Reconnect completed in ${duration}ms`);
      
      if (reconnectToastId) {
        toast.dismiss(reconnectToastId);
        
        // Show success message
        toast.success('✅ Conexión restaurada', {
          description: 'Todos tus datos están actualizados',
          duration: 3000,
        });
        
        reconnectToastId = undefined;
      }
    };

    const handleReconnectError = () => {
      logger.error('[ReconnectNotification] Reconnect failed');
      
      if (reconnectToastId) {
        toast.dismiss(reconnectToastId);
        
        toast.error('Error de conexión', {
          description: 'Intenta refrescar la página si los datos no cargan',
          duration: 5000,
          action: {
            label: 'Refrescar',
            onClick: () => window.location.reload(),
          },
        });
        
        reconnectToastId = undefined;
      }
    };

    // Listen for custom reconnection events
    window.addEventListener('supabase-reconnect-start', handleReconnectStart as EventListener);
    window.addEventListener('supabase-reconnected', handleReconnectComplete as EventListener);
    window.addEventListener('supabase-reconnect-error', handleReconnectError as EventListener);

    return () => {
      window.removeEventListener('supabase-reconnect-start', handleReconnectStart as EventListener);
      window.removeEventListener('supabase-reconnected', handleReconnectComplete as EventListener);
      window.removeEventListener('supabase-reconnect-error', handleReconnectError as EventListener);
      
      // Dismiss any pending toast
      if (reconnectToastId) {
        toast.dismiss(reconnectToastId);
      }
    };
  }, []);
}
