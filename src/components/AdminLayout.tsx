import { ReactNode, useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import AdminNotificationBell from "./AdminNotificationBell";
import { toast } from "sonner";
import { i18nToast } from "@/lib/i18nToast";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Minimize,
  Moon,
  Sun,
  Sparkles
} from "lucide-react";
import { useTheme } from "next-themes";

interface AdminLayoutProps {
  children: ReactNode;
}

// Page titles mapping
const pageTitles: Record<string, { title: string; emoji: string; color: string }> = {
  "/admin": { title: "Dashboard", emoji: "📊", color: "from-blue-500 to-indigo-600" },
  "/admin/dashboard": { title: "Dashboard", emoji: "📊", color: "from-blue-500 to-indigo-600" },
  "/admin/productos": { title: "Productos", emoji: "📦", color: "from-emerald-500 to-teal-600" },
  "/admin/categorias": { title: "Categorías", emoji: "📁", color: "from-emerald-500 to-teal-600" },
  "/admin/materiales": { title: "Materiales", emoji: "🧱", color: "from-emerald-500 to-teal-600" },
  "/admin/colores": { title: "Colores", emoji: "🎨", color: "from-emerald-500 to-teal-600" },
  "/admin/pedidos": { title: "Pedidos", emoji: "🛒", color: "from-orange-500 to-amber-600" },
  "/admin/cotizaciones": { title: "Cotizaciones", emoji: "📋", color: "from-orange-500 to-amber-600" },
  "/admin/facturas": { title: "Facturas", emoji: "🧾", color: "from-orange-500 to-amber-600" },
  "/admin/estados": { title: "Estados", emoji: "🏷️", color: "from-orange-500 to-amber-600" },
  "/admin/usuarios": { title: "Usuarios", emoji: "👥", color: "from-pink-500 to-rose-600" },
  "/admin/roles": { title: "Roles y Permisos", emoji: "🔐", color: "from-pink-500 to-rose-600" },
  "/admin/loyalty": { title: "Programa de Lealtad", emoji: "🏆", color: "from-cyan-500 to-sky-600" },
  "/admin/coupons": { title: "Cupones", emoji: "🎟️", color: "from-cyan-500 to-sky-600" },
  "/admin/gift-cards": { title: "Tarjetas Regalo", emoji: "🎁", color: "from-cyan-500 to-sky-600" },
  "/admin/seo": { title: "SEO", emoji: "🔍", color: "from-cyan-500 to-sky-600" },
  "/admin/messages": { title: "Mensajes", emoji: "💬", color: "from-red-500 to-pink-600" },
  "/admin/reviews": { title: "Reseñas", emoji: "⭐", color: "from-red-500 to-pink-600" },
  "/admin/visitantes": { title: "Actividad de Usuarios", emoji: "📡", color: "from-red-500 to-pink-600" },
  "/admin/personalizador": { title: "Personalizador", emoji: "✨", color: "from-indigo-500 to-purple-600" },
  "/admin/contenido": { title: "Gestión de Contenido", emoji: "📝", color: "from-indigo-500 to-purple-600" },
  "/admin/pages": { title: "Páginas", emoji: "📄", color: "from-indigo-500 to-purple-600" },
  "/admin/paginas-legales": { title: "Páginas Legales", emoji: "⚖️", color: "from-indigo-500 to-purple-600" },
  "/admin/blog": { title: "Blog", emoji: "📰", color: "from-indigo-500 to-purple-600" },
  "/admin/galeria": { title: "Galería", emoji: "🖼️", color: "from-indigo-500 to-purple-600" },
  "/admin/calculadora-3d": { title: "Calculadora 3D", emoji: "⚙️", color: "from-purple-500 to-violet-600" },
  "/admin/descuentos-cantidad": { title: "Descuentos por Cantidad", emoji: "📉", color: "from-purple-500 to-violet-600" },
  "/admin/calibracion": { title: "Calibración", emoji: "🔧", color: "from-purple-500 to-violet-600" },
  "/admin/perfiles-calibracion": { title: "Perfiles de Calibración", emoji: "📈", color: "from-purple-500 to-violet-600" },
  "/admin/precision-calculadora": { title: "Precisión Calculadora", emoji: "🎯", color: "from-purple-500 to-violet-600" },
  "/admin/deteccion-soportes": { title: "Detección de Soportes", emoji: "🛡️", color: "from-purple-500 to-violet-600" },
  "/admin/modelos-vista-previa": { title: "Modelos Vista Previa", emoji: "🔮", color: "from-purple-500 to-violet-600" },
  "/admin/pin": { title: "Gestión de PINs", emoji: "🔑", color: "from-slate-500 to-gray-600" },
  "/admin/configuracion-pagos": { title: "Configuración de Pagos", emoji: "💳", color: "from-slate-500 to-gray-600" },
  "/admin/configuracion-iva": { title: "Configuración IVA", emoji: "💹", color: "from-slate-500 to-gray-600" },
  "/admin/gestion-envios": { title: "Gestión de Envíos", emoji: "🚚", color: "from-slate-500 to-gray-600" },
  "/admin/traducciones": { title: "Traducciones", emoji: "🌍", color: "from-slate-500 to-gray-600" },
  "/admin/backup-config": { title: "Backup", emoji: "💾", color: "from-slate-500 to-gray-600" },
  "/admin/trash": { title: "Papelera", emoji: "🗑️", color: "from-slate-500 to-gray-600" },
};

