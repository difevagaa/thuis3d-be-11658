import { useLocation, useNavigate } from "react-router-dom";
import { useState, useCallback, useRef, useEffect } from "react";
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
  TrendingDown,
  ChevronDown,
  Layers,
  Shield,
  Activity,
  CreditCard,
  Truck,
  Gauge,
  Image,
  Globe,
  Calculator,
  Layout,
  X,
  Database,
  Mail,
  Home,
  DollarSign,
  Megaphone,
  PenTool,
  Printer,
  Store,
  Wrench,
  KeyRound,
  Target,
  Eye,
  Crosshair,
  SlidersHorizontal,
  Save,
  Scale,
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
  group?: "operations" | "config";
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
    "/admin/perfiles-calibracion": SlidersHorizontal,
    "/admin/precision-calculadora": Crosshair,
    "/admin/deteccion-soportes": Shield,
    "/admin/modelos-vista-previa": Eye,
    "/admin/usuarios": Users,
    "/admin/roles": UserCog,
    "/admin/loyalty": Award,
    "/admin/coupons": Percent,
    "/admin/gift-cards": Gift,
    "/admin/seo": Target,
    "/admin/messages": MessageSquare,
    "/admin/emails": Mail,
    "/admin/reviews": Star,
    "/admin/visitantes": Activity,
    "/admin/page-builder": Layout,
    "/admin/personalizador": PenTool,
    "/admin/contenido": FileCode,
    "/admin/pages": BookOpen,
    "/admin/paginas-legales": Scale,
    "/admin/blog": BookOpen,
    "/admin/galeria": Image,
    "/admin/database": Database,
    "/admin/pin": KeyRound,
    "/admin/configuracion-pagos": CreditCard,
    "/admin/configuracion-iva": Percent,
    "/admin/gestion-envios": Truck,
    "/admin/traducciones": Globe,
    "/admin/backup-config": Save,
    "/admin/trash": Trash2,
  };
  return iconMap[url] || Settings;
};

const getSectionIcon = (title: string): React.ElementType => {
  // Match on the text after the emoji
  const sectionIconMap: Record<string, React.ElementType> = {
    "Panel Principal": Home,
    "Ventas y Pedidos": DollarSign,
    "Catálogo": Package,
    "Usuarios y Permisos": Users,
    "Marketing y Promociones": Megaphone,
    "Comunicación": MessageSquare,
    "Contenido Web": PenTool,
    "Impresión 3D": Printer,
    "Ajustes de Tienda": Store,
    "Sistema y Datos": Wrench,
  };
  // Strip leading non-letter characters (emoji prefix) for matching
  const cleanTitle = title.replace(/^[^a-zA-ZÀ-ÿ]+/, "").trim();
  return sectionIconMap[cleanTitle] || Settings;
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
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-all duration-200 min-h-[36px]",
        isActive 
          ? "bg-primary text-primary-foreground font-medium" 
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
      )}
    >
      <Icon className={cn(
        "h-4 w-4 flex-shrink-0",
        isActive ? "text-primary-foreground" : "text-primary"
      )} />
      <span className="text-sm leading-tight">{item.label}</span>
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
  
  const hasActiveItem = section.items.some(item => location.pathname === item.url);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-all duration-200 min-h-[40px]",
          hasActiveItem 
            ? "bg-primary/10 text-primary" 
            : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
        )}
      >
        <div className={cn(
          "flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0",
          hasActiveItem ? "bg-primary text-primary-foreground" : "bg-sidebar-accent text-primary"
        )}>
          <SectionIcon className="h-4 w-4" />
        </div>
        <span className="flex-1 text-left text-sm font-semibold leading-tight">
          {section.title}
        </span>
        <div className={cn(
          "transition-transform duration-200 flex-shrink-0",
          isOpen ? "rotate-0" : "-rotate-90"
        )}>
          <ChevronDown className="h-4 w-4 text-sidebar-foreground/50" />
        </div>
      </button>
      
      {isOpen && (
        <div className="ml-4 pl-3 border-l border-sidebar-border/50 space-y-0.5">
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
  const isResizing = useRef(false);
  
  const handleNavigate = () => {
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

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.max(220, Math.min(400, e.clientX));
      // Update the CSS variable on the sidebar wrapper (SidebarProvider root div)
      const sidebarEl = document.querySelector('[data-sidebar="sidebar"]');
      // Walk up the DOM to find the element with the --sidebar-width CSS variable
      let wrapper = sidebarEl?.parentElement;
      while (wrapper && !wrapper.style.getPropertyValue('--sidebar-width')) {
        wrapper = wrapper.parentElement;
      }
      if (wrapper) {
        wrapper.style.setProperty('--sidebar-width', `${newWidth}px`);
      }
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Split sections by group property
  const operationSections = menuItems.filter(s => s.group !== "config");
  const configSections = menuItems.filter(s => s.group === "config");
  
  return (
    <Sidebar className="bg-sidebar border-r border-sidebar-border relative">
      <SidebarContent className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-sidebar-foreground leading-tight">Administración</h3>
              <p className="text-[10px] text-sidebar-foreground/60 leading-tight">Gestión de Tienda</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCloseSidebar}
            className="h-6 w-6 rounded-md hover:bg-sidebar-accent"
          >
            <X className="h-4 w-4 text-sidebar-foreground/70" />
          </Button>
        </div>
        
        {/* Menu Sections */}
        <ScrollArea className="flex-1 px-2 py-2">
          <div className="space-y-2">
            {/* Operations sections */}
            {operationSections.map((section, idx) => (
              <AdminMenuSection 
                key={idx} 
                section={section}
                onNavigate={handleNavigate}
              />
            ))}
            
            {/* Separator between operations and config */}
            {configSections.length > 0 && (
              <div className="flex items-center gap-2 px-2 py-2">
                <div className="flex-1 h-px bg-sidebar-border/60" />
                <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold whitespace-nowrap">Configuración</span>
                <div className="flex-1 h-px bg-sidebar-border/60" />
              </div>
            )}
            
            {/* Config/system sections */}
            {configSections.map((section, idx) => (
              <AdminMenuSection 
                key={`config-${idx}`} 
                section={section}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        </ScrollArea>
      </SidebarContent>
      
      {/* Resize handle */}
      {!isMobile && (
        <div
          onMouseDown={startResizing}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-50"
        />
      )}
    </Sidebar>
  );
}
