import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Shield,
  Search,
  ArrowRight,
  Zap,
  Award,
  MessageSquare,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const checkAdminAccess = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Debes iniciar sesión");
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
        toast.error("No tienes permisos de administrador");
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch (error: any) {
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

  const sections = [
    {
      title: "ACCESOS RÁPIDOS",
      description: "Las herramientas más importantes para gestionar tu negocio",
      color: "orange",
      items: [
        { 
          icon: LayoutDashboard, 
          label: "Dashboard", 
          description: "Visión general y métricas",
          path: "/admin/dashboard",
          color: "bg-gradient-to-br from-orange-500 to-orange-600",
          iconColor: "text-orange-600"
        },
        { 
          icon: ShoppingCart, 
          label: "Pedidos", 
          description: "Gestionar todos los pedidos",
          path: "/admin/pedidos", 
          badge: "0",
          color: "bg-gradient-to-br from-blue-500 to-blue-600",
          iconColor: "text-blue-600"
        },
        { 
          icon: FileText, 
          label: "Cotizaciones", 
          description: "Presupuestos pendientes",
          path: "/admin/cotizaciones", 
          badge: "0",
          color: "bg-gradient-to-br from-purple-500 to-purple-600",
          iconColor: "text-purple-600"
        },
        { 
          icon: Package, 
          label: "Productos", 
          description: "Catálogo completo",
          path: "/admin/productos", 
          badge: "0",
          color: "bg-gradient-to-br from-teal-500 to-teal-600",
          iconColor: "text-teal-600"
        }
      ]
    },
    {
      title: "VENTAS Y FACTURACIÓN",
      description: "Gestiona tus transacciones y documentos fiscales",
      color: "blue",
      items: [
        { 
          icon: Receipt, 
          label: "Facturas", 
          description: "Gestión de facturas",
          path: "/admin/facturas", 
          badge: "0",
          iconColor: "text-green-600"
        },
        { 
          icon: Receipt, 
          label: "Notas de Cobro", 
          description: "Documentos de cobro",
          path: "/admin/notas-cobro", 
          badge: "0",
          iconColor: "text-blue-600"
        },
        { 
          icon: Archive, 
          label: "Archivados", 
          description: "Pedidos archivados",
          path: "/admin/archivados",
          iconColor: "text-gray-600"
        },
        { 
          icon: Settings, 
          label: "Estados", 
          description: "Gestión de estados",
          path: "/admin/estados",
          iconColor: "text-orange-600"
        },
        { 
          icon: Settings, 
          label: "Métodos de Pago", 
          description: "Configurar pagos",
          path: "/admin/metodos-pago",
          iconColor: "text-purple-600"
        }
      ]
    },
    {
      title: "CATÁLOGO DE PRODUCTOS",
      description: "Administra tu inventario y configuraciones",
      color: "teal",
      items: [
        { 
          icon: Package, 
          label: "Materiales", 
          description: "Tipos de materiales",
          path: "/admin/materiales",
          iconColor: "text-amber-600"
        },
        { 
          icon: Palette, 
          label: "Colores", 
          description: "Paleta de colores",
          path: "/admin/colores",
          iconColor: "text-pink-600"
        }
      ]
    },
    {
      title: "CLIENTES Y USUARIOS",
      description: "Gestiona clientes, usuarios y permisos",
      color: "purple",
      items: [
        { 
          icon: Users, 
          label: "Clientes", 
          description: "Base de clientes",
          path: "/admin/clientes", 
          badge: "0",
          iconColor: "text-blue-600"
        },
        { 
          icon: Users, 
          label: "Usuarios", 
          description: "Todos los usuarios",
          path: "/admin/usuarios",
          iconColor: "text-teal-600"
        },
        { 
          icon: UserCog, 
          label: "Roles", 
          description: "Permisos y roles",
          path: "/admin/roles",
          iconColor: "text-purple-600"
        }
      ]
    },
    {
      title: "CONFIGURACIÓN 3D",
      description: "Ajusta la calculadora y calibración de impresión 3D",
      color: "green",
      items: [
        { 
          icon: Calculator, 
          label: "Configuración", 
          description: "Ajustes generales",
          path: "/admin/calculadora-3d",
          iconColor: "text-orange-600"
        },
        { 
          icon: TrendingUp, 
          label: "Calibración", 
          description: "Calibrar impresoras",
          path: "/admin/calibracion",
          iconColor: "text-green-600"
        },
        { 
          icon: TrendingUp, 
          label: "Perfiles", 
          description: "Perfiles de calibración",
          path: "/admin/perfiles-calibracion",
          iconColor: "text-blue-600"
        },
        { 
          icon: Settings, 
          label: "Precisión", 
          description: "Ajustes de precisión",
          path: "/admin/precision-calculadora",
          iconColor: "text-purple-600"
        },
        { 
          icon: Shield, 
          label: "Detección Soportes", 
          description: "Configurar soportes",
          path: "/admin/deteccion-soportes",
          iconColor: "text-teal-600"
        }
      ]
    }
  ];

  // Filter sections based on search
  const filteredSections = searchQuery.trim() === "" 
    ? sections 
    : sections.map(section => ({
        ...section,
        items: section.items.filter(item => 
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(section => section.items.length > 0);

  // Quick stats for the header
  const quickStats = [
    { icon: ShoppingCart, label: "Pedidos Hoy", value: "0", color: "text-blue-600" },
    { icon: Zap, label: "Cotizaciones Nuevas", value: "0", color: "text-purple-600" },
    { icon: BarChart3, label: "Ventas del Mes", value: "€0", color: "text-green-600" },
    { icon: MessageSquare, label: "Mensajes", value: "0", color: "text-orange-600" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Professional Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <LayoutDashboard className="h-6 w-6 text-white" />
                </div>
                Panel de Administración
              </h1>
              <p className="text-gray-300 text-base">Gestiona tu negocio de impresión 3D de forma profesional</p>
            </div>
            <Button 
              onClick={() => navigate("/admin/dashboard")}
              className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all"
              size="lg"
            >
              <LayoutDashboard className="h-5 w-5 mr-2" />
              Ir al Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {quickStats.map((stat, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-medium">{stat.label}</p>
                    <p className="text-white text-lg font-bold">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar funciones, configuraciones o herramientas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8">
          {filteredSections.map((section, idx) => (
            <div key={idx} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-1 w-12 bg-primary rounded-full"></div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {section.title}
                  </h2>
                  <p className="text-sm text-gray-500">{section.description}</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {section.items.map((item, itemIdx) => (
                  <Card 
                    key={itemIdx}
                    className="group cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] border-2"
                    onClick={() => navigate(item.path)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl ${item.color || 'bg-gray-100'} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <item.icon className={`h-6 w-6 ${item.iconColor || 'text-gray-600'} ${item.color ? 'text-white' : ''}`} />
                        </div>
                        {item.badge && (
                          <Badge className="bg-primary/10 text-primary border-primary/20 font-bold">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-lg mb-1 text-gray-900 group-hover:text-primary transition-colors">
                        {item.label}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-gray-500 mb-3">{item.description}</p>
                      )}
                      <div className="flex items-center text-primary font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        Acceder
                        <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredSections.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron resultados</h3>
            <p className="text-gray-500">Intenta con otros términos de búsqueda</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
