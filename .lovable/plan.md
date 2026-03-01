

# Auditoria Completa del Sistema de Pagos

## 1. Error de Build (Critico - Bloquea todo)

**Archivo:** `src/components/STLUploader.tsx` linea 144

**Problema:** La propiedad `analysisParams` se pasa en el resultado pero el tipo `AnalysisResult & { file: File }` no la incluye.

**Solucion:** Actualizar el tipo del callback `onAnalysisComplete` para incluir `analysisParams` opcional, o expandir la interfaz.

---

## 2. Hallazgos de la Auditoria Global del Sistema de Pagos

### 2.1 Flujo de Productos (Carrito -> Envio -> Resumen -> Pago)

| Componente | Estado | Notas |
|---|---|---|
| Cart (`/carrito`) | OK | Calculo de subtotal, cupones, tarjetas regalo funcional |
| ShippingInfo (`/informacion-envio`) | OK | Validacion, sesion de checkout, perfil autofill |
| PaymentSummary (`/resumen-pago`) | Revisar | Necesita verificacion de calculo de envio y IVA |
| Payment (`/pago`) | OK | 4 metodos, gift card, flujo invoice |
| CardPaymentPage (`/pago-tarjeta`) | OK | Overlay 4s, pestaña nueva, pedido pending |
| RevolutPaymentPage (`/pago-revolut`) | OK | Mismo flujo que tarjeta |
| PaymentInstructions (`/pago-instrucciones`) | OK | Transferencia bancaria |
| PaymentProcessing (`/pago-en-proceso`) | OK | Pagina de confirmacion |

### 2.2 Problemas Identificados

**A. `paymentUtils.ts` linea 283: `shipping: 0` hardcoded**
- En `calculateOrderTotals()`, el shipping siempre es 0. Esta funcion se usa en algunos flujos pero NO en el flujo principal de Payment.tsx (que calcula shipping dinámicamente). Riesgo bajo pero debe corregirse para consistencia.

**B. `PaymentSummary.tsx` - Verificar sincronizacion de calculos**
- El resumen de pago calcula subtotal, IVA y envio independientemente. Debe coincidir con Payment.tsx.

**C. Textos hardcoded en español**
- `paymentUtils.ts` linea 309: `"Tarjeta de regalo aplicada:..."` - No traducido
- `paymentUtils.ts` linea 317: Notas de tarjeta regalo en español
- `PaymentInstructions.tsx` linea 31: `"No se encontró información del pedido"` - No traducido
- `Payment.tsx` linea 396-397: Toast de gift card en español hardcoded

**D. `STLUploader.tsx` - Error de tipos (BUILD ERROR)**
- Linea 144: `analysisParams` no existe en el tipo de retorno

### 2.3 Flujo de Cotizaciones (`/cotizaciones`)

- Calculo de envio por codigo postal: funcional (usa `calculateShippingByPostalCode`)
- Contexto separado `'quotes'` vs `'products'`: correctamente implementado
- Umbral de envio gratis para cotizaciones: configurado

### 2.4 Flujo de Facturas (Invoice Payment)

- Pago desde "Mi Cuenta" -> Payment.tsx: funcional
- Soporta bank_transfer, card, paypal, revolut: correcto
- Status siempre "pending" hasta verificacion admin: correcto

### 2.5 Sistema de Envio (`useShippingCalculator`)

- 7 pasos de prioridad: producto free/disabled/custom -> global enable -> umbral gratis -> codigo postal especial -> zonas por peso -> tarifa pais -> default
- Contexto productos vs cotizaciones: correcto
- Calculo por peso: funcional

### 2.6 Sistema de Impuestos (`useTaxSettings`)

- Lee `tax_enabled` y `tax_rate` de `site_settings`
- Solo aplica IVA a productos con `tax_enabled !== false`
- Tarjetas regalo excluidas de IVA: correcto

---

## 3. Plan de Correccion

### Tarea 1: Corregir error de build en STLUploader.tsx
- Actualizar la interfaz del callback para aceptar `analysisParams`

### Tarea 2: Corregir shipping hardcoded en paymentUtils
- Eliminar `shipping: 0` hardcoded en `calculateOrderTotals` y usar parametro dinamico

### Tarea 3: Internacionalizar textos hardcoded en español
- Traducir mensajes en `paymentUtils.ts`, `Payment.tsx`, `PaymentInstructions.tsx`

### Tarea 4: Verificar consistencia de calculos PaymentSummary vs Payment
- Asegurar que ambos usan la misma formula: `subtotal + IVA + envio - cupones - gift cards = total`

### Tarea 5: Test end-to-end de cada flujo de pago
- Productos: carrito -> envio -> resumen -> pago (4 metodos)
- Cotizaciones: archivo 3D -> personalizar -> envio -> revision
- Facturas: mi cuenta -> pagar factura -> metodo de pago

---

## Detalles Tecnicos

### Archivos a modificar:
1. `src/components/STLUploader.tsx` - Fix tipo AnalysisResult (build error)
2. `src/lib/paymentUtils.ts` - Fix shipping hardcoded, internacionalizar notas
3. `src/pages/Payment.tsx` - Internacionalizar textos hardcoded
4. `src/pages/PaymentInstructions.tsx` - Internacionalizar textos hardcoded
5. `src/pages/PaymentSummary.tsx` - Verificar calculos

### Checklist de Verificacion Final:
- [ ] Build sin errores
- [ ] Subtotal calculado correctamente (suma de precio x cantidad)
- [ ] IVA aplicado solo a productos con tax_enabled (no gift cards)
- [ ] Envio calculado segun configuracion (zonas, codigos postales, umbrales)
- [ ] Total = subtotal + IVA + envio - descuentos
- [ ] Transferencia bancaria: redirige a instrucciones
- [ ] Tarjeta: overlay 4s + nueva pestaña + /pago-en-proceso
- [ ] Revolut: overlay 4s + nueva pestaña + /pago-en-proceso
- [ ] PayPal: crea pedido + redirige a PayPal
- [ ] Gift card cubre total: procesa pago automaticamente
- [ ] Factura: actualiza status a pending + redirige segun metodo
- [ ] Cotizacion: envio calculado con contexto 'quotes'
- [ ] Todos los textos traducidos en ES/EN/NL

