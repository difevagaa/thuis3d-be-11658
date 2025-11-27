# Diagnóstico Profundo del Sistema de Roles

## Fecha
30 de Octubre de 2025 - Análisis Exhaustivo

## Hallazgos de la Base de Datos

### Estado Actual del Producto
```sql
SELECT p.id, p.name, p.visible_to_all,
  json_agg(json_build_object('role', pr.role)) as product_roles_detail
FROM products p
LEFT JOIN product_roles pr ON p.id = pr.product_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.visible_to_all
```

**Resultado:**
```
id: ce4c275f-4755-4d48-8fe2-edb30457ba6f
name: Llavero Elefante Esqueleto 3D - Diseño Único y Resistente en PLA
visible_to_all: false
product_roles_detail: [{"role": null}]
```

### Estado de los Roles de Usuario
```sql
SELECT u.email, ur.role, pg_typeof(ur.role) as role_type
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
```

**Resultado:**
```
email: difevaga@outlook.com, role: admin, role_type: app_role
email: tr20015@gmail.com, role: client, role_type: app_role
```

### Estado de product_roles
```sql
SELECT role, pg_typeof(role) as role_type FROM product_roles LIMIT 5
```

**Resultado:**
```
(vacío - no hay registros)
```

## Problema Identificado

### EL PROBLEMA REAL: Los Roles NO se Están Guardando

**Síntomas:**
1. ✅ El producto se guarda correctamente
2. ✅ `visible_to_all` se establece en `false` cuando se seleccionan roles
3. ❌ **PERO** los registros NO se insertan en `product_roles`
4. ❌ Como resultado, el producto tiene `visible_to_all=false` pero NO tiene roles asignados
5. ❌ La lógica de filtrado dice: "si no tiene roles y visible_to_all=false, no mostrar"
6. ❌ Por eso el cliente NO puede ver el producto

### Teoría sobre la Causa

El problema probablemente está en uno de estos lugares:

1. **Estado `selectedRoles` vacío**: Los checkboxes no están actualizando correctamente el estado
2. **Error silencioso en INSERT**: El insert a product_roles falla pero no se muestra el error
3. **Incompatibilidad de tipos**: El tipo `text` de product_roles vs `app_role` de user_roles
4. **Lógica de checkbox**: El onChange no está funcionando correctamente

## Solución Implementada

### 1. Logs Exhaustivos en ProductsAdminEnhanced

He agregado logs detallados en `handleSubmit()` para rastrear cada paso:

```typescript
console.log('[ProductsAdmin] === INICIO DE GUARDADO ===');
console.log('[ProductsAdmin] Selected roles:', selectedRoles);
console.log('[ProductsAdmin] Inserting roles...', selectedRoles);
console.log('[ProductsAdmin] Roles to insert:', rolesToInsert);
console.log('[ProductsAdmin] Roles inserted successfully:', insertedRoles);
console.log('[ProductsAdmin] Error inserting roles:', rolesError);
```

Estos logs nos dirán EXACTAMENTE:
- ¿Qué roles están seleccionados antes de guardar?
- ¿Se está intentando insertar los roles?
- ¿El insert es exitoso o falla?
- ¿Qué error específico ocurre si falla?

### 2. Manejo de Errores Mejorado

```typescript
const { data: insertedRoles, error: rolesError } = await supabase
  .from("product_roles")
  .insert(rolesToInsert)
  .select();

if (rolesError) {
  console.error('[ProductsAdmin] Error inserting roles:', rolesError);
} else {
  console.log('[ProductsAdmin] Roles inserted successfully:', insertedRoles);
}
```

Ahora capturamos y mostramos cualquier error que ocurra durante el insert.

## Próximos Pasos para el Usuario

### Paso 1: Crear/Editar un Producto con Roles
1. Ir a Admin → Productos
2. Crear un nuevo producto o editar uno existente
3. Seleccionar el checkbox "Cliente" en "Visibilidad por Rol"
4. Hacer clic en "Guardar"
5. **Abrir la consola del navegador (F12)**

### Paso 2: Revisar los Logs en Consola

Buscar logs que empiecen con `[ProductsAdmin]`:

**Si todo funciona correctamente, deberías ver:**
```
[ProductsAdmin] === INICIO DE GUARDADO ===
[ProductsAdmin] Selected roles: ["client"]
[ProductsAdmin] visible_to_all will be: false
[ProductsAdmin] Updating product: xxx
[ProductsAdmin] Deleting existing associations...
[ProductsAdmin] Inserting roles... ["client"]
[ProductsAdmin] Roles to insert: [{product_id: "xxx", role: "client"}]
[ProductsAdmin] Roles inserted successfully: [{id: "yyy", product_id: "xxx", role: "client"}]
[ProductsAdmin] === FIN DE GUARDADO ===
```

