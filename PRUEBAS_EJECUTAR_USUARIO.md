# 🧪 GUÍA DE PRUEBAS PARA EJECUTAR MANUALMENTE

**Para:** Usuario/Administrador  
**Propósito:** Validar funcionalidad completa del sistema  
**Tiempo estimado:** 15-20 minutos

---

## 📋 PRE-REQUISITOS

Antes de empezar, asegúrate de:
- [x] Tener acceso como Admin al panel de administración
- [x] Tener al menos 2 emails reales para probar (tuyo + otro)
- [x] Navegador con console abierta (F12) para ver logs
- [x] Base de datos tiene 3 tarjetas de prueba insertadas

---

## 🎁 PRUEBA 1: PANEL DE TARJETAS DE REGALO (ADMIN)

### Objetivo: Verificar que el panel carga y funciona sin errores

#### Pasos:
1. **Iniciar sesión** como Admin
2. **Navegar** a `/admin/gift-cards`
3. **Verificar que carga:**
   - ✅ Sin errores en consola
   - ✅ Sin mensaje "Error al cargar las tarjetas de regalo"
   - ✅ Debe mostrar 3 tarjetas de prueba:
     - TEST-AAAA-BBBB-CCCC (€50, saldo €50, Activa)
     - TEST-DDDD-EEEE-FFFF (€100, saldo €75, Activa)
     - TEST-GGGG-HHHH-IIII (€25, saldo €0, Activa)

#### ✅ Criterio de Éxito:
- Tabla de tarjetas visible con 3 registros
- Botones "Editar", "Enviar", "Eliminar" presentes
- Console sin errores (F12)

#### ❌ Si falla:
- Abrir consola (F12) y copiar el error exacto
- Verificar que estás logueado como Admin (rol 'admin' en BD)

---

## 💳 PRUEBA 2: CREAR TARJETA DE REGALO MANUALMENTE (ADMIN)

### Objetivo: Validar creación y envío de email

#### Pasos:
1. En `/admin/gift-cards`, hacer clic en **"Crear Nueva Tarjeta Regalo"**
2. **Completar formulario:**
   - Email destinatario: TU_EMAIL_REAL@ejemplo.com
   - Nombre remitente: "Admin Prueba"
   - Monto: €10.00
   - Mensaje: "Tarjeta de prueba del sistema"
   - IVA: **Dejar DESACTIVADO** (gift cards no tienen IVA)
3. **Hacer clic** en "Crear y Enviar Tarjeta"
4. **Verificar:**
   - ✅ Toast verde: "Tarjeta regalo creada y email enviado exitosamente"
   - ✅ Nueva tarjeta aparece en la tabla automáticamente (realtime)
   - ✅ Código único generado (formato: XXXX-XXXX-XXXX-XXXX)

#### ✅ Criterio de Éxito:
- Tarjeta creada visible en tabla
- Email recibido en bandeja (revisar spam)
- Email contiene: código, monto €10, mensaje personalizado
- Tarjeta tiene estado "Activa"

#### ❌ Si falla:
- Si no se crea: Revisar console para error de BD
- Si no llega email: Verificar que `RESEND_API_KEY` está configurada en secrets
- Si email en spam: Normal, es servidor de desarrollo

---

## 🛒 PRUEBA 3: COMPRAR TARJETA DE REGALO (CLIENTE)

### Objetivo: Validar flujo completo de compra y activación

#### Pasos:
1. **Cerrar sesión** (importante: probar como cliente)
2. **Navegar** a `/tarjeta-regalo`
3. **Completar formulario:**
   - Monto: €50
   - Email destinatario: OTRO_EMAIL_REAL@ejemplo.com
   - Tu nombre: "Cliente Prueba"
   - Mensaje: "¡Felicidades!"
4. **Hacer clic** "Comprar Tarjeta de Regalo"
5. **Verificar redirección** a `/pago`
6. **Verificar resumen:**
   - Subtotal: €50.00
   - IVA: €0.00 ✅ (gift cards sin IVA)
   - Envío: €0.00 ✅ (producto digital)
   - Total: €50.00 ✅
7. **Seleccionar** "Transferencia Bancaria"
8. **Confirmar** pago

