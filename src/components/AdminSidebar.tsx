import { NavLink } from "react-router-dom";
import { useState } from "react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, useSidebar } from "@/components/ui/sidebar";
import { LayoutDashboard, FileText, ShoppingCart, FolderTree, Settings, Receipt, Package, Users, UserCog, Palette, Gift, Tag, Award, MessageSquare, FileCode, BookOpen, Star, Trash2, Percent, Calculator, TrendingUp, TrendingDown, ChevronRight, Layers, Shield, Activity, CreditCard, Truck, HardDrive, Gauge, Box, Image, Globe } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
const menuItems = [{
  title: "Principal",
  items: [{
    icon: LayoutDashboard,
    label: "Dashboard",
    url: "/admin/dashboard"
  }]
}, {
  title: "Catálogo",
  items: [{
    icon: Package,
    label: "Productos",
    url: "/admin/productos"
  }, {
    icon: FolderTree,
    label: "Categorías",
    url: "/admin/categorias"
  }, {
    icon: Layers,
    label: "Materiales",
    url: "/admin/materiales"
  }, {
    icon: Palette,
    label: "Colores",
    url: "/admin/colores"
  }]
}, {
  title: "Ventas",
  items: [{
    icon: ShoppingCart,
    label: "Pedidos",
    url: "/admin/pedidos"
  }, {
    icon: FileText,
    label: "Cotizaciones",
    url: "/admin/cotizaciones"
  }, {
    icon: Receipt,
    label: "Facturas",
    url: "/admin/facturas"
  }, {
    icon: Tag,
    label: "Estados",
    url: "/admin/estados"
  }]
}, {
  title: "Calculadora 3D",
  collapsible: true,
  items: [{
    icon: Settings,
    label: "Configuración",
    url: "/admin/calculadora-3d"
  }, {
    icon: TrendingDown,
    label: "Descuentos por Cantidad",
    url: "/admin/descuentos-cantidad"
  }, {
    icon: Gauge,
    label: "Calibración",
    url: "/admin/calibracion"
  }, {
    icon: TrendingUp,
    label: "Perfiles",
    url: "/admin/perfiles-calibracion"
  }, {
    icon: Activity,
    label: "Precisión",
    url: "/admin/precision-calculadora"
  }, {
    icon: Shield,
    label: "Detección Soportes",
    url: "/admin/deteccion-soportes"
  }, {
    icon: Box,
    label: "Modelos Vista Previa",
    url: "/admin/modelos-vista-previa"
  }]
}, {
  title: "Clientes",
  items: [{
    icon: Users,
    label: "Usuarios",
    url: "/admin/usuarios"
  }, {
    icon: UserCog,
    label: "Roles y Permisos",
    url: "/admin/roles"
  }]
}, {
  title: "Marketing",
  items: [{
    icon: Award,
    label: "Programa de Lealtad",
    url: "/admin/loyalty"
  }, {
    icon: Percent,
    label: "Cupones",
    url: "/admin/coupons"
  }, {
    icon: Gift,
    label: "Tarjetas Regalo",
    url: "/admin/gift-cards"
  }, {
    icon: TrendingUp,
    label: "SEO",
    url: "/admin/seo"
  }]
}, {
  title: "Comunicación",
  items: [{
    icon: MessageSquare,
    label: "Mensajes",
    url: "/admin/messages"
  }, {
    icon: Star,
    label: "Reseñas",
    url: "/admin/reviews"
  }, {
    icon: Activity,
    label: "Actividad de Usuarios",
    url: "/admin/visitantes"
  }]
}, {
  title: "Contenido",
  items: [{
    icon: Palette,
    label: "Personalizador",
    url: "/admin/personalizador"
  }, {
    icon: FileCode,
    label: "Gestión de Contenido",
    url: "/admin/contenido"
  }, {
    icon: BookOpen,
    label: "Páginas",
    url: "/admin/pages"
  }, {
    icon: FileText,
    label: "Páginas Legales",
    url: "/admin/paginas-legales"
  }, {
    icon: BookOpen,
    label: "Blog",
    url: "/admin/blog"
  }, {
    icon: Image,
    label: "Galería",
    url: "/admin/galeria"
  }]
}, {
  title: "Configuración",
  items: [{
    icon: Shield,
    label: "Gestión de PINs",
    url: "/admin/pin"
  }, {
    icon: CreditCard,
    label: "Pagos",
    url: "/admin/configuracion-pagos"
  }, {
    icon: Percent,
    label: "IVA",
    url: "/admin/configuracion-iva"
  }, {
    icon: Truck,
    label: "Envíos",
    url: "/admin/gestion-envios"
  }, {
    icon: Globe,
    label: "Traducciones",
    url: "/admin/traducciones"
  }, {
    icon: HardDrive,
    label: "Backup",
    url: "/admin/backup-config"
  }, {
    icon: Trash2,
    label: "Papelera",
    url: "/admin/trash"
  }]
}];
export function AdminSidebar() {
  const [openCalculator, setOpenCalculator] = useState(true);
  const {
    state
  } = useSidebar();
  const collapsed = state === "collapsed";
  return <Sidebar className={`${collapsed ? "w-16" : "w-72"} transition-all duration-300 border-r bg-sidebar`}>
      <SidebarContent className="py-4 bg-sidebar">
        {menuItems.map((section, idx) => <SidebarGroup key={idx} className="mb-1">
            {section.collapsible ? <Collapsible open={openCalculator} onOpenChange={setOpenCalculator} className="group/collapsible">
                <SidebarGroupLabel asChild>
                    <CollapsibleTrigger style={{
              fontSize: 'var(--sidebar-label-size, 11px)'
            }} className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors font-serif">
                    {!collapsed && <span>{section.title}</span>}
                    {!collapsed && <ChevronRight className={`h-3 w-3 transition-transform ${openCalculator ? 'rotate-90' : ''}`} />}
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items.map(item => <SidebarMenuItem key={item.url}>
                          <SidebarMenuButton asChild tooltip={collapsed ? item.label : undefined}>
                            <NavLink to={item.url} className={({
                      isActive
                    }) => `${collapsed ? 'justify-center px-2' : 'pl-6'} ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"} transition-all flex items-center gap-3 py-2 px-3`}>
                              <item.icon className="h-4 w-4 flex-shrink-0" />
                              {!collapsed && <span className="text-sm">{item.label}</span>}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible> : <>
                <SidebarGroupLabel style={{
            fontSize: 'var(--sidebar-label-size, 11px)'
          }} className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground">
                  {!collapsed && section.title}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map(item => <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild tooltip={collapsed ? item.label : undefined}>
                          <NavLink to={item.url} className={({
                    isActive
                  }) => `${collapsed ? 'justify-center px-2' : ''} ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"} transition-all flex items-center gap-3 py-2 px-3`}>
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            {!collapsed && <span className="text-sm">{item.label}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </>}
          </SidebarGroup>)}
      </SidebarContent>
    </Sidebar>;
}