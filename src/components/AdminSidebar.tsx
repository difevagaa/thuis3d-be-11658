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
  
  return <Sidebar className={`${collapsed ? "w-16" : "w-72"} transition-all duration-300 border-r bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 shadow-xl`}>
      <SidebarContent className="py-4 bg-transparent">
        {!collapsed && (
          <div className="px-4 mb-6">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Admin Panel</h3>
                <p className="text-xs text-gray-400">Gestión Completa</p>
              </div>
            </div>
          </div>
        )}
        
        {menuItems.map((section, idx) => <SidebarGroup key={idx} className="mb-2">
            {section.collapsible ? <Collapsible open={openCalculator} onOpenChange={setOpenCalculator} className="group/collapsible">
                <SidebarGroupLabel asChild>
                    <CollapsibleTrigger style={{
              fontSize: 'var(--sidebar-label-size, 11px)'
            }} className="flex w-full items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-primary transition-colors">
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
                    }) => `${collapsed ? 'justify-center px-2' : 'pl-6'} ${isActive ? "bg-primary/20 text-primary font-semibold border-l-4 border-primary" : "text-gray-300 hover:bg-white/5 hover:text-white border-l-4 border-transparent"} transition-all flex items-center gap-3 py-3 px-4 rounded-r-lg`}>
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
          }} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                  {!collapsed && section.title}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map(item => <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild tooltip={collapsed ? item.label : undefined}>
                          <NavLink to={item.url} className={({
                    isActive
                  }) => `${collapsed ? 'justify-center px-2' : ''} ${isActive ? "bg-primary/20 text-primary font-semibold border-l-4 border-primary" : "text-gray-300 hover:bg-white/5 hover:text-white border-l-4 border-transparent"} transition-all flex items-center gap-3 py-3 px-4 rounded-r-lg`}>
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