#### ✅ Criterio de Éxito Parte 1:
- Redirige a instrucciones de pago
- Total mostrado es €50.00 (sin IVA ni envío)
- Pedido creado en BD con `payment_status: 'pending'`
- Gift card creada con `is_active: false`

#### Continuación (como Admin):
9. **Iniciar sesión** como Admin
10. **Ir a** `/admin/pedidos`
11. **Buscar el pedido** recién creado
12. **En notas** debe aparecer: "Tarjeta Regalo: [CODIGO]"
13. **Cambiar estado de pago** a "Pagado"
14. **Esperar 2 segundos**

#### ✅ Criterio de Éxito Parte 2 (CRÍTICO):
- ⚙️ **Trigger se ejecuta:** `trigger_activate_gift_card_on_payment`
- ⚙️ **Gift card se activa automáticamente:** `is_active` cambia a `true`
- ⚙️ **Email se envía al destinatario** automáticamente
- ⚙️ **Notificación al cliente:** "Pedido pagado confirmado"

#### Verificación Final:
15. **Ir a** `/admin/gift-cards`
16. **Buscar la tarjeta** recién creada por código
17. **Verificar:**
    - Estado: **"Activa"** ✅
    - Saldo: €50.00
    - is_active: true

#### ❌ Si falla la activación automática:
- Revisar logs de Supabase (Analytics → Postgres Logs)
- Buscar: `activate_gift_card_on_payment`
- Verificar que el código está en `orders.notes` como "Tarjeta Regalo: CODIGO"

---

## 💰 PRUEBA 4: USAR TARJETA DE REGALO EN COMPRA

### Objetivo: Validar aplicación de descuento y actualización de saldo

#### Pasos:
1. **Iniciar sesión** como Admin
2. **Navegar** a `/productos`
3. **Agregar producto** al carrito (cualquier precio > €50)
4. **Ir al carrito** (`/carrito`)
5. **En sección "Tarjeta Regalo"**, ingresar código: `TEST-AAAA-BBBB-CCCC`
6. **Hacer clic** "Aplicar"
7. **Verificar:**
   - ✅ Toast verde: "Tarjeta aplicada"
   - ✅ Descuento de €50 visible en resumen
   - ✅ Total se reduce en €50
8. **Proceder al pago** (usar método "Tarjeta")
9. **Confirmar pago**

#### ✅ Criterio de Éxito:
- Pedido creado con `discount: 50`
- Total = (subtotal + IVA + envío) - €50
- Gift card actualizada: `current_balance = 0`
- En `/admin/gift-cards`, tarjeta TEST-AAAA muestra saldo €0
- Badge cambia a "Agotada"

---

## 📊 PRUEBA 5: CÁLCULO DE IVA EN DIFERENTES ESCENARIOS

### Escenario A: Solo Tarjeta de Regalo
1. Agregar gift card €50 al carrito
2. Ir a pago
3. **Verificar:**
   - Subtotal: €50.00
   - IVA: €0.00 ✅ (no aplica)
   - Envío: €0.00 ✅
   - Total: €50.00 ✅

### Escenario B: Solo Producto Físico
1. Agregar producto físico €100 al carrito
2. Ir a pago
3. **Verificar:**
   - Subtotal: €100.00
   - IVA: €21.00 ✅ (21% de €100)
   - Envío: €5.00 ✅ (o según zona)
   - Total: €126.00 ✅

### Escenario C: Mix (Físico + Gift Card)
1. Agregar producto físico €50 + gift card €25 al carrito
2. Ir a pago
3. **Verificar:**
   - Subtotal: €75.00
   - IVA: €10.50 ✅ (21% de €50, NO de €75)
   - Envío: €5.00 ✅ (solo por el físico)
   - Total: €90.50 ✅

---

## 📦 PRUEBA 6: CÁLCULO DE ENVÍOS

### Caso A: Solo Gift Card
1. Carrito con solo gift card €100
2. **Envío esperado:** €0.00 ✅

### Caso B: Producto con Envío Gratis Configurado
1. Ir a `/admin/productos`
2. Editar un producto → Tipo de envío: "Gratis"
3. Agregar ese producto al carrito
4. **Envío esperado:** €0.00 ✅

### Caso C: Producto con Envío Custom
1. Editar producto → Tipo de envío: "Personalizado", Costo: €15.00
2. Agregar al carrito
3. **Envío esperado:** €15.00 ✅