**Si hay un problema, verás:**
```
[ProductsAdmin] === INICIO DE GUARDADO ===
[ProductsAdmin] Selected roles: []  ← PROBLEMA: debería tener valores
```
O:
```
[ProductsAdmin] Error inserting roles: {code: "xxx", message: "xxx"}  ← PROBLEMA: error en insert
```

### Paso 3: Verificar en Base de Datos

Después de guardar, verificar con esta consulta:
```sql
SELECT p.name, p.visible_to_all, 
  ARRAY_AGG(pr.role) as roles
FROM products p
LEFT JOIN product_roles pr ON p.id = pr.product_id
WHERE p.name = 'TU_PRODUCTO'
GROUP BY p.name, p.visible_to_all
```

**Resultado esperado:**
```
name: Tu Producto
visible_to_all: false
roles: ["client"]
```

### Paso 4: Probar Visualización

1. Cerrar sesión del admin
2. Iniciar sesión como cliente (tr20015@gmail.com)
3. Navegar a `/` o `/productos`
4. **Abrir la consola (F12)**
5. Buscar logs que empiecen con `[Home]` o `[Products]`

**Logs esperados:**
```
[Products] User roles: ["client"]
[Products] Raw products data: [{...}]
[Products] Checking product: Tu Producto {visible_to_all: false, product_roles: [{role: "client"}], user_roles: ["client"]}
[Products] Product Tu Producto normalized roles: ["client"]
[Products] Product Tu Producto role match: true
```

## Posibles Problemas y Soluciones

### Problema 1: selectedRoles está vacío
**Causa**: Los checkboxes no actualizan el estado
**Solución**: Verificar que el onClick del checkbox funciona correctamente
**Log esperado**: `[ProductsAdmin] Selected roles: []`

### Problema 2: Error al insertar roles
**Causa**: Problema de permisos RLS o tipo de dato
**Solución**: Verificar políticas RLS en product_roles
**Log esperado**: `[ProductsAdmin] Error inserting roles: {...}`

### Problema 3: Roles se insertan pero no se cargan
**Causa**: Problema en la consulta SELECT de productos
**Solución**: Verificar que la consulta incluye product_roles
**Log esperado**: `[Products] Raw products data` no incluye product_roles

### Problema 4: Normalización incorrecta
**Causa**: Los roles no coinciden después de normalizar
**Solución**: Verificar que ambos lados normalizan igual
**Log esperado**: `[Products] Product X role match: false`

## Diferencias de Tipos de Datos

### user_roles.role
- **Tipo**: `app_role` (enum)
- **Valores permitidos**: 'admin', 'client', 'moderator'
- **Restricción**: Solo acepta estos valores

### product_roles.role
- **Tipo**: `text`
- **Valores permitidos**: Cualquier string
- **Flexibilidad**: Permite roles personalizados

### Normalización Aplicada
En ambos casos, se normaliza a:
```typescript
String(role || '').trim().toLowerCase()
```

Esto asegura que 'client' (enum) y 'client' (text) coincidan correctamente.

## Arquitectura del Sistema

```
Admin selecciona roles →
  ↓
  selectedRoles state = ["client"]
  ↓
  handleSubmit() ejecuta
  ↓
  UPDATE products SET visible_to_all = false
  ↓
  DELETE FROM product_roles WHERE product_id = X
  ↓
  INSERT INTO product_roles (product_id, role) VALUES (X, 'client')
  ↓
  Cliente navega a /productos
  ↓
  SELECT * FROM products ... product_roles(role)
  ↓
  Filtrar donde:
    - visible_to_all = true → MOSTRAR
    - producto tiene roles → verificar coincidencia
    - user roles incluye product role → MOSTRAR
```

## Conclusión Temporal

Con los logs implementados, ahora podemos:
1. ✅ Ver exactamente qué roles se están seleccionando
2. ✅ Verificar si el insert se ejecuta
3. ✅ Capturar cualquier error que ocurra
4. ✅ Rastrear todo el flujo de guardado
5. ✅ Diagnosticar dónde exactamente falla el proceso

**Siguiente acción requerida del usuario:**
1. Crear o editar un producto
2. Seleccionar el rol "Cliente"
3. Guardar
4. Compartir los logs de la consola que empiezan con `[ProductsAdmin]`

Con esa información, podremos identificar la causa raíz exacta del problema.
