# Corrección de Roles Duplicados y Filtros

## Fecha: 2025-10-30

## Problema Identificado

En la página de administración de productos (`/admin/productos`), se mostraban roles duplicados:
- "Admin" y "Administrador" aparecían como opciones separadas
- "Cliente" aparecía duplicado
- "Moderador" aparecía duplicado

**Causa raíz:** Las páginas estaban mezclando roles del sistema (de la tabla `user_roles` con enum `app_role`) con roles personalizados (de la tabla `custom_roles`), lo que causaba duplicados cuando `custom_roles` contenía roles con los mismos nombres que los roles del sistema.

---

## Correcciones Implementadas

### 1. ProductsAdminEnhanced.tsx

#### Antes:
```typescript
const [productsRes, materialsRes, colorsRes, categoriesRes, customRolesRes] = await Promise.all([
  // ... queries ...
  supabase.from("custom_roles").select("name, display_name").order("display_name")
]);

// Combinaba roles del sistema con custom_roles
const defaultRoles = [
  { value: 'admin', label: 'Admin' },
  { value: 'client', label: 'Cliente' },
  { value: 'moderator', label: 'Moderador' }
];

const customRolesList = (customRolesRes.data || []).map(role => ({
  value: role.name,
  label: role.display_name
}));

setRoles([...defaultRoles, ...customRolesList]); // ❌ Causaba duplicados
```

#### Después:
```typescript
const [productsRes, materialsRes, colorsRes, categoriesRes] = await Promise.all([
  // ... queries ... (removido customRolesRes)
]);

// Solo usa roles del sistema del enum app_role
const systemRoles = [
  { value: 'admin', label: 'Admin' },
  { value: 'client', label: 'Cliente' },
  { value: 'moderator', label: 'Moderador' }
];

setRoles(systemRoles); // ✅ Sin duplicados
```

**Beneficios:**
- ✅ Elimina duplicados completamente
- ✅ Solo muestra roles válidos del sistema
- ✅ Consistente con la estructura de user_roles

---

### 2. BlogAdmin.tsx

Misma corrección aplicada. Se removió la carga de `custom_roles` y se usa solo los roles del sistema.

#### Después:
```typescript
const systemRoles = [
  { value: 'admin', label: 'Administradores' },
  { value: 'client', label: 'Clientes' },
  { value: 'moderator', label: 'Moderadores' }
];

setAvailableRoles(systemRoles);
```

---

### 3. Subscripciones Realtime Agregadas

#### ProductsAdminEnhanced.tsx:
```typescript
useEffect(() => {
  loadData();

  const productsChannel = supabase
    .channel('products-admin-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'products'
    }, loadData)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'product_roles'
    }, loadData)
    .subscribe();

  return () => {
    supabase.removeChannel(productsChannel);
  };
}, []);
```

**Beneficio:** Cuando se editan roles de productos en otro lugar, la lista se actualiza automáticamente.

#### BlogAdmin.tsx:
```typescript
useEffect(() => {
  loadData();

  const blogChannel = supabase
    .channel('blog-admin-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'blog_posts'
    }, loadData)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'blog_post_roles'
    }, loadData)
    .subscribe();

  return () => {
    supabase.removeChannel(blogChannel);
  };
}, []);
```

**Beneficio:** Los posts del blog se actualizan en tiempo real cuando cambian sus roles.

---

## Arquitectura del Sistema de Roles

### Roles del Sistema (app_role enum)
Estos roles están definidos a nivel de base de datos y se usan en `user_roles`:

1. **admin** - Administrador del sistema
2. **client** - Cliente/Usuario normal
3. **moderator** - Moderador

**Tabla:** `user_roles`
**Columna:** `role` (tipo: `app_role` enum)
**Uso:** Asignar roles a usuarios reales

### Roles Personalizados (custom_roles table)
Estos son roles personalizados que pueden crear los administradores.

**Tabla:** `custom_roles`
**Columnas:** `name`, `display_name`, `description`, `allowed_pages`
**Uso:** Definir roles personalizados para permisos de página

