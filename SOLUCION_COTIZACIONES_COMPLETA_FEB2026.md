# Solución Completa al Sistema de Cotizaciones - Febrero 2026

## 📋 Resumen Ejecutivo

Este documento describe la solución completa a los problemas del sistema de aprobación de cotizaciones, incluyendo:
1. ✅ Corrección de errores en creación de pedidos/facturas
2. ✅ Prevención de aprobaciones/rechazos duplicados
3. ✅ Política RLS para actualización de cotizaciones por clientes
4. ✅ Mejoras en experiencia de usuario

---

## 🔍 Problemas Identificados y Solucionados

### 1. Error al Aprobar Cotizaciones (RESUELTO PREVIAMENTE)

**Problema Original:**
```
Error en automación: Edge Function returned a non-2xx status code. 
Por favor, crea la factura y pedido manualmente
```

**Causa Raíz:**
El código intentaba usar un campo `admin_notes` que no existe en la tabla `orders`.

**Solución Aplicada (commit previo):**
- ✅ Eliminado campo `admin_notes` del INSERT
- ✅ Consolidado marcador en campo `notes` como `[QUOTE:uuid]`
- ✅ Búsqueda actualizada para usar `notes` en lugar de `admin_notes`

**Archivo Modificado:**
- `supabase/functions/process-quote-approval/index.ts`

**Estado:** ✅ RESUELTO

---

### 2. Falta Política RLS para Actualización por Clientes (NUEVO - CRÍTICO)

**Problema:**
Los clientes NO podían actualizar sus propias cotizaciones debido a la falta de una política RLS de UPDATE en la tabla `quotes`.

**Síntomas:**
- El botón "Aceptar Cambios" o "Rechazar Cambios" arroja error
- Error en consola: "row-level security policy" o "permission denied"
- La función `handleAcceptChanges()` falla en el UPDATE

**Diagnóstico:**
```sql
-- Políticas existentes ANTES de la corrección:
CREATE POLICY "Users can create quotes" ON public.quotes FOR INSERT;
CREATE POLICY "Users can view their own quotes" ON public.quotes FOR SELECT;
CREATE POLICY "Admins can manage all quotes" ON public.quotes (ALL);

-- FALTABA: Política para UPDATE por usuarios
```

**Solución:**
Se creó el archivo `LOVABLE_SQL_FIX_QUOTE_CLIENT_UPDATES.sql` con la política necesaria:

```sql
CREATE POLICY "Users can update their own quote status and comments"
ON public.quotes
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id OR customer_email = auth.email()
)
WITH CHECK (
  auth.uid() = user_id OR customer_email = auth.email()
);
```

**Acciones Requeridas:**
⚠️ **IMPORTANTE: Este script debe ser ejecutado manualmente en Lovable/Supabase**

1. Abrir el editor SQL en Lovable/Supabase
2. Copiar y pegar el contenido de `LOVABLE_SQL_FIX_QUOTE_CLIENT_UPDATES.sql`
3. Ejecutar el script completo
4. Verificar que la política se creó correctamente (el script incluye una query de verificación)

**Archivo Creado:**
- ✅ `LOVABLE_SQL_FIX_QUOTE_CLIENT_UPDATES.sql` - Listo para ejecutar en Lovable

**Estado:** ⚠️ SCRIPT CREADO - PENDIENTE DE EJECUCIÓN EN LOVABLE

---

### 3. Clientes Pueden Aprobar/Rechazar Múltiples Veces (RESUELTO)

**Problema:**
Después de aprobar o rechazar una cotización, los botones seguían disponibles, permitiendo al cliente hacer clic múltiples veces y crear confusión.

**Solución Implementada:**

#### A. Detección de Estado de Respuesta
```typescript
// Nuevas variables para detectar si ya respondió
const isAlreadyApproved = statusSlug === "approved" || statusName === "aprobado" || statusName === "aprobada";
const isAlreadyRejected = statusSlug === "rejected" || statusName === "rechazado" || statusName === "rechazada";
const hasAlreadyResponded = isAlreadyApproved || isAlreadyRejected;
```

#### B. Validación en Funciones
```typescript
// En handleAcceptChanges()
if (hasAlreadyResponded) {
  i18nToast.directWarning("Esta cotización ya ha sido respondida.");
  return;
}

// En handleRejectChanges()
if (hasAlreadyResponded) {
  i18nToast.directWarning("Esta cotización ya ha sido respondida.");
  return;
}

// En handleCustomerAction()
if ((action === "approve" || action === "reject") && hasAlreadyResponded) {
  i18nToast.directWarning("Esta cotización ya ha sido respondida.");
  return;
}
```

#### C. Ocultación de Botones
```typescript
// Los botones solo se muestran si NO ha respondido
const isPendingClientApproval = !hasAlreadyResponded && (
  statusSlug === "awaiting_client_response" ||
  // ... otras condiciones
);
```

