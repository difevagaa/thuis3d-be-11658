import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarHeader,
  SidebarFooter,
  useSidebar 
} from "@/components/ui/sidebar";
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
  ChevronRight, 
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
  Sparkles,
  Megaphone,
  Wrench,
  BarChart3
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Define menu structure with colors and emojis
const menuItems = [
  {
    title: "Principal",
    icon: LayoutDashboard,
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-600",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", url: "/admin/dashboard", emoji: "📊" }
    ]
  },
  {
    title: "Catálogo",
    icon: Package,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-600",
    items: [
      { icon: Package, label: "Productos", url: "/admin/productos", emoji: "📦" },
      { icon: FolderTree, label: "Categorías", url: "/admin/categorias", emoji: "📁" },
      { icon: Layers, label: "Materiales", url: "/admin/materiales", emoji: "🧱" },
      { icon: Palette, label: "Colores", url: "/admin/colores", emoji: "🎨" }
    ]
  },
  {
    title: "Ventas",
    icon: ShoppingCart,
    color: "from-orange-500 to-amber-600",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-600",
    items: [
      { icon: ShoppingCart, label: "Pedidos", url: "/admin/pedidos", emoji: "🛒" },
      { icon: FileText, label: "Cotizaciones", url: "/admin/cotizaciones", emoji: "📋" },
      { icon: Receipt, label: "Facturas", url: "/admin/facturas", emoji: "🧾" },
      { icon: Tag, label: "Estados", url: "/admin/estados", emoji: "🏷️" }
    ]
  },
  {
    title: "Calculadora 3D",
    icon: Box,
    color: "from-purple-500 to-violet-600",
    bgColor: "bg-purple-500/10",
    textColor: "text-purple-600",
    collapsible: true,
    items: [
      { icon: Settings, label: "Configuración", url: "/admin/calculadora-3d", emoji: "⚙️" },
      { icon: TrendingDown, label: "Descuentos por Cantidad", url: "/admin/descuentos-cantidad", emoji: "📉" },
      { icon: Gauge, label: "Calibración", url: "/admin/calibracion", emoji: "🔧" },
      { icon: TrendingUp, label: "Perfiles", url: "/admin/perfiles-calibracion", emoji: "📈" },
      { icon: Activity, label: "Precisión", url: "/admin/precision-calculadora", emoji: "🎯" },
      { icon: Shield, label: "Detección Soportes", url: "/admin/deteccion-soportes", emoji: "🛡️" },
      { icon: Box, label: "Modelos Vista Previa", url: "/admin/modelos-vista-previa", emoji: "🔮" }
    ]
  },
  {
    title: "Clientes",
    icon: Users,
    color: "from-pink-500 to-rose-600",
    bgColor: "bg-pink-500/10",
    textColor: "text-pink-600",
    items: [
      { icon: Users, label: "Usuarios", url: "/admin/usuarios", emoji: "👥" },
      { icon: UserCog, label: "Roles y Permisos", url: "/admin/roles", emoji: "🔐" }
    ]
  },
  {
    title: "Marketing",
    icon: Megaphone,
    color: "from-cyan-500 to-sky-600",
    bgColor: "bg-cyan-500/10",
    textColor: "text-cyan-600",
    items: [
      { icon: Award, label: "Programa de Lealtad", url: "/admin/loyalty", emoji: "🏆" },
      { icon: Percent, label: "Cupones", url: "/admin/coupons", emoji: "🎟️" },
      { icon: Gift, label: "Tarjetas Regalo", url: "/admin/gift-cards", emoji: "🎁" },
      { icon: BarChart3, label: "SEO", url: "/admin/seo", emoji: "🔍" }
    ]
  },
  {
    title: "Comunicación",
    icon: MessageSquare,
    color: "from-red-500 to-pink-600",
    bgColor: "bg-red-500/10",
    textColor: "text-red-600",
    items: [
      { icon: MessageSquare, label: "Mensajes", url: "/admin/messages", emoji: "💬" },
      { icon: Star, label: "Reseñas", url: "/admin/reviews", emoji: "⭐" },
      { icon: Activity, label: "Actividad de Usuarios", url: "/admin/visitantes", emoji: "📡" }
    ]
  },
  {
    title: "Contenido",
    icon: FileCode,
    color: "from-indigo-500 to-purple-600",
    bgColor: "bg-indigo-500/10",
    textColor: "text-indigo-600",
    collapsible: true,
    items: [
      { icon: Sparkles, label: "Personalizador", url: "/admin/personalizador", emoji: "✨" },
      { icon: FileCode, label: "Gestión de Contenido", url: "/admin/contenido", emoji: "📝" },
      { icon: BookOpen, label: "Páginas", url: "/admin/pages", emoji: "📄" },
      { icon: FileText, label: "Páginas Legales", url: "/admin/paginas-legales", emoji: "⚖️" },
      { icon: BookOpen, label: "Blog", url: "/admin/blog", emoji: "📰" },
      { icon: Image, label: "Galería", url: "/admin/galeria", emoji: "🖼️" }
    ]
  },
  {
    title: "Configuración",
    icon: Wrench,
    color: "from-slate-500 to-gray-600",
    bgColor: "bg-slate-500/10",
    textColor: "text-slate-600",
    collapsible: true,
    items: [
      { icon: Shield, label: "Gestión de PINs", url: "/admin/pin", emoji: "🔑" },
      { icon: CreditCard, label: "Pagos", url: "/admin/configuracion-pagos", emoji: "💳" },
      { icon: Percent, label: "IVA", url: "/admin/configuracion-iva", emoji: "💹" },
      { icon: Truck, label: "Envíos", url: "/admin/gestion-envios", emoji: "🚚" },
      { icon: Globe, label: "Traducciones", url: "/admin/traducciones", emoji: "🌍" },
      { icon: HardDrive, label: "Backup", url: "/admin/backup-config", emoji: "💾" },
      { icon: Trash2, label: "Papelera", url: "/admin/trash", emoji: "🗑️" }
    ]
  }
];

