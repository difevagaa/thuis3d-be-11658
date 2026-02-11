import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import {
  LayoutDashboard, FileText, ShoppingCart, FolderTree, Settings, Receipt,
  Package, Users, UserCog, Palette, Gift, Tag, Award, MessageSquare,
  FileCode, BookOpen, Star, Trash2, Percent, TrendingDown, ChevronDown,
  Layers, Shield, Activity, CreditCard, Truck, Gauge, Image, Globe,
  Calculator, Layout, X, Database, Mail, Home, DollarSign, Megaphone,
  PenTool, Printer, Store, Wrench, KeyRound, Target, Eye, Crosshair,
  SlidersHorizontal, Save, Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { adminMenuItems } from "@/constants/adminMenu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarCustomizer,
  getStoredTheme,
  type SidebarTheme,
} from "@/components/admin/SidebarCustomizer";

const getIconForUrl = (url: string): React.ElementType => {
  const iconMap: Record<string, React.ElementType> = {
    "/admin/dashboard": LayoutDashboard, "/admin/productos": Package,
    "/admin/categorias": FolderTree, "/admin/materiales": Layers,
    "/admin/colores": Palette, "/admin/pedidos": ShoppingCart,
    "/admin/cotizaciones": FileText, "/admin/facturas": Receipt,
    "/admin/estados": Tag, "/admin/calculadora-3d": Calculator,
    "/admin/descuentos-cantidad": TrendingDown, "/admin/calibracion": Gauge,
    "/admin/perfiles-calibracion": SlidersHorizontal,
    "/admin/precision-calculadora": Crosshair,
    "/admin/deteccion-soportes": Shield, "/admin/modelos-vista-previa": Eye,
    "/admin/usuarios": Users, "/admin/roles": UserCog,
    "/admin/loyalty": Award, "/admin/coupons": Percent,
    "/admin/gift-cards": Gift, "/admin/seo": Target,
    "/admin/messages": MessageSquare, "/admin/emails": Mail,
    "/admin/reviews": Star, "/admin/visitantes": Activity,
    "/admin/page-builder": Layout, "/admin/personalizador": PenTool,
    "/admin/contenido": FileCode, "/admin/pages": BookOpen,
    "/admin/paginas-legales": Scale, "/admin/blog": BookOpen,
    "/admin/galeria": Image, "/admin/database": Database,
    "/admin/pin": KeyRound, "/admin/configuracion-pagos": CreditCard,
    "/admin/configuracion-iva": Percent, "/admin/gestion-envios": Truck,
    "/admin/traducciones": Globe, "/admin/backup-config": Save,
    "/admin/trash": Trash2,
  };
  return iconMap[url] || Settings;
};

const getSectionIcon = (title: string): React.ElementType => {
  const map: Record<string, React.ElementType> = {
    "Panel Principal": Home, "Ventas y Pedidos": DollarSign,
    "Catálogo": Package, "Usuarios y Permisos": Users,
    "Marketing y Promociones": Megaphone, "Comunicación": MessageSquare,
    "Contenido Web": PenTool, "Impresión 3D": Printer,
    "Ajustes de Tienda": Store, "Sistema y Datos": Wrench,
  };
  const clean = title.replace(/^[^a-zA-ZÀ-ÿ]+/, "").trim();
  return map[clean] || Settings;
};

interface MenuItem { icon: React.ElementType; label: string; url: string; color: string; bgColor: string; }
interface MenuSection { title: string; icon: React.ElementType; color: string; collapsible?: boolean; group?: "operations" | "config"; items: MenuItem[]; }

const menuItems: MenuSection[] = adminMenuItems.map((section) => ({
  ...section,
  icon: getSectionIcon(section.title),
  items: section.items.map((item) => ({ ...item, icon: getIconForUrl(item.url) })),
}));

function AdminMenuItem({ item, isActive, onNavigate, theme }: { item: MenuItem; isActive: boolean; onNavigate: () => void; theme: SidebarTheme }) {
  const Icon = item.icon;
  const navigate = useNavigate();
  const handleClick = (e: React.MouseEvent) => { e.preventDefault(); navigate(item.url); onNavigate(); };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-all duration-200 min-h-[36px]",
        isActive ? "font-medium" : ""
      )}
      style={isActive
        ? { background: theme.activeItem, color: theme.activeText }
        : { color: theme.text }
      }
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = theme.hoverBg; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      <Icon className="h-4 w-4 flex-shrink-0" style={{ color: isActive ? theme.activeText : theme.accent }} />
      <span className="text-sm leading-tight">{item.label}</span>
    </button>
  );
}

