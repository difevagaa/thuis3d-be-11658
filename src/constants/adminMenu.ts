export interface AdminMenuItem {
  icon: any;
  label: string;
  url: string;
  color: string;
  bgColor: string;
}

export interface AdminMenuSection {
  title: string;
  icon: any;
  color: string;
  collapsible?: boolean;
  items: AdminMenuItem[];
}

// Centralized Admin navigation definition.
// Used by AdminSidebar (navigation) and RolesPermissions (permission picklist).
export const adminMenuItems: AdminMenuSection[] = [
  {
    title: "Principal",
    icon: null,
    color: "from-blue-500 to-blue-600",
    items: [
      {
        icon: null,
        label: "Dashboard",
        url: "/admin/dashboard",
        color: "text-blue-600",
        bgColor: "bg-blue-100 hover:bg-blue-200 border-blue-300",
      },
    ],
  },
  {
    title: "Catálogo",
    icon: null,
    color: "from-emerald-500 to-emerald-600",
    items: [
      { icon: null, label: "Productos", url: "/admin/productos", color: "text-emerald-700", bgColor: "bg-emerald-100 hover:bg-emerald-200 border-emerald-300" },
      { icon: null, label: "Categorías", url: "/admin/categorias", color: "text-teal-700", bgColor: "bg-teal-100 hover:bg-teal-200 border-teal-300" },
      { icon: null, label: "Materiales", url: "/admin/materiales", color: "text-cyan-700", bgColor: "bg-cyan-100 hover:bg-cyan-200 border-cyan-300" },
      { icon: null, label: "Colores", url: "/admin/colores", color: "text-pink-700", bgColor: "bg-pink-100 hover:bg-pink-200 border-pink-300" },
    ],
  },
  {
    title: "Ventas",
    icon: null,
    color: "from-orange-500 to-orange-600",
    items: [
      { icon: null, label: "Pedidos", url: "/admin/pedidos", color: "text-orange-700", bgColor: "bg-orange-100 hover:bg-orange-200 border-orange-300" },
      { icon: null, label: "Cotizaciones", url: "/admin/cotizaciones", color: "text-amber-700", bgColor: "bg-amber-100 hover:bg-amber-200 border-amber-300" },
      { icon: null, label: "Facturas", url: "/admin/facturas", color: "text-yellow-700", bgColor: "bg-yellow-100 hover:bg-yellow-200 border-yellow-300" },
      { icon: null, label: "Estados", url: "/admin/estados", color: "text-lime-700", bgColor: "bg-lime-100 hover:bg-lime-200 border-lime-300" },
    ],
  },
  {
    title: "Calculadora 3D",
    icon: null,
    color: "from-violet-500 to-violet-600",
    collapsible: true,
    items: [
      { icon: null, label: "Configuración", url: "/admin/calculadora-3d", color: "text-violet-700", bgColor: "bg-violet-100 hover:bg-violet-200 border-violet-300" },
      { icon: null, label: "Descuentos", url: "/admin/descuentos-cantidad", color: "text-purple-700", bgColor: "bg-purple-100 hover:bg-purple-200 border-purple-300" },
      { icon: null, label: "Calibración", url: "/admin/calibracion", color: "text-fuchsia-700", bgColor: "bg-fuchsia-100 hover:bg-fuchsia-200 border-fuchsia-300" },
      { icon: null, label: "Perfiles", url: "/admin/perfiles-calibracion", color: "text-indigo-700", bgColor: "bg-indigo-100 hover:bg-indigo-200 border-indigo-300" },
      { icon: null, label: "Precisión", url: "/admin/precision-calculadora", color: "text-blue-700", bgColor: "bg-blue-100 hover:bg-blue-200 border-blue-300" },
      { icon: null, label: "Soportes", url: "/admin/deteccion-soportes", color: "text-sky-700", bgColor: "bg-sky-100 hover:bg-sky-200 border-sky-300" },
      { icon: null, label: "Vista Previa", url: "/admin/modelos-vista-previa", color: "text-cyan-700", bgColor: "bg-cyan-100 hover:bg-cyan-200 border-cyan-300" },
    ],
  },
  {
    title: "Clientes",
    icon: null,
    color: "from-rose-500 to-rose-600",
    items: [
      { icon: null, label: "Usuarios", url: "/admin/usuarios", color: "text-rose-700", bgColor: "bg-rose-100 hover:bg-rose-200 border-rose-300" },
      { icon: null, label: "Roles", url: "/admin/roles", color: "text-red-700", bgColor: "bg-red-100 hover:bg-red-200 border-red-300" },
    ],
  },
  {
    title: "Marketing",
    icon: null,
    color: "from-amber-500 to-amber-600",
    items: [
      { icon: null, label: "Lealtad", url: "/admin/loyalty", color: "text-amber-700", bgColor: "bg-amber-100 hover:bg-amber-200 border-amber-300" },
      { icon: null, label: "Cupones", url: "/admin/coupons", color: "text-orange-700", bgColor: "bg-orange-100 hover:bg-orange-200 border-orange-300" },
      { icon: null, label: "Gift Cards", url: "/admin/gift-cards", color: "text-pink-700", bgColor: "bg-pink-100 hover:bg-pink-200 border-pink-300" },
      { icon: null, label: "SEO", url: "/admin/seo", color: "text-green-700", bgColor: "bg-green-100 hover:bg-green-200 border-green-300" },
    ],
  },
  {
    title: "Comunicación",
    icon: null,
    color: "from-sky-500 to-sky-600",
    items: [
      { icon: null, label: "Mensajes", url: "/admin/messages", color: "text-sky-700", bgColor: "bg-sky-100 hover:bg-sky-200 border-sky-300" },
      { icon: null, label: "Emails", url: "/admin/emails", color: "text-indigo-700", bgColor: "bg-indigo-100 hover:bg-indigo-200 border-indigo-300" },
      { icon: null, label: "Reseñas", url: "/admin/reviews", color: "text-yellow-700", bgColor: "bg-yellow-100 hover:bg-yellow-200 border-yellow-300" },
      { icon: null, label: "Actividad", url: "/admin/visitantes", color: "text-teal-700", bgColor: "bg-teal-100 hover:bg-teal-200 border-teal-300" },
    ],
  },
  {
    title: "Contenido",
    icon: null,
    color: "from-indigo-500 to-indigo-600",
    items: [
      { icon: null, label: "Editor de Páginas", url: "/admin/page-builder", color: "text-indigo-700", bgColor: "bg-indigo-100 hover:bg-indigo-200 border-indigo-300" },
      { icon: null, label: "Personalizar", url: "/admin/personalizador", color: "text-indigo-700", bgColor: "bg-indigo-100 hover:bg-indigo-200 border-indigo-300" },
      { icon: null, label: "Contenido", url: "/admin/contenido", color: "text-violet-700", bgColor: "bg-violet-100 hover:bg-violet-200 border-violet-300" },
      { icon: null, label: "Páginas", url: "/admin/pages", color: "text-purple-700", bgColor: "bg-purple-100 hover:bg-purple-200 border-purple-300" },
      { icon: null, label: "Legal", url: "/admin/paginas-legales", color: "text-slate-700", bgColor: "bg-slate-100 hover:bg-slate-200 border-slate-300" },
      { icon: null, label: "Blog", url: "/admin/blog", color: "text-blue-700", bgColor: "bg-blue-100 hover:bg-blue-200 border-blue-300" },
      { icon: null, label: "Galería", url: "/admin/galeria", color: "text-cyan-700", bgColor: "bg-cyan-100 hover:bg-cyan-200 border-cyan-300" },
    ],
  },
  {
    title: "Configuración",
    icon: null,
    color: "from-slate-500 to-slate-600",
    items: [
      { icon: null, label: "Base de Datos", url: "/admin/database", color: "text-red-700", bgColor: "bg-red-100 hover:bg-red-200 border-red-300" },
      { icon: null, label: "PINs", url: "/admin/pin", color: "text-slate-700", bgColor: "bg-slate-100 hover:bg-slate-200 border-slate-300" },
      { icon: null, label: "Pagos", url: "/admin/configuracion-pagos", color: "text-emerald-700", bgColor: "bg-emerald-100 hover:bg-emerald-200 border-emerald-300" },
      { icon: null, label: "IVA", url: "/admin/configuracion-iva", color: "text-blue-700", bgColor: "bg-blue-100 hover:bg-blue-200 border-blue-300" },
      { icon: null, label: "Envíos", url: "/admin/gestion-envios", color: "text-orange-700", bgColor: "bg-orange-100 hover:bg-orange-200 border-orange-300" },
      { icon: null, label: "Idiomas", url: "/admin/traducciones", color: "text-sky-700", bgColor: "bg-sky-100 hover:bg-sky-200 border-sky-300" },
      { icon: null, label: "Backup", url: "/admin/backup-config", color: "text-gray-700", bgColor: "bg-gray-100 hover:bg-gray-200 border-gray-300" },
      { icon: null, label: "Papelera", url: "/admin/trash", color: "text-red-700", bgColor: "bg-red-100 hover:bg-red-200 border-red-300" },
    ],
  },
];

export function buildAdminPageOptions() {
  const options: { value: string; label: string }[] = [];
  for (const section of adminMenuItems) {
    for (const item of section.items) {
      options.push({ value: item.url, label: `${section.title} — ${item.label}` });
    }
  }
  // De-dup by URL
  const map = new Map<string, string>();
  for (const o of options) map.set(o.value, o.label);
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
}
