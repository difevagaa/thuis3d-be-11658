import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { 
  LayoutDashboard, FileText, ShoppingCart, FolderTree, Settings, Receipt, 
  Package, Users, UserCog, Palette, Gift, Tag, Award, MessageSquare, 
  FileCode, BookOpen, Star, Trash2, Percent, TrendingUp, TrendingDown, 
  ChevronDown, ChevronRight, Layers, Shield, Activity, CreditCard, Truck, 
  HardDrive, Gauge, Box, Image, Globe, Calculator, Layout, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
      color: "text-blue-600",
      bgColor: "bg-blue-100 hover:bg-blue-200 border-blue-300"
    }]
  },
  {
    title: "Catálogo",
    icon: Package,
    color: "from-emerald-500 to-emerald-600",
    items: [
      { icon: Package, label: "Productos", url: "/admin/productos", color: "text-emerald-700", bgColor: "bg-emerald-100 hover:bg-emerald-200 border-emerald-300" },
      { icon: FolderTree, label: "Categorías", url: "/admin/categorias", color: "text-teal-700", bgColor: "bg-teal-100 hover:bg-teal-200 border-teal-300" },
      { icon: Layers, label: "Materiales", url: "/admin/materiales", color: "text-cyan-700", bgColor: "bg-cyan-100 hover:bg-cyan-200 border-cyan-300" },
      { icon: Palette, label: "Colores", url: "/admin/colores", color: "text-pink-700", bgColor: "bg-pink-100 hover:bg-pink-200 border-pink-300" }
    ]
  },
  {
    title: "Ventas",
    icon: ShoppingCart,
    color: "from-orange-500 to-orange-600",
    items: [
      { icon: ShoppingCart, label: "Pedidos", url: "/admin/pedidos", color: "text-orange-700", bgColor: "bg-orange-100 hover:bg-orange-200 border-orange-300" },
      { icon: FileText, label: "Cotizaciones", url: "/admin/cotizaciones", color: "text-amber-700", bgColor: "bg-amber-100 hover:bg-amber-200 border-amber-300" },
      { icon: Receipt, label: "Facturas", url: "/admin/facturas", color: "text-yellow-700", bgColor: "bg-yellow-100 hover:bg-yellow-200 border-yellow-300" },
      { icon: Tag, label: "Estados", url: "/admin/estados", color: "text-lime-700", bgColor: "bg-lime-100 hover:bg-lime-200 border-lime-300" }
    ]
  },
  {
    title: "Calculadora 3D",
    icon: Calculator,
    color: "from-violet-500 to-violet-600",
    collapsible: true,
    items: [
      { icon: Settings, label: "Configuración", url: "/admin/calculadora-3d", color: "text-violet-700", bgColor: "bg-violet-100 hover:bg-violet-200 border-violet-300" },
      { icon: TrendingDown, label: "Descuentos", url: "/admin/descuentos-cantidad", color: "text-purple-700", bgColor: "bg-purple-100 hover:bg-purple-200 border-purple-300" },
      { icon: Gauge, label: "Calibración", url: "/admin/calibracion", color: "text-fuchsia-700", bgColor: "bg-fuchsia-100 hover:bg-fuchsia-200 border-fuchsia-300" },
      { icon: TrendingUp, label: "Perfiles", url: "/admin/perfiles-calibracion", color: "text-indigo-700", bgColor: "bg-indigo-100 hover:bg-indigo-200 border-indigo-300" },
      { icon: Activity, label: "Precisión", url: "/admin/precision-calculadora", color: "text-blue-700", bgColor: "bg-blue-100 hover:bg-blue-200 border-blue-300" },
      { icon: Shield, label: "Soportes", url: "/admin/deteccion-soportes", color: "text-sky-700", bgColor: "bg-sky-100 hover:bg-sky-200 border-sky-300" },
      { icon: Box, label: "Vista Previa", url: "/admin/modelos-vista-previa", color: "text-cyan-700", bgColor: "bg-cyan-100 hover:bg-cyan-200 border-cyan-300" }
    ]
  },
  {
    title: "Clientes",
    icon: Users,
    color: "from-rose-500 to-rose-600",
    items: [
      { icon: Users, label: "Usuarios", url: "/admin/usuarios", color: "text-rose-700", bgColor: "bg-rose-100 hover:bg-rose-200 border-rose-300" },
      { icon: UserCog, label: "Roles", url: "/admin/roles", color: "text-red-700", bgColor: "bg-red-100 hover:bg-red-200 border-red-300" }
    ]
  },
  {
    title: "Marketing",
    icon: Award,
    color: "from-amber-500 to-amber-600",
    items: [
      { icon: Award, label: "Lealtad", url: "/admin/loyalty", color: "text-amber-700", bgColor: "bg-amber-100 hover:bg-amber-200 border-amber-300" },
      { icon: Percent, label: "Cupones", url: "/admin/coupons", color: "text-orange-700", bgColor: "bg-orange-100 hover:bg-orange-200 border-orange-300" },
      { icon: Gift, label: "Gift Cards", url: "/admin/gift-cards", color: "text-pink-700", bgColor: "bg-pink-100 hover:bg-pink-200 border-pink-300" },
      { icon: TrendingUp, label: "SEO", url: "/admin/seo", color: "text-green-700", bgColor: "bg-green-100 hover:bg-green-200 border-green-300" }
    ]
  },
  {
    title: "Comunicación",
    icon: MessageSquare,
    color: "from-sky-500 to-sky-600",
    items: [
      { icon: MessageSquare, label: "Mensajes", url: "/admin/messages", color: "text-sky-700", bgColor: "bg-sky-100 hover:bg-sky-200 border-sky-300" },
      { icon: Star, label: "Reseñas", url: "/admin/reviews", color: "text-yellow-700", bgColor: "bg-yellow-100 hover:bg-yellow-200 border-yellow-300" },
      { icon: Activity, label: "Actividad", url: "/admin/visitantes", color: "text-teal-700", bgColor: "bg-teal-100 hover:bg-teal-200 border-teal-300" }
    ]
  },
  {
    title: "Contenido",
    icon: FileCode,
    color: "from-indigo-500 to-indigo-600",
    items: [
      { icon: Layout, label: "Editor de Páginas", url: "/admin/page-builder", color: "text-indigo-700", bgColor: "bg-indigo-100 hover:bg-indigo-200 border-indigo-300" },
      { icon: Palette, label: "Personalizar", url: "/admin/personalizador", color: "text-indigo-700", bgColor: "bg-indigo-100 hover:bg-indigo-200 border-indigo-300" },
      { icon: FileCode, label: "Contenido", url: "/admin/contenido", color: "text-violet-700", bgColor: "bg-violet-100 hover:bg-violet-200 border-violet-300" },
      { icon: BookOpen, label: "Páginas", url: "/admin/pages", color: "text-purple-700", bgColor: "bg-purple-100 hover:bg-purple-200 border-purple-300" },
      { icon: FileText, label: "Legal", url: "/admin/paginas-legales", color: "text-slate-700", bgColor: "bg-slate-100 hover:bg-slate-200 border-slate-300" },
      { icon: BookOpen, label: "Blog", url: "/admin/blog", color: "text-blue-700", bgColor: "bg-blue-100 hover:bg-blue-200 border-blue-300" },
      { icon: Image, label: "Galería", url: "/admin/galeria", color: "text-cyan-700", bgColor: "bg-cyan-100 hover:bg-cyan-200 border-cyan-300" }
    ]
  },
  {
    title: "Configuración",
    icon: Settings,
    color: "from-slate-500 to-slate-600",
    items: [
      { icon: Shield, label: "PINs", url: "/admin/pin", color: "text-slate-700", bgColor: "bg-slate-100 hover:bg-slate-200 border-slate-300" },
      { icon: CreditCard, label: "Pagos", url: "/admin/configuracion-pagos", color: "text-emerald-700", bgColor: "bg-emerald-100 hover:bg-emerald-200 border-emerald-300" },
      { icon: Percent, label: "IVA", url: "/admin/configuracion-iva", color: "text-blue-700", bgColor: "bg-blue-100 hover:bg-blue-200 border-blue-300" },
      { icon: Truck, label: "Envíos", url: "/admin/gestion-envios", color: "text-orange-700", bgColor: "bg-orange-100 hover:bg-orange-200 border-orange-300" },
      { icon: Globe, label: "Idiomas", url: "/admin/traducciones", color: "text-sky-700", bgColor: "bg-sky-100 hover:bg-sky-200 border-sky-300" },
      { icon: HardDrive, label: "Backup", url: "/admin/backup-config", color: "text-gray-700", bgColor: "bg-gray-100 hover:bg-gray-200 border-gray-300" },
      { icon: Trash2, label: "Papelera", url: "/admin/trash", color: "text-red-700", bgColor: "bg-red-100 hover:bg-red-200 border-red-300" }
    ]
  }
];

