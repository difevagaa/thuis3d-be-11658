import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingCart, 
  FolderTree, 
  Settings, 
  Receipt, 
  Package, 
  Users, 
  UserCog, 
  Palette, 
  Gift, 
  Tag, 
  Award, 
  MessageSquare, 
  FileCode, 
  BookOpen, 
  Star, 
  Trash2, 
  Percent, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Shield, 
  Activity, 
  CreditCard, 
  Truck, 
  HardDrive, 
  Gauge, 
  Box, 
  Image, 
  Globe,
  Calculator,
  Home,
  ChevronRight,
  LucideIcon
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MenuItem {
  icon: LucideIcon;
  label: string;
  url: string;
  description?: string;
}

interface MenuSection {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgGradient: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    title: "Principal",
    description: "Vista general del negocio",
    icon: Home,
    color: "text-blue-600 dark:text-blue-400",
    bgGradient: "from-blue-500/20 to-blue-600/10 hover:from-blue-500/30 hover:to-blue-600/20",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", url: "/admin/dashboard", description: "Métricas y estadísticas" }
    ]
  },
  {
    title: "Catálogo",
    description: "Productos, materiales y colores",
    icon: Package,
    color: "text-purple-600 dark:text-purple-400",
    bgGradient: "from-purple-500/20 to-purple-600/10 hover:from-purple-500/30 hover:to-purple-600/20",
    items: [
      { icon: Package, label: "Productos", url: "/admin/productos", description: "Gestionar productos" },
      { icon: FolderTree, label: "Categorías", url: "/admin/categorias", description: "Organizar categorías" },
      { icon: Layers, label: "Materiales", url: "/admin/materiales", description: "Tipos de material" },
      { icon: Palette, label: "Colores", url: "/admin/colores", description: "Paleta de colores" }
    ]
  },
  {
    title: "Ventas",
    description: "Pedidos, cotizaciones y facturas",
    icon: ShoppingCart,
    color: "text-green-600 dark:text-green-400",
    bgGradient: "from-green-500/20 to-green-600/10 hover:from-green-500/30 hover:to-green-600/20",
    items: [
      { icon: ShoppingCart, label: "Pedidos", url: "/admin/pedidos", description: "Gestionar pedidos" },
      { icon: FileText, label: "Cotizaciones", url: "/admin/cotizaciones", description: "Ver cotizaciones" },
      { icon: Receipt, label: "Facturas", url: "/admin/facturas", description: "Historial de facturas" },
      { icon: Tag, label: "Estados", url: "/admin/estados", description: "Configurar estados" }
    ]
  },
  {
    title: "Calculadora 3D",
    description: "Configuración de impresión",
    icon: Calculator,
    color: "text-orange-600 dark:text-orange-400",
    bgGradient: "from-orange-500/20 to-orange-600/10 hover:from-orange-500/30 hover:to-orange-600/20",
    items: [
      { icon: Settings, label: "Configuración", url: "/admin/calculadora-3d", description: "Parámetros base" },
      { icon: TrendingDown, label: "Descuentos", url: "/admin/descuentos-cantidad", description: "Descuentos por cantidad" },
      { icon: Gauge, label: "Calibración", url: "/admin/calibracion", description: "Ajuste de impresión" },
      { icon: TrendingUp, label: "Perfiles", url: "/admin/perfiles-calibracion", description: "Perfiles guardados" },
      { icon: Activity, label: "Precisión", url: "/admin/precision-calculadora", description: "Nivel de precisión" },
      { icon: Shield, label: "Soportes", url: "/admin/deteccion-soportes", description: "Detección automática" },
      { icon: Box, label: "Modelos", url: "/admin/modelos-vista-previa", description: "Vista previa 3D" }
    ]
  },
  {
    title: "Clientes",
    description: "Usuarios y permisos",
    icon: Users,
    color: "text-cyan-600 dark:text-cyan-400",
    bgGradient: "from-cyan-500/20 to-cyan-600/10 hover:from-cyan-500/30 hover:to-cyan-600/20",
    items: [
      { icon: Users, label: "Usuarios", url: "/admin/usuarios", description: "Lista de usuarios" },
      { icon: UserCog, label: "Roles", url: "/admin/roles", description: "Permisos y accesos" }
    ]
  },
  {
    title: "Marketing",
    description: "Promociones y fidelización",
    icon: Award,
    color: "text-pink-600 dark:text-pink-400",
    bgGradient: "from-pink-500/20 to-pink-600/10 hover:from-pink-500/30 hover:to-pink-600/20",
    items: [
      { icon: Award, label: "Lealtad", url: "/admin/loyalty", description: "Programa de puntos" },
      { icon: Percent, label: "Cupones", url: "/admin/coupons", description: "Descuentos y códigos" },
      { icon: Gift, label: "Tarjetas", url: "/admin/gift-cards", description: "Tarjetas de regalo" },
      { icon: TrendingUp, label: "SEO", url: "/admin/seo", description: "Optimización web" }
    ]
  },
  {
    title: "Comunicación",
    description: "Mensajes y reseñas",
    icon: MessageSquare,
    color: "text-indigo-600 dark:text-indigo-400",
    bgGradient: "from-indigo-500/20 to-indigo-600/10 hover:from-indigo-500/30 hover:to-indigo-600/20",
    items: [
      { icon: MessageSquare, label: "Mensajes", url: "/admin/messages", description: "Chat con clientes" },
      { icon: Star, label: "Reseñas", url: "/admin/reviews", description: "Opiniones de clientes" },
      { icon: Activity, label: "Visitantes", url: "/admin/visitantes", description: "Actividad del sitio" }
    ]
  },
  {
    title: "Contenido",
    description: "Páginas y multimedia",
    icon: FileCode,
    color: "text-teal-600 dark:text-teal-400",
    bgGradient: "from-teal-500/20 to-teal-600/10 hover:from-teal-500/30 hover:to-teal-600/20",
    items: [
      { icon: Palette, label: "Personalizar", url: "/admin/personalizador", description: "Diseño del sitio" },
      { icon: FileCode, label: "Contenido", url: "/admin/contenido", description: "Gestión de textos" },
      { icon: BookOpen, label: "Páginas", url: "/admin/pages", description: "Páginas estáticas" },
      { icon: FileText, label: "Legal", url: "/admin/paginas-legales", description: "Políticas y términos" },
      { icon: BookOpen, label: "Blog", url: "/admin/blog", description: "Artículos del blog" },
      { icon: Image, label: "Galería", url: "/admin/galeria", description: "Imágenes del sitio" }
    ]
  },
  {
    title: "Configuración",
    description: "Ajustes del sistema",
    icon: Settings,
    color: "text-slate-600 dark:text-slate-400",
    bgGradient: "from-slate-500/20 to-slate-600/10 hover:from-slate-500/30 hover:to-slate-600/20",
    items: [
      { icon: Shield, label: "PINs", url: "/admin/pin", description: "Gestión de acceso" },
      { icon: CreditCard, label: "Pagos", url: "/admin/configuracion-pagos", description: "Métodos de pago" },
      { icon: Percent, label: "IVA", url: "/admin/configuracion-iva", description: "Configurar impuestos" },
      { icon: Truck, label: "Envíos", url: "/admin/gestion-envios", description: "Opciones de envío" },
      { icon: Globe, label: "Idiomas", url: "/admin/traducciones", description: "Traducciones" },
      { icon: HardDrive, label: "Backup", url: "/admin/backup-config", description: "Copias de seguridad" },
      { icon: Trash2, label: "Papelera", url: "/admin/trash", description: "Elementos eliminados" }
    ]
  }
];