### Caso D: Umbral de Envío Gratis
1. Agregar productos por valor > €100
2. **Envío esperado:** €0.00 ✅ (supera umbral)

---

## 🔔 PRUEBA 7: NOTIFICACIONES Y EMAILS

### Objetivo: Validar que no hay duplicados y llegan correctamente

#### Pasos:
1. **Crear un pedido nuevo** (cualquier producto)
2. **Verificar notificaciones in-app:**
   - Admin recibe: "Nuevo Pedido: [NUMERO]"
   - Cliente recibe: "Pedido Confirmado: [NUMERO]"
   - **Verificar:** Solo 1 notificación cada uno (no duplicadas)

3. **Verificar emails:**
   - Admin recibe: Email de nuevo pedido
   - Cliente recibe: Email de confirmación
   - **Verificar:** Solo 1 email cada uno

4. **Cambiar estado del pedido** (admin)
5. **Verificar:**
   - Cliente recibe notificación de cambio de estado
   - Cliente recibe email de actualización
   - **Solo 1 de cada**

---

## 🎯 PRUEBA 8: FACTURACIÓN AUTOMÁTICA

### Test A: Factura desde Pedido Pagado
1. Crear pedido con método "Tarjeta"
2. **Verificar automáticamente:**
   - Factura creada en `/admin/invoices`
   - Número único generado (formato: INV-YYYYMMDD-NNNN)
   - Subtotal, IVA, envío copiados correctamente
   - Items del pedido copiados a invoice_items
   - Cliente notificado

### Test B: Factura desde Cotización Aprobada
1. Crear cotización en `/admin/cotizaciones`
2. Establecer precio estimado: €200
3. Cambiar estado a **"Aprobada"**
4. **Verificar automáticamente:**
   - Factura creada en `/admin/invoices`
   - Subtotal: €200.00
   - IVA: €42.00 (21% de €200)
   - Total: €242.00 (+ envío si aplica)
   - Item creado con nombre del archivo STL
   - Cliente notificado

---

## 🎨 PRUEBA 9: PRECISIÓN DEL SISTEMA

### Objetivo: Validar que NO pida calibración incorrectamente

#### Pasos:
1. **Navegar** a `/admin/calculadora/precision` (o ruta equivalente)
2. **Verificar:**
   - **Calibraciones activas:** Debe mostrar 6
   - **Estado general:** Debe ser "Excelente", "Bueno" o "Aceptable"
   - **NO debe mostrar:** "Requiere Calibración"
   - **Error de material:** Debe mostrar porcentaje calculado
   - **Error de tiempo:** Debe mostrar porcentaje calculado
   - **Última calibración:** Debe mostrar fecha reciente

#### ✅ Criterio de Éxito:
- Con 6 calibraciones activas → Estado nunca será "poor"
- Lógica prioriza existencia de calibraciones sobre error exacto
- Sistema reconoce que YA ESTÁ CALIBRADO

---

## 📊 CHECKLIST FINAL

Marca cada prueba después de ejecutarla:

### Tarjetas de Regalo
- [ ] Panel admin carga sin errores
- [ ] Crear tarjeta manual funciona
- [ ] Email de tarjeta llega al destinatario
- [ ] Tarjetas de prueba visibles (3 tarjetas)
- [ ] Estados correctos (Activa, Agotada)

### Compra y Activación
- [ ] Cliente puede comprar gift card
- [ ] Redirige a pago correctamente
- [ ] Subtotal correcto (sin IVA, sin envío)
- [ ] Admin puede marcar como pagado
- [ ] **CRÍTICO:** Tarjeta se activa automáticamente al pagar
- [ ] Email se envía automáticamente al destinatario

### Uso de Tarjetas
- [ ] Aplicar código en carrito funciona
- [ ] Descuento se aplica correctamente
- [ ] Saldo se actualiza al pagar
- [ ] Badge cambia a "Agotada" cuando saldo = 0

### IVA y Envíos
- [ ] Gift cards: IVA = €0, Envío = €0
- [ ] Productos físicos: IVA = 21%, Envío según config
- [ ] Mix: IVA solo en físicos, Envío solo para físicos
- [ ] PayPal/Revolut reciben monto correcto (con IVA + envío)