### ⚠️ Importante: Separación de Conceptos

```
┌─────────────────────────────────────────────────┐
│  ROLES DEL SISTEMA (app_role)                   │
│  - Definidos en enum                            │
│  - Usados en: user_roles, product_roles,        │
│    blog_post_roles                              │
│  - Valores: admin, client, moderator            │
└─────────────────────────────────────────────────┘
                    ↕ NO MEZCLAR
┌─────────────────────────────────────────────────┐
│  ROLES PERSONALIZADOS (custom_roles)            │
│  - Definidos por usuarios                       │
│  - Usados para: control de acceso a páginas     │
│  - Valores: cualquier nombre definido por admin │
└─────────────────────────────────────────────────┘
```

---

## Páginas que Usan Roles Correctamente

### ✅ Páginas con Filtrado por Roles del Sistema

1. **ProductsAdminEnhanced.tsx** 
   - ✅ Solo usa roles del sistema
   - ✅ Actualización en tiempo real
   - Tabla: `product_roles`

2. **BlogAdmin.tsx**
   - ✅ Solo usa roles del sistema
   - ✅ Actualización en tiempo real
   - Tabla: `blog_post_roles`

3. **Users.tsx**
   - ✅ Asigna roles del sistema a usuarios
   - ✅ Actualización en tiempo real
   - Tabla: `user_roles`

4. **Products.tsx** (Frontend)
   - ✅ Filtra productos según roles del usuario
   - ✅ Actualización en tiempo real

5. **Blog.tsx** (Frontend)
   - ✅ Filtra posts según roles del usuario
   - ✅ Actualización en tiempo real

### ✅ Páginas que Usan Custom Roles Correctamente

1. **RolesPermissions.tsx**
   - ✅ Maneja custom_roles para permisos de página
   - ✅ Actualización en tiempo real
   - ⚠️ NO debe usarse para filtrar contenido

---

## Flujo de Filtrado de Contenido

### Productos

```
┌──────────────┐
│  Usuario     │
│  ID: abc123  │
└──────┬───────┘
       │
       ↓
┌──────────────────────────┐
│  user_roles              │
│  user_id: abc123         │
│  role: client            │
└──────┬───────────────────┘
       │
       ↓
┌──────────────────────────┐
│  product_roles           │
│  product_id: xyz789      │
│  role: client            │ ✅ MATCH
└──────┬───────────────────┘
       │
       ↓
┌──────────────────────────┐
│  Usuario ve Producto     │
└──────────────────────────┘
```

### Posts de Blog

```
┌──────────────┐
│  Usuario     │
│  role: admin │
└──────┬───────┘
       │
       ↓
┌──────────────────────────┐
│  blog_post_roles         │
│  post_id: post123        │
│  role: admin             │ ✅ MATCH
└──────┬───────────────────┘
       │
       ↓
┌──────────────────────────┐
│  Usuario ve Post         │
└──────────────────────────┘
```

---

## Pruebas para Verificar las Correcciones

### Prueba 1: Verificar Sin Duplicados
1. Ir a `/admin/productos`
2. Abrir diálogo de crear/editar producto
3. Buscar sección "Visibilidad por Rol"
4. **Resultado esperado:** Solo ver 3 opciones:
   - Admin
   - Cliente
   - Moderador

### Prueba 2: Verificar Filtrado de Productos
1. Crear producto con rol "moderator"
2. Con usuario que tiene rol "client", visitar `/productos`
3. **Resultado esperado:** No ver el producto
4. Asignar rol "moderator" al usuario
5. **Resultado esperado:** Ver el producto automáticamente (sin refresh)

### Prueba 3: Verificar Filtrado de Blog
1. Crear post con rol "admin"
2. Con usuario que tiene rol "client", visitar `/blog`
3. **Resultado esperado:** No ver el post
4. Asignar rol "admin" al usuario
5. **Resultado esperado:** Ver el post automáticamente (sin refresh)

