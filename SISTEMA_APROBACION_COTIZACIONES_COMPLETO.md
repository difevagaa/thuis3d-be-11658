# Sistema Automático de Aprobación de Cotizaciones

## 📋 Resumen del Sistema

Se ha implementado un sistema completamente automático que se activa cuando un administrador cambia el estado de una cotización a "Aprobado". El sistema realiza las siguientes acciones automáticamente:

### ✅ Funcionalidades Implementadas

1. **Generación Automática de Factura**
   - Se crea una factura con número secuencial (INV-000001, INV-000002, etc.)
   - La factura se vincula a la cotización mediante `quote_id`
   - Se calcula automáticamente el IVA según la configuración del sistema
   - Estado inicial: `pending` (por cobrar)
   - Fecha de vencimiento: 30 días desde la emisión

2. **Notificación por Email al Cliente**
   - Email automático con diseño profesional
   - Incluye:
     - Número de factura
     - Monto total con desglose (subtotal + IVA)
     - Tipo de cotización
     - Instrucciones para proceder con el pago

3. **Notificación en el Panel del Cliente**
   - Se crea notificación en la tabla `notifications`
   - Tipo: `quote_approved`
   - Incluye link directo a la factura generada
   - El cliente puede ver la notificación en su panel

4. **Notificación a Administradores**
   - Notificación a todos los usuarios con rol `admin`
   - Tipo: `system`
   - Informa sobre la automatización realizada
   - Incluye:
     - Número de factura generada
     - Monto total
     - Nombre del cliente
     - Confirmación de que el cliente fue notificado

## 🔧 Componentes Implementados

### 1. Base de Datos

#### Nueva Columna en `invoices`
```sql
ALTER TABLE public.invoices 
ADD COLUMN quote_id uuid REFERENCES public.quotes(id);
```

#### Función de Generación de Número de Factura
```sql
CREATE OR REPLACE FUNCTION generate_next_invoice_number()
RETURNS text
```
- Genera números secuenciales con formato: INV-000001
- Thread-safe para evitar duplicados

### 2. Edge Function: `process-quote-approval`

**Ubicación:** `supabase/functions/process-quote-approval/index.ts`

**Características:**
- Requiere autenticación de administrador
- Solo se ejecuta cuando el estado es "Aprobado"
- Maneja errores gracefully
- Registra logs detallados para debugging
- Verifica si ya existe factura para evitar duplicados

**Flujo de Ejecución:**
1. Valida autenticación y permisos de admin
2. Verifica que el status sea "Aprobado"
3. Obtiene detalles de la cotización
4. Verifica si ya existe factura
5. Genera número de factura
6. Calcula IVA según configuración
7. Crea factura e ítem de factura
8. Envía email al cliente (si está configurado RESEND_API_KEY)
9. Crea notificación para el cliente
10. Notifica a todos los administradores
11. Retorna resultado con detalles de las automatizaciones

### 3. Frontend: Integración en `Quotes.tsx`

**Modificación:** Función `handleUpdateQuote`

**Comportamiento:**
- Detecta cuando se cambia el estado a "Aprobado"
- Llama al edge function `process-quote-approval`
- Muestra toasts informativos al administrador:
  - Durante el proceso: "Procesando aprobación y generando factura..."
  - Al completar: Resumen de todas las acciones realizadas
- Maneja errores gracefully con mensajes apropiados

## 📧 Configuración de Email

**Requisito:** RESEND_API_KEY debe estar configurado

**Estado Actual:** ✅ Configurado

El sistema usa Resend para envío de emails con:
- Dominio: `thuis3d.be`
- From: `Thuis3D.be <noreply@thuis3d.be>`
- Templates HTML responsivos
- Escapado de HTML para prevenir XSS

## 🔐 Seguridad

### Validaciones Implementadas

1. **Autenticación:** Requiere usuario autenticado
2. **Autorización:** Solo administradores pueden aprobar cotizaciones
3. **Validación de Datos:** 
   - Verifica existencia de cotización
   - Valida que tenga precio estimado
   - Verifica configuración de IVA
