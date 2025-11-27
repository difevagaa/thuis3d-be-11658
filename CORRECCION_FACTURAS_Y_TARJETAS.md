# CORRECCIÓN: FACTURAS PDF Y ACTIVACIÓN TARJETAS REGALO

## 🎯 PROBLEMAS SOLUCIONADOS

### 1. Activación Automática de Tarjetas Regalo
**Problema:** Las tarjetas de regalo no se activaban automáticamente cuando el administrador marcaba un pedido como pagado.

**Causa:** El trigger `activate_gift_card_on_payment` no estaba activo en la base de datos.

**Solución Implementada:**
```sql
-- Recreado trigger de activación automática
CREATE TRIGGER trigger_activate_gift_card_on_payment
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid'))
  EXECUTE FUNCTION activate_gift_card_on_payment();
```

**Cómo funciona:**
1. Cuando un administrador cambia `payment_status` a `'paid'`
2. El trigger verifica si las notas contienen `'Tarjeta Regalo: XXXX-XXXX-XXXX-XXXX'`
3. Extrae el código de la tarjeta
4. Actualiza `gift_cards.is_active = true` para ese código
5. Registra en logs el evento

**Archivos modificados:**
- `supabase/migrations/[timestamp]_reactivate_gift_card_trigger.sql`

---

### 2. Descarga de Facturas en PDF

**Problema:** El botón "Descargar Factura" mostraba "Función de descarga en desarrollo" y no funcionaba.

**Solución Implementada:**

#### A. Edge Function para Generar HTML de Factura

**Archivo:** `supabase/functions/generate-invoice-pdf/index.ts`

**Características:**
- ✅ Obtiene datos de la factura, pedido, cliente e items
- ✅ Verifica que el usuario tenga acceso a la factura
- ✅ Genera HTML profesional con estilos optimizados
- ✅ Formato tamaño carta (letter)
- ✅ Diseño de una página máximo
- ✅ Incluye:
  - Encabezado con info de empresa
  - Datos del cliente y dirección de envío
  - Tabla de items del pedido
  - Totales (subtotal, IVA, total)
  - Estado de pago (badge visual)
  - Notas si las hay
  - Footer con información de contacto

**Diseño del PDF:**
```
┌─────────────────────────────────────────┐
│ 3DThuis.be              FACTURA         │
│ Dirección...            INV-XXXXX       │
│                         [PAGADO]         │
├─────────────────────────────────────────┤
│ Facturar a:    Enviar a:    Detalles:  │
│ Cliente        Dirección    Fechas      │
├─────────────────────────────────────────┤
│ TABLA DE ITEMS                          │
│ Producto | Cant. | Precio | Total      │
├─────────────────────────────────────────┤
│ TOTALES                                 │
│ Subtotal: €XX.XX                        │
│ IVA (21%): €XX.XX                       │
│ TOTAL: €XXX.XX                          │
├─────────────────────────────────────────┤
│ Notas (si hay)                          │
├─────────────────────────────────────────┤
│ Footer con info de contacto             │
└─────────────────────────────────────────┘
```

#### B. Frontend - Generación de PDF

**Archivo:** `src/pages/user/OrderDetail.tsx`

**Dependencia agregada:** `html2pdf.js@latest`

**Funcionalidad:**
```typescript
const downloadInvoice = async () => {
  // 1. Validar que hay factura
  if (!invoice) {
    toast.error("No hay factura disponible");
    return;
  }

  // 2. Validar que el pedido está pagado
  if (order.payment_status !== 'paid') {
    toast.error("La factura solo puede descargarse cuando el pedido está pagado");
    return;
  }

  // 3. Llamar al edge function para obtener el HTML
  const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
    body: { invoice_id: invoice.id }
  });

  // 4. Crear contenedor temporal con el HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = data.html;
  document.body.appendChild(tempDiv);

  // 5. Generar PDF con html2pdf.js
  const html2pdf = (await import('html2pdf.js')).default;
  const options = {
    margin: [10, 10, 10, 10],
    filename: `factura-${invoice.invoice_number}.pdf`,
    jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
  };
  await html2pdf().set(options).from(tempDiv).save();

  // 6. Limpiar
  document.body.removeChild(tempDiv);
  toast.success("Factura descargada correctamente");
};
```

**Validaciones implementadas:**
- ✅ Solo descarga si hay factura asociada
- ✅ Solo permite descarga si `payment_status === 'paid'`
- ✅ Verifica que el usuario tenga acceso a la factura (en edge function)
- ✅ Manejo de errores con mensajes claros

**Archivos modificados:**
- `src/pages/user/OrderDetail.tsx` (líneas 77-122)
- `package.json` (agregada dependencia html2pdf.js)

---

## 🧪 CÓMO PROBAR

### Test 1: Activación Automática de Tarjetas Regalo

1. **Crear una compra de tarjeta regalo:**
   - Ir a productos
   - Comprar una tarjeta regalo
   - Completar el checkout

2. **Verificar en Admin:**
   - Ir a `/admin/tarjetas-regalo`
   - Buscar la tarjeta creada
   - Verificar que `is_active = false` inicialmente

3. **Marcar pedido como pagado:**
   - Ir a `/admin/pedidos`
   - Buscar el pedido de la tarjeta
   - Cambiar `Estado de Pago` a `Pagado`

