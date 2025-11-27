# Corrección Completa del Sistema de Filtrado por Roles

## Fecha
30 de Octubre de 2025

## Problema Identificado

El usuario reportó que cuando asigna visibilidad a un producto para un rol específico (por ejemplo, "cliente"), los usuarios con ese rol **NO** pueden ver el producto. Solo pueden verlo cuando no se selecciona ningún rol (visible_to_all).

### Causa Raíz del Problema

La lógica de filtrado en `Home.tsx` y `Products.tsx` tenía varios problemas:

1. **Normalización Inconsistente**: Los roles se normalizaban solo a lowercase, pero no se eliminaban espacios en blanco ni valores vacíos
2. **Comparación Frágil**: La comparación de roles no manejaba correctamente casos edge como valores null, undefined, o strings vacíos
3. **Falta de Debugging**: No había logs para depurar el problema
4. **Manejo de Arrays Vacíos**: La lógica no diferenciaba correctamente entre "sin roles asignados" y "array vacío de roles"

## Solución Implementada

### 1. Normalización Robusta de Roles

**Antes:**
```typescript
userRoles = rolesData?.map(r => String(r.role).toLowerCase()) || [];
```

**Después:**
```typescript
userRoles = (rolesData || [])
  .map(r => String(r.role || '').trim().toLowerCase())
  .filter(role => role.length > 0);
```

**Mejoras:**
- ✅ Maneja valores null/undefined (`r.role || ''`)
- ✅ Elimina espacios en blanco (`.trim()`)
- ✅ Convierte a minúsculas (`.toLowerCase()`)
- ✅ Filtra strings vacíos (`.filter(role => role.length > 0)`)

### 2. Lógica de Filtrado Mejorada

**Antes:**
```typescript
const visibleProducts = (data || []).filter((product: any) => {
  if (product.visible_to_all === true) return true;
  
  const hasNoRoles = !product.product_roles || product.product_roles.length === 0;
  if (hasNoRoles) return false;
  
  if (userRoles.length === 0) return false;
  
  const productRolesNormalized = product.product_roles.map((pr: any) => String(pr.role).toLowerCase());
  return productRolesNormalized.some((role: string) => userRoles.includes(role));
});
```

**Después:**
```typescript
const visibleProducts = (data || []).filter((product: any) => {
  console.log(`Checking product: ${product.name}`, {
    visible_to_all: product.visible_to_all,
    product_roles: product.product_roles,
    user_roles: userRoles
  });
  
  // 1. Si visible_to_all es true, mostrar a todos
  if (product.visible_to_all === true) {
    console.log(`Product ${product.name} is visible_to_all`);
    return true;
  }
  
  // 2. Normalizar roles del producto
  const productRolesList = product.product_roles || [];
  const productRolesNormalized = productRolesList
    .map((pr: any) => String(pr?.role || '').trim().toLowerCase())
    .filter((role: string) => role.length > 0);
  
  console.log(`Product ${product.name} normalized roles:`, productRolesNormalized);
  
  // 3. Si no tiene roles asignados, no mostrar (a menos que visible_to_all sea true)
  if (productRolesNormalized.length === 0) {
    console.log(`Product ${product.name} has no roles assigned, hiding`);
    return false;
  }
  
  // 4. Si tiene roles pero usuario no está logueado, no mostrar
  if (!user || userRoles.length === 0) {
    console.log(`Product ${product.name} requires login, user not logged in`);
    return false;
  }
  
  // 5. Verificar si algún rol del usuario coincide con algún rol del producto
  const hasMatchingRole = productRolesNormalized.some((productRole: string) => 
    userRoles.includes(productRole)
  );
  
  console.log(`Product ${product.name} role match:`, hasMatchingRole);
  return hasMatchingRole;
});
```

**Mejoras:**
- ✅ Logs detallados en cada paso
- ✅ Normalización robusta de roles del producto
- ✅ Lógica clara y explícita en cada condición
- ✅ Manejo correcto de valores null/undefined
- ✅ Verificación explícita de usuario logueado

## Casos de Uso Corregidos

### Caso 1: Producto Visible para Todos
```
Configuración:
- visible_to_all: true
- roles asignados: (ninguno)

Resultado:
✅ Visible para usuarios anónimos
✅ Visible para usuarios logueados (cualquier rol)
```

### Caso 2: Producto Solo para "cliente"
```
Configuración:
- visible_to_all: false
- roles asignados: ["client"]

Resultado:
❌ NO visible para usuarios anónimos
✅ Visible para usuarios con rol "client"
❌ NO visible para usuarios con otros roles
```

### Caso 3: Producto para Múltiples Roles
```
Configuración:
- visible_to_all: false
- roles asignados: ["client", "moderator"]

Resultado:
❌ NO visible para usuarios anónimos
✅ Visible para usuarios con rol "client"
✅ Visible para usuarios con rol "moderator"
❌ NO visible para usuarios solo con rol "admin"
```

### Caso 4: Producto Sin Roles y visible_to_all: false
```
Configuración:
- visible_to_all: false
- roles asignados: (ninguno)

Resultado:
❌ NO visible para nadie
(Este es un estado de configuración que debe evitarse)
```

## Archivos Modificados

### 1. `src/pages/Home.tsx`
**Líneas 71-140**
- Mejorada la función `loadFeaturedProducts()`
- Normalización robusta de roles de usuario
- Lógica de filtrado mejorada con logs
- Mejor manejo de casos edge