export function AdminNavigationGrid() {
  const location = useLocation();
  
  // Check if we're on the main dashboard
  const isOnDashboard = location.pathname === "/admin" || location.pathname === "/admin/dashboard";
  
  // Only show navigation grid on main admin pages
  if (!isOnDashboard) return null;

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          ¿Qué deseas hacer hoy?
        </h2>
        <p className="text-muted-foreground">
          Selecciona una categoría para comenzar
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuSections.map((section, idx) => (
          <Card 
            key={idx}
            className={`overflow-hidden transition-all duration-300 hover:shadow-lg border-2 border-transparent hover:border-opacity-50 group bg-gradient-to-br ${section.bgGradient}`}
          >
            <CardContent className="p-5">
              {/* Section Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-xl bg-background/80 shadow-sm ${section.color}`}>
                  <section.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">{section.title}</h3>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
              </div>
              
              {/* Items Grid */}
              <div className="grid grid-cols-2 gap-2">
                {section.items.map((item) => (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    className={({ isActive }) => `
                      flex items-center gap-2 p-3 rounded-lg transition-all duration-200
                      bg-background/60 hover:bg-background/90
                      border border-transparent hover:border-border
                      group/item hover:shadow-md
                      ${isActive ? 'bg-background/90 border-primary/30 shadow-sm' : ''}
                    `}
                  >
                    <div className={`p-1.5 rounded-md bg-muted/50 ${section.color} group-hover/item:scale-110 transition-transform`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground block truncate">
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </NavLink>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Compact version for showing current section in header
export function AdminBreadcrumb() {
  const location = useLocation();
  
  // Find current section and item
  for (const section of menuSections) {
    for (const item of section.items) {
      if (location.pathname === item.url) {
        return (
          <div className="flex items-center gap-2 text-sm">
            <section.icon className={`h-4 w-4 ${section.color}`} />
            <span className="text-muted-foreground">{section.title}</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium text-foreground">{item.label}</span>
          </div>
        );
      }
    }
  }
  
  return null;
}

// Quick navigation dropdown for when viewing sub-pages
export function AdminQuickNav() {
  const location = useLocation();
  
  // Find current section
  let currentSection: MenuSection | null = null;
  for (const section of menuSections) {
    for (const item of section.items) {
      if (location.pathname === item.url || location.pathname.startsWith(item.url + '/')) {
        currentSection = section;
        break;
      }
    }
    if (currentSection) break;
  }
  
  if (!currentSection) return null;
  
  return (
    <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg border border-border/50 mb-6">
      <span className="text-sm text-muted-foreground mr-2 self-center">
        En {currentSection.title}:
      </span>
      {currentSection.items.map((item) => (
        <NavLink
          key={item.url}
          to={item.url}
          className={({ isActive }) => `
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
            transition-all duration-200
            ${isActive 
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'bg-background hover:bg-muted border border-border hover:border-primary/30'
            }
          `}
        >
          <item.icon className="h-3.5 w-3.5" />
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

export { menuSections };
