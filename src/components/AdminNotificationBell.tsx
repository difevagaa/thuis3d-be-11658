import { useState, useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { i18nToast } from "@/lib/i18nToast";
import { logger } from "@/lib/logger";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export default function AdminNotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isMountedRef = useRef(true);
  const userIdRef = useRef<string | null>(null);

  // Memoized load function to avoid recreating on each render
  const loadNotifications = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMountedRef.current) return;

      // Filtrar SOLO notificaciones de tipo administrativo
      const adminTypes = [
        'order', 'order_update', 
        'quote', 'quote_update', 'quote_updated',
        'invoice', 'invoice_update',
        'message', 'new_message', 'gift_card'
      ];
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .in("type", adminTypes)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      if (isMountedRef.current) {
        setNotifications(data || []);
        setUnreadCount(data?.filter(n => !n.is_read).length || 0);
      }
    } catch (error) {
      logger.error("Error loading admin notifications:", error);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    let dbChannel: ReturnType<typeof supabase.channel> | undefined;
    let broadcastChannel: ReturnType<typeof supabase.channel> | undefined;
    
    const setupSubscription = async () => {
      // First load notifications
      await loadNotifications();
      if (!isMountedRef.current) return;
      
      // Get current user for filtering
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMountedRef.current) return;
      userIdRef.current = user.id;
      
      // Set up realtime subscription for database changes
      // Using specific events for better efficiency
      dbChannel = supabase
        .channel(`admin-notifications-db-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            if (!isMountedRef.current) return;
            
            // Check if this notification is for the current user
            const newRecord = payload.new as Notification & { user_id?: string };
            
            if (newRecord?.user_id === userIdRef.current) {
              logger.debug('📬 New admin notification received via postgres_changes:', payload);
              loadNotifications();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
          },
          (payload) => {
            if (!isMountedRef.current) return;
            
            // Check if this notification is for the current user
            const newRecord = payload.new as Notification & { user_id?: string };
            const oldRecord = payload.old as Notification & { user_id?: string };
            const recordUserId = newRecord?.user_id || oldRecord?.user_id;
            
            if (recordUserId === userIdRef.current) {
              logger.debug('📬 Admin notification updated via postgres_changes:', payload);
              loadNotifications();
            }
          }
        )
        .subscribe((status, err) => {
          if (err) {
            logger.error('🔔 Admin notification DB subscription error:', err);
          } else {
            logger.debug('🔔 Admin notification DB subscription status:', status);
          }
        });
      
      // Set up a broadcast channel for immediate updates
      // This provides faster notification delivery when triggered manually
      broadcastChannel = supabase
        .channel(`admin-notifications-broadcast-${user.id}`)
        .on(
          'broadcast',
          { event: 'new-notification' },
          (payload) => {
            if (!isMountedRef.current) return;
            logger.debug('📬 New admin notification received via broadcast:', payload);
            loadNotifications();
          }
        )
        .subscribe((status, err) => {
          if (err) {
            logger.error('🔔 Admin notification broadcast subscription error:', err);
          } else {
            logger.debug('🔔 Admin notification broadcast subscription status:', status);
          }
        });
    };
    
    setupSubscription();

    return () => {
      isMountedRef.current = false;
      if (dbChannel) {
        supabase.removeChannel(dbChannel);
      }
      if (broadcastChannel) {
        supabase.removeChannel(broadcastChannel);
      }
    };
  }, [loadNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      
      loadNotifications();
    } catch (error) {
      i18nToast.error("error.notificationMarkFailed");
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      
      loadNotifications();
      i18nToast.success("success.allNotificationsRead");
    } catch (error) {
      i18nToast.error("error.notificationsMarkFailed");
    }
  };

  const deleteAllRead = async () => {
    if (!confirm("¿Eliminar todas las notificaciones leídas?")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ deleted_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_read", true)
        .is("deleted_at", null);
      
      if (error) throw error;
      
      loadNotifications();
      i18nToast.success("success.readNotificationsDeleted");
    } catch (error: any) {
      logger.error("Error deleting read notifications:", error);
      toast.error("Error al eliminar notificaciones: " + (error.message || "Error desconocido"));
    }
  };

  const deleteAll = async () => {
    if (!confirm("¿Eliminar TODAS las notificaciones (leídas y no leídas)?")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notifications")
        .update({ deleted_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("deleted_at", null);
      
      if (error) throw error;
      
      loadNotifications();
      i18nToast.success("success.allNotificationsDeleted");
    } catch (error: any) {
      logger.error("Error deleting all notifications:", error);
      toast.error("Error al eliminar notificaciones: " + (error.message || "Error desconocido"));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[500px] overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notificaciones</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs h-7"
              >
                Marcar todo
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={deleteAll}
              className="text-xs h-7 text-destructive hover:text-destructive"
            >
              Eliminar todo
            </Button>
          </div>
        </div>
        
        {notifications.length > 0 ? (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-3 cursor-pointer border-b ${
                  !notification.is_read ? 'bg-primary/5' : ''
                }`}
                onClick={() => {
                  markAsRead(notification.id);
                  if (notification.link) {
                    window.location.href = notification.link;
                  }
                }}
              >
                <div className="flex justify-between w-full mb-1">
                  <span className="font-semibold text-sm">{notification.title}</span>
                  {!notification.is_read && (
                    <Badge variant="default" className="ml-2">Nuevo</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{notification.message}</p>
                <span className="text-xs text-muted-foreground mt-1">
                  {new Date(notification.created_at).toLocaleString('es-ES')}
                </span>
              </DropdownMenuItem>
            ))}
            
            {notifications.some(n => n.is_read) && (
              <div className="p-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={deleteAllRead}
                  className="w-full text-xs h-8"
                >
                  Eliminar leídas
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No hay notificaciones
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