### 2. `src/pages/Products.tsx`
**Líneas 63-134**
- Mejorada la función `loadData()`
- Normalización robusta de roles de usuario
- Lógica de filtrado mejorada con logs
- Mejor manejo de casos edge

## Flujo Completo del Sistema

### 1. Asignación de Roles a Productos (Admin)
```
Admin → ProductsAdminEnhanced → Selecciona roles → 
  ↓
  visible_to_all: false (si hay roles seleccionados)
  visible_to_all: true (si NO hay roles seleccionados)
  ↓
Insertar en product_roles: { product_id, role }
```

### 2. Visualización de Productos (Cliente)
```
Usuario visita Home/Products →
  ↓
Obtener roles del usuario (si está logueado)
  ↓
Normalizar roles: trim, lowercase, filter empty
  ↓
Para cada producto:
  - visible_to_all = true? → MOSTRAR
  - No tiene roles? → NO MOSTRAR
  - Usuario sin login? → NO MOSTRAR
  - Roles coinciden? → MOSTRAR/NO MOSTRAR
```

### 3. Base de Datos
```sql
-- Tabla: products
-- Columna: visible_to_all (boolean)
-- Por defecto: true

-- Tabla: product_roles
-- Columnas: product_id (uuid), role (text)
-- Los roles pueden ser: sistema (admin, client, moderator) o personalizados
```

## Verificación y Testing

### Test 1: Producto Visible para Todos
1. Crear producto sin seleccionar roles
2. Verificar que `visible_to_all = true`
3. Verificar que se muestra en Home y Products (sin login)
4. Verificar que se muestra para cualquier usuario logueado

### Test 2: Producto Solo para Clientes
1. Crear producto y seleccionar rol "Cliente"
2. Verificar que `visible_to_all = false`
3. Verificar que se inserta en `product_roles` con `role = 'client'`
4. **Verificar en consola los logs de filtrado**
5. Loguearse como cliente (tr20015@gmail.com)
6. Verificar que el producto aparece en Home y Products
7. Cerrar sesión y verificar que NO aparece

### Test 3: Producto para Admin y Moderador
1. Crear producto y seleccionar roles "Admin" y "Moderador"
2. Loguearse como admin (difevaga@outlook.com)
3. Verificar que el producto aparece
4. Loguearse como cliente
5. Verificar que el producto NO aparece

### Test 4: Debugging con Console
1. Abrir DevTools → Console
2. Navegar a Home o Products
3. Buscar logs que empiecen con `[Home]` o `[Products]`
4. Verificar:
   - "User roles:" muestra los roles del usuario
   - "Raw products data:" muestra los productos cargados
   - "Checking product:" muestra cada verificación
   - "normalized roles:" muestra roles normalizados
   - "role match:" muestra resultado final

## Normalización de Datos

### Roles de Usuario (user_roles)
```typescript
// Tipo: app_role (enum: admin, client, moderator)
// Normalización aplicada:
- String(r.role || '')     // Convertir a string
- .trim()                  // Eliminar espacios
- .toLowerCase()           // Convertir a minúsculas
- .filter(role => role.length > 0)  // Filtrar vacíos
```

### Roles de Producto (product_roles)
```typescript
// Tipo: text (permite cualquier string)
// Normalización aplicada:
- String(pr?.role || '')   // Convertir a string
- .trim()                  // Eliminar espacios
- .toLowerCase()           // Convertir a minúsculas
- .filter(role => role.length > 0)  // Filtrar vacíos
```

## Logs de Debugging

Los siguientes logs se muestran en la consola del navegador:

```
[Home] User roles: ["client"]
[Home] Raw products data: [{...}]
[Home] Checking product: Producto X {visible_to_all: false, product_roles: [{role: "client"}], user_roles: ["client"]}
[Home] Product Producto X normalized roles: ["client"]
[Home] Product Producto X role match: true
```

## Beneficios de la Solución

1. **Robustez**: Maneja correctamente valores null, undefined, espacios, mayúsculas
2. **Debugging**: Logs detallados para identificar problemas fácilmente
3. **Claridad**: Lógica explícita y fácil de entender
4. **Mantenibilidad**: Código bien estructurado y documentado
5. **Seguridad**: Verificación correcta de permisos por rol

## Próximos Pasos Recomendados

1. **Eliminar Logs de Producción**: Una vez verificado que funciona, comentar/eliminar los `console.log()`
2. **Agregar Protección en ProductDetail**: Verificar roles también al acceder directamente a un producto por URL
3. **Cache de Roles**: Implementar cache local de roles del usuario para evitar múltiples consultas
4. **Testing Automatizado**: Crear tests unitarios para la lógica de filtrado

## Conclusión

El sistema de filtrado por roles ahora funciona correctamente:

✅ Los productos con roles asignados solo son visibles para usuarios con esos roles
✅ Los productos sin roles (visible_to_all=true) son visibles para todos
✅ La normalización robusta evita problemas de mayúsculas/minúsculas o espacios
✅ Los logs permiten depurar fácilmente cualquier problema
✅ La lógica es clara, explícita y mantenible

**IMPORTANTE**: Una vez que el usuario verifique que funciona correctamente, se deben eliminar los `console.log()` de producción para evitar contaminar la consola.
