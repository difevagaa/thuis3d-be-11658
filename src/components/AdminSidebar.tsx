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

const menuItems: MenuSection[] = [
  {
    title: "Principal",
    icon: LayoutDashboard,
    color: "from-blue-500 to-blue-600",
    items: [{
      icon: LayoutDashboard,
      label: "Dashboard",
      url: "/admin/dashboard",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30"
    }]
  },
  {
    title: "Catálogo",
    icon: Package,
    color: "from-emerald-500 to-emerald-600",
    items: [
      { icon: Package, label: "Productos", url: "/admin/productos", color: "text-emerald-500", bgColor: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30" },
      { icon: FolderTree, label: "Categorías", url: "/admin/categorias", color: "text-teal-500", bgColor: "bg-teal-500/10 hover:bg-teal-500/20 border-teal-500/30" },
      { icon: Layers, label: "Materiales", url: "/admin/materiales", color: "text-cyan-500", bgColor: "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30" },
      { icon: Palette, label: "Colores", url: "/admin/colores", color: "text-pink-500", bgColor: "bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30" }
    ]
  },
  {
    title: "Ventas",
    icon: ShoppingCart,
    color: "from-orange-500 to-orange-600",
    items: [
      { icon: ShoppingCart, label: "Pedidos", url: "/admin/pedidos", color: "text-orange-500", bgColor: "bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30" },
      { icon: FileText, label: "Cotizaciones", url: "/admin/cotizaciones", color: "text-amber-500", bgColor: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30" },
      { icon: Receipt, label: "Facturas", url: "/admin/facturas", color: "text-yellow-600", bgColor: "bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30" },
      { icon: Tag, label: "Estados", url: "/admin/estados", color: "text-lime-500", bgColor: "bg-lime-500/10 hover:bg-lime-500/20 border-lime-500/30" }
    ]
  },
  {
    title: "Calculadora 3D",
    icon: Calculator,
    color: "from-violet-500 to-violet-600",
    collapsible: true,
    items: [
      { icon: Settings, label: "Configuración", url: "/admin/calculadora-3d", color: "text-violet-500", bgColor: "bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30" },
      { icon: TrendingDown, label: "Descuentos", url: "/admin/descuentos-cantidad", color: "text-purple-500", bgColor: "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30" },
      { icon: Gauge, label: "Calibración", url: "/admin/calibracion", color: "text-fuchsia-500", bgColor: "bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border-fuchsia-500/30" },
      { icon: TrendingUp, label: "Perfiles", url: "/admin/perfiles-calibracion", color: "text-indigo-500", bgColor: "bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30" },
      { icon: Activity, label: "Precisión", url: "/admin/precision-calculadora", color: "text-blue-500", bgColor: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30" },
      { icon: Shield, label: "Soportes", url: "/admin/deteccion-soportes", color: "text-sky-500", bgColor: "bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30" },
      { icon: Box, label: "Vista Previa", url: "/admin/modelos-vista-previa", color: "text-cyan-500", bgColor: "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30" }
    ]
  },
  {
    title: "Clientes",
    icon: Users,
    color: "from-rose-500 to-rose-600",
    items: [
      { icon: Users, label: "Usuarios", url: "/admin/usuarios", color: "text-rose-500", bgColor: "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30" },
      { icon: UserCog, label: "Roles", url: "/admin/roles", color: "text-red-500", bgColor: "bg-red-500/10 hover:bg-red-500/20 border-red-500/30" }
    ]
  },
  {
    title: "Marketing",
    icon: Award,
    color: "from-amber-500 to-amber-600",
    items: [
      { icon: Award, label: "Lealtad", url: "/admin/loyalty", color: "text-amber-500", bgColor: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30" },
      { icon: Percent, label: "Cupones", url: "/admin/coupons", color: "text-orange-500", bgColor: "bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30" },
      { icon: Gift, label: "Gift Cards", url: "/admin/gift-cards", color: "text-pink-500", bgColor: "bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30" },
      { icon: TrendingUp, label: "SEO", url: "/admin/seo", color: "text-green-500", bgColor: "bg-green-500/10 hover:bg-green-500/20 border-green-500/30" }
    ]
  },
  {
    title: "Comunicación",
    icon: MessageSquare,
    color: "from-sky-500 to-sky-600",
    items: [
      { icon: MessageSquare, label: "Mensajes", url: "/admin/messages", color: "text-sky-500", bgColor: "bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30" },
      { icon: Star, label: "Reseñas", url: "/admin/reviews", color: "text-yellow-500", bgColor: "bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30" },
      { icon: Activity, label: "Actividad", url: "/admin/visitantes", color: "text-teal-500", bgColor: "bg-teal-500/10 hover:bg-teal-500/20 border-teal-500/30" }
    ]
  },
  {
    title: "Contenido",
    icon: FileCode,
    color: "from-indigo-500 to-indigo-600",
    items: [
      { icon: Layout, label: "Editor de Páginas", url: "/admin/page-builder", color: "text-indigo-600", bgColor: "bg-indigo-600/10 hover:bg-indigo-600/20 border-indigo-600/30" },
      { icon: Palette, label: "Personalizar", url: "/admin/personalizador", color: "text-indigo-500", bgColor: "bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30" },
      { icon: FileCode, label: "Contenido", url: "/admin/contenido", color: "text-violet-500", bgColor: "bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/30" },
      { icon: BookOpen, label: "Páginas", url: "/admin/pages", color: "text-purple-500", bgColor: "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30" },
      { icon: FileText, label: "Legal", url: "/admin/paginas-legales", color: "text-slate-500", bgColor: "bg-slate-500/10 hover:bg-slate-500/20 border-slate-500/30" },
      { icon: BookOpen, label: "Blog", url: "/admin/blog", color: "text-blue-500", bgColor: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30" },
      { icon: Image, label: "Galería", url: "/admin/galeria", color: "text-cyan-500", bgColor: "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30" }
    ]
  },
  {
    title: "Configuración",
    icon: Settings,
    color: "from-slate-500 to-slate-600",
    items: [
      { icon: Shield, label: "PINs", url: "/admin/pin", color: "text-slate-600", bgColor: "bg-slate-500/10 hover:bg-slate-500/20 border-slate-500/30" },
      { icon: CreditCard, label: "Pagos", url: "/admin/configuracion-pagos", color: "text-emerald-500", bgColor: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30" },
      { icon: Percent, label: "IVA", url: "/admin/configuracion-iva", color: "text-blue-500", bgColor: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30" },
      { icon: Truck, label: "Envíos", url: "/admin/gestion-envios", color: "text-orange-500", bgColor: "bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30" },
      { icon: Globe, label: "Idiomas", url: "/admin/traducciones", color: "text-sky-500", bgColor: "bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30" },
      { icon: HardDrive, label: "Backup", url: "/admin/backup-config", color: "text-gray-500", bgColor: "bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/30" },
      { icon: Trash2, label: "Papelera", url: "/admin/trash", color: "text-red-500", bgColor: "bg-red-500/10 hover:bg-red-500/20 border-red-500/30" }
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
          "flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl border transition-all duration-300",
          isActive 
            ? "bg-gradient-to-br from-primary to-primary/80 text-white border-primary shadow-lg shadow-primary/30 scale-105" 
            : item.bgColor
        )}
      >
        <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5", isActive ? "text-white" : item.color)} />
      </NavLink>
    );
  }

  return (
    <NavLink
      to={item.url}
      className={cn(
        "group flex items-center gap-2 sm:gap-2.5 md:gap-3 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl border transition-all duration-300",
        isActive 
          ? "bg-gradient-to-br from-primary to-primary/80 text-white border-primary shadow-lg shadow-primary/30 scale-[1.02]" 
          : item.bgColor
      )}
    >
      <div className={cn(
        "flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg transition-all duration-300",
        isActive 
          ? "bg-white/20" 
          : "bg-white/50 dark:bg-white/10 group-hover:scale-110"
      )}>
        <Icon 
          className={cn(
            "h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 transition-all duration-300",
            isActive ? "text-white" : item.color,
            "group-hover:animate-bounce-subtle"
          )} 
        />
      </div>
      <span className={cn(
        "text-[10px] sm:text-xs md:text-sm font-medium transition-colors truncate",
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
      <div className="flex flex-col items-center gap-1.5 sm:gap-2 py-1.5 sm:py-2">
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
    <div className="space-y-1.5 sm:space-y-2">
      <button
        onClick={() => section.collapsible && setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-300",
          hasActiveItem 
            ? `bg-gradient-to-r ${section.color} text-white shadow-md` 
            : "hover:bg-muted/50"
        )}
      >
        <div className={cn(
          "flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg transition-all",
          hasActiveItem ? "bg-white/20" : `bg-gradient-to-br ${section.color} shadow-sm`
        )}>
          <SectionIcon className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4", hasActiveItem ? "text-white" : "text-white")} />
        </div>
        <span className={cn(
          "flex-1 text-left text-[10px] sm:text-xs md:text-sm font-semibold tracking-wide truncate",
          hasActiveItem ? "text-white" : "text-foreground"
        )}>
          {section.title}
        </span>
        {section.collapsible && (
          <div className={cn(
            "transition-transform duration-300 flex-shrink-0",
            isOpen ? "rotate-180" : ""
          )}>
            <ChevronDown className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4", hasActiveItem ? "text-white" : "text-muted-foreground")} />
          </div>
        )}
      </button>
      
      {(!section.collapsible || isOpen) && (
        <div className={cn(
          "grid gap-1.5 sm:gap-2 transition-all duration-300",
          section.items.length > 4 ? "grid-cols-2" : "grid-cols-1",
          "pl-1 sm:pl-2"
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
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  
  return (
    <Sidebar 
      className={cn(
        "transition-all duration-300 border-r",
        collapsed ? "w-16 sm:w-18 md:w-20" : "w-64 sm:w-72 md:w-80",
        "bg-gradient-to-b from-background via-background to-muted/30"
      )}
    >
      <SidebarContent className="py-2 sm:py-3 md:py-4 px-1 sm:px-1.5 md:px-2">
        {/* Logo Header */}
        {!collapsed && (
          <div className="px-1 sm:px-1.5 md:px-2 mb-3 sm:mb-4 md:mb-6">
            <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-sm">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
                <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white animate-pulse-slow" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs sm:text-sm md:text-base font-bold text-foreground truncate">Admin Panel</h3>
                <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground truncate">Gestión Completa</p>
              </div>
            </div>
          </div>
        )}
        
        {collapsed && (
          <div className="flex justify-center mb-2 sm:mb-3 md:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
              <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
        )}
        
        {/* Menu Sections */}
        <div className={cn("space-y-2 sm:space-y-3 md:space-y-4", collapsed ? "px-0.5 sm:px-1" : "px-1 sm:px-1.5 md:px-2")}>
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
