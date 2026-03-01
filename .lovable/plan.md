
# Plan: Sistema Completo de Cotizaciones Automatizado

## Problemas Criticos Identificados

### 1. SIN POLITICAS RLS en `quotes`, `invoices`, `invoice_items`
Las tres tablas tienen RLS **habilitado** pero **cero politicas**. Esto significa:
- Los clientes NO pueden crear cotizaciones desde el frontend
- Los clientes NO pueden ver sus propias cotizaciones
- Los administradores NO pueden listar/editar cotizaciones desde el panel admin
- Las facturas no son visibles para nadie desde el frontend

Esto explica por que todo el sistema de cotizaciones esta roto desde el lado del cliente.

### 2. Duplicacion de estados de "Pendiente Aprobacion Cliente"
Existen DOS estados similares:
- `e8afe3a8` - "Pendiente Aprobacion Cliente" (slug: `awaiting_client_response`)
- `c4d3ada8` - "Pendiente aprobacion del cliente" (slug: NULL)

Se unificaran en uno solo con slug `pending_client_approval`.

### 3. Flujo incompleto: Admin cambia precio pero no hay estado intermedio claro
Cuando el admin cambia el precio, el sistema notifica al cliente pero no cambia automaticamente el estado a "Pendiente Aprobacion Cliente". Esto debe ser automatico.

### 4. Aprobacion del cliente no genera pedido/factura
Cuando el cliente aprueba en `user/QuoteDetail.tsx`, solo cambia el status a "Aprobada" y notifica admins, pero NO invoca `process-quote-approval` para generar el pedido y la factura automaticamente.

### 5. Sincronizacion Factura-Pedido no existe
No hay mecanismo para que al marcar una factura como pagada, el pedido tambien cambie a pagado, ni viceversa.

---

## Plan de Implementacion

### Fase 1: Migracion SQL - RLS + Estados + Trigger de sincronizacion

Una sola migracion que:

**A. Politicas RLS para `quotes`:**
- SELECT: usuarios autenticados ven sus propias cotizaciones (`user_id = auth.uid()`)
- SELECT: admins ven todas las cotizaciones
- INSERT: usuarios autenticados pueden crear cotizaciones con su `user_id`
- UPDATE: usuarios pueden actualizar sus propias cotizaciones (para aprobar/rechazar)
- UPDATE: admins pueden actualizar cualquier cotizacion

**B. Politicas RLS para `invoices`:**
- SELECT: usuarios ven sus propias facturas (`user_id = auth.uid()`)
- SELECT: admins ven todas
- INSERT: usuarios autenticados pueden crear facturas con su `user_id`
- UPDATE: admins pueden actualizar cualquier factura

**C. Politicas RLS para `invoice_items`:**
- SELECT: usuarios ven items de sus facturas (via join con invoices)
- SELECT: admins ven todos
- INSERT: service role / admin puede crear items

**D. Limpiar estados duplicados:**
- Unificar "Pendiente Aprobacion Cliente" en un solo registro con slug `pending_client_approval`
- Eliminar el duplicado

**E. Trigger de sincronizacion factura/pedido:**
- Funcion `sync_payment_status()` que al actualizar `payment_status` en `invoices`, busca el pedido asociado (via `quote_id` o `order_id`) y sincroniza
- Trigger inverso en `orders`: al cambiar `payment_status`, actualiza la factura asociada

### Fase 2: Modificar `src/pages/admin/Quotes.tsx`

Cuando el admin cambia el precio de una cotizacion:
- Automaticamente cambiar el estado a "Pendiente Aprobacion Cliente" (`pending_client_approval`)
- Enviar notificacion y email al cliente informando los cambios
- Si el admin aprueba directamente (sin cambio de precio), ejecutar el flujo actual de `process-quote-approval`

### Fase 3: Modificar `src/pages/user/QuoteDetail.tsx`

Cuando el cliente aprueba los cambios:
1. Cambiar estado a "Aprobada"
2. Invocar `process-quote-approval` para generar pedido + factura automaticamente
3. Notificar a admins
4. Redirigir al cliente a su factura

Cuando el cliente rechaza:
1. Cambiar estado a "Rechazada"
2. Notificar a admins
3. Mostrar mensaje de confirmacion

### Fase 4: Actualizar `process-quote-approval` Edge Function

- Permitir que sea invocado tanto por admins como por el propio usuario (dueno de la cotizacion)
- Agregar soporte multiidioma en el email de aprobacion (leer `preferred_language` del perfil)
- Vincular factura al pedido generado (actualmente no se vincula `order_id` en la factura)

### Fase 5: Notificaciones y Emails

- Al crear cotizacion: email + notificacion a todos los admins
- Al admin cambiar precio: email + notificacion al cliente
- Al cliente aprobar: email + notificacion a admins, se genera pedido + factura
- Al cliente rechazar: email + notificacion a admins
- Sincronizacion pago: notificacion al cliente cuando factura/pedido se marca como pagado

---

## Detalles Tecnicos

### Archivos a modificar:
1. **Migracion SQL** - RLS para quotes/invoices/invoice_items, limpieza de estados, trigger sync
2. `src/pages/admin/Quotes.tsx` - Auto-cambio de estado al modificar precio
3. `src/pages/user/QuoteDetail.tsx` - Invocar process-quote-approval al aprobar
4. `supabase/functions/process-quote-approval/index.ts` - Permitir invocacion por usuario, multiidioma, vincular order_id en factura

### Flujo completo esperado:

```text
Cliente envia cotizacion
    |
    v
Admin recibe notificacion + email
    |
    v
Admin revisa cotizacion
    |-- Precio OK --> Admin marca "Aprobada" --> Se genera pedido + factura automaticamente
    |-- Precio diferente --> Admin cambia precio --> Estado cambia a "Pendiente Aprobacion Cliente"
                                                        |
                                                        v
                                              Cliente recibe notificacion + email
                                                        |
                                              Cliente ve cambios en su panel
                                                        |
                                    +---------+         |         +---------+
                                    | Rechaza |<--------+-------->| Aprueba |
                                    +---------+                   +---------+
                                        |                             |
                                        v                             v
                                  Cotizacion cancelada          Se genera pedido + factura
                                  Admins notificados            Cliente recibe factura
                                                                Admins notificados
                                                                        |
                                                                        v
                                                              Admin marca pago recibido
                                                                        |
                                                                        v
                                                              Factura Y Pedido pasan a "Pagado"
                                                              (sincronizacion bidireccional)
```

### Checklist de Verificacion:
- [ ] Cliente puede crear cotizacion (RLS permite INSERT en quotes)
- [ ] Admin puede ver todas las cotizaciones (RLS permite SELECT para admin)
- [ ] Cliente ve solo sus cotizaciones en Mi Cuenta
- [ ] Admin cambia precio -> estado cambia automaticamente a "Pendiente Aprobacion Cliente"
- [ ] Cliente recibe notificacion y email con cambios
- [ ] Cliente aprueba -> se genera pedido + factura automaticamente
- [ ] Cliente rechaza -> cotizacion se cancela, admins notificados
- [ ] Al marcar factura pagada, pedido cambia a pagado
- [ ] Al marcar pedido pagado, factura cambia a pagada
- [ ] Emails llegan en el idioma del perfil del usuario (ES/EN/NL)
- [ ] Facturas y pedidos son visibles para el cliente en Mi Cuenta
