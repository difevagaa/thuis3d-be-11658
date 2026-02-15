# Solución al Problema de Creación de Pedidos - Febrero 2026

## 🚨 Problema Reportado
Al seleccionar una cotización como "Aprobada", el sistema mostraba el error:
```
Error en automación: Edge Function returned a non-2xx status code. 
Por favor, crea la factura y pedido manualmente
```

## ✅ Causa Raíz Identificada
El código en `supabase/functions/process-quote-approval/index.ts` intentaba insertar un campo `admin_notes` en la tabla `orders` que **no existe** en la base de datos actual.

### Código Problemático (líneas 213-217, 296-297):
```typescript
// Búsqueda usaba admin_notes
const quoteMarker = `quote_id:${quote_id}`;
const { data: existingOrder } = await supabase
  .from('orders')
  .select('id, order_number')
  .ilike('admin_notes', `%${quoteMarker}%`)  // ❌ Campo no existe
  .maybeSingle();

// INSERT incluía admin_notes
.insert({
  // ... otros campos ...
  notes: `Pedido generado automáticamente desde la cotización ${quote.quote_type}`,
  admin_notes: quoteMarker,  // ❌ Campo no existe
  // ... más campos ...
})
```

### Resultado del Error:
El INSERT fallaba con un error SQL porque `admin_notes` no es una columna válida en la tabla `orders`, causando que:
- La factura se creara correctamente ✓
- El pedido NO se creara ✗
- Se mostrara el error al usuario

## 🔧 Solución Implementada

### 1. Eliminación de Dependencia de `admin_notes`
Se modificó el código para usar **solo el campo `notes`** que sí existe en la tabla `orders`.

### 2. Consolidación en Campo `notes`
Se incluyó el marcador de cotización dentro del campo `notes` con un formato estructurado:

```typescript
// Nuevo marcador más visible
const quoteMarker = `[QUOTE:${quote_id}]`;

// Búsqueda actualizada
const { data: existingOrder } = await supabase
  .from('orders')
  .select('id, order_number')
  .ilike('notes', `%${quoteMarker}%`)  // ✓ Usa campo existente
  .maybeSingle();

// INSERT actualizado
.insert({
  // ... otros campos ...
  notes: `${quoteMarker}\n\nPedido generado automáticamente desde la cotización ${quote.quote_type}`,
  // admin_notes eliminado ✓
  // ... más campos ...
})
```

### 3. Formato Mejorado
El campo `notes` ahora tiene un formato estructurado:
```
[QUOTE:uuid-de-la-cotizacion]

Pedido generado automáticamente desde la cotización tipo_cotizacion
```

Esto permite:
- Identificar fácilmente los pedidos generados desde cotizaciones
- Mantener legibilidad para humanos
- Facilitar búsquedas programáticas

## 📊 Cambios Específicos

### Archivo: `supabase/functions/process-quote-approval/index.ts`

1. **Línea 213**: Cambio de formato del marcador
   - Antes: `quote_id:${quote_id}`
   - Después: `[QUOTE:${quote_id}]`

2. **Línea 217**: Cambio de campo de búsqueda
   - Antes: `.ilike('admin_notes', ...)`
   - Después: `.ilike('notes', ...)`

3. **Línea 296**: Consolidación del marcador en `notes`
   - Antes: Dos campos separados (`notes` y `admin_notes`)
   - Después: Un solo campo `notes` con formato estructurado

## ✨ Resultado Esperado

### Antes (❌)
```
Usuario aprueba cotización
  ↓
Edge Function ejecuta
  ↓
Crea factura ✓
  ↓
Intenta crear pedido
  ↓
INSERT falla: column "admin_notes" does not exist
  ↓
Error 500 al usuario
  ↓
Pedido NO creado
```

### Después (✅)
```
Usuario aprueba cotización
  ↓
Edge Function ejecuta
  ↓
Crea factura ✓
  ↓
Crea pedido ✓
  ↓
Éxito 200 al usuario
  ↓
Pedido creado exitosamente
```

## 🔐 Validaciones Realizadas

- ✅ **Code Review**: Sin comentarios - código aprobado
- ✅ **CodeQL Security Scan**: 0 alertas de seguridad
- ✅ **Cumplimiento de restricciones**: No se crearon nuevas tablas
- ✅ **Compatibilidad**: Usa solo campos existentes en la base de datos
- ✅ **Retrocompatibilidad**: Los pedidos existentes no se ven afectados

## 🚀 Impacto

### Beneficios:
1. Los pedidos ahora se crean automáticamente al aprobar cotizaciones
2. No se requiere creación manual de pedidos por parte del admin
3. El flujo de trabajo está completamente automatizado
4. Mejor experiencia de usuario

### Sin Efectos Secundarios:
- No afecta pedidos existentes
- No requiere migraciones de base de datos
- No modifica el esquema de la base de datos
- Compatible con el código existente

## 📝 Notas Técnicas

- **No se crearon nuevas tablas**: Como se solicitó, la solución usa solo la estructura existente
- **Campo `notes` suficiente**: El campo `notes` ya existente es suficiente para almacenar tanto el marcador como el mensaje
- **Búsqueda eficiente**: El operador `ILIKE` permite buscar el marcador sin importar mayúsculas/minúsculas
- **Formato estructurado**: El marcador `[QUOTE:uuid]` es fácilmente identificable y parseable

## 🎯 Estado
**✓ COMPLETADO Y LISTO PARA PRODUCCIÓN**

Los cambios han sido:
- Implementados ✓
- Revisados ✓
- Verificados por seguridad ✓
- Documentados ✓
- Comprometidos al repositorio ✓

## 📌 Archivos Modificados
- `supabase/functions/process-quote-approval/index.ts` (4 líneas cambiadas, 1 línea removida)

Total de cambios: **Mínimo y quirúrgico** ✓