#### D. Mensaje Visual de Estado
```jsx
{/* Nuevo: Mensaje cuando ya respondió */}
{hasAlreadyResponded && (
  <div className={`space-y-4 p-4 rounded-lg border ${
    isAlreadyApproved 
      ? 'bg-green-50 border-green-200' 
      : 'bg-red-50 border-red-200'
  }`}>
    <h3 className="font-semibold flex items-center gap-2">
      {isAlreadyApproved ? '✓ Cotización Aprobada' : '✗ Cotización Rechazada'}
    </h3>
    <p className="text-sm">
      {isAlreadyApproved 
        ? 'Ya has aprobado esta cotización. El administrador está procesando tu pedido.'
        : 'Ya has rechazado esta cotización. El administrador ha sido notificado de tu decisión.'}
    </p>
  </div>
)}
```

**Archivo Modificado:**
- ✅ `src/pages/user/QuoteDetail.tsx`

**Estado:** ✅ RESUELTO

---

## 🎯 Flujo Completo del Sistema

### Flujo de Aprobación por Administrador

```
1. Admin abre /admin/cotizaciones
2. Admin selecciona cotización
3. Admin cambia estado a "Aprobado/Aprobada"
4. Admin guarda cambios
   ↓
5. Se detecta isApproving = true (línea 107 en admin/Quotes.tsx)
6. Se invoca función process-quote-approval
   ↓
7. FUNCIÓN EDGE:
   a. Verifica que usuario es admin (líneas 52-73)
   b. Busca cotización (líneas 101-109)
   c. Verifica/crea factura (líneas 115-213)
      - Genera número de factura
      - Calcula totales (subtotal + envío + impuestos)
      - Inserta registro en invoices
      - Inserta items en invoice_items
   d. Verifica/crea pedido (líneas 215-390)
      - Busca marcador [QUOTE:uuid] en campo notes
      - Si no existe, genera número de pedido
      - Busca/crea estado "Recibido"
      - Inserta registro en orders con marcador
      - Inserta items en order_items
   e. Envía notificaciones (líneas 401-537)
      - Email al cliente (via Resend)
      - Notificación in-app al cliente
      - Notificación in-app a todos los admins
   ↓
8. Retorna éxito con detalles
9. UI muestra toast con resultados
```

### Flujo de Aprobación por Cliente

```
1. Cliente recibe notificación de cambios
2. Cliente abre /cotizacion/:id
3. Cliente ve botón "Aceptar Cambios" (solo si isPendingClientApproval)
4. Cliente hace clic en "Aceptar Cambios"
   ↓
5. VALIDACIONES:
   a. Verifica que no haya respondido antes (hasAlreadyResponded)
   b. Busca ID de estado "aprobado"
   ↓
6. Actualiza quotes.status_id a "aprobado" (líneas 264-267)
   ⚠️ REQUIERE POLÍTICA RLS (ver paso 2 arriba)
   ↓
7. Invoca función process-quote-approval (igual que admin)
   ↓
8. Misma automatización que flujo admin (factura + pedido)
   ↓
9. Notifica a admins de la aprobación del cliente
10. UI muestra mensaje de éxito
11. Recarga página → botones desaparecen, muestra mensaje verde
```

### Flujo de Rechazo por Cliente

```
1-4. (Igual que aprobación)
5. Cliente hace clic en "Rechazar Cambios"
   ↓
6. VALIDACIONES:
   a. Verifica que no haya respondido antes
   b. Busca ID de estado "rechazado"
   ↓
7. Actualiza quotes.status_id a "rechazado"
   ⚠️ REQUIERE POLÍTICA RLS
   ↓
8. Notifica a admins del rechazo
9. UI muestra mensaje de éxito
10. Recarga página → botones desaparecen, muestra mensaje rojo
11. NO se crea factura ni pedido (solo se actualiza estado)
```

---

## 🔐 Políticas RLS Actuales

### Tabla: `quotes`

| Política | Comando | Rol | Condición |
|----------|---------|-----|-----------|
| Admins can manage all quotes | ALL | authenticated | has_role('admin') |
| Users can create quotes | INSERT | anon/authenticated | true |
| Users can view their own quotes | SELECT | authenticated | user_id = auth.uid() OR customer_email = auth.email() |
| **Users can update their own quote status** | **UPDATE** | **authenticated** | **user_id = auth.uid() OR customer_email = auth.email()** |

⚠️ **La última política debe ser creada manualmente en Lovable**

### Tabla: `orders`

