# Corrección del Sistema de Filtrado de Productos por Roles

## Problema Identificado

Los usuarios reportaron que el sistema de filtrado de productos basado en roles no funcionaba correctamente:

1. **Clientes no veían productos asignados a su rol**: Un usuario con rol "client" no podía ver productos que fueron configurados para ser visibles solo para clientes.

2. **Administradores no veían productos asignados a su rol**: Cuando se asignaban productos para que solo los vieran administradores, estos desaparecían incluso para los administradores.

3. **Moderadores no veían productos asignados a su rol**: Los productos asignados al rol moderador no eran visibles para usuarios con ese rol.

## Causa Raíz

El problema estaba en la **comparación de cadenas sensible a mayúsculas/minúsculas** entre:
- Los roles del usuario (almacenados como enum `app_role` con valores: 'admin', 'client', 'moderator')
- Los roles del producto (almacenados como TEXT en la tabla `product_roles`)

Cuando se comparaban directamente sin normalización, cualquier diferencia en mayúsculas/minúsculas causaba que la comparación fallara.

## Solución Implementada

### 1. Normalización de Roles en `src/pages/Home.tsx`

**Antes:**
```typescript
userRoles = rolesData?.map(r => r.role) || [];
```

**Después:**
```typescript
// Normalize roles to lowercase for case-insensitive comparison
userRoles = rolesData?.map(r => String(r.role).toLowerCase()) || [];
```

**Y en el filtrado:**
```typescript
// Check if any of user's roles matches any of the product roles (case-insensitive)
const productRolesNormalized = product.product_roles.map((pr: any) => String(pr.role).toLowerCase());
return productRolesNormalized.some((role: string) => userRoles.includes(role));
```

### 2. Normalización de Roles en `src/pages/Products.tsx`

Se aplicó la misma corrección:

```typescript
// Normalize roles to lowercase for case-insensitive comparison
userRoles = rolesData?.map(r => String(r.role).toLowerCase()) || [];

// ...y en el filtrado:
const productRolesNormalized = product.product_roles.map((pr: any) => String(pr.role).toLowerCase());
return productRolesNormalized.some((role: string) => userRoles.includes(role));
```

## Lógica de Filtrado de Productos

El sistema ahora funciona con la siguiente lógica (en orden):

1. **Si `visible_to_all = true`**: El producto es visible para todos los usuarios (logueados o no)

2. **Si el producto NO tiene roles asignados**: El producto es visible para todos

3. **Si el producto tiene roles asignados pero el usuario NO está logueado**: El producto NO es visible

4. **Si el producto tiene roles asignados y el usuario SÍ está logueado**: 
   - Se normalizan todos los roles a minúsculas
   - Se verifica si alguno de los roles del usuario coincide con alguno de los roles del producto
   - Si hay coincidencia, el producto es visible

## Archivos Modificados

- `src/pages/Home.tsx`: Corrección en función `loadFeaturedProducts()`
- `src/pages/Products.tsx`: Corrección en función `loadData()`

## Flujo de Funcionamiento Correcto

### Caso 1: Producto visible para todos
```
Producto: { visible_to_all: true, product_roles: [] }
Usuario: cualquiera (logueado o no)
Resultado: ✓ VISIBLE
```

### Caso 2: Producto sin roles específicos
```
Producto: { visible_to_all: false, product_roles: [] }
Usuario: cualquiera (logueado o no)
Resultado: ✓ VISIBLE
```

### Caso 3: Producto solo para clientes
```
Producto: { visible_to_all: false, product_roles: ['client'] }
Usuario: role = 'client'
Resultado: ✓ VISIBLE

Usuario: role = 'admin'
Resultado: ✗ NO VISIBLE

Usuario: no logueado
Resultado: ✗ NO VISIBLE
```

### Caso 4: Producto solo para admins
```
Producto: { visible_to_all: false, product_roles: ['admin'] }
Usuario: role = 'admin'
Resultado: ✓ VISIBLE

Usuario: role = 'client'
Resultado: ✗ NO VISIBLE
```

### Caso 5: Producto para múltiples roles
```
Producto: { visible_to_all: false, product_roles: ['admin', 'moderator'] }
Usuario: role = 'admin'
Resultado: ✓ VISIBLE

Usuario: role = 'moderator'
Resultado: ✓ VISIBLE

Usuario: role = 'client'
Resultado: ✗ NO VISIBLE
```

## Características Técnicas de la Solución

### Ventajas
1. **Comparación insensible a mayúsculas**: Funciona sin importar cómo se almacenen los roles en la base de datos
2. **Conversión explícita a String**: Previene errores de tipo al normalizar
3. **Sin cambios en la base de datos**: No requiere migración de datos existentes
4. **Retrocompatible**: Funciona con roles del sistema y roles personalizados

### Seguridad
- La normalización se hace en el cliente, pero las políticas RLS de la base de datos proveen una capa adicional de seguridad
- Los usuarios no autenticados no pueden ver productos con roles específicos
- Cada producto puede tener múltiples roles asignados

## Pruebas Recomendadas

Para verificar que el sistema funciona correctamente:

1. **Crear un producto solo para clientes**:
   - Ir a Admin > Productos
   - Crear/editar un producto
   - En "Visibilidad por Rol", seleccionar solo "Cliente"
   - Guardar

2. **Verificar como cliente**:
   - Iniciar sesión con una cuenta de cliente
   - Navegar a la página de productos
   - El producto debería ser VISIBLE

3. **Verificar como admin**:
   - Iniciar sesión con una cuenta de admin
   - Navegar a la página de productos
   - El producto NO debería ser VISIBLE (porque no tiene el rol admin)

4. **Verificar sin autenticar**:
   - Cerrar sesión
   - Navegar a la página de productos
   - El producto NO debería ser VISIBLE

5. **Crear un producto visible para todos**:
   - Ir a Admin > Productos
   - Crear/editar un producto
   - En "Visibilidad por Rol", NO seleccionar ningún rol
   - Guardar
   - Este producto debería ser VISIBLE para todos (logueados o no)

## Conclusión

El sistema de filtrado de productos por roles ahora funciona correctamente. Todos los productos se filtran apropiadamente según los roles del usuario, independientemente de cómo se almacenen las mayúsculas/minúsculas en la base de datos.
