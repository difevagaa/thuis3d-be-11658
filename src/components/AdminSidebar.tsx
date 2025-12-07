import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { 
  LayoutDashboard, FileText, ShoppingCart, FolderTree, Settings, Receipt, 
  Package, Users, UserCog, Palette, Gift, Tag, Award, MessageSquare, 
  FileCode, BookOpen, Star, Trash2, Percent, TrendingUp, TrendingDown, 
  ChevronDown, ChevronRight, Layers, Shield, Activity, CreditCard, Truck, 
  HardDrive, Gauge, Box, Image, Globe, Calculator, Layout
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  icon: React.ElementType;
  label: string;
  url: string;
  color: string;
  bgColor: string;
}

interface MenuSection {
  title: string;
  icon: React.ElementType;
  color: string;
  collapsible?: boolean;
  items: MenuItem[];
}

// Modern, professional color palette with better contrast and visual harmony
const menuItems: MenuSection[] = [
  {
    title: "Principal",
    icon: LayoutDashboard,
    color: "from-indigo-600 to-indigo-700",
    items: [{
      icon: LayoutDashboard,
      label: "Dashboard",
      url: "/admin/dashboard",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 dark:border-indigo-800"
    }]
  },
  {
    title: "Catálogo",
    icon: Package,
    color: "from-emerald-600 to-emerald-700",
    items: [
      { icon: Package, label: "Productos", url: "/admin/productos", color: "text-emerald-600", bgColor: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 dark:border-emerald-800" },
      { icon: FolderTree, label: "Categorías", url: "/admin/categorias", color: "text-teal-600", bgColor: "bg-teal-50 hover:bg-teal-100 border-teal-200 dark:bg-teal-950/50 dark:hover:bg-teal-900/50 dark:border-teal-800" },
      { icon: Layers, label: "Materiales", url: "/admin/materiales", color: "text-cyan-600", bgColor: "bg-cyan-50 hover:bg-cyan-100 border-cyan-200 dark:bg-cyan-950/50 dark:hover:bg-cyan-900/50 dark:border-cyan-800" },
      { icon: Palette, label: "Colores", url: "/admin/colores", color: "text-rose-600", bgColor: "bg-rose-50 hover:bg-rose-100 border-rose-200 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 dark:border-rose-800" }
    ]
  },
  {
    title: "Ventas",
    icon: ShoppingCart,
    color: "from-orange-600 to-orange-700",
    items: [
      { icon: ShoppingCart, label: "Pedidos", url: "/admin/pedidos", color: "text-orange-600", bgColor: "bg-orange-50 hover:bg-orange-100 border-orange-200 dark:bg-orange-950/50 dark:hover:bg-orange-900/50 dark:border-orange-800" },
      { icon: FileText, label: "Cotizaciones", url: "/admin/cotizaciones", color: "text-amber-600", bgColor: "bg-amber-50 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 dark:border-amber-800" },
      { icon: Receipt, label: "Facturas", url: "/admin/facturas", color: "text-yellow-700", bgColor: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200 dark:bg-yellow-950/50 dark:hover:bg-yellow-900/50 dark:border-yellow-800" },
      { icon: Tag, label: "Estados", url: "/admin/estados", color: "text-lime-700", bgColor: "bg-lime-50 hover:bg-lime-100 border-lime-200 dark:bg-lime-950/50 dark:hover:bg-lime-900/50 dark:border-lime-800" }
    ]
  },
  {
    title: "Calculadora 3D",
    icon: Calculator,
    color: "from-violet-600 to-violet-700",
    collapsible: true,
    items: [
      { icon: Settings, label: "Configuración", url: "/admin/calculadora-3d", color: "text-violet-600", bgColor: "bg-violet-50 hover:bg-violet-100 border-violet-200 dark:bg-violet-950/50 dark:hover:bg-violet-900/50 dark:border-violet-800" },
      { icon: TrendingDown, label: "Descuentos", url: "/admin/descuentos-cantidad", color: "text-purple-600", bgColor: "bg-purple-50 hover:bg-purple-100 border-purple-200 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 dark:border-purple-800" },
      { icon: Gauge, label: "Calibración", url: "/admin/calibracion", color: "text-fuchsia-600", bgColor: "bg-fuchsia-50 hover:bg-fuchsia-100 border-fuchsia-200 dark:bg-fuchsia-950/50 dark:hover:bg-fuchsia-900/50 dark:border-fuchsia-800" },
      { icon: TrendingUp, label: "Perfiles", url: "/admin/perfiles-calibracion", color: "text-indigo-600", bgColor: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 dark:border-indigo-800" },
      { icon: Activity, label: "Precisión", url: "/admin/precision-calculadora", color: "text-blue-600", bgColor: "bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 dark:border-blue-800" },
      { icon: Shield, label: "Soportes", url: "/admin/deteccion-soportes", color: "text-sky-600", bgColor: "bg-sky-50 hover:bg-sky-100 border-sky-200 dark:bg-sky-950/50 dark:hover:bg-sky-900/50 dark:border-sky-800" },
      { icon: Box, label: "Vista Previa", url: "/admin/modelos-vista-previa", color: "text-cyan-600", bgColor: "bg-cyan-50 hover:bg-cyan-100 border-cyan-200 dark:bg-cyan-950/50 dark:hover:bg-cyan-900/50 dark:border-cyan-800" }
    ]
  },
  {
    title: "Clientes",
    icon: Users,
    color: "from-rose-600 to-rose-700",
    items: [
      { icon: Users, label: "Usuarios", url: "/admin/usuarios", color: "text-rose-600", bgColor: "bg-rose-50 hover:bg-rose-100 border-rose-200 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 dark:border-rose-800" },
      { icon: UserCog, label: "Roles", url: "/admin/roles", color: "text-red-600", bgColor: "bg-red-50 hover:bg-red-100 border-red-200 dark:bg-red-950/50 dark:hover:bg-red-900/50 dark:border-red-800" }
    ]
  },
  {
    title: "Marketing",
    icon: Award,
    color: "from-amber-600 to-amber-700",
    items: [
      { icon: Award, label: "Lealtad", url: "/admin/loyalty", color: "text-amber-600", bgColor: "bg-amber-50 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 dark:border-amber-800" },
      { icon: Percent, label: "Cupones", url: "/admin/coupons", color: "text-orange-600", bgColor: "bg-orange-50 hover:bg-orange-100 border-orange-200 dark:bg-orange-950/50 dark:hover:bg-orange-900/50 dark:border-orange-800" },
      { icon: Gift, label: "Gift Cards", url: "/admin/gift-cards", color: "text-pink-600", bgColor: "bg-pink-50 hover:bg-pink-100 border-pink-200 dark:bg-pink-950/50 dark:hover:bg-pink-900/50 dark:border-pink-800" },
      { icon: TrendingUp, label: "SEO", url: "/admin/seo", color: "text-green-600", bgColor: "bg-green-50 hover:bg-green-100 border-green-200 dark:bg-green-950/50 dark:hover:bg-green-900/50 dark:border-green-800" }
    ]
  },
  {
    title: "Comunicación",
    icon: MessageSquare,
    color: "from-sky-600 to-sky-700",
    items: [
      { icon: MessageSquare, label: "Mensajes", url: "/admin/messages", color: "text-sky-600", bgColor: "bg-sky-50 hover:bg-sky-100 border-sky-200 dark:bg-sky-950/50 dark:hover:bg-sky-900/50 dark:border-sky-800" },
      { icon: Star, label: "Reseñas", url: "/admin/reviews", color: "text-yellow-600", bgColor: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200 dark:bg-yellow-950/50 dark:hover:bg-yellow-900/50 dark:border-yellow-800" },
      { icon: Activity, label: "Actividad", url: "/admin/visitantes", color: "text-teal-600", bgColor: "bg-teal-50 hover:bg-teal-100 border-teal-200 dark:bg-teal-950/50 dark:hover:bg-teal-900/50 dark:border-teal-800" }
    ]
  },
  {
    title: "Contenido",
    icon: FileCode,
    color: "from-indigo-600 to-indigo-700",
    items: [
      { icon: Layout, label: "Editor de Páginas", url: "/admin/page-builder", color: "text-indigo-700", bgColor: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 dark:border-indigo-800" },
      { icon: Palette, label: "Personalizar", url: "/admin/personalizador", color: "text-indigo-600", bgColor: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 dark:border-indigo-800" },
      { icon: FileCode, label: "Contenido", url: "/admin/contenido", color: "text-violet-600", bgColor: "bg-violet-50 hover:bg-violet-100 border-violet-200 dark:bg-violet-950/50 dark:hover:bg-violet-900/50 dark:border-violet-800" },
      { icon: BookOpen, label: "Páginas", url: "/admin/pages", color: "text-purple-600", bgColor: "bg-purple-50 hover:bg-purple-100 border-purple-200 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 dark:border-purple-800" },
      { icon: FileText, label: "Legal", url: "/admin/paginas-legales", color: "text-slate-600", bgColor: "bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-950/50 dark:hover:bg-slate-900/50 dark:border-slate-800" },
      { icon: BookOpen, label: "Blog", url: "/admin/blog", color: "text-blue-600", bgColor: "bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 dark:border-blue-800" },
      { icon: Image, label: "Galería", url: "/admin/galeria", color: "text-cyan-600", bgColor: "bg-cyan-50 hover:bg-cyan-100 border-cyan-200 dark:bg-cyan-950/50 dark:hover:bg-cyan-900/50 dark:border-cyan-800" }
    ]
  },
  {
    title: "Configuración",
    icon: Settings,
    color: "from-slate-600 to-slate-700",
    items: [
      { icon: Shield, label: "PINs", url: "/admin/pin", color: "text-slate-700", bgColor: "bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-950/50 dark:hover:bg-slate-900/50 dark:border-slate-800" },
      { icon: CreditCard, label: "Pagos", url: "/admin/configuracion-pagos", color: "text-emerald-600", bgColor: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 dark:border-emerald-800" },
      { icon: Percent, label: "IVA", url: "/admin/configuracion-iva", color: "text-blue-600", bgColor: "bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 dark:border-blue-800" },
      { icon: Truck, label: "Envíos", url: "/admin/gestion-envios", color: "text-orange-600", bgColor: "bg-orange-50 hover:bg-orange-100 border-orange-200 dark:bg-orange-950/50 dark:hover:bg-orange-900/50 dark:border-orange-800" },
      { icon: Globe, label: "Idiomas", url: "/admin/traducciones", color: "text-sky-600", bgColor: "bg-sky-50 hover:bg-sky-100 border-sky-200 dark:bg-sky-950/50 dark:hover:bg-sky-900/50 dark:border-sky-800" },
      { icon: HardDrive, label: "Backup", url: "/admin/backup-config", color: "text-gray-600", bgColor: "bg-gray-50 hover:bg-gray-100 border-gray-200 dark:bg-gray-950/50 dark:hover:bg-gray-900/50 dark:border-gray-800" },
      { icon: Trash2, label: "Papelera", url: "/admin/trash", color: "text-red-600", bgColor: "bg-red-50 hover:bg-red-100 border-red-200 dark:bg-red-950/50 dark:hover:bg-red-900/50 dark:border-red-800" }
    ]
  }
];

function AdminMenuCard({ item, isActive, collapsed }: { item: MenuItem; isActive: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  
  if (collapsed) {
    return (
      <NavLink
        to={item.url}
        className={cn(
          "flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl border-2 transition-all duration-200 shadow-sm hover:shadow-md",
          isActive 
            ? "bg-gradient-to-br from-primary to-primary/90 text-white border-primary/50 shadow-lg scale-105" 
            : item.bgColor
        )}
      >
        <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5", isActive ? "text-white" : item.color)} />
      </NavLink>
    );
  }

  return (
    <NavLink
      to={item.url}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 shadow-sm hover:shadow-md",
        isActive 
          ? "bg-gradient-to-br from-primary to-primary/90 text-white border-primary/50 shadow-lg scale-[1.01]" 
          : item.bgColor
      )}
    >
      <div className={cn(
        "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200",
        isActive 
          ? "bg-white/20 shadow-inner" 
          : "bg-white/80 dark:bg-white/10 group-hover:scale-105 shadow-sm"
      )}>
        <Icon 
          className={cn(
            "h-5 w-5 transition-all duration-200",
            isActive ? "text-white" : item.color
          )} 
        />
      </div>
      <span className={cn(
        "text-sm font-semibold transition-colors truncate",
        isActive ? "text-white" : "text-foreground"
      )}>
        {item.label}
      </span>
    </NavLink>
  );
}

function AdminMenuSection({ section, collapsed }: { section: MenuSection; collapsed: boolean }) {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();
  const SectionIcon = section.icon;
  
  const hasActiveItem = section.items.some(item => location.pathname === item.url);
  
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-2">
        {section.items.map((item) => (
          <AdminMenuCard 
            key={item.url} 
            item={item} 
            isActive={location.pathname === item.url}
            collapsed={collapsed}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => section.collapsible && setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md",
          hasActiveItem 
            ? `bg-gradient-to-r ${section.color} text-white border-2 border-white/20` 
            : "hover:bg-muted/70 bg-muted/40 border-2 border-transparent"
        )}
      >
        <div className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg transition-all shadow-sm",
          hasActiveItem ? "bg-white/20" : `bg-gradient-to-br ${section.color}`
        )}>
          <SectionIcon className={cn("h-4 w-4", hasActiveItem ? "text-white" : "text-white")} />
        </div>
        <span className={cn(
          "flex-1 text-left text-sm font-bold tracking-wide truncate",
          hasActiveItem ? "text-white" : "text-foreground"
        )}>
          {section.title}
        </span>
        {section.collapsible && (
          <div className={cn(
            "transition-transform duration-200 flex-shrink-0",
            isOpen ? "rotate-180" : ""
          )}>
            <ChevronDown className={cn("h-4 w-4", hasActiveItem ? "text-white" : "text-muted-foreground")} />
          </div>
        )}
      </button>
      
      {(!section.collapsible || isOpen) && (
        <div className={cn(
          "grid gap-2 transition-all duration-200",
          section.items.length > 4 ? "grid-cols-2" : "grid-cols-1",
          "pl-2"
        )}>
          {section.items.map((item) => (
            <AdminMenuCard 
              key={item.url} 
              item={item} 
              isActive={location.pathname === item.url}
              collapsed={collapsed}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminSidebar() {
  const { state, resetAutoHideTimer } = useSidebar();
  const collapsed = state === "collapsed";
  
  return (
    <Sidebar 
      className={cn(
        "transition-all duration-300 border-r shadow-sm",
        collapsed ? "w-20" : "w-72",
        "bg-gradient-to-b from-background via-background/95 to-muted/20"
      )}
    >
      <SidebarContent 
        className="py-4 px-2"
        onClick={resetAutoHideTimer}
      >
        {/* Logo Header */}
        {!collapsed && (
          <div className="px-2 mb-6">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/20 shadow-md hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center shadow-lg flex-shrink-0">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-foreground truncate">Panel Admin</h3>
                <p className="text-xs text-muted-foreground truncate">Gestión Completa</p>
              </div>
            </div>
          </div>
        )}
        
        {collapsed && (
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center shadow-lg">
              <LayoutDashboard className="h-6 w-6 text-white" />
            </div>
          </div>
        )}
        
        {/* Menu Sections */}
        <div className={cn("space-y-4", collapsed ? "px-0" : "px-2")}>
          {menuItems.map((section, idx) => (
            <AdminMenuSection 
              key={idx} 
              section={section} 
              collapsed={collapsed}
            />
          ))}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
