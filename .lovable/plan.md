

# Plan: Correccion Completa del Sistema de Pagos

## Problema
El proyecto tiene **13 errores de compilacion** que impiden que la aplicacion se renderice (lo que explica la pantalla en blanco en la vista previa). Ademas, se requiere una auditoria completa del sistema de pagos.

## Fase 1: Corregir errores de compilacion (CRITICO - desbloquea la vista previa)

### 1.1 `src/lib/paymentConfigUtils.ts` (lineas 93 y 161)
- **Error**: Comparacion `value === true` cuando `value` es siempre `string` desde la base de datos
- **Solucion**: Eliminar `|| value === true` ya que el valor de la BD siempre es string

### 1.2 `src/pages/Payment.tsx` (linea 653)
- **Error**: `triggerNotificationRefresh()` se llama sin argumentos, pero requiere `userId: string`
- **Solucion**: Pasar `user.id` como argumento: `triggerNotificationRefresh(user.id)`

### 1.3 `src/pages/admin/Invoices.tsx` (linea 61)
- **Error**: Accede a `taxSettings.is_enabled` y `taxSettings.tax_rate` que no existen en la interfaz `TaxSettings`
- **Solucion**: Cambiar a `taxSettings.enabled` y `taxSettings.rate` (nombres correctos de la interfaz)

### 1.4 `src/pages/admin/Invoices.tsx` (lineas 486, 496, 521)
- **Error**: Referencia `newInvoice.id` que no existe en el estado del formulario (no tiene campo `id`)
- **Solucion**: Cambiar a `invoiceData?.id` (el registro retornado por la base de datos despues de insertar)

### 1.5 `src/pages/admin/Quotes.tsx` (lineas 251-252)
- **Error**: `parseFloat()` recibe `number | "0"` en vez de `string`
- **Solucion**: Envolver en `String()`: `parseFloat(String(value))`

### 1.6 `src/pages/admin/Quotes.tsx` (linea 377)
- **Error**: `fullQuote.quote_number` no existe en la tabla `quotes`
- **Solucion**: Usar `fullQuote.id` o generar un identificador alternativo para la referencia de cotizacion

### 1.7 `src/pages/user/MyAccount.tsx` (lineas 178-179)
- **Error**: La relacion entre `loyalty_redemptions` y `coupon_code` no se resuelve correctamente en la query de Supabase
- **Solucion**: Corregir la query de join - el campo `coupon_code` no es una FK directa; acceder a los datos del cupon por otra via o corregir el nombre de la relacion

## Fase 2: Auditoria del flujo de pagos

Una vez corregidos los errores de compilacion, se verificaran los siguientes flujos:

### 2.1 Calculo de precios
- Subtotal (suma de productos)
- IVA (segun configuracion de tax_settings en site_settings)
- Envio (segun configuracion de shipping)
- Descuento por cupon (porcentaje, fijo, envio gratis)
- Descuento por tarjeta de regalo
- Total final = subtotal - cupon + IVA + envio - tarjeta regalo

### 2.2 Metodos de pago
- Transferencia bancaria: crear pedido pendiente + factura + redirigir a instrucciones
- Tarjeta: crear pedido pendiente + factura + redirigir a pagina de tarjeta
- PayPal: crear pedido + redirigir a PayPal
- Revolut: crear pedido + factura + redirigir a pagina Revolut
- Tarjeta de regalo (pago completo): crear pedido pagado + descontar saldo

### 2.3 Pago de facturas
- Con tarjeta de regalo
- Con otros metodos de pago
- Actualizacion correcta del estado de factura y pedido vinculado

### 2.4 Cotizaciones a pedidos
- Aprobacion de cotizacion genera pedido y factura automaticamente
- Calculo correcto de impuestos desde site_settings (no desde tabla `tax_settings` inexistente)

## Fase 3: Correcciones adicionales encontradas durante auditoria

### 3.1 Quotes.tsx - Query a tabla `tax_settings` inexistente
- La linea 258-263 consulta una tabla `tax_settings` que no existe en el schema
- Debe usar el patron `site_settings` con claves `tax_enabled` y `tax_rate`, igual que el hook `useTaxSettings`

### 3.2 Mensajes hardcoded en espanol
- Varios toasts y notificaciones usan texto en espanol hardcoded en vez del sistema i18n
- Se corregiran para usar `t()` donde sea posible

## Detalles Tecnicos

### Archivos a modificar:
1. `src/lib/paymentConfigUtils.ts` - 2 lineas
2. `src/pages/Payment.tsx` - 1 linea
3. `src/pages/admin/Invoices.tsx` - 5 lineas
4. `src/pages/admin/Quotes.tsx` - 4 lineas (compilacion) + ~10 lineas (query tax_settings)
5. `src/pages/user/MyAccount.tsx` - 3 lineas (query corregida)

### Lista de verificacion post-implementacion:
1. La aplicacion compila sin errores
2. La vista previa muestra el sitio correctamente
3. Se puede navegar a la pagina de pago
4. Los calculos de subtotal, IVA, envio y total son correctos
5. Se puede aplicar un cupon de descuento
6. Se puede aplicar una tarjeta de regalo
7. Cada metodo de pago redirige correctamente
8. Aprobar una cotizacion crea pedido y factura
9. Se puede pagar una factura con tarjeta de regalo
10. El panel de admin puede crear facturas con tarjetas de regalo
11. La cuenta del usuario muestra cupones canjeados correctamente
12. No hay errores en consola del navegador