function AdminMenuSection({ section, onNavigate, theme }: { section: MenuSection; onNavigate: () => void; theme: SidebarTheme }) {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();
  const SectionIcon = section.icon;
  const hasActiveItem = section.items.some(item => location.pathname === item.url);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-all duration-200 min-h-[40px]"
        style={{ color: hasActiveItem ? theme.accent : theme.text }}
        onMouseEnter={(e) => { e.currentTarget.style.background = theme.hoverBg; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <div
          className="flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0"
          style={hasActiveItem
            ? { background: theme.activeItem, color: theme.activeText }
            : { background: theme.sectionIconBg, color: theme.accent }
          }
        >
          <SectionIcon className="h-4 w-4" />
        </div>
        <span className="flex-1 text-left text-sm font-semibold leading-tight">{section.title}</span>
        <div className={cn("transition-transform duration-200 flex-shrink-0", isOpen ? "rotate-0" : "-rotate-90")}>
          <ChevronDown className="h-4 w-4" style={{ color: theme.text, opacity: 0.5 }} />
        </div>
      </button>
      {isOpen && (
        <div className="ml-4 pl-3 space-y-0.5" style={{ borderLeft: `1px solid ${theme.border}` }}>
          {section.items.map((item) => (
            <AdminMenuItem key={item.url} item={item} isActive={location.pathname === item.url} onNavigate={onNavigate} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
}

const WIDTH_KEY = "admin-sidebar-width";
const MIN_WIDTH = 180;
const MAX_WIDTH = 360;
const DEFAULT_WIDTH = 224;

function getStoredWidth(): number {
  try {
    const v = localStorage.getItem(WIDTH_KEY);
    if (v) { const n = parseInt(v, 10); if (n >= MIN_WIDTH && n <= MAX_WIDTH) return n; }
  } catch {}
  return DEFAULT_WIDTH;
}

export function AdminSidebar() {
  const { setOpen, isMobile, setOpenMobile } = useSidebar();
  const [theme, setTheme] = useState<SidebarTheme>(getStoredTheme);
  const [width, setWidth] = useState(getStoredWidth);
  const isDragging = useRef(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleNavigate = () => { isMobile ? setOpenMobile(false) : setOpen(false); };
  const handleCloseSidebar = () => { isMobile ? setOpenMobile(false) : setOpen(false); };

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setWidth(newWidth);
    };
    const onMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        localStorage.setItem(WIDTH_KEY, String(width));
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [width]);

  const operationSections = menuItems.filter(s => s.group !== "config");
  const configSections = menuItems.filter(s => s.group === "config");

  return (
    <Sidebar
      ref={sidebarRef}
      className="border-r transition-colors duration-300"
      style={{
        width: isMobile ? undefined : `${width}px`,
        background: theme.bg,
        borderColor: theme.border,
        // Override CSS variable widths for the sidebar
        "--sidebar-width": `${width}px`,
      } as React.CSSProperties}
    >
      <SidebarContent className="flex flex-col h-full">
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: `1px solid ${theme.border}` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}cc)` }}
            >
              <LayoutDashboard className="h-4 w-4" style={{ color: theme.activeText }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold leading-tight" style={{ color: theme.text }}>Admin</h3>
              <p className="text-[10px] leading-tight" style={{ color: theme.text, opacity: 0.6 }}>Gestión</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <SidebarCustomizer currentTheme={theme} onThemeChange={setTheme} />
            <Button variant="ghost" size="icon" onClick={handleCloseSidebar} className="h-6 w-6 rounded-md">
              <X className="h-4 w-4" style={{ color: theme.text, opacity: 0.7 }} />
            </Button>
          </div>
        </div>

        {/* Menu Sections */}
        <ScrollArea className="flex-1 px-2 py-2">
          <div className="space-y-2">
            {operationSections.map((section, idx) => (
              <AdminMenuSection key={idx} section={section} onNavigate={handleNavigate} theme={theme} />
            ))}
            {configSections.length > 0 && (
              <div className="flex items-center gap-2 px-2 py-2">
                <div className="flex-1 h-px" style={{ background: theme.border }} />
                <span className="text-[10px] uppercase tracking-wider font-semibold whitespace-nowrap" style={{ color: theme.text, opacity: 0.4 }}>
                  Configuración
                </span>
                <div className="flex-1 h-px" style={{ background: theme.border }} />
              </div>
            )}
            {configSections.map((section, idx) => (
              <AdminMenuSection key={`config-${idx}`} section={section} onNavigate={handleNavigate} theme={theme} />
            ))}
          </div>
        </ScrollArea>
      </SidebarContent>

      {/* Drag handle to resize width */}
      {!isMobile && (
        <div
          onMouseDown={onMouseDown}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-50 group"
        >
          <div className="w-full h-full transition-colors group-hover:bg-primary/20 group-active:bg-primary/40" />
        </div>
      )}
    </Sidebar>
  );
}