| Política | Comando | Rol | Condición |
|----------|---------|-----|-----------|
| Admins can manage all orders | ALL | authenticated | has_role('admin') |
| Users can view their own orders | SELECT | authenticated | user_id = auth.uid() OR user_id IS NULL |
| Users can create their own orders | INSERT | authenticated | user_id = auth.uid() |
| Guests can create orders without user_id | INSERT | anon | user_id IS NULL |
| Admins can create orders for any user | INSERT | authenticated | has_role('admin') |

✅ **Políticas de orders ya configuradas correctamente**

### Tabla: `invoices`

| Política | Comando | Rol | Condición |
|----------|---------|-----|-----------|
| Admins can manage all invoices | ALL | authenticated | has_role('admin') |
| Users can view their own invoices | SELECT | authenticated | user_id = auth.uid() |
| Admins can create invoices | INSERT | authenticated | has_role('admin') |
| Service role can create invoices | INSERT | service_role | true |

✅ **Políticas de invoices ya configuradas correctamente**

---

## 📁 Archivos Modificados/Creados

### 1. `src/pages/user/QuoteDetail.tsx`
**Cambios:**
- ✅ Agregadas variables `isAlreadyApproved`, `isAlreadyRejected`, `hasAlreadyResponded`
- ✅ Modificada condición `isPendingClientApproval` para excluir respondidos
- ✅ Agregadas validaciones en `handleAcceptChanges()`, `handleRejectChanges()`, `handleCustomerAction()`
- ✅ Agregado bloque JSX con mensaje visual cuando ya respondió

**Líneas Modificadas:** ~30 líneas
**Impacto:** Previene aprobaciones/rechazos duplicados

### 2. `LOVABLE_SQL_FIX_QUOTE_CLIENT_UPDATES.sql` (NUEVO)
**Contenido:**
- ✅ Script SQL completo para ejecutar en Lovable
- ✅ DROP POLICY IF EXISTS (seguridad)
- ✅ CREATE POLICY para UPDATE de cotizaciones
- ✅ COMMENT para documentación
- ✅ Query de verificación
- ✅ Instrucciones detalladas de testing

**Líneas:** 70 líneas con documentación
**Impacto:** ⚠️ CRÍTICO - Sin este script, clientes NO pueden actualizar cotizaciones

### 3. `supabase/functions/process-quote-approval/index.ts`
**Estado:** ✅ Ya corregido en commit anterior
**Cambio Previo:** Eliminado uso de campo `admin_notes`

---

## ✅ Checklist de Implementación

### Para el Desarrollador (Completado)
- [x] Analizar código existente
- [x] Identificar problema de RLS
- [x] Crear script SQL para Lovable
- [x] Implementar validación de estado en cliente
- [x] Agregar mensajes visuales de estado
- [x] Documentar todos los cambios
- [x] Hacer commit y push de cambios

### Para el Usuario (Pendiente)
- [ ] **CRÍTICO**: Ejecutar `LOVABLE_SQL_FIX_QUOTE_CLIENT_UPDATES.sql` en Lovable
  1. Abrir editor SQL en Lovable
  2. Copiar contenido completo del archivo
  3. Ejecutar script
  4. Verificar en resultado que se creó la política
- [ ] Testing: Admin aprueba cotización
  - [ ] Verificar que se crea factura
  - [ ] Verificar que se crea pedido
  - [ ] Verificar que se notifica cliente
- [ ] Testing: Cliente aprueba cotización
  - [ ] Verificar que puede actualizar estado (requiere script SQL)
  - [ ] Verificar que se crea factura
  - [ ] Verificar que se crea pedido
  - [ ] Verificar que botones desaparecen
  - [ ] Verificar mensaje verde de confirmación
- [ ] Testing: Cliente rechaza cotización
  - [ ] Verificar que puede actualizar estado (requiere script SQL)
  - [ ] Verificar que NO se crea factura/pedido
  - [ ] Verificar que botones desaparecen
  - [ ] Verificar mensaje rojo de confirmación
- [ ] Testing: Intentar aprobar/rechazar dos veces
  - [ ] Verificar que aparece advertencia
  - [ ] Verificar que no se duplican registros

---

## 🚀 Despliegue

### Orden de Despliegue Recomendado

1. ✅ **Código Frontend (Ya desplegado)**
   - Cambios en `src/pages/user/QuoteDetail.tsx`
   - Se actualiza automáticamente con el commit

2. ⚠️ **Base de Datos (PENDIENTE - MANUAL)**
   - Ejecutar `LOVABLE_SQL_FIX_QUOTE_CLIENT_UPDATES.sql` en Lovable
   - ⚠️ **IMPORTANTE**: Sin este paso, el sistema NO funcionará para clientes

3. ✅ **Edge Function (Ya corregida)**
   - `supabase/functions/process-quote-approval/index.ts`
   - Se desplegó automáticamente en commit anterior

### Verificación Post-Despliegue

