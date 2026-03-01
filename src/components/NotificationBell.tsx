import { useState, useEffect, useCallback, useRef } from "react";
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
import { useTranslation } from "react-i18next";

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
  const { t, i18n } = useTranslation('common');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const isMountedRef = useRef(true);
  const userIdRef = useRef<string | null>(null);

  const getLocale = () => {
    const lang = i18n.language;
    if (lang?.startsWith('nl')) return 'nl-BE';
    if (lang?.startsWith('en')) return 'en-GB';
    return 'es-ES';
  };

  // Memoized load function to avoid recreating on each render
  const loadNotifications = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMountedRef.current) return;

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

      if (isMountedRef.current) {
        setNotifications(data || []);
        setUnreadCount(data?.filter(n => !n.is_read).length || 0);
      }
    } catch (error) {
      logger.error("Error loading client notifications:", error);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    let dbChannel: ReturnType<typeof supabase.channel> | undefined;
    let broadcastChannel: ReturnType<typeof supabase.channel> | undefined;
    
    const setupSubscription = async () => {
      await loadNotifications();
      if (!isMountedRef.current) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMountedRef.current) return;
      userIdRef.current = user.id;
      
      dbChannel = supabase
        .channel(`user-notifications-db-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload) => {
            if (!isMountedRef.current) return;
            const newRecord = payload.new as Notification & { user_id?: string };
            if (newRecord?.user_id === userIdRef.current) {
              loadNotifications();
            }
          }
        )
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' },
          (payload) => {
            if (!isMountedRef.current) return;
            const newRecord = payload.new as Notification & { user_id?: string };
            const oldRecord = payload.old as Notification & { user_id?: string };
            const recordUserId = newRecord?.user_id || oldRecord?.user_id;
            if (recordUserId === userIdRef.current) {
              loadNotifications();
            }
          }
        )
        .subscribe();
      
      broadcastChannel = supabase
        .channel(`user-notifications-broadcast-${user.id}`)
        .on('broadcast', { event: 'new-notification' },
          () => {
            if (!isMountedRef.current) return;
            loadNotifications();
          }
        )
        .subscribe();
    };
    
    setupSubscription();

    return () => {
      isMountedRef.current = false;
      if (dbChannel) supabase.removeChannel(dbChannel);
      if (broadcastChannel) supabase.removeChannel(broadcastChannel);
    };
  }, [loadNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      loadNotifications();
    } catch (error) {
      toast.error(t('notifications.errorMarking'));
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
      loadNotifications();
      toast.success(t('notifications.allMarkedRead'));
    } catch (error) {
      toast.error(t('notifications.errorMarking'));
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from("notifications").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      loadNotifications();
      toast.success(t('notifications.deleted'));
    } catch (error: any) {
      logger.error("Error deleting notification:", error);
      toast.error(t('notifications.errorDeleting'));
    }
  };

  const deleteAllRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("notifications").update({ deleted_at: new Date().toISOString() }).eq("user_id", user.id).eq("is_read", true).is("deleted_at", null);
      if (error) throw error;
      loadNotifications();
      toast.success(t('notifications.readDeleted'));
    } catch (error: any) {
      logger.error("Error deleting read notifications:", error);
      toast.error(t('notifications.errorDeleting'));
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
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
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] sm:text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-h-[60vh] sm:max-h-[500px] overflow-y-auto">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">{t('notifications.title')}</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>
        
        {notifications.length > 0 ? (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-4 cursor-pointer border-b hover:bg-accent ${!notification.is_read ? 'bg-primary/5' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex justify-between items-start w-full mb-1">
                  <div className="flex-1">
                    <span className="font-semibold text-sm">{notification.title}</span>
                    {!notification.is_read && (
                      <Badge variant="default" className="ml-2 text-xs">{t('notifications.new')}</Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => deleteNotification(notification.id, e)} className="h-7 w-7 p-0 hover:bg-destructive/20 flex items-center justify-center">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{notification.message}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(notification.created_at).toLocaleString(getLocale(), {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </DropdownMenuItem>
            ))}
            
            {notifications.some(n => n.is_read) && (
              <div className="p-2 border-t">
                <Button variant="outline" size="sm" onClick={deleteAllRead} className="w-full text-xs sm:text-sm h-8 sm:h-9">
                  {t('notifications.deleteRead')}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {t('notifications.empty')}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
