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

  // Auto-hide sidebar after 30 seconds of inactivity
  useEffect(() => {
    const resetAutoHideTimer = () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
      
      // Set timer to auto-hide after 30 seconds
      autoHideTimerRef.current = setTimeout(() => {
        setOpen(false);
      }, 30000);
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
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('mousemove', handleUserActivity);

    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('mousemove', handleUserActivity);
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
      {/* Header - Fixed at top with centered content */}
      <header className="h-14 md:h-16 flex items-center border-b bg-card shadow-sm sticky top-0 z-50 shrink-0">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1 overflow-hidden">
            <SidebarTrigger className="flex-shrink-0 h-8 w-8" />
            <div className="flex items-center gap-2 md:gap-3 min-w-0 overflow-hidden flex-1">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary-foreground" />
              </div>
              <h1 className="text-sm md:text-base lg:text-lg font-bold text-foreground truncate overflow-hidden">
                <span className="hidden sm:inline">Panel de Administración</span>
                <span className="inline sm:hidden">Admin</span>
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
                    className="h-8 w-8 md:h-9 md:w-9 hover:bg-muted"
                  >
                    <Home className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
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
                    className="h-8 w-8 md:h-9 md:w-9 hover:bg-muted"
                  >
                    <RotateCcw className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
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
                    className="h-8 w-8 md:h-9 md:w-9 hover:bg-muted hidden sm:flex"
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-4 w-4 md:h-5 md:w-5 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`} />
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
                    className="h-8 w-8 md:h-9 md:w-9 hover:bg-muted hidden lg:flex"
                  >
                    {isFullscreen ? (
                      <Minimize className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                    ) : (
                      <Maximize className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
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
        </div>
      </header>
      
      {/* Main area with sidebar */}
      <div className="flex flex-1 w-full overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 bg-muted/30 overflow-auto pb-16 sm:pb-20 md:pb-6">
          {/* Centered content container for admin */}
          <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-5 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  const checkAdminAccess = useCallback(async () => {
    // Set a timeout to prevent infinite loading (increase to avoid false "logout" on slow networks)
    const timeoutId = setTimeout(() => {
      if (loading) {
        logger.error("Admin access check timed out");
        toast.error("La verificación está tardando demasiado. Intenta recargar.");
        // Do not force sign-out; just redirect to login if session is missing.
        navigate("/auth");
      }
    }, 30000); // 30 seconds

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        clearTimeout(timeoutId);
        toast.error("Debes iniciar sesión");
        navigate("/auth");
        return;
      }

      // Load all roles for this user
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesError) throw rolesError;

      const roles = (rolesData || [])
        .map(r => String(r.role || "").trim().toLowerCase())
        .filter(Boolean);

      const isSuperAdmin = roles.includes("superadmin");
      const isAdmin = roles.includes("admin");

      if (isSuperAdmin || isAdmin) {
        clearTimeout(timeoutId);
        setHasAdminAccess(true);
        setLoading(false);
        return;
      }

      // Allow access if user has any role that exists in custom_roles
      if (roles.length === 0) {
        clearTimeout(timeoutId);
        toast.error("No tienes permisos de administrador");
        navigate("/");
        return;
      }

      const { data: customRoles, error: customError } = await supabase
        .from("custom_roles")
        .select("name")
        .in("name", roles);

      if (customError) throw customError;

      const hasCustomAdminRole = (customRoles || []).length > 0;
      if (!hasCustomAdminRole) {
        clearTimeout(timeoutId);
        toast.error("No tienes permisos de administrador");
        navigate("/");
        return;
      }

      clearTimeout(timeoutId);
      setHasAdminAccess(true);
      setLoading(false);
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      logger.error("Error checking admin access:", { error });
      toast.error("Error al verificar permisos. Intenta iniciar sesión nuevamente.");
      navigate("/auth");
    }
  }, [navigate, loading]);

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

  if (!hasAdminAccess) {
    return null;
  }

  return (
    <SidebarProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </SidebarProvider>
  );
};
