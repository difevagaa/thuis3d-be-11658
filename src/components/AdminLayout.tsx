import { ReactNode, useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import AdminNotificationBell from "./AdminNotificationBell";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  Home, 
  RefreshCw, 
  RotateCcw, 
  Maximize, 
  Minimize,
  Shield
} from "lucide-react";
interface AdminLayoutProps {
  children: ReactNode;
}

// Inner component that has access to useSidebar
function AdminLayoutContent({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { setOpen, open } = useSidebar();
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mouseLeaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide sidebar after 5 seconds of inactivity
  useEffect(() => {
    const resetAutoHideTimer = () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
      
      // Set timer to auto-hide after 5 seconds
      autoHideTimerRef.current = setTimeout(() => {
        setOpen(false);
      }, 5000);
    };

    // Reset timer on any user interaction
    const handleUserActivity = () => {
      if (open) {
        resetAutoHideTimer();
      }
    };

    // Start the timer
    resetAutoHideTimer();

    // Listen for user interactions
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
    };
  }, [open, setOpen]);

  // Show sidebar when mouse is near left edge
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // If mouse is within 20px of left edge
      if (e.clientX < 20 && !open) {
        setOpen(true);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [open, setOpen]);


  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    // Check for browser support
    if (!document.documentElement.requestFullscreen) {
      toast.error("Tu navegador no soporta pantalla completa");
      return;
    }
    
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
        toast.success("Pantalla completa activada");
      }).catch((err) => {
        logger.error("Error entering fullscreen:", { error: err });
        toast.error("No se pudo activar pantalla completa");
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        toast.success("Pantalla completa desactivada");
      }).catch((err) => {
        logger.error("Error exiting fullscreen:", { error: err });
      });
    }
  }, []);

  // Refresh the page
  const handleRefreshPage = useCallback(() => {
    window.location.reload();
  }, []);

  // Refresh data (re-run queries, trigger a global refresh event)
  const handleRefreshData = useCallback(() => {
    setIsRefreshing(true);
    // Dispatch a custom event that components can listen to for refreshing their data
    window.dispatchEvent(new CustomEvent("admin-refresh-data"));
    toast.success("Actualizando datos...");
    // Reset the refreshing state after a short delay
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  // Listen for fullscreen change events
  useEffect(() => {
    // Check for browser support before adding listener
    if (typeof document.fullscreenElement === "undefined") {
      return;
    }
    
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      {/* Header - Fixed at top, adapts to sidebar */}
      <header className="h-12 sm:h-14 md:h-16 flex items-center justify-between border-b bg-card shadow-sm px-2 sm:px-3 md:px-6 sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4 min-w-0 flex-1 overflow-hidden">
          <SidebarTrigger className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8" />
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 min-w-0 overflow-hidden flex-1">
            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-primary-foreground" />
            </div>
            <h1 className="text-[10px] sm:text-xs md:text-sm lg:text-lg font-bold text-foreground truncate overflow-hidden">
              <span className="hidden md:inline">Panel de Administración</span>
              <span className="inline md:hidden">Admin</span>
            </h1>
          </div>
        </div>
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-shrink-0">
            {/* Home - Go to homepage */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate("/")}
                  className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 hover:bg-muted"
                >
                  <Home className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Inicio</p>
              </TooltipContent>
            </Tooltip>

            {/* Refresh Page */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleRefreshPage}
                  className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 hover:bg-muted"
                >
                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Recargar</p>
              </TooltipContent>
            </Tooltip>

            {/* Refresh Data - Hidden on small mobile */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleRefreshData}
                  className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 hover:bg-muted hidden xs:flex"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Actualizar datos</p>
              </TooltipContent>
            </Tooltip>


            {/* Toggle Fullscreen - Hidden on mobile */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleFullscreen}
                  className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 hover:bg-muted hidden lg:flex"
                >
                  {isFullscreen ? (
                    <Minimize className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-muted-foreground" />
                  ) : (
                    <Maximize className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-muted-foreground" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{isFullscreen ? "Salir" : "Pantalla completa"}</p>
              </TooltipContent>
            </Tooltip>

            {/* Notification Bell */}
            <AdminNotificationBell />
          </div>
        </TooltipProvider>
      </header>
      
      {/* Main area with sidebar */}
      <div className="flex flex-1 w-full overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 p-2 sm:p-3 md:p-4 lg:p-6 bg-muted/30 overflow-auto pb-16 sm:pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const checkAdminAccess = useCallback(async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Debes iniciar sesión");
        navigate("/auth");
        return;
      }
      const {
        data,
        error
      } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error("No tienes permisos de administrador");
        navigate("/");
        return;
      }
      setIsAdmin(true);
    } catch (error: unknown) {
      logger.error("Error checking admin access:", { error });
      toast.error("Error al verificar permisos");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Verificando permisos...</div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return null;
  }
  
  return (
    <SidebarProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </SidebarProvider>
  );
};