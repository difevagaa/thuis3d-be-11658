
## Auditoría Completa de Cálculos Financieros

### Bug Crítico #1: Edge Function `process-quote-approval` lee IVA de tabla equivocada

**Líneas 139-148** de `supabase/functions/process-quote-approval/index.ts`:
```js
// ACTUAL (INCORRECTO) — lee de tabla `tax_settings` que está VACÍA
const { data: settings } = await supabase
  .from('tax_settings')
  .select('*')
  .eq('is_enabled', true)
  .maybeSingle();
taxRate = settings?.tax_rate || 0; // Siempre 0 porque la tabla está vacía
```

La configuración real de IVA está en `site_settings` con claves `tax_enabled` y `tax_rate`. La tabla `tax_settings` existe pero **tiene 0 registros**. Esto causa que al aprobar una cotización, la factura y el pedido se crean con **IVA = 0** siempre, aunque el admin lo tenga configurado al 21%.

**Además**, la línea 140 usa `quote.tax_enabled` que **no existe como columna** en la tabla `quotes` — siempre es `undefined`, lo que hace que `shouldApplyTax` sea `true` por defecto pero `taxRate` es 0.

**Corrección:** Cambiar la lectura de IVA para usar `site_settings` (misma lógica que `useTaxSettings.tsx`).

### Bug #2: La cotización no almacena si tiene IVA aplicado

El formulario de cotización (`Quotes.tsx` línea 375) guarda `finalPrice = analysisResult.estimatedTotal` que es el **precio de impresión** calculado por `stlAnalyzer.ts`. Este precio **NO incluye IVA** — es solo costo de impresión con multiplicador de ganancia. 

El `totalEstimated` mostrado al usuario (línea 570) es `estimatedTotal + shippingCost`, tampoco incluye IVA.

**Corrección:** 
- Agregar columna `tax_enabled` a la tabla `quotes` (por defecto `true`)
- En el resumen de la cotización (`Quotes.tsx`), mostrar el IVA desglosado
- Almacenar en la cotización el subtotal (sin IVA) y el IVA por separado

### Bug #3: Inconsistencia en cálculos Cart vs Payment

En `Cart.tsx` (línea 179-181), el IVA se calcula sobre el monto taxable **después de aplicar el descuento proporcional del cupón**:
```js
const taxableAfterDiscount = Math.max(0, taxableAmount - (discount * discountRatio));
const tax = calculateTax(taxableAfterDiscount, true);
```

En `Payment.tsx` (línea 225-239), el IVA se calcula sobre el monto taxable **sin considerar descuento del cupón**:
```js
const taxableAmount = cartItems.filter(item => !item.isGiftCard && (item.tax_enabled ?? true))...
const taxRate = taxSettings.enabled ? taxSettings.rate / 100 : 0;
return Number((taxableAmount * taxRate).toFixed(2));
```

El cupón se aplica en Cart pero **no se pasa a Payment** para el cálculo de IVA. Esto crea una diferencia de valor entre lo que ve en carrito y lo que paga.

**Corrección:** Unificar la lógica. En Payment, aplicar el descuento del cupón al cálculo de IVA igual que en Cart.

### Bug #4: Valores actuales de `site_settings`

Actualmente `tax_enabled = false` y `tax_rate = 21`. Si el usuario espera que se cobre IVA, debe cambiar `tax_enabled` a `true`. Pero incluso con `true`, la Edge Function no lo leería porque busca en la tabla equivocada.

---

### Plan de Corrección

#### Tarea 1: Corregir lectura de IVA en `process-quote-approval`
**Archivo:** `supabase/functions/process-quote-approval/index.ts`
- Reemplazar lectura de `tax_settings` por lectura de `site_settings` (claves `tax_enabled`, `tax_rate`)
- Eliminar dependencia de `quote.tax_enabled` inexistente
- Mantener la misma fórmula: `subtotal + tax + shipping = total`

#### Tarea 2: Mostrar IVA en el resumen de cotización
**Archivo:** `src/pages/Quotes.tsx`
- Leer configuración de IVA con `useTaxSettings`
- Mostrar desglose: Subtotal (precio impresión) + IVA + Envío = Total
- El `estimated_price` que se guarda en la BD seguirá siendo el subtotal (sin IVA)

#### Tarea 3: Unificar cálculo de IVA entre Cart y Payment
**Archivo:** `src/pages/Payment.tsx`
- Considerar cupón aplicado al calcular el IVA (igual que en Cart)
- Leer cupón desde `sessionStorage` para aplicar descuento proporcional

#### Tarea 4: Verificar coherencia en toda la cadena
- Verificar que Invoice display (`InvoiceDisplay.tsx`, `InvoiceView.tsx`) muestre correctamente subtotal, IVA, envío, descuento y total
- Verificar que los triggers de notificación usen valores redondeados
- Verificar que `paymentUtils.calculateOrderTotals` sea coherente con Cart/Payment

### Lista de Verificación Final
1. Aprobar cotización → factura y pedido deben incluir IVA correcto (21% si habilitado)
2. Resumen de cotización del cliente debe mostrar IVA desglosado
3. Carrito y Pago deben mostrar el mismo total
4. Facturas generadas deben tener subtotal + IVA + envío = total
5. Notificaciones de aprobación deben mostrar total con IVA
6. Cambiar `tax_enabled` en admin → debe afectar inmediatamente los cálculos
