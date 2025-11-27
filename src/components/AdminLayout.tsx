import { ReactNode, useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminNotificationBell from "./AdminNotificationBell";
import { AdminQuickNav, AdminBreadcrumb } from "./AdminNavigationGrid";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { Home, LayoutGrid, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isOnDashboard = location.pathname === "/admin" || location.pathname === "/admin/dashboard";
  
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

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Back to Dashboard - shown when not on dashboard */}
              {!isOnDashboard && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin/dashboard")}
                  className="hidden sm:inline-flex items-center gap-2"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden md:inline">Inicio Admin</span>
                </Button>
              )}
              
              {/* Go to Store */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                title="Ir a la tienda"
                className="text-muted-foreground hover:text-foreground"
              >
                <Home className="h-5 w-5" />
              </Button>
              
              {/* Notifications */}
              <AdminNotificationBell />
            </div>
          </div>
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
  const location = useLocation();
  
  const sections = [
    {
      title: "Principal",
      items: [
        { label: "Dashboard", url: "/admin/dashboard" }
      ]
    },
    {
      title: "Catálogo",
      items: [
        { label: "Productos", url: "/admin/productos" },
        { label: "Categorías", url: "/admin/categorias" },
        { label: "Materiales", url: "/admin/materiales" },
        { label: "Colores", url: "/admin/colores" }
      ]
    },
    {
      title: "Ventas",
      items: [
        { label: "Pedidos", url: "/admin/pedidos" },
        { label: "Cotizaciones", url: "/admin/cotizaciones" },
        { label: "Facturas", url: "/admin/facturas" },
        { label: "Estados", url: "/admin/estados" }
      ]
    },
    {
      title: "Calculadora 3D",
      items: [
        { label: "Configuración", url: "/admin/calculadora-3d" },
        { label: "Descuentos", url: "/admin/descuentos-cantidad" },
        { label: "Calibración", url: "/admin/calibracion" },
        { label: "Perfiles", url: "/admin/perfiles-calibracion" },
        { label: "Precisión", url: "/admin/precision-calculadora" },
        { label: "Soportes", url: "/admin/deteccion-soportes" },
        { label: "Modelos", url: "/admin/modelos-vista-previa" }
      ]
    },
    {
      title: "Clientes",
      items: [
        { label: "Usuarios", url: "/admin/usuarios" },
        { label: "Roles", url: "/admin/roles" }
      ]
    },
    {
      title: "Marketing",
      items: [
        { label: "Lealtad", url: "/admin/loyalty" },
        { label: "Cupones", url: "/admin/coupons" },
        { label: "Tarjetas", url: "/admin/gift-cards" },
        { label: "SEO", url: "/admin/seo" }
      ]
    },
    {
      title: "Comunicación",
      items: [
        { label: "Mensajes", url: "/admin/messages" },
        { label: "Reseñas", url: "/admin/reviews" },
        { label: "Visitantes", url: "/admin/visitantes" }
      ]
    },
    {
      title: "Contenido",
      items: [
        { label: "Personalizar", url: "/admin/personalizador" },
        { label: "Contenido", url: "/admin/contenido" },
        { label: "Páginas", url: "/admin/pages" },
        { label: "Legal", url: "/admin/paginas-legales" },
        { label: "Blog", url: "/admin/blog" },
        { label: "Galería", url: "/admin/galeria" }
      ]
    },
    {
      title: "Configuración",
      items: [
        { label: "PINs", url: "/admin/pin" },
        { label: "Pagos", url: "/admin/configuracion-pagos" },
        { label: "IVA", url: "/admin/configuracion-iva" },
        { label: "Envíos", url: "/admin/gestion-envios" },
        { label: "Idiomas", url: "/admin/traducciones" },
        { label: "Backup", url: "/admin/backup-config" },
        { label: "Papelera", url: "/admin/trash" }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {sections.map((section, idx) => (
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