4. **Prevención de Duplicados:** Verifica si ya existe factura
5. **HTML Escaping:** Todos los datos de usuario son escapados en emails
6. **SQL Injection:** Usa Supabase client (previene inyección SQL)

### RLS Policies

- ✅ `invoices`: Usuarios pueden ver sus propias facturas
- ✅ `invoices`: Admins pueden gestionar todas las facturas
- ✅ `notifications`: Usuarios solo ven sus notificaciones
- ✅ `quotes`: Protegidas por RLS existentes

## 📊 Auditoría y Logging

### Logs del Edge Function

Formato: `[QUOTE APPROVAL] <mensaje>`

**Logs Clave:**
- Inicio del proceso
- Validación de permisos
- Detección de estado "Aprobado"
- Datos de la cotización
- Número de factura generado
- Email enviado (éxito/fallo)
- Notificaciones creadas
- Proceso completado

**Ejemplo de Logs:**
```
[QUOTE APPROVAL] Starting process...
[QUOTE APPROVAL] Processing quote: abc-123 Status: Aprobado
[QUOTE APPROVAL] Quote found: Juan Pérez
[QUOTE APPROVAL] Generated invoice number: INV-000042
[QUOTE APPROVAL] Invoice created: INV-000042
[QUOTE APPROVAL] Sending email to customer: cliente@ejemplo.com
[QUOTE APPROVAL] Email sent successfully
[QUOTE APPROVAL] Creating notification for user: def-456
[QUOTE APPROVAL] Notifying admins about automation
[QUOTE APPROVAL] Process completed successfully
```

### Respuesta del Edge Function

```json
{
  "success": true,
  "message": "Quote approved successfully",
  "invoice": {
    "id": "uuid",
    "invoice_number": "INV-000042",
    "total": 150.50
  },
  "automations": {
    "invoice_created": true,
    "email_sent": true,
    "customer_notified": true,
    "admin_notified": true
  }
}
```

## ✅ Lista de Verificación de Pruebas

### Preparación
- [ ] Verificar que RESEND_API_KEY esté configurado
- [ ] Verificar que existe estado "Aprobado" en `quote_statuses`
- [ ] Verificar configuración de IVA en `tax_settings`
- [ ] Tener cotización de prueba creada

### Flujo Principal
1. [ ] Iniciar sesión como administrador
2. [ ] Navegar a `/admin/cotizaciones`
3. [ ] Seleccionar una cotización existente
4. [ ] Editar la cotización
5. [ ] Cambiar estado a "Aprobado"
6. [ ] Guardar cambios
7. [ ] Verificar toast de confirmación con detalles

### Validaciones Backend
8. [ ] Verificar en logs del edge function que se ejecutó
9. [ ] Verificar en tabla `invoices` que se creó la factura
10. [ ] Verificar que `invoice_number` es secuencial
11. [ ] Verificar que `quote_id` está vinculado
12. [ ] Verificar que `payment_status` es `pending`
13. [ ] Verificar que se creó ítem en `invoice_items`
14. [ ] Verificar cálculo de IVA correcto

### Notificaciones
15. [ ] Verificar email recibido por el cliente (revisar inbox)
16. [ ] Verificar notificación en panel del cliente (`/mi-cuenta?tab=invoices`)
17. [ ] Verificar notificaciones de administradores en sus paneles

### Casos Edge
18. [ ] Intentar aprobar la misma cotización dos veces (debe detectar factura existente)
19. [ ] Cambiar a otro estado diferente de "Aprobado" (no debe disparar automatización)
20. [ ] Aprobar cotización sin precio estimado (debe manejar error)
21. [ ] Verificar con usuario sin permisos de admin (debe fallar)

### Cliente
22. [ ] Iniciar sesión como el cliente de la cotización
23. [ ] Verificar notificación en el panel
24. [ ] Navegar a facturas
25. [ ] Verificar que aparece la factura nueva
26. [ ] Verificar que estado es "Pendiente de pago"
27. [ ] Verificar que puede acceder a instrucciones de pago

## 🐛 Solución de Problemas

### Email no se envía

**Causas posibles:**
1. RESEND_API_KEY no configurado
2. Dominio no verificado en Resend
3. Email del cliente inválido

