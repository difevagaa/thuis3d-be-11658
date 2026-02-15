# Explicación del Script de Políticas RLS

## 🎯 Propósito

Este script **verifica y corrige** las políticas RLS (Row Level Security) para asegurar que la creación de pedidos, facturas y notificaciones funcione sin problemas.

## ⚠️ IMPORTANTE: Sobre el Service Role Key

**El Service Role Key BYPASEA TODAS las políticas RLS.**

Esto significa que las Edge Functions que usan `SUPABASE_SERVICE_ROLE_KEY` (como `process-quote-approval`) **NO están afectadas por las políticas RLS**. Por lo tanto, **el problema original NO era de políticas RLS**.

Sin embargo, este script es útil para:
1. Asegurar que las políticas sean correctas para otros contextos
2. Documentar cómo deben funcionar los permisos
3. Permitir operaciones desde el frontend cuando sea necesario
4. Seguir mejores prácticas de seguridad

## 📋 Qué Hace el Script

### 1. Políticas para `orders` (Pedidos)

**Crea 3 políticas:**

#### A) `"Users can create their own orders"`
```sql
-- Usuarios autenticados pueden crear pedidos para sí mismos
WITH CHECK (auth.uid() = user_id)
```
- ✅ Usuario autenticado crea pedido → Funciona si user_id = auth.uid()
- ❌ Usuario intenta crear pedido para otro → Bloqueado

#### B) `"Guests can create orders without user_id"`
```sql
-- Usuarios NO autenticados pueden crear pedidos sin user_id
WITH CHECK (user_id IS NULL)
```
- ✅ Invitado (no autenticado) crea pedido sin user_id → Funciona
- ❌ Invitado intenta crear pedido con user_id → Bloqueado

#### C) `"Admins can create orders for any user"`
```sql
-- Administradores pueden crear pedidos para cualquier usuario
WITH CHECK (public.has_role(auth.uid(), 'admin'))
```
- ✅ Admin crea pedido para cualquier usuario → Funciona
- ❌ Usuario no admin intenta → Bloqueado

### 2. Políticas para `order_items`

**Política permisiva:**
```sql
"Anyone can create order items"
WITH CHECK (true)
```

**¿Por qué tan permisiva?**
- Necesario para guest checkout (compra sin cuenta)
- Los order_items están vinculados a orders, que ya tienen control
- Simplifica la automatización

### 3. Políticas para `invoices` y `invoice_items`

**Dos políticas:**

#### A) Para admins:
```sql
"Admins can create invoices"
WITH CHECK (public.has_role(auth.uid(), 'admin'))
```

#### B) Para service_role (Edge Functions):
```sql
"Service role can create invoices"
TO service_role
WITH CHECK (true)
```

Esto permite a las Edge Functions crear facturas automáticamente.

### 4. Políticas para `notifications`

Similar a invoices: permite a service_role y admins crear notificaciones.

## 🔍 Verificación Incluida

El script incluye una consulta para ver todas las políticas activas:

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('orders', 'order_items', 'invoices', ...)
```

Esto te permite **verificar visualmente** que las políticas se aplicaron correctamente.

## 📊 Antes vs Después

### ANTES (Políticas originales):
```sql
-- orders
"Users and guests can create orders"
WITH CHECK (
  (auth.uid() = user_id) OR 
  ((auth.uid() IS NULL) AND (user_id IS NULL))
)
-- Una sola política compleja
```

### DESPUÉS (Este script):
```sql
-- orders
"Users can create their own orders" → Para usuarios autenticados
"Guests can create orders without user_id" → Para invitados
"Admins can create orders for any user" → Para admins
-- Tres políticas claras y específicas
```

**Ventajas:**
- ✅ Más claras y fáciles de entender
- ✅ Más fáciles de debuggear
- ✅ Mejor documentadas con comentarios
- ✅ Siguen el principio de responsabilidad única

## 🚀 Cómo Usar Este Script

### Opción 1: Dashboard de Supabase (RECOMENDADO)
1. Ve a Supabase Dashboard
2. SQL Editor
3. Copia y pega el contenido completo
4. Ejecuta
5. Revisa los resultados de la consulta de verificación

### Opción 2: Supabase CLI
```bash
supabase db push
```

## ⚠️ Importante: Orden de Aplicación

**ESTE SCRIPT ES OPCIONAL** porque el problema real ya está resuelto con la migración de triggers.

Si decides aplicarlo, hazlo EN ESTE ORDEN:

1. ✅ **PRIMERO**: `20260215171700_fix_order_triggers_exception_handling.sql` (OBLIGATORIO)
2. ✅ **DESPUÉS**: `20260215172000_verify_and_fix_rls_policies.sql` (OPCIONAL)

## 🔒 Impacto en Seguridad

### ✅ LO QUE MEJORA:
- Políticas más claras y específicas
- Mejor separación de responsabilidades
- Documentación incorporada en el código

### ⚠️ LO QUE NO CAMBIA:
- Service Role Key sigue bypasseando RLS (correcto)
- Usuarios no pueden crear pedidos para otros (correcto)
- Invitados pueden crear pedidos sin cuenta (correcto)

## 🧪 Cómo Verificar Que Funciona

### Después de aplicar el script:

1. **Verifica en Supabase Dashboard:**
   - Settings → Database → Policies
   - Busca las tablas: orders, order_items, invoices
   - Deberías ver las nuevas políticas listadas

2. **Prueba el flujo completo:**
   - Admin edita cotización
   - Cliente acepta
   - Verifica que se creó el pedido ✅

3. **Revisa los logs:**
   - No deberían aparecer errores de permisos
   - Solo warnings si fallan emails (esperado)

## 💡 ¿Necesitas Aplicar Este Script?

**NO ES OBLIGATORIO** porque:
- ✅ El problema real (triggers) ya está resuelto
- ✅ Service Role Key bypasea RLS de todas formas
- ✅ Las políticas originales probablemente funcionan

**Aplícalo SI:**
- ❓ Quieres políticas más claras y mejor documentadas
- ❓ Planeas usar operaciones desde frontend
- ❓ Quieres seguir mejores prácticas
- ❓ Necesitas debuggear permisos en el futuro

**NO lo apliques SI:**
- ✅ La creación de pedidos ya funciona después de aplicar el fix de triggers
- ✅ No quieres hacer cambios adicionales
- ✅ Prefieres mantener las políticas originales

## 📝 Resumen Ejecutivo

| Aspecto | Detalle |
|---------|---------|
| **¿Es obligatorio?** | ❌ No, el fix de triggers es suficiente |
| **¿Es recomendado?** | ✅ Sí, mejora claridad y documentación |
| **¿Rompe algo?** | ❌ No, es compatible con código existente |
| **¿Cuándo aplicar?** | Después del fix de triggers, cuando quieras |
| **¿Tiene riesgo?** | ⚠️ Bajo, pero testea en staging primero |

## ✨ Conclusión

Este script **NO es la solución al problema original** (ese ya está resuelto con el fix de triggers), pero **mejora las políticas RLS** para hacerlas más claras, específicas y mantenibles.

Úsalo si quieres mejorar la calidad del código y la documentación de permisos.