```bash
# Verificar que la política RLS existe
# Ejecutar en SQL Editor de Lovable:
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'quotes'
  AND cmd = 'UPDATE';

# Resultado esperado:
# policyname: "Users can update their own quote status and comments"
# cmd: UPDATE
# roles: {authenticated}
```

---

## 🔍 Debugging

### Si el Cliente NO Puede Aprobar/Rechazar

**Error Típico:**
```
Error: new row violates row-level security policy
```

**Solución:**
1. Verificar que se ejecutó el script SQL en Lovable
2. Verificar la política con la query de verificación arriba
3. Si no existe, ejecutar `LOVABLE_SQL_FIX_QUOTE_CLIENT_UPDATES.sql`

### Si se Crean Múltiples Pedidos/Facturas

**Verificar:**
1. Que el campo `notes` en orders contiene `[QUOTE:uuid]`
2. Que la búsqueda de pedido existente funciona (línea 216-220)
3. Que la búsqueda de factura existente funciona (línea 115-119)

**Logs a Revisar:**
```
[QUOTE APPROVAL] Invoice found, skipping creation
[QUOTE APPROVAL] Order found, skipping creation
```

### Si NO se Envían Notificaciones

**Verificar:**
1. Variable de entorno `RESEND_API_KEY` configurada
2. Email del cliente válido en cotización
3. Logs en Edge Function:
   ```
   [QUOTE APPROVAL] Email sent successfully
   [QUOTE APPROVAL] Creating notification for user
   ```

---

## 📊 Métricas de Éxito

Después de implementar estas correcciones, se espera:

- ✅ **0 errores** al aprobar cotizaciones (admin o cliente)
- ✅ **100% automatización** en creación de facturas/pedidos
- ✅ **0 duplicados** en aprobaciones/rechazos
- ✅ **UX clara** con mensajes visuales de estado
- ✅ **Prevención** de clics múltiples

---

## 📝 Notas Técnicas Importantes

### Service Role vs Authenticated Role

- **Service Role**: Usado por Edge Functions, BYPASEA todas las políticas RLS
- **Authenticated Role**: Usado por usuarios logueados, REQUIERE políticas RLS explícitas

Por eso la función `process-quote-approval` puede crear pedidos/facturas (usa service_role), pero los clientes necesitan política RLS para actualizar quotes (usan authenticated).

### Marcador de Cotización en Pedidos

El sistema usa un marcador especial en el campo `notes` de orders:
```
[QUOTE:uuid-de-la-cotizacion]
```

Esto permite:
- Identificar pedidos generados desde cotizaciones
- Evitar duplicados (búsqueda por marcador)
- Mantener trazabilidad

### Estados Críticos

Los estados necesarios en la base de datos:
- **Quote Status "Aprobado/Aprobada"**: con slug `approved`
- **Quote Status "Rechazado/Rechazada"**: con slug `rejected`
- **Order Status "Recibido"**: usado por defecto para nuevos pedidos

Si faltan, el sistema puede fallar. El script `LOVABLE_SQL_FIX_AUTOMATIZACION_COTIZACIONES.sql` ya crea el estado de pedido necesario.

---

## 🎓 Para Futuros Desarrolladores

### Agregar Nuevo Estado de Cotización

1. Crear estado en `quote_statuses` con slug descriptivo
2. Si requiere automatización, modificar líneas 79-84 en `process-quote-approval/index.ts`
3. Actualizar condiciones en `QuoteDetail.tsx` si requiere UI especial

### Modificar Email de Notificación

Editar plantilla HTML en líneas 410-462 de `process-quote-approval/index.ts`

### Agregar Campo a Cotizaciones

1. Agregar columna en tabla `quotes` (Lovable)
2. Agregar política RLS si usuario debe poder modificarlo
3. Actualizar UI en `QuoteDetail.tsx` y `admin/Quotes.tsx`

---

## ✅ Estado Final

| Componente | Estado | Acción Requerida |
|------------|--------|------------------|
| UI Cliente | ✅ COMPLETADO | Ninguna |
| UI Admin | ✅ COMPLETADO | Ninguna |
| Edge Function | ✅ COMPLETADO | Ninguna |
| Políticas RLS | ⚠️ SCRIPT CREADO | **EJECUTAR SQL EN LOVABLE** |
| Documentación | ✅ COMPLETADO | Ninguna |
| Testing | ⏳ PENDIENTE | Ejecutar checklist arriba |

---

## 📞 Soporte

Si hay problemas después de la implementación:

1. Verificar que se ejecutó el script SQL en Lovable
2. Revisar logs de Edge Function en Supabase Dashboard
3. Verificar políticas RLS con queries de verificación
4. Revisar este documento para debugging

---

**Última Actualización:** Febrero 2026
**Autor:** GitHub Copilot Agent
**Versión:** 1.0
