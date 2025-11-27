import { ReactNode, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
  Contrast, 
  Maximize, 
  Minimize 
} from "lucide-react";
interface AdminLayoutProps {
  children: ReactNode;
}
export const AdminLayout = ({
  children
}: AdminLayoutProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGrayscale, setIsGrayscale] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Toggle grayscale mode for accessibility
  const toggleGrayscale = useCallback(() => {
    setIsGrayscale((prev) => {
      const newValue = !prev;
      if (newValue) {
        document.documentElement.classList.add("grayscale");
        toast.success("Modo blanco y negro activado");
      } else {
        document.documentElement.classList.remove("grayscale");
        toast.success("Modo blanco y negro desactivado");
      }
      return newValue;
    });
  }, []);

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
    return <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Verificando permisos...</div>
      </div>;
  }
  if (!isAdmin) {
    return null;
  }
  return <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1">
          <header className="h-14 flex items-center justify-between border-b px-4">
            <div className="flex items-center">
              <SidebarTrigger />
              <h1 className="ml-4 text-lg font-semibold">Panel de Administración</h1>
            </div>
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-1">
                {/* Home - Go to homepage */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => navigate("/")}
                      className="h-9 w-9"
                    >
                      <Home className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ir a la página de inicio</p>
                  </TooltipContent>
                </Tooltip>

                {/* Refresh Page */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleRefreshPage}
                      className="h-9 w-9"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Recargar página</p>
                  </TooltipContent>
                </Tooltip>

                {/* Refresh Data */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleRefreshData}
                      className="h-9 w-9"
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Actualizar datos</p>
                  </TooltipContent>
                </Tooltip>

                {/* Toggle Grayscale Mode */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={toggleGrayscale}
                      className={`h-9 w-9 ${isGrayscale ? "bg-accent" : ""}`}
                    >
                      <Contrast className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isGrayscale ? "Desactivar" : "Activar"} modo blanco y negro</p>
                  </TooltipContent>
                </Tooltip>

                {/* Toggle Fullscreen */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={toggleFullscreen}
                      className="h-9 w-9"
                    >
                      {isFullscreen ? (
                        <Minimize className="h-5 w-5" />
                      ) : (
                        <Maximize className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isFullscreen ? "Salir de" : "Activar"} pantalla completa</p>
                  </TooltipContent>
                </Tooltip>

                {/* Notification Bell */}
                <AdminNotificationBell />
              </div>
            </TooltipProvider>
          </header>
          <main className="p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>;
};