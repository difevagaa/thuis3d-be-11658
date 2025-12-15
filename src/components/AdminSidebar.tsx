import { NavLink, useLocation, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { adminMenuItems } from "@/constants/adminMenu";

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

const menuItems: MenuSection[] = adminMenuItems.map((section) => ({
  ...section,
  icon:
    section.title === "Principal"
      ? LayoutDashboard
      : section.title === "Catálogo"
      ? Package
      : section.title === "Ventas"
      ? ShoppingCart
      : section.title === "Calculadora 3D"
      ? Calculator
      : section.title === "Clientes"
      ? Users
      : section.title === "Marketing"
      ? Award
      : section.title === "Comunicación"
      ? MessageSquare
      : section.title === "Contenido"
      ? FileCode
      : Settings,
  items: section.items.map((item) => ({
    ...item,
    icon:
      item.url === "/admin/dashboard"
        ? LayoutDashboard
        : item.url === "/admin/productos"
        ? Package
        : item.url === "/admin/categorias"
        ? FolderTree
        : item.url === "/admin/materiales"
        ? Layers
        : item.url === "/admin/colores"
        ? Palette
        : item.url === "/admin/pedidos"
        ? ShoppingCart
        : item.url === "/admin/cotizaciones"
        ? FileText
        : item.url === "/admin/facturas"
        ? Receipt
        : item.url === "/admin/estados"
        ? Tag
        : item.url === "/admin/calculadora-3d"
        ? Settings
        : item.url === "/admin/descuentos-cantidad"
        ? TrendingDown
        : item.url === "/admin/calibracion"
        ? Gauge
        : item.url === "/admin/perfiles-calibracion"
        ? TrendingUp
        : item.url === "/admin/precision-calculadora"
        ? Activity
        : item.url === "/admin/deteccion-soportes"
        ? Shield
        : item.url === "/admin/modelos-vista-previa"
        ? Box
        : item.url === "/admin/usuarios"
        ? Users
        : item.url === "/admin/roles"
        ? UserCog
        : item.url === "/admin/loyalty"
        ? Award
        : item.url === "/admin/coupons"
        ? Percent
        : item.url === "/admin/gift-cards"
        ? Gift
        : item.url === "/admin/seo"
        ? TrendingUp
        : item.url === "/admin/messages"
        ? MessageSquare
        : item.url === "/admin/emails"
        ? FileText
        : item.url === "/admin/reviews"
        ? Star
        : item.url === "/admin/visitantes"
        ? Activity
        : item.url === "/admin/page-builder"
        ? Layout
        : item.url === "/admin/personalizador"
        ? Palette
        : item.url === "/admin/contenido"
        ? FileCode
        : item.url === "/admin/pages"
        ? BookOpen
        : item.url === "/admin/paginas-legales"
        ? FileText
        : item.url === "/admin/blog"
        ? BookOpen
        : item.url === "/admin/galeria"
        ? Image
        : item.url === "/admin/database"
        ? Database
        : item.url === "/admin/pin"
        ? Shield
        : item.url === "/admin/configuracion-pagos"
        ? CreditCard
        : item.url === "/admin/configuracion-iva"
        ? Percent
        : item.url === "/admin/gestion-envios"
        ? Truck
        : item.url === "/admin/traducciones"
        ? Globe
        : item.url === "/admin/backup-config"
        ? HardDrive
        : item.url === "/admin/trash"
        ? Trash2
        : Settings,
  })),
}));


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
