import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
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
  ChevronDown,
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
  Layout,
  X,
  Database,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { adminMenuItems } from "@/constants/adminMenu";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const getIconForUrl = (url: string): React.ElementType => {
  const iconMap: Record<string, React.ElementType> = {
    "/admin/dashboard": LayoutDashboard,
    "/admin/productos": Package,
    "/admin/categorias": FolderTree,
    "/admin/materiales": Layers,
    "/admin/colores": Palette,
    "/admin/pedidos": ShoppingCart,
    "/admin/cotizaciones": FileText,
    "/admin/facturas": Receipt,
    "/admin/estados": Tag,
    "/admin/calculadora-3d": Calculator,
    "/admin/descuentos-cantidad": TrendingDown,
    "/admin/calibracion": Gauge,
    "/admin/perfiles-calibracion": TrendingUp,
    "/admin/precision-calculadora": Activity,
    "/admin/deteccion-soportes": Shield,
    "/admin/modelos-vista-previa": Box,
    "/admin/usuarios": Users,
    "/admin/roles": UserCog,
    "/admin/loyalty": Award,
    "/admin/coupons": Percent,
    "/admin/gift-cards": Gift,
    "/admin/seo": TrendingUp,
    "/admin/messages": MessageSquare,
    "/admin/emails": Mail,
    "/admin/reviews": Star,
    "/admin/visitantes": Activity,
    "/admin/page-builder": Layout,
    "/admin/personalizador": Palette,
    "/admin/contenido": FileCode,
    "/admin/pages": BookOpen,
    "/admin/paginas-legales": FileText,
    "/admin/blog": BookOpen,
    "/admin/galeria": Image,
    "/admin/database": Database,
    "/admin/pin": Shield,
    "/admin/configuracion-pagos": CreditCard,
    "/admin/configuracion-iva": Percent,
    "/admin/gestion-envios": Truck,
    "/admin/traducciones": Globe,
    "/admin/backup-config": HardDrive,
    "/admin/trash": Trash2,
  };
  return iconMap[url] || Settings;
};

// Pastel color palette for section icons
const sectionPastelColors: Record<string, { bg: string; text: string; activeBg: string }> = {
  "Principal": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", activeBg: "bg-blue-500" },
  "Catálogo": { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400", activeBg: "bg-emerald-500" },
  "Ventas": { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", activeBg: "bg-amber-500" },
  "Calculadora 3D": { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-600 dark:text-violet-400", activeBg: "bg-violet-500" },
  "Clientes": { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400", activeBg: "bg-cyan-500" },
  "Marketing": { bg: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-600 dark:text-pink-400", activeBg: "bg-pink-500" },
  "Comunicación": { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400", activeBg: "bg-indigo-500" },
  "Contenido": { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-600 dark:text-teal-400", activeBg: "bg-teal-500" },
  "Configuración": { bg: "bg-slate-100 dark:bg-slate-800/30", text: "text-slate-600 dark:text-slate-400", activeBg: "bg-slate-500" },
};

const getSectionIcon = (title: string): React.ElementType => {
  const sectionIconMap: Record<string, React.ElementType> = {
    "Principal": LayoutDashboard,
    "Catálogo": Package,
    "Ventas": ShoppingCart,
    "Calculadora 3D": Calculator,
    "Clientes": Users,
    "Marketing": Award,
    "Comunicación": MessageSquare,
    "Contenido": FileCode,
    "Configuración": Settings,
  };
  return sectionIconMap[title] || Settings;
};

const menuItems: MenuSection[] = adminMenuItems.map((section) => ({
  ...section,
  icon: getSectionIcon(section.title),
  items: section.items.map((item) => ({
    ...item,
    icon: getIconForUrl(item.url),
  })),
}));

function AdminMenuItem({ 
  item, 
  isActive, 
  onNavigate 
}: { 
  item: MenuItem; 
  isActive: boolean; 
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(item.url);
    onNavigate();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-200 min-h-[36px] group",
        isActive 
          ? "bg-primary/15 text-primary font-semibold shadow-sm" 
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
    >
      <Icon className={cn(
        "h-4 w-4 flex-shrink-0 transition-colors",
        isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-primary/70"
      )} />
      <span className="text-[13px] leading-tight">{item.label}</span>
      {isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
      )}
    </button>
  );
}

function AdminMenuSection({ 
  section, 
  onNavigate 
}: { 
  section: MenuSection; 
  onNavigate: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();
  const SectionIcon = section.icon;
  const colors = sectionPastelColors[section.title] || sectionPastelColors["Configuración"];
  
  const hasActiveItem = section.items.some(item => location.pathname === item.url);

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-200 min-h-[40px]",
          hasActiveItem 
            ? "bg-sidebar-accent/80" 
            : "hover:bg-sidebar-accent/40"
        )}
      >
        <div className={cn(
          "flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-all",
          hasActiveItem 
            ? `${colors.activeBg} text-white shadow-sm` 
            : `${colors.bg} ${colors.text}`
        )}>
          <SectionIcon className="h-3.5 w-3.5" />
        </div>
        <span className={cn(
          "flex-1 text-left text-[13px] font-semibold leading-tight",
          hasActiveItem ? "text-sidebar-foreground" : "text-sidebar-foreground/80"
        )}>
          {section.title}
        </span>
        <div className={cn(
          "transition-transform duration-200 flex-shrink-0",
          isOpen ? "rotate-0" : "-rotate-90"
        )}>
          <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/40" />
        </div>
      </button>
      
      {isOpen && (
        <div className="ml-4 pl-3 border-l-2 border-sidebar-border/40 space-y-0.5 py-0.5">
          {section.items.map((item) => (
            <AdminMenuItem 
              key={item.url} 
              item={item} 
              isActive={location.pathname === item.url}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminSidebar() {
  const { setOpen, isMobile, setOpenMobile } = useSidebar();
  
  const handleNavigate = () => {
    if (isMobile) {
      setOpenMobile(false);
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
    <Sidebar className="w-56 border-r-0 bg-transparent">
      <SidebarContent className="flex flex-col h-full bg-sidebar/80 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/90 to-primary/70 flex items-center justify-center shadow-sm">
              <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-sidebar-foreground leading-tight">Admin</h3>
              <p className="text-[10px] text-sidebar-foreground/50 leading-tight">Panel de Control</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCloseSidebar}
            className="h-6 w-6 rounded-lg hover:bg-sidebar-accent/60 text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        {/* Subtle divider */}
        <div className="mx-3 h-px bg-gradient-to-r from-transparent via-sidebar-border/60 to-transparent" />
        
        {/* Menu Sections */}
        <ScrollArea className="flex-1 px-2 py-2">
          <div className="space-y-1.5">
            {menuItems.map((section, idx) => (
              <AdminMenuSection 
                key={idx} 
                section={section}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