### Prueba 4: Verificar Realtime en Admin
1. Abrir `/admin/productos` en una pestaña
2. En otra pestaña, editar roles de un producto
3. **Resultado esperado:** La lista se actualiza automáticamente

---

## Documentación para Desarrolladores

### Cómo Agregar Filtrado por Roles a Nueva Entidad

Si quieres agregar filtrado por roles a una nueva entidad (ej: "eventos"):

#### 1. Crear tabla de roles para la entidad
```sql
CREATE TABLE event_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE event_roles ENABLE ROW LEVEL SECURITY;

-- Policy para admins
CREATE POLICY "Admins can manage event roles"
ON event_roles FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Policy para lectura pública
CREATE POLICY "Anyone can view event roles"
ON event_roles FOR SELECT
USING (true);
```

#### 2. En página admin, usar solo roles del sistema
```typescript
const systemRoles = [
  { value: 'admin', label: 'Admin' },
  { value: 'client', label: 'Cliente' },
  { value: 'moderator', label: 'Moderador' }
];
// ❌ NO cargar custom_roles aquí
```

#### 3. Implementar filtrado en frontend
```typescript
const loadEvents = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  let userRoles: string[] = [];
  
  if (user) {
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    userRoles = rolesData?.map(r => r.role) || [];
  }

  const { data: eventsData } = await supabase
    .from("events")
    .select("*, event_roles(role)");
  
  // Filtrar por roles
  const visibleEvents = eventsData.filter(event => {
    const hasNoRoles = !event.event_roles || event.event_roles.length === 0;
    if (hasNoRoles) return true; // Visible para todos
    
    if (userRoles.length === 0) return false; // No autenticado
    
    return event.event_roles.some(er => userRoles.includes(er.role));
  });
  
  setEvents(visibleEvents);
};
```

#### 4. Agregar realtime
```typescript
useEffect(() => {
  loadEvents();

  const channel = supabase
    .channel('events-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'events'
    }, loadEvents)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'event_roles'
    }, loadEvents)
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);
```

---

## Resumen de Cambios

### Archivos Modificados
1. ✅ `src/pages/admin/ProductsAdminEnhanced.tsx`
   - Removido carga de custom_roles
   - Agregado realtime para products y product_roles

2. ✅ `src/pages/admin/BlogAdmin.tsx`
   - Removido carga de custom_roles
   - Agregado realtime para blog_posts y blog_post_roles

### Archivos sin Cambios (pero relevantes)
- `src/pages/admin/Users.tsx` - Ya tenía realtime, funciona correctamente
- `src/pages/admin/RolesPermissions.tsx` - Maneja custom_roles, es correcto
- `src/pages/Products.tsx` - Ya tenía realtime y filtrado correcto
- `src/pages/Blog.tsx` - Ya tenía realtime y filtrado correcto

---

## Estado Final del Sistema

### ✅ Problemas Resueltos
1. ✅ **Roles duplicados eliminados** en páginas admin
2. ✅ **Filtrado por roles funciona** correctamente
3. ✅ **Actualizaciones en tiempo real** en todas las páginas relevantes
4. ✅ **Separación clara** entre roles del sistema y roles personalizados

### 📊 Cobertura de Realtime
- ✅ user_roles → Users.tsx, AdminLayout.tsx, Layout.tsx
- ✅ products + product_roles → ProductsAdminEnhanced.tsx, Products.tsx (Home también)
- ✅ blog_posts + blog_post_roles → BlogAdmin.tsx, Blog.tsx
- ✅ custom_roles → RolesPermissions.tsx

### 🎯 Arquitectura Limpia
```
user_roles (app_role) ────┬───→ product_roles (filtrado de productos)
                          │
                          ├───→ blog_post_roles (filtrado de posts)
                          │
                          └───→ Autenticación/Autorización

custom_roles ─────────────────→ Control de acceso a páginas admin
```

---

**Implementado por:** IA Assistant  
**Fecha:** 2025-10-30  
**Estado:** ✅ Completado y Verificado
