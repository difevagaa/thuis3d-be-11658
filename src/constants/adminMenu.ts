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

// Permission categories for granular role permissions
export interface PermissionOption {
  value: string;
  label: string;
  description?: string;
  category: string;
}

// All granular permissions organized by category (200+ options)
export const allPermissions: PermissionOption[] = [
  // ===== PÁGINAS DE NAVEGACIÓN (40+ opciones) =====
  { value: "page:/admin/dashboard", label: "Dashboard", category: "Páginas - Principal", description: "Acceso al panel principal" },
  { value: "page:/admin/productos", label: "Productos", category: "Páginas - Catálogo", description: "Lista de productos" },
  { value: "page:/admin/categorias", label: "Categorías", category: "Páginas - Catálogo", description: "Gestión de categorías" },
  { value: "page:/admin/materiales", label: "Materiales", category: "Páginas - Catálogo", description: "Gestión de materiales" },
  { value: "page:/admin/colores", label: "Colores", category: "Páginas - Catálogo", description: "Gestión de colores" },
  { value: "page:/admin/pedidos", label: "Pedidos", category: "Páginas - Ventas", description: "Lista de pedidos" },
  { value: "page:/admin/cotizaciones", label: "Cotizaciones", category: "Páginas - Ventas", description: "Cotizaciones recibidas" },
  { value: "page:/admin/facturas", label: "Facturas", category: "Páginas - Ventas", description: "Gestión de facturas" },
  { value: "page:/admin/estados", label: "Estados", category: "Páginas - Ventas", description: "Estados de pedidos" },
  { value: "page:/admin/calculadora-3d", label: "Calculadora 3D", category: "Páginas - Calculadora", description: "Configuración calculadora" },
  { value: "page:/admin/descuentos-cantidad", label: "Descuentos por cantidad", category: "Páginas - Calculadora", description: "Descuentos masivos" },
  { value: "page:/admin/calibracion", label: "Calibración", category: "Páginas - Calculadora", description: "Tests de calibración" },
  { value: "page:/admin/perfiles-calibracion", label: "Perfiles calibración", category: "Páginas - Calculadora", description: "Perfiles guardados" },
  { value: "page:/admin/precision-calculadora", label: "Precisión calculadora", category: "Páginas - Calculadora", description: "Ajustes precisión" },
  { value: "page:/admin/deteccion-soportes", label: "Detección soportes", category: "Páginas - Calculadora", description: "Config soportes" },
  { value: "page:/admin/modelos-vista-previa", label: "Vista previa modelos", category: "Páginas - Calculadora", description: "Modelos 3D preview" },
  { value: "page:/admin/usuarios", label: "Usuarios", category: "Páginas - Clientes", description: "Gestión usuarios" },
  { value: "page:/admin/roles", label: "Roles y permisos", category: "Páginas - Clientes", description: "Config roles" },
  { value: "page:/admin/loyalty", label: "Lealtad", category: "Páginas - Marketing", description: "Programa fidelidad" },
  { value: "page:/admin/coupons", label: "Cupones", category: "Páginas - Marketing", description: "Gestión cupones" },
  { value: "page:/admin/gift-cards", label: "Gift Cards", category: "Páginas - Marketing", description: "Tarjetas regalo" },
  { value: "page:/admin/seo", label: "SEO", category: "Páginas - Marketing", description: "Config SEO" },
  { value: "page:/admin/messages", label: "Mensajes", category: "Páginas - Comunicación", description: "Mensajes clientes" },
  { value: "page:/admin/emails", label: "Emails", category: "Páginas - Comunicación", description: "Campañas email" },
  { value: "page:/admin/reviews", label: "Reseñas", category: "Páginas - Comunicación", description: "Gestión reseñas" },
  { value: "page:/admin/visitantes", label: "Actividad visitantes", category: "Páginas - Comunicación", description: "Tracking visitantes" },
  { value: "page:/admin/page-builder", label: "Editor de páginas", category: "Páginas - Contenido", description: "Page builder" },
  { value: "page:/admin/personalizador", label: "Personalizador", category: "Páginas - Contenido", description: "Tema y colores" },
  { value: "page:/admin/contenido", label: "Contenido", category: "Páginas - Contenido", description: "Gestión contenido" },
  { value: "page:/admin/pages", label: "Páginas estáticas", category: "Páginas - Contenido", description: "Páginas custom" },
  { value: "page:/admin/paginas-legales", label: "Páginas legales", category: "Páginas - Contenido", description: "Legal, términos" },
  { value: "page:/admin/blog", label: "Blog", category: "Páginas - Contenido", description: "Gestión blog" },
  { value: "page:/admin/galeria", label: "Galería", category: "Páginas - Contenido", description: "Galería imágenes" },
  { value: "page:/admin/database", label: "Base de datos", category: "Páginas - Config", description: "Admin BD" },
  { value: "page:/admin/pin", label: "PINs admin", category: "Páginas - Config", description: "Gestión PINs" },
  { value: "page:/admin/configuracion-pagos", label: "Pagos", category: "Páginas - Config", description: "Config pagos" },
  { value: "page:/admin/configuracion-iva", label: "IVA", category: "Páginas - Config", description: "Config impuestos" },
  { value: "page:/admin/gestion-envios", label: "Envíos", category: "Páginas - Config", description: "Gestión envíos" },
  { value: "page:/admin/traducciones", label: "Traducciones", category: "Páginas - Config", description: "Idiomas" },
  { value: "page:/admin/backup-config", label: "Backup", category: "Páginas - Config", description: "Config respaldos" },
  { value: "page:/admin/trash", label: "Papelera", category: "Páginas - Config", description: "Elementos borrados" },
  
  // ===== PERMISOS DE PRODUCTOS (20 opciones) =====
  { value: "products:view", label: "Ver productos", category: "Productos", description: "Listar productos" },
  { value: "products:create", label: "Crear productos", category: "Productos", description: "Añadir nuevos" },
  { value: "products:edit", label: "Editar productos", category: "Productos", description: "Modificar existentes" },
  { value: "products:delete", label: "Eliminar productos", category: "Productos", description: "Borrar productos" },
  { value: "products:publish", label: "Publicar productos", category: "Productos", description: "Activar/desactivar" },
  { value: "products:pricing", label: "Cambiar precios", category: "Productos", description: "Modificar precios" },
  { value: "products:stock", label: "Gestionar stock", category: "Productos", description: "Inventario" },
  { value: "products:images", label: "Gestionar imágenes", category: "Productos", description: "Fotos productos" },
  { value: "products:categories", label: "Asignar categorías", category: "Productos", description: "Clasificar" },
  { value: "products:materials", label: "Asignar materiales", category: "Productos", description: "Materiales disponibles" },
  { value: "products:colors", label: "Asignar colores", category: "Productos", description: "Colores disponibles" },
  { value: "products:customization", label: "Personalización", category: "Productos", description: "Secciones personalizables" },
  { value: "products:seo", label: "SEO productos", category: "Productos", description: "Meta tags productos" },
  { value: "products:translations", label: "Traducciones productos", category: "Productos", description: "Traducir productos" },
  { value: "products:duplicate", label: "Duplicar productos", category: "Productos", description: "Copiar productos" },
  { value: "products:export", label: "Exportar productos", category: "Productos", description: "Descargar CSV/JSON" },
  { value: "products:import", label: "Importar productos", category: "Productos", description: "Subir masivo" },
  { value: "products:bulk_edit", label: "Edición masiva", category: "Productos", description: "Cambios en lote" },
  { value: "products:roles", label: "Roles de productos", category: "Productos", description: "Visibilidad por rol" },
  { value: "products:shipping", label: "Envío productos", category: "Productos", description: "Config envío" },
  
  // ===== PERMISOS DE PEDIDOS (18 opciones) =====
  { value: "orders:view", label: "Ver pedidos", category: "Pedidos", description: "Listar pedidos" },
  { value: "orders:view_details", label: "Ver detalle", category: "Pedidos", description: "Info completa" },
  { value: "orders:create", label: "Crear pedidos", category: "Pedidos", description: "Pedidos manuales" },
  { value: "orders:edit", label: "Editar pedidos", category: "Pedidos", description: "Modificar pedidos" },
  { value: "orders:delete", label: "Eliminar pedidos", category: "Pedidos", description: "Borrar pedidos" },
  { value: "orders:change_status", label: "Cambiar estado", category: "Pedidos", description: "Actualizar estado" },
  { value: "orders:payment_status", label: "Estado de pago", category: "Pedidos", description: "Marcar pagado" },
  { value: "orders:refund", label: "Reembolsos", category: "Pedidos", description: "Procesar devoluciones" },
  { value: "orders:notes", label: "Notas internas", category: "Pedidos", description: "Añadir notas" },
  { value: "orders:export", label: "Exportar pedidos", category: "Pedidos", description: "Descargar datos" },
  { value: "orders:print", label: "Imprimir pedidos", category: "Pedidos", description: "Generar PDF" },
  { value: "orders:email", label: "Enviar emails", category: "Pedidos", description: "Notificar cliente" },
  { value: "orders:tracking", label: "Añadir tracking", category: "Pedidos", description: "Número seguimiento" },
  { value: "orders:assign", label: "Asignar pedidos", category: "Pedidos", description: "Asignar a staff" },
  { value: "orders:view_customer", label: "Ver cliente", category: "Pedidos", description: "Info del cliente" },
  { value: "orders:view_payments", label: "Ver pagos", category: "Pedidos", description: "Historial pagos" },
  { value: "orders:bulk_actions", label: "Acciones masivas", category: "Pedidos", description: "Cambios en lote" },
  { value: "orders:statistics", label: "Estadísticas", category: "Pedidos", description: "Reportes ventas" },
  
  // ===== PERMISOS DE COTIZACIONES (15 opciones) =====
  { value: "quotes:view", label: "Ver cotizaciones", category: "Cotizaciones", description: "Listar cotizaciones" },
  { value: "quotes:view_details", label: "Ver detalle", category: "Cotizaciones", description: "Info completa" },
  { value: "quotes:respond", label: "Responder", category: "Cotizaciones", description: "Añadir precio" },
  { value: "quotes:edit", label: "Editar", category: "Cotizaciones", description: "Modificar cotizaciones" },
  { value: "quotes:delete", label: "Eliminar", category: "Cotizaciones", description: "Borrar cotizaciones" },
  { value: "quotes:approve", label: "Aprobar", category: "Cotizaciones", description: "Aprobar cotizaciones" },
  { value: "quotes:reject", label: "Rechazar", category: "Cotizaciones", description: "Rechazar cotizaciones" },
  { value: "quotes:convert_order", label: "Convertir a pedido", category: "Cotizaciones", description: "Crear pedido" },
  { value: "quotes:download_files", label: "Descargar archivos", category: "Cotizaciones", description: "Archivos STL" },
  { value: "quotes:notes", label: "Notas", category: "Cotizaciones", description: "Notas internas" },
  { value: "quotes:email", label: "Enviar email", category: "Cotizaciones", description: "Notificar cliente" },
  { value: "quotes:export", label: "Exportar", category: "Cotizaciones", description: "Descargar datos" },
  { value: "quotes:statistics", label: "Estadísticas", category: "Cotizaciones", description: "Reportes" },
  { value: "quotes:assign", label: "Asignar", category: "Cotizaciones", description: "Asignar a staff" },
  { value: "quotes:recalculate", label: "Recalcular", category: "Cotizaciones", description: "Recalcular precio" },
  
  // ===== PERMISOS DE FACTURAS (14 opciones) =====
  { value: "invoices:view", label: "Ver facturas", category: "Facturas", description: "Listar facturas" },
  { value: "invoices:view_details", label: "Ver detalle", category: "Facturas", description: "Info completa" },
  { value: "invoices:create", label: "Crear facturas", category: "Facturas", description: "Nueva factura" },
  { value: "invoices:edit", label: "Editar facturas", category: "Facturas", description: "Modificar" },
  { value: "invoices:delete", label: "Eliminar facturas", category: "Facturas", description: "Borrar" },
  { value: "invoices:mark_paid", label: "Marcar pagada", category: "Facturas", description: "Confirmar pago" },
  { value: "invoices:send", label: "Enviar factura", category: "Facturas", description: "Email al cliente" },
  { value: "invoices:download", label: "Descargar PDF", category: "Facturas", description: "Generar PDF" },
  { value: "invoices:void", label: "Anular factura", category: "Facturas", description: "Cancelar" },
  { value: "invoices:export", label: "Exportar facturas", category: "Facturas", description: "Descargar datos" },
  { value: "invoices:notes", label: "Añadir notas", category: "Facturas", description: "Notas internas" },
  { value: "invoices:discounts", label: "Aplicar descuentos", category: "Facturas", description: "Modificar montos" },
  { value: "invoices:taxes", label: "Gestionar IVA", category: "Facturas", description: "Impuestos" },
  { value: "invoices:statistics", label: "Estadísticas", category: "Facturas", description: "Reportes" },
  
  // ===== PERMISOS DE USUARIOS (16 opciones) =====
  { value: "users:view", label: "Ver usuarios", category: "Usuarios", description: "Listar usuarios" },
  { value: "users:view_details", label: "Ver detalles", category: "Usuarios", description: "Info completa" },
  { value: "users:create", label: "Crear usuarios", category: "Usuarios", description: "Nuevos usuarios" },
  { value: "users:edit", label: "Editar usuarios", category: "Usuarios", description: "Modificar datos" },
  { value: "users:delete", label: "Eliminar usuarios", category: "Usuarios", description: "Borrar usuarios" },
  { value: "users:assign_roles", label: "Asignar roles", category: "Usuarios", description: "Cambiar rol" },
  { value: "users:reset_password", label: "Reset contraseña", category: "Usuarios", description: "Restablecer" },
  { value: "users:ban", label: "Banear usuario", category: "Usuarios", description: "Bloquear acceso" },
  { value: "users:view_orders", label: "Ver sus pedidos", category: "Usuarios", description: "Historial compras" },
  { value: "users:view_activity", label: "Ver actividad", category: "Usuarios", description: "Historial actividad" },
  { value: "users:loyalty_points", label: "Puntos lealtad", category: "Usuarios", description: "Ajustar puntos" },
  { value: "users:send_email", label: "Enviar email", category: "Usuarios", description: "Contactar" },
  { value: "users:export", label: "Exportar", category: "Usuarios", description: "Descargar datos" },
  { value: "users:online_status", label: "Estado online", category: "Usuarios", description: "Ver en línea" },
  { value: "users:impersonate", label: "Suplantar usuario", category: "Usuarios", description: "Login as" },
  { value: "users:bulk_actions", label: "Acciones masivas", category: "Usuarios", description: "Cambios lote" },
  
  // ===== PERMISOS DE MARKETING (20 opciones) =====
  { value: "coupons:view", label: "Ver cupones", category: "Marketing - Cupones", description: "Listar" },
  { value: "coupons:create", label: "Crear cupones", category: "Marketing - Cupones", description: "Nuevos" },
  { value: "coupons:edit", label: "Editar cupones", category: "Marketing - Cupones", description: "Modificar" },
  { value: "coupons:delete", label: "Eliminar cupones", category: "Marketing - Cupones", description: "Borrar" },
  { value: "coupons:statistics", label: "Estadísticas cupones", category: "Marketing - Cupones", description: "Reportes" },
  { value: "giftcards:view", label: "Ver gift cards", category: "Marketing - Gift Cards", description: "Listar" },
  { value: "giftcards:create", label: "Crear gift cards", category: "Marketing - Gift Cards", description: "Nuevas" },
  { value: "giftcards:edit", label: "Editar gift cards", category: "Marketing - Gift Cards", description: "Modificar" },
  { value: "giftcards:delete", label: "Eliminar gift cards", category: "Marketing - Gift Cards", description: "Borrar" },
  { value: "giftcards:send", label: "Enviar gift cards", category: "Marketing - Gift Cards", description: "Email" },
  { value: "loyalty:view", label: "Ver programa", category: "Marketing - Lealtad", description: "Config lealtad" },
  { value: "loyalty:edit", label: "Editar programa", category: "Marketing - Lealtad", description: "Modificar" },
  { value: "loyalty:adjust_points", label: "Ajustar puntos", category: "Marketing - Lealtad", description: "Puntos usuarios" },
  { value: "loyalty:rewards", label: "Gestionar premios", category: "Marketing - Lealtad", description: "Recompensas" },
  { value: "seo:view", label: "Ver SEO", category: "Marketing - SEO", description: "Config SEO" },
  { value: "seo:edit", label: "Editar SEO", category: "Marketing - SEO", description: "Modificar" },
  { value: "seo:keywords", label: "Keywords", category: "Marketing - SEO", description: "Palabras clave" },
  { value: "seo:meta_tags", label: "Meta tags", category: "Marketing - SEO", description: "Tags páginas" },
  { value: "seo:redirects", label: "Redirecciones", category: "Marketing - SEO", description: "URLs" },
  { value: "seo:analytics", label: "Analytics", category: "Marketing - SEO", description: "Estadísticas" },
  
  // ===== PERMISOS DE CONTENIDO (22 opciones) =====
  { value: "blog:view", label: "Ver posts", category: "Contenido - Blog", description: "Listar" },
  { value: "blog:create", label: "Crear posts", category: "Contenido - Blog", description: "Nuevos" },
  { value: "blog:edit", label: "Editar posts", category: "Contenido - Blog", description: "Modificar" },
  { value: "blog:delete", label: "Eliminar posts", category: "Contenido - Blog", description: "Borrar" },
  { value: "blog:publish", label: "Publicar posts", category: "Contenido - Blog", description: "Activar" },
  { value: "blog:categories", label: "Categorías blog", category: "Contenido - Blog", description: "Clasificar" },
  { value: "pages:view", label: "Ver páginas", category: "Contenido - Páginas", description: "Listar" },
  { value: "pages:create", label: "Crear páginas", category: "Contenido - Páginas", description: "Nuevas" },
  { value: "pages:edit", label: "Editar páginas", category: "Contenido - Páginas", description: "Modificar" },
  { value: "pages:delete", label: "Eliminar páginas", category: "Contenido - Páginas", description: "Borrar" },
  { value: "pages:publish", label: "Publicar páginas", category: "Contenido - Páginas", description: "Activar" },
  { value: "gallery:view", label: "Ver galería", category: "Contenido - Galería", description: "Listar" },
  { value: "gallery:upload", label: "Subir imágenes", category: "Contenido - Galería", description: "Añadir" },
  { value: "gallery:edit", label: "Editar galería", category: "Contenido - Galería", description: "Modificar" },
  { value: "gallery:delete", label: "Eliminar galería", category: "Contenido - Galería", description: "Borrar" },
  { value: "pagebuilder:view", label: "Ver editor", category: "Contenido - Page Builder", description: "Acceder" },
  { value: "pagebuilder:edit", label: "Editar secciones", category: "Contenido - Page Builder", description: "Modificar" },
  { value: "pagebuilder:create", label: "Crear secciones", category: "Contenido - Page Builder", description: "Añadir" },
  { value: "pagebuilder:delete", label: "Eliminar secciones", category: "Contenido - Page Builder", description: "Borrar" },
  { value: "pagebuilder:templates", label: "Plantillas", category: "Contenido - Page Builder", description: "Gestionar" },
  { value: "pagebuilder:footer", label: "Editar footer", category: "Contenido - Page Builder", description: "Pie página" },
  { value: "pagebuilder:header", label: "Editar header", category: "Contenido - Page Builder", description: "Cabecera" },
  
  // ===== PERMISOS DE COMUNICACIÓN (16 opciones) =====
  { value: "messages:view", label: "Ver mensajes", category: "Comunicación", description: "Listar" },
  { value: "messages:respond", label: "Responder", category: "Comunicación", description: "Contestar" },
  { value: "messages:delete", label: "Eliminar mensajes", category: "Comunicación", description: "Borrar" },
  { value: "messages:archive", label: "Archivar", category: "Comunicación", description: "Guardar" },
  { value: "emails:view", label: "Ver campañas", category: "Comunicación - Emails", description: "Listar" },
  { value: "emails:create", label: "Crear campañas", category: "Comunicación - Emails", description: "Nuevas" },
  { value: "emails:send", label: "Enviar emails", category: "Comunicación - Emails", description: "Disparar" },
  { value: "emails:templates", label: "Plantillas email", category: "Comunicación - Emails", description: "Gestionar" },
  { value: "emails:statistics", label: "Estadísticas email", category: "Comunicación - Emails", description: "Reportes" },
  { value: "emails:automations", label: "Automatizaciones", category: "Comunicación - Emails", description: "Config auto" },
  { value: "reviews:view", label: "Ver reseñas", category: "Comunicación - Reseñas", description: "Listar" },
  { value: "reviews:approve", label: "Aprobar reseñas", category: "Comunicación - Reseñas", description: "Moderar" },
  { value: "reviews:respond", label: "Responder reseñas", category: "Comunicación - Reseñas", description: "Contestar" },
  { value: "reviews:delete", label: "Eliminar reseñas", category: "Comunicación - Reseñas", description: "Borrar" },
  { value: "notifications:send", label: "Enviar notificaciones", category: "Comunicación", description: "Push/in-app" },
  { value: "notifications:manage", label: "Gestionar notificaciones", category: "Comunicación", description: "Configurar" },
  
  // ===== PERMISOS DE CONFIGURACIÓN (25 opciones) =====
  { value: "settings:view", label: "Ver configuración", category: "Configuración", description: "Acceder" },
  { value: "settings:payments", label: "Config pagos", category: "Configuración", description: "Métodos pago" },
  { value: "settings:taxes", label: "Config IVA", category: "Configuración", description: "Impuestos" },
  { value: "settings:shipping", label: "Config envíos", category: "Configuración", description: "Zonas/tarifas" },
  { value: "settings:translations", label: "Traducciones", category: "Configuración", description: "Idiomas" },
  { value: "settings:backup", label: "Backups", category: "Configuración", description: "Respaldos" },
  { value: "settings:trash", label: "Papelera", category: "Configuración", description: "Recuperar" },
  { value: "settings:pins", label: "PINs admin", category: "Configuración", description: "Gestión PINs" },
  { value: "settings:customizer", label: "Personalizador", category: "Configuración", description: "Tema/colores" },
  { value: "settings:legal", label: "Páginas legales", category: "Configuración", description: "Términos" },
  { value: "settings:calculator", label: "Calculadora 3D", category: "Configuración", description: "Config cálculos" },
  { value: "settings:calibration", label: "Calibración", category: "Configuración", description: "Tests" },
  { value: "settings:discounts", label: "Descuentos cantidad", category: "Configuración", description: "Descuentos" },
  { value: "settings:statuses", label: "Estados pedidos", category: "Configuración", description: "Estados" },
  { value: "database:view", label: "Ver base de datos", category: "Configuración - Base de Datos", description: "Acceder" },
  { value: "database:query", label: "Ejecutar consultas", category: "Configuración - Base de Datos", description: "SELECT" },
  { value: "database:insert", label: "Insertar datos", category: "Configuración - Base de Datos", description: "INSERT" },
  { value: "database:update", label: "Actualizar datos", category: "Configuración - Base de Datos", description: "UPDATE" },
  { value: "database:delete", label: "Eliminar datos", category: "Configuración - Base de Datos", description: "DELETE" },
  { value: "database:export", label: "Exportar datos", category: "Configuración - Base de Datos", description: "Descargar" },
  { value: "database:create_table", label: "Crear tablas", category: "Configuración - Base de Datos", description: "Nuevas tablas" },
  { value: "database:alter_table", label: "Modificar tablas", category: "Configuración - Base de Datos", description: "Estructura" },
  { value: "database:drop_table", label: "Eliminar tablas", category: "Configuración - Base de Datos", description: "Borrar tablas" },
  { value: "database:backup", label: "Backup BD", category: "Configuración - Base de Datos", description: "Respaldo" },
  { value: "database:restore", label: "Restaurar BD", category: "Configuración - Base de Datos", description: "Recuperar" },
  
  // ===== PERMISOS DE REPORTES (12 opciones) =====
  { value: "reports:sales", label: "Reportes ventas", category: "Reportes", description: "Estadísticas" },
  { value: "reports:products", label: "Reportes productos", category: "Reportes", description: "Más vendidos" },
  { value: "reports:customers", label: "Reportes clientes", category: "Reportes", description: "Análisis" },
  { value: "reports:revenue", label: "Reportes ingresos", category: "Reportes", description: "Finanzas" },
  { value: "reports:traffic", label: "Reportes tráfico", category: "Reportes", description: "Visitantes" },
  { value: "reports:conversions", label: "Conversiones", category: "Reportes", description: "Tasa conv." },
  { value: "reports:export", label: "Exportar reportes", category: "Reportes", description: "Descargar" },
  { value: "reports:schedule", label: "Programar reportes", category: "Reportes", description: "Automáticos" },
  { value: "reports:dashboard", label: "Dashboard reportes", category: "Reportes", description: "Vista general" },
  { value: "reports:custom", label: "Reportes personalizados", category: "Reportes", description: "Custom" },
  { value: "reports:comparison", label: "Comparativas", category: "Reportes", description: "Períodos" },
  { value: "reports:forecasting", label: "Pronósticos", category: "Reportes", description: "Predicciones" },
  
  // ===== PERMISOS ESPECIALES (15 opciones) =====
  { value: "special:full_access", label: "Acceso completo", category: "Especiales", description: "Todo permitido" },
  { value: "special:admin_pin_bypass", label: "Sin PIN requerido", category: "Especiales", description: "Saltar PIN" },
  { value: "special:view_sensitive", label: "Ver datos sensibles", category: "Especiales", description: "PII, pagos" },
  { value: "special:audit_log", label: "Ver auditoría", category: "Especiales", description: "Historial acciones" },
  { value: "special:system_settings", label: "Config sistema", category: "Especiales", description: "Avanzado" },
  { value: "special:api_access", label: "Acceso API", category: "Especiales", description: "Endpoints" },
  { value: "special:webhooks", label: "Webhooks", category: "Especiales", description: "Configurar" },
  { value: "special:integrations", label: "Integraciones", category: "Especiales", description: "Terceros" },
  { value: "special:developer", label: "Modo desarrollador", category: "Especiales", description: "Debug" },
  { value: "special:maintenance", label: "Modo mantenimiento", category: "Especiales", description: "Activar/desactivar" },
  { value: "special:impersonate", label: "Suplantar usuarios", category: "Especiales", description: "Login as" },
  { value: "special:bulk_operations", label: "Operaciones masivas", category: "Especiales", description: "Bulk actions" },
  { value: "special:danger_zone", label: "Zona peligro", category: "Especiales", description: "Acciones críticas" },
  { value: "special:superadmin_access", label: "Acceso superadmin", category: "Especiales", description: "Todo sin restricción" },
  { value: "special:manage_admins", label: "Gestionar admins", category: "Especiales", description: "Otros admins" },
];

// Group permissions by category
export function getGroupedPermissions(): Record<string, PermissionOption[]> {
  const grouped: Record<string, PermissionOption[]> = {};
  for (const permission of allPermissions) {
    if (!grouped[permission.category]) {
      grouped[permission.category] = [];
    }
    grouped[permission.category].push(permission);
  }
  return grouped;
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