export function AdminSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  
  // Track which sections are open
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "Calculadora 3D": false,
    "Contenido": false,
    "Configuración": false
  });

  const toggleSection = (title: string) => {
    setOpenSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  // Check if current path is in a section
  const isInSection = (items: typeof menuItems[0]['items']) => {
    return items.some(item => location.pathname === item.url || location.pathname.startsWith(item.url + '/'));
  };

  return (
    <Sidebar className={cn(
      "transition-all duration-300 border-r",
      collapsed ? "w-16" : "w-72"
    )}>
      {/* Header with Logo */}
      <SidebarHeader className="border-b border-sidebar-border/50 p-4">
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
            <span className="text-xl">🏠</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Thuis3D
              </span>
              <span className="text-xs text-muted-foreground">Panel Admin</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <ScrollArea className="h-[calc(100vh-140px)]">
          {menuItems.map((section, idx) => {
            const isOpen = openSections[section.title] || isInSection(section.items);
            const SectionIcon = section.icon;
            
            return (
              <SidebarGroup key={idx} className="mb-1 px-2">
                {section.collapsible ? (
                  <Collapsible 
                    open={isOpen} 
                    onOpenChange={() => toggleSection(section.title)} 
                    className="group/collapsible"
                  >
                    <CollapsibleTrigger className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5 mb-1",
                      "hover:bg-accent/50 transition-all duration-200",
                      isInSection(section.items) && "bg-accent/30"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          section.bgColor
                        )}>
                          <SectionIcon className={cn("h-4 w-4", section.textColor)} />
                        </div>
                        {!collapsed && (
                          <span className="text-sm font-semibold text-foreground/80">
                            {section.title}
                          </span>
                        )}
                      </div>
                      {!collapsed && (
                        <ChevronDown className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          isOpen && "rotate-180"
                        )} />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-0.5 ml-2">
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {section.items.map(item => (
                            <SidebarMenuItem key={item.url}>
                              <SidebarMenuButton asChild tooltip={collapsed ? item.label : undefined}>
                                <NavLink 
                                  to={item.url} 
                                  className={({ isActive }) => cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200",
                                    collapsed ? 'justify-center' : 'pl-4',
                                    isActive 
                                      ? `bg-gradient-to-r ${section.color} text-white shadow-md` 
                                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                  )}
                                >
                                  {!collapsed && <span className="text-base">{item.emoji}</span>}
                                  <item.icon className="h-4 w-4 flex-shrink-0" />
                                  {!collapsed && <span className="text-sm">{item.label}</span>}
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <>
                    <SidebarGroupLabel className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 mb-1",
                      !collapsed && section.bgColor
                    )}>
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        collapsed && section.bgColor
                      )}>
                        <SectionIcon className={cn("h-4 w-4", section.textColor)} />
                      </div>
                      {!collapsed && (
                        <span className={cn("text-sm font-semibold", section.textColor)}>
                          {section.title}
                        </span>
                      )}
                    </SidebarGroupLabel>
                    <SidebarGroupContent className="space-y-0.5">
                      <SidebarMenu>
                        {section.items.map(item => (
                          <SidebarMenuItem key={item.url}>
                            <SidebarMenuButton asChild tooltip={collapsed ? item.label : undefined}>
                              <NavLink 
                                to={item.url} 
                                className={({ isActive }) => cn(
                                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200",
                                  collapsed ? 'justify-center' : 'ml-2',
                                  isActive 
                                    ? `bg-gradient-to-r ${section.color} text-white shadow-md` 
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                )}
                              >
                                {!collapsed && <span className="text-base">{item.emoji}</span>}
                                <item.icon className="h-4 w-4 flex-shrink-0" />
                                {!collapsed && <span className="text-sm">{item.label}</span>}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </>
                )}
              </SidebarGroup>
            );
          })}
        </ScrollArea>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border/50 p-3">
        {!collapsed && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>✨</span>
            <span>Panel de Administración</span>
            <span>✨</span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}