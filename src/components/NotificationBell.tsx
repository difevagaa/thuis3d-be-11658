import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
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

export default function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

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
      
      // Set up realtime subscription for INSERT and UPDATE events
      // The filter on user_id ensures we only receive notifications for the current user
      channel = supabase
        .channel(`user-notifications-${currentUserId}`)
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
              logger.debug('📬 New notification received:', payload);
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
            logger.error('🔔 Notification subscription error:', err);
          } else {
            logger.debug('🔔 Notification subscription status:', status);
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

      // Filtrar SOLO notificaciones de tipo cliente (excluyendo las administrativas)
      // Tipos de notificaciones que los clientes pueden recibir:
      // - order: Nuevo pedido creado
      // - order_update: Actualización de estado de pedido
      // - order_paid: Pago confirmado
      // - order_cancelled: Pedido cancelado
      // - invoice: Nueva factura generada
      // - quote: Nueva cotización enviada/recibida
      // - quote_update: Actualización de cotización
      // - loyalty_points: Puntos de lealtad ganados
      // - loyalty_coupon_available: Cupón de lealtad disponible
      // - loyalty_next_goal: Próxima meta de lealtad
      // - loyalty_milestone: Hito de lealtad alcanzado
      // - admin_reply: Respuesta del administrador
      // - message_received: Mensaje recibido en chat
      // Note: Both 'quote_update' and 'quote_updated' are included for backwards compatibility
      // as different parts of the system may use either naming convention
      const clientTypes = [
        'order', 'order_update', 'order_paid', 'order_cancelled',
        'invoice', 'quote', 'quote_update', 'quote_updated',
        'loyalty_points', 'loyalty_coupon_available', 'loyalty_next_goal', 'loyalty_milestone',
        'admin_reply', 'message_received', 'giftcard_redeemed'
      ];
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .in("type", clientTypes)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(15);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      logger.error("Error loading client notifications:", error);
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

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
      
      loadNotifications();
      toast.success("Notificación eliminada");
    } catch (error: any) {
      logger.error("Error deleting notification:", error);
      toast.error("Error al eliminar notificación: " + (error.message || ""));
    }
  };

  const deleteAllRead = async () => {
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
      toast.error("Error al eliminar notificaciones: " + (error.message || ""));
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      // Si el link es inválido o apunta a /puntos, redirigir a /mi-cuenta?tab=points
      if (notification.link === '/puntos' || notification.type === 'points_earned' || notification.type === 'loyalty_points') {
        navigate('/mi-cuenta?tab=points');
      } else {
        navigate(notification.link);
      }
    }
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" id="nav-notifications-btn">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] sm:text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-h-[60vh] sm:max-h-[500px] overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs h-7"
            >
              Marcar todo como leído
            </Button>
          )}
        </div>
        
        {notifications.length > 0 ? (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-4 cursor-pointer border-b hover:bg-accent ${
                  !notification.is_read ? 'bg-primary/5' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex justify-between items-start w-full mb-1">
                  <div className="flex-1">
                    <span className="font-semibold text-sm">{notification.title}</span>
                    {!notification.is_read && (
                      <Badge variant="default" className="ml-2 text-xs">Nuevo</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => deleteNotification(notification.id, e)}
                    className="h-7 w-7 p-0 hover:bg-destructive/20 flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{notification.message}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(notification.created_at).toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </DropdownMenuItem>
            ))}
            
            {notifications.some(n => n.is_read) && (
              <div className="p-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={deleteAllRead}
                  className="w-full text-xs sm:text-sm h-8 sm:h-9"
                >
                  Eliminar leídas
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No tienes notificaciones
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