### Facturación
- [ ] Factura automática al marcar pedido como pagado
- [ ] Factura automática al aprobar cotización
- [ ] Números de factura únicos
- [ ] Totales correctos (subtotal + IVA + envío)

### Notificaciones
- [ ] Sin notificaciones duplicadas
- [ ] Emails llegan correctamente
- [ ] Real-time updates funcionan
- [ ] Precisión del sistema no pide calibración incorrectamente

---

## 🚨 ERRORES COMUNES Y SOLUCIONES

### Error: "Error al cargar las tarjetas de regalo"
**Causa:** RLS policy problemática  
**Estado:** ✅ CORREGIDO (política eliminada)  
**Validar:** Recargar `/admin/gift-cards` debe funcionar ahora

### Error: "Tarjeta no se activa al pagar"
**Causa:** Notes del pedido no contiene "Tarjeta Regalo: CODIGO"  
**Solución:** Verificar en `/admin/pedidos` → Detalles → Notes debe tener el patrón exacto  
**Trigger:** `trigger_activate_gift_card_on_payment` busca este patrón

### Error: "Email no llega"
**Causa:** `RESEND_API_KEY` no configurada  
**Solución:** Verificar secrets en configuración del proyecto  
**Alternativa:** Usar botón "Reenviar" en panel admin después de configurar

### Error: "IVA aplicado a gift card"
**Causa:** Campo `tax_enabled` en gift card  
**Estado:** ✅ CORREGIDO (siempre false para gift cards)  
**Validar:** Verificar en resumen de pago que IVA = €0 para gift cards

### Error: "Envío cobrado en gift card"
**Causa:** Lógica de shipping no excluye gift cards  
**Estado:** ✅ CORREGIDO (detecta si todos son gift cards)  
**Validar:** Verificar en resumen de pago que Envío = €0 para solo gift cards

---

## 📧 VERIFICACIÓN DE EMAILS

### Email de Gift Card Debe Contener:
- ✅ Asunto: "🎁 ¡Has recibido una Tarjeta Regalo de [COMPAÑÍA]!"
- ✅ Código: XXXX-XXXX-XXXX-XXXX (en grande, monospace)
- ✅ Monto: €XX.XX (en grande, bold)
- ✅ Nombre del remitente
- ✅ Mensaje personalizado (si existe)
- ✅ Instrucciones de uso
- ✅ Diseño profesional con colores corporativos

### Email de Confirmación de Pedido Debe Contener:
- ✅ Número de pedido
- ✅ Desglose: subtotal, IVA, envío, total
- ✅ Lista de items
- ✅ Dirección de envío (si aplica)

---

## 🎯 RESULTADO ESPERADO FINAL

Después de todas las pruebas, deberías tener:

### En Base de Datos:
- 3+ tarjetas de regalo de prueba
- 1+ tarjetas de regalo reales (creadas en prueba 2)
- 1+ pedidos con gift cards
- 1+ facturas generadas automáticamente
- Configuración de IVA y envíos poblada

### En Panel Admin:
- `/admin/gift-cards` funcionando sin errores
- `/admin/pedidos` mostrando pedidos con notas de gift cards
- `/admin/invoices` con facturas automáticas
- `/admin/calculadora/precision` mostrando estado correcto (no "requiere calibración")

### En Cuenta de Cliente:
- Tarjetas recibidas visibles en `/mi-cuenta?tab=giftcards`
- Estados correctos (No Activada → Activa → Agotada)
- Real-time updates: cambios se reflejan sin recargar
- Pedidos con totales correctos

### En Bandeja de Email:
- Email de gift card recibido (diseño profesional)
- Email de confirmación de pedido
- Emails de notificaciones (sin duplicados)

---

## 📞 SI ALGO FALLA

1. **Abrir Console** (F12) y copiar error exacto
2. **Verificar logs** de Supabase (si tienes acceso)
3. **Reportar error** con:
   - Pantalla donde ocurrió
   - Mensaje de error exacto
   - Paso que estabas ejecutando
   - Screenshot si es visual

---

**Instrucciones Preparadas Por:** Sistema de Validación Lovable  
**Próxima Acción:** Ejecutar estas pruebas y reportar resultados  
**Documentos de Referencia:** AUDITORIA_INTEGRAL_SISTEMA_COMPLETO.md