function AdminMenuCard({ item, isActive, collapsed, onNavigate }: { item: MenuItem; isActive: boolean; collapsed: boolean; onNavigate: () => void }) {
  const Icon = item.icon;
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(item.url);
    onNavigate();
  };
  
  if (collapsed) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl border transition-all duration-300 shadow-sm",
          isActive 
            ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105" 
            : "bg-sidebar-accent/50 border-sidebar-border hover:bg-sidebar-accent"
        )}
      >
        <Icon className={cn("h-5 w-5 md:h-6 md:w-6", isActive ? "text-primary-foreground" : "text-primary")} />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full group flex items-center gap-3 p-3 md:p-4 rounded-xl border transition-all duration-300 shadow-sm text-left",
        isActive 
          ? "bg-primary text-primary-foreground border-primary shadow-lg scale-[1.02]" 
          : "bg-sidebar-accent/50 border-sidebar-border hover:bg-sidebar-accent"
      )}
    >
      <div className={cn(
        "flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl transition-all duration-300 flex-shrink-0",
        isActive 
          ? "bg-primary-foreground/20" 
          : "bg-background shadow-sm group-hover:scale-110"
      )}>
        <Icon 
          className={cn(
            "h-5 w-5 md:h-6 md:w-6 transition-all duration-300",
            isActive ? "text-primary-foreground" : "text-primary"
          )} 
        />
      </div>
      <span className={cn(
        "text-sm md:text-base font-semibold transition-colors truncate",
        isActive ? "text-primary-foreground" : "text-sidebar-foreground"
      )}>
        {item.label}
      </span>
    </button>
  );
}

