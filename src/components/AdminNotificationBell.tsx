import { useState, useEffect } from "react";
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

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let isMounted = true;
    
    const setupSubscription = async () => {
      // First load notifications (check isMounted before and after)
      if (!isMounted) return;
      await loadNotifications();
      if (!isMounted) return;
      
      // Get current user for filtering
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;
      const currentUserId = user.id;
      
      // Set up realtime subscription for admin notifications
      // The filter on user_id ensures we only receive notifications for the current admin
      channel = supabase
        .channel(`admin-notifications-${currentUserId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            if (isMounted) {
              logger.debug('📬 New admin notification received:', payload);
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
            filter: `user_id=eq.${currentUserId}`,
          },
          () => {
            if (isMounted) {
              loadNotifications();
            }
          }
        )
        .subscribe((status, err) => {
          if (err) {
            logger.error('🔔 Admin notification subscription error:', err);
          } else {
            logger.debug('🔔 Admin notification subscription status:', status);
          }
        });
    };
    
    setupSubscription();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Filtrar SOLO notificaciones de tipo administrativo
      // Tipos de notificaciones que los administradores pueden recibir:
      // - order: Nuevo pedido recibido
      // - order_update: Actualización de pedido
      // - invoice: Nueva factura generada
      // - invoice_update: Actualización de factura
      // - quote: Nueva cotización solicitada
      // - quote_update: Actualización de cotización
      // - quote_updated: Actualización de cotización (alias para compatibilidad)
      // - message: Nuevo mensaje de cliente
      // - new_message: Nuevo mensaje de cliente (usado por triggers de base de datos)
      // - gift_card: Actividad relacionada con tarjetas de regalo
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

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      logger.error("Error loading admin notifications:", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      
      loadNotifications();
    } catch (error) {
      toast.error("Error al marcar notificación");
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
      toast.success("Todas las notificaciones marcadas como leídas");
    } catch (error) {
      toast.error("Error al marcar notificaciones");
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
      toast.success("Notificaciones leídas eliminadas");
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
      toast.success("Todas las notificaciones eliminadas");
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
