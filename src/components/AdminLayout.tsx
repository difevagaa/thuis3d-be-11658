import { ReactNode, useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminNotificationBell from "./AdminNotificationBell";
import { AdminQuickNav, AdminBreadcrumb, menuSections, isOnDashboardPath } from "./AdminNavigationGrid";
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
  const location = useLocation();
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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            {/* Left: Logo/Title & Navigation */}
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Menú de Administración</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
                    <MobileNavigation onNavigate={() => setMobileMenuOpen(false)} />
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              {/* Logo/Title */}
              <NavLink 
                to="/admin/dashboard" 
                className="flex items-center gap-3 group"
              >
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-foreground leading-none">
                    Panel Admin
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Gestión del sitio
                  </p>
                </div>
              </NavLink>

              {/* Breadcrumb - Desktop */}
              <div className="hidden lg:flex items-center ml-4">
                <AdminBreadcrumb />
              </div>
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
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Quick Navigation for sub-pages */}
        {!isOnDashboard && <AdminQuickNav />}
        
        {/* Page Content */}
        {children}
      </main>
    </div>
  );
};

// Mobile Navigation Component
function MobileNavigation({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="space-y-6">
      {menuSections.map((section, idx) => (
        <div key={idx}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
            {section.title}
          </h3>
          <div className="space-y-1">
            {section.items.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                onClick={onNavigate}
                className={({ isActive }) => `
                  block px-3 py-2 rounded-lg text-sm transition-colors
                  ${isActive 
                    ? 'bg-primary text-primary-foreground font-medium' 
                    : 'hover:bg-muted text-foreground'
                  }
                `}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}