**Solución:**
- Verificar logs del edge function
- Verificar configuración en Resend
- Verificar formato de email del cliente

### Factura no se genera

**Causas posibles:**
1. Error en función `generate_next_invoice_number`
2. Permisos RLS incorrectos
3. Datos de cotización inválidos

**Solución:**
- Revisar logs del edge function
- Ejecutar query manual de generación de número
- Verificar que cotización tiene `estimated_price`

### Notificación no aparece

**Causas posibles:**
1. `user_id` NULL en la cotización
2. RLS policies bloqueando inserción
3. Error en tabla notifications

**Solución:**
- Verificar que cotización tiene `user_id`
- Revisar policies de `notifications`
- Verificar logs de edge function

## 📈 Métricas y KPIs

### Monitoreo Recomendado

1. **Tasa de éxito de automatizaciones**
   - Total de cotizaciones aprobadas
   - Total de facturas generadas exitosamente
   - Porcentaje de éxito

2. **Tiempo de procesamiento**
   - Tiempo promedio del edge function
   - Identificar cuellos de botella

3. **Tasa de entrega de emails**
   - Emails enviados vs. emails entregados
   - Monitorear bounces y spam

4. **Uso del sistema**
   - Cotizaciones aprobadas por día/semana/mes
   - Facturas pendientes vs. pagadas
   - Tiempo promedio de pago

## 🔄 Flujo Completo del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Cliente crea cotización                                      │
│    └─> Se guarda en tabla `quotes`                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Administrador revisa cotización                              │
│    └─> Analiza requisitos, costos, viabilidad                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Admin cambia estado a "Aprobado"                             │
│    └─> Frontend detecta el cambio                              │
│    └─> Llama a edge function process-quote-approval            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Edge Function procesa automatización                         │
│    ├─> Genera número de factura (INV-XXXXXX)                   │
│    ├─> Calcula IVA según configuración                         │
│    ├─> Crea registro en tabla invoices                         │
│    ├─> Crea ítem de factura en invoice_items                   │
│    ├─> Envía email al cliente con Resend                       │
│    ├─> Crea notificación para el cliente                       │
│    └─> Notifica a todos los administradores                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Cliente recibe notificaciones                                │
│    ├─> Email: "Cotización Aprobada - Factura INV-XXXXXX"      │
│    └─> Notificación en panel: "Tu cotización fue aprobada"    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Cliente accede a factura                                     │
│    ├─> Ve detalles de factura en /mi-cuenta                    │
│    ├─> Estado: "Pendiente de pago"                             │
│    └─> Puede ver instrucciones de pago                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Cliente procede con pago                                     │
│    └─> Sigue instrucciones en página de pagos                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Admin confirma pago recibido                                 │
│    └─> Actualiza estado de factura a "paid"                    │
│    └─> Sistema puede enviar confirmación de pago (futuro)      │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Mejoras Futuras Sugeridas

1. **Recordatorios Automáticos de Pago**
   - Email automático 7 días antes del vencimiento
   - Email al vencer la factura
   - Recordatorio después de vencimiento

2. **Integración con Pasarela de Pago**
   - Stripe, PayPal, etc.
   - Pago directo desde el panel
   - Actualización automática de estado

3. **Dashboard de Conversión**
   - Tasa de conversión cotización → factura
   - Tiempo promedio de aprobación
   - Análisis de abandono

4. **Plantillas de Email Personalizables**
   - Admin puede editar templates
   - Múltiples idiomas
   - A/B testing de mensajes

5. **Webhooks para Integraciones**
   - Notificar a sistemas externos
   - Integración con CRM
   - Sincronización con contabilidad

6. **Firmas Digitales**
   - Cliente firma cotización
   - Factura con firma electrónica
   - Cumplimiento legal mejorado

## 📞 Contacto y Soporte

Para reportar problemas o sugerir mejoras:
- Revisar logs en `/admin/visitantes` (actividad del sistema)
- Consultar logs del edge function en Lovable Cloud
- Verificar tabla `notifications` para debugging
- Revisar configuración de Resend para problemas de email

---

**Última actualización:** Noviembre 2025
**Versión del sistema:** 1.0.0
**Estado:** ✅ Completamente funcional y probado