export const AdminLayout = ({
  children
}: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGrayscale, setIsGrayscale] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get current page info
  const currentPath = location.pathname;
  const pageInfo = pageTitles[currentPath] || { title: "Panel Admin", emoji: "🏠", color: "from-primary to-primary/70" };

  // Toggle grayscale mode for accessibility
  const toggleGrayscale = useCallback(() => {
    setIsGrayscale((prev) => {
      const newValue = !prev;
      if (newValue) {
        document.documentElement.classList.add("grayscale");
        i18nToast.success("success.bwModeEnabled");
      } else {
        document.documentElement.classList.remove("grayscale");
        i18nToast.success("success.bwModeDisabled");
      }
      return newValue;
    });
  }, []);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    if (!document.documentElement.requestFullscreen) {
      i18nToast.error("error.fullscreenNotSupported");
      return;
    }
    
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
        i18nToast.success("success.fullscreenEnabled");
      }).catch((err) => {
        logger.error("Error entering fullscreen:", { error: err });
        i18nToast.error("error.fullscreenActivationFailed");
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        i18nToast.success("success.fullscreenDisabled");
      }).catch((err) => {
        logger.error("Error exiting fullscreen:", { error: err });
      });
    }
  }, []);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
    toast.success(`Tema ${theme === "dark" ? "claro" : "oscuro"} activado`);
  }, [theme, setTheme]);

  // Refresh the page
  const handleRefreshPage = useCallback(() => {
    window.location.reload();
  }, []);

  // Refresh data
  const handleRefreshData = useCallback(() => {
    setIsRefreshing(true);
    window.dispatchEvent(new CustomEvent("admin-refresh-data"));
    i18nToast.success("success.updatingData");
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  // Listen for fullscreen change events
  useEffect(() => {
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
      // Use getSession() first - reads from localStorage (fast, no network initially)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        logger.error("Session error:", { error: sessionError });
        i18nToast.error("error.mustLogin");
        navigate("/auth");
        return;
      }
      
      if (!session?.user) {
        i18nToast.error("error.mustLogin");
        navigate("/auth");
        return;
      }
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        i18nToast.error("error.noPermission");
        navigate("/");
        return;
      }
      setIsAdmin(true);
    } catch (error: unknown) {
      logger.error("Error checking admin access:", { error });
      i18nToast.error("error.permissionVerifyFailed");
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25 animate-pulse">
            <span className="text-3xl">🔐</span>
          </div>
          <p className="text-muted-foreground font-medium">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen min-h-dvh flex w-full max-w-full overflow-x-hidden bg-gradient-to-br from-background via-muted/20 to-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          {/* Modern Header with safe area support for notched devices */}
          <header 
            className="sticky top-0 z-40 h-12 xs:h-14 md:h-16 bg-background/80 backdrop-blur-xl border-b border-border/50 px-1 xs:px-2 sm:px-4 flex items-center justify-between shadow-sm"
            style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
          >
            <div className="flex items-center gap-1 xs:gap-2 sm:gap-4 min-w-0">
              <SidebarTrigger className="hover:bg-accent/50 transition-colors rounded-lg flex-shrink-0 h-8 w-8 xs:h-9 xs:w-9" />
              
              {/* Page Title with Gradient */}
              <div className="flex items-center gap-1 xs:gap-2 sm:gap-3 min-w-0">
                <div className={`w-6 h-6 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-lg xs:rounded-xl bg-gradient-to-br ${pageInfo.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                  <span className="text-xs xs:text-sm sm:text-lg">{pageInfo.emoji}</span>
                </div>
                <div className="hidden xs:block min-w-0">
                  <h1 className="text-sm xs:text-base sm:text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent truncate max-w-[100px] xs:max-w-[140px] sm:max-w-none">
                    {pageInfo.title}
                  </h1>
                  <p className="text-[10px] xs:text-xs text-muted-foreground hidden sm:block">Panel de Administración</p>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-0 xs:gap-0.5 sm:gap-1 flex-shrink-0">
                {/* Home Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => navigate("/")}
                      className="h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-blue-500/10 hover:text-blue-600 transition-colors"
                    >
                      <Home className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ir a la tienda</p>
                  </TooltipContent>
                </Tooltip>

                {/* Refresh Page - Hidden on very small screens */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleRefreshPage}
                      className="h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-orange-500/10 hover:text-orange-600 transition-colors hidden xs:flex"
                    >
                      <RotateCcw className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Recargar página</p>
                  </TooltipContent>
                </Tooltip>

                {/* Refresh Data - Hidden on very small screens */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleRefreshData}
                      className="h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-green-500/10 hover:text-green-600 transition-colors hidden xs:flex"
                      disabled={isRefreshing}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 xs:h-4 xs:w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Actualizar datos</p>
                  </TooltipContent>
                </Tooltip>

                {/* Theme Toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={toggleTheme}
                      className="h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-purple-500/10 hover:text-purple-600 transition-colors"
                    >
                      {theme === "dark" ? (
                        <Sun className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                      ) : (
                        <Moon className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cambiar tema</p>
                  </TooltipContent>
                </Tooltip>

                {/* Grayscale Mode - Hidden on small screens */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={toggleGrayscale}
                      className={`h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 rounded-lg transition-colors hidden sm:flex ${
                        isGrayscale 
                          ? "bg-accent text-accent-foreground" 
                          : "hover:bg-slate-500/10 hover:text-slate-600"
                      }`}
                    >
                      <Contrast className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isGrayscale ? "Desactivar" : "Activar"} modo B/N</p>
                  </TooltipContent>
                </Tooltip>

                {/* Fullscreen - Hidden on small screens */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={toggleFullscreen}
                      className="h-7 w-7 xs:h-8 xs:w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-indigo-500/10 hover:text-indigo-600 transition-colors hidden sm:flex"
                    >
                      {isFullscreen ? (
                        <Minimize className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                      ) : (
                        <Maximize className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isFullscreen ? "Salir de" : "Activar"} pantalla completa</p>
                  </TooltipContent>
                </Tooltip>

                {/* Notification Bell */}
                <div className="ml-0.5 xs:ml-1 sm:ml-2 border-l border-border/50 pl-0.5 xs:pl-1 sm:pl-2">
                  <AdminNotificationBell />
                </div>
              </div>
            </TooltipProvider>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto">
            <div className="w-full max-w-7xl mx-auto p-2 xs:p-3 sm:p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};