function AdminMenuSection({ section, collapsed, onNavigate }: { section: MenuSection; collapsed: boolean; onNavigate: () => void }) {
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
            onNavigate={onNavigate}
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
          "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
          hasActiveItem 
            ? "bg-primary text-primary-foreground shadow-lg" 
            : "bg-sidebar-accent/30 hover:bg-sidebar-accent"
        )}
      >
        <div className={cn(
          "flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl transition-all shadow-md",
          hasActiveItem ? "bg-primary-foreground/20" : "bg-primary"
        )}>
          <SectionIcon className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
        </div>
        <span className={cn(
          "flex-1 text-left text-base md:text-lg font-bold tracking-wide truncate",
          hasActiveItem ? "text-primary-foreground" : "text-sidebar-foreground"
        )}>
          {section.title}
        </span>
        {section.collapsible && (
          <div className={cn(
            "transition-transform duration-300 flex-shrink-0",
            isOpen ? "rotate-180" : ""
          )}>
            <ChevronDown className={cn("h-5 w-5 md:h-6 md:w-6", hasActiveItem ? "text-primary-foreground" : "text-sidebar-foreground/70")} />
          </div>
        )}
      </button>
      
      {(!section.collapsible || isOpen) && (
        <div className={cn(
          "grid gap-2 transition-all duration-300",
          section.items.length > 4 ? "grid-cols-2" : "grid-cols-1",
          "pl-2"
        )}>
          {section.items.map((item) => (
            <AdminMenuCard 
              key={item.url} 
              item={item} 
              isActive={location.pathname === item.url}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminSidebar() {
  const { state, setOpen, isMobile, openMobile, setOpenMobile } = useSidebar();
  // En móvil, siempre mostrar expandido para que se vean los textos
  const collapsed = isMobile ? false : state === "collapsed";
  
  const handleNavigate = () => {
    // Cerrar sidebar al navegar (especialmente importante en móvil)
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };
  
  const handleCloseSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };
  
  return (
    <Sidebar 
      className={cn(
        "transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-20 md:w-24" : "w-80 md:w-96",
        "bg-sidebar"
      )}
    >
      <SidebarContent className="py-4 px-3 overflow-y-auto">
        {/* Close Button - Always visible */}
        <div className="flex justify-end mb-2 px-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCloseSidebar}
            className="h-10 w-10 rounded-xl hover:bg-sidebar-accent"
          >
            <X className="h-6 w-6 text-sidebar-foreground" />
          </Button>
        </div>
        
        {/* Logo Header */}
        {!collapsed && (
          <div className="px-2 mb-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-sidebar-accent/50 border-2 border-sidebar-border shadow-md">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
                <LayoutDashboard className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg md:text-xl font-bold text-sidebar-foreground truncate">Admin Panel</h3>
                <p className="text-sm text-sidebar-foreground/70 truncate">Gestión Completa</p>
              </div>
            </div>
          </div>
        )}
        
        {collapsed && (
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
              <LayoutDashboard className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
        )}
        
        {/* Menu Sections */}
        <div className={cn("space-y-4", collapsed ? "px-1" : "px-2")}>
          {menuItems.map((section, idx) => (
            <AdminMenuSection 
              key={idx} 
              section={section} 
              collapsed={collapsed}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