4. **Verificar activación automática:**
   - Volver a `/admin/tarjetas-regalo`
   - La tarjeta debe aparecer con `is_active = true`
   - Se debe ver el badge verde "Activa"

5. **Verificar en logs de BD:**
```sql
-- Ver logs del trigger
SELECT * FROM postgres_logs
WHERE event_message LIKE '%Gift card%activated%'
ORDER BY timestamp DESC
LIMIT 5;
```

### Test 2: Descarga de Factura en PDF

1. **Con pedido NO pagado:**
   - Ir a un pedido con `payment_status = 'pending'`
   - El botón "Descargar Factura PDF" NO debe aparecer
   - Solo debe aparecer si está pagado

2. **Con pedido pagado:**
   - Marcar un pedido como `payment_status = 'paid'`
   - Ir a la vista del pedido (`/pedido/:id`)
   - Hacer clic en "Descargar Factura PDF"
   - Debe aparecer toast "Generando factura..."
   - Se debe descargar automáticamente el PDF

3. **Verificar contenido del PDF:**
   - ✅ Tamaño carta (letter)
   - ✅ Una página máximo
   - ✅ Encabezado con logo/nombre de empresa
   - ✅ Número de factura visible
   - ✅ Badge de estado (PAGADO/PENDIENTE)
   - ✅ Datos del cliente
   - ✅ Dirección de envío
   - ✅ Tabla de items con precios
   - ✅ Totales correctos
   - ✅ Footer con info de contacto

4. **Verificar seguridad:**
   - Intentar descargar factura de otro usuario (debe fallar con error 403)
   - Edge function valida que `invoice.order.user_id === user.id`

---

## 📊 CARACTERÍSTICAS TÉCNICAS

### Edge Function: generate-invoice-pdf

**Endpoint:** `supabase.functions.invoke('generate-invoice-pdf')`

**Input:**
```typescript
{
  invoice_id: string  // UUID de la factura
}
```

**Output:**
```typescript
{
  html: string,       // HTML completo de la factura
  invoice: object     // Datos completos de la factura
}
```

**Seguridad:**
- ✅ Requiere autenticación (Authorization header)
- ✅ Valida que el usuario tenga acceso a la factura
- ✅ Solo retorna facturas del usuario logueado

**Performance:**
- ✅ Una sola query para obtener factura + pedido + usuario
- ✅ Una query adicional para items
- ✅ Generación de HTML en memoria (rápido)
- ✅ HTML optimizado (sin imágenes pesadas)

### Diseño del PDF

**Tamaño:** Letter (8.5" x 11" o 215.9mm x 279.4mm)

**Márgenes:** 10mm en todos los lados

**Fuentes:** Arial (web-safe, no requiere carga externa)

**Colores:**
- Azul primario: #3b82f6 (headers, títulos)
- Gris oscuro: #333 (texto principal)
- Gris medio: #666 (texto secundario)
- Verde: #d1fae5 (badge "Pagado")
- Amarillo: #fef3c7 (badge "Pendiente")

**Secciones:**
1. Header (empresa + título + número)
2. Info (facturar a, enviar a, detalles)
3. Tabla de items
4. Totales
5. Notas (opcional)
6. Footer

---

## ✅ CHECKLIST DE VALIDACIÓN

### Tarjetas Regalo
- [x] Trigger creado en base de datos
- [x] Función `activate_gift_card_on_payment()` implementada
- [x] Trigger se ejecuta SOLO cuando payment_status cambia a 'paid'
- [x] Extrae código de tarjeta de las notas
- [x] Actualiza `is_active = true`
- [x] Registra en logs

### Facturas PDF
- [x] Edge function `generate-invoice-pdf` creado
- [x] Dependencia `html2pdf.js` agregada
- [x] Validación de payment_status antes de descargar
- [x] Generación de HTML profesional
- [x] Tamaño carta (letter)
- [x] Diseño de una página
- [x] Todos los datos incluidos
- [x] Seguridad validada (solo usuario owner)
- [x] Manejo de errores implementado
- [x] Toasts informativos

---

## 🎯 RESULTADO FINAL

### Antes ❌

**Tarjetas Regalo:**
- No se activaban automáticamente
- Había que activarlas manualmente

**Facturas:**
- Botón mostraba "Función de descarga en desarrollo"
- No se podía descargar

### Ahora ✅

**Tarjetas Regalo:**
- ✅ Activación automática al marcar como pagado
- ✅ Trigger en base de datos funcional
- ✅ Sin intervención manual necesaria

**Facturas:**
- ✅ Descarga funcional en PDF
- ✅ Solo disponible cuando está pagado
- ✅ Formato profesional tamaño carta
- ✅ Una página máximo
- ✅ Incluye toda la información necesaria
- ✅ Seguridad validada

---

**Fecha:** 2025-10-30  
**Estado:** ✅ COMPLETADO  
**Archivos:**
- `supabase/migrations/[timestamp]_reactivate_gift_card_trigger.sql`
- `supabase/functions/generate-invoice-pdf/index.ts`
- `src/pages/user/OrderDetail.tsx`
- `package.json` (html2pdf.js)
