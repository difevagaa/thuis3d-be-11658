import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  Archive, 
  Settings, 
  Receipt, 
  Package, 
  Users, 
  UserCog,
  Palette,
  Calculator,
  TrendingUp,
  Shield
} from "lucide-react";
import { toast } from "sonner";

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        i18nToast.error("error.mustLogin");
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        i18nToast.error("error.noPermission");
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch (error: any) {
      i18nToast.error("error.permissionVerifyFailed");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

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

  const sections = [
    {
      title: "PRINCIPAL",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
        { icon: Settings, label: "Métodos de Pago", path: "/admin/metodos-pago" }
      ]
    },
    {
      title: "VENTAS",
      items: [
        { icon: FileText, label: "Cotizaciones", path: "/admin/cotizaciones", badge: "0" },
        { icon: ShoppingCart, label: "Pedidos", path: "/admin/pedidos", badge: "0" },
        { icon: Archive, label: "Archivados", path: "/admin/archivados" },
        { icon: Settings, label: "Estados", path: "/admin/estados" },
        { icon: Receipt, label: "Facturas", path: "/admin/facturas", badge: "0" },
        { icon: Receipt, label: "Notas de Cobro", path: "/admin/notas-cobro", badge: "0" }
      ]
    },
    {
      title: "CATÁLOGO",
      items: [
        { icon: Package, label: "Productos", path: "/admin/productos", badge: "0" },
        { icon: Package, label: "Materiales", path: "/admin/materiales" },
        { icon: Palette, label: "Colores", path: "/admin/colores" }
      ]
    },
    {
      title: "CLIENTES",
      items: [
        { icon: Users, label: "Clientes", path: "/admin/clientes", badge: "0" },
        { icon: Users, label: "Usuarios", path: "/admin/usuarios" },
        { icon: UserCog, label: "Roles", path: "/admin/roles" }
      ]
    },
    {
      title: "CALCULADORA 3D",
      items: [
        { icon: Calculator, label: "Configuración", path: "/admin/calculadora-3d" },
        { icon: TrendingUp, label: "Calibración", path: "/admin/calibracion" },
        { icon: TrendingUp, label: "Perfiles", path: "/admin/perfiles-calibracion" },
        { icon: Settings, label: "Precisión", path: "/admin/precision-calculadora" },
        { icon: Shield, label: "Detección Soportes", path: "/admin/deteccion-soportes" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Panel de Administración</h1>
          <p className="text-muted-foreground">Gestiona tu tienda de impresión 3D</p>
        </div>

        <div className="grid gap-8">
          {sections.map((section, idx) => (
            <div key={idx}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-4">
                {section.title}
              </h2>
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                {section.items.map((item, itemIdx) => (
                  <Card 
                    key={itemIdx}
                    className="cursor-pointer hover:shadow-medium transition-shadow"
                    onClick={() => navigate(item.path)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-2">
                        <item.icon className="h-5 w-5 text-primary" />
                        {item.badge && (
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold">{item.label}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Admin;
