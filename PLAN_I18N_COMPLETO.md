# Plan Completo de Internacionalización (i18n)

## Estado Actual
✅ **Quotes.tsx**: COMPLETADO - Todos los textos traducidos a ES/EN/NL
✅ **Bucket quote-files**: Existe y funcional
⏳ **Políticas RLS**: Requieren verificación

## Archivos Detectados con Textos Hardcodeados

### Críticos (Flujo de Compra)
1. **Payment.tsx** - 4+ textos en español:
   - "Debes completar la información de envío primero"
   - "Método de pago no válido"
   - "Total a Pagar"
   - "Dirección de Envío"
   - "Método de Pago"

2. **PaymentInstructions.tsx** - Textos de instrucciones de pago

3. **ShippingInfo.tsx** - Formulario de envío (alta prioridad)

4. **Cart.tsx** - Carrito de compras

5. **ProductDetail.tsx** - Detalles de producto

### Administrativos
6. **CreateOrder.tsx** - "Por favor ingresa la dirección de envío"
7. **Invoices.tsx** - "Método de Pago"
8. **OrderDetail.tsx** - Varios textos
9. **admin/QuoteDetail.tsx** - Vista de cotizaciones

### Usuario
10. **user/OrderDetail.tsx** - Vista de pedidos del usuario
11. **user/Messages.tsx** - Sistema de mensajes
12. **SendAdminMessage.tsx** - "Adjuntar Archivos", "Enviando…"

### Otros
13. **Home.tsx** - Página principal
14. **Gallery.tsx** - Galería
15. **GiftCard.tsx** - Tarjetas de regalo
16. **Blog.tsx** & **BlogPost.tsx** - Sistema de blog
17. **STLUploader.tsx** - Avisos y ayudas

## Estrategia de Ejecución

### Fase 1: Flujo de Compra (CRÍTICO)
**Prioridad MÁXIMA** - Afecta directamente ventas

#### 1.1 Payment.tsx
- Namespace: `payment`
- Claves necesarias:
  - `mustCompleteShipping`: "Debes completar la información de envío primero"
  - `invalidPaymentMethod`: "Método de pago no válido"
  - `totalToPay`: "Total a Pagar"
  - `shippingAddress`: "Dirección de Envío"
  - `paymentMethod`: "Método de Pago"
  - `selectPaymentMethod`: "Selecciona cómo deseas pagar tu pedido"

#### 1.2 ShippingInfo.tsx
- Namespace: `shipping`
- Revisar TODOS los labels, placeholders, validaciones

#### 1.3 Cart.tsx
- Namespace: `cart`
- Botones, mensajes de carrito vacío, totales

### Fase 2: Sistema de Cotizaciones (Emails)
**Prioridad ALTA** - Comunicación con clientes

#### 2.1 send-quote-email Edge Function
- Parametrizar idioma
- Plantillas ES/EN/NL
- Usar preferencia de usuario o parámetro `lang`

#### 2.2 send-order-confirmation
- Igual que anterior

#### 2.3 send-invoice-email
- Templates multiidioma

### Fase 3: Páginas Públicas
**Prioridad MEDIA** - Experiencia de usuario

#### 3.1 Home.tsx
- Namespace: `home`
- Hero, features, CTA

#### 3.2 ProductDetail.tsx
- Namespace: `products`
- Descripciones, botones, reviews

#### 3.3 Gallery.tsx
- Namespace: `gallery`
- Títulos, mensajes vacíos

#### 3.4 GiftCard.tsx
- Namespace: `giftCards`
- Formulario y confirmaciones

### Fase 4: Blog y Contenido Dinámico
**Prioridad MEDIA**

#### 4.1 Blog.tsx & BlogPost.tsx
- Namespace: `blog`, `blogPost`
- Integración con sistema de traducción automática

#### 4.2 Productos
- Usar sistema de `translations` table
- Verificar auto-traducción

### Fase 5: Panel Administrativo
**Prioridad BAJA** - Uso interno

#### 5.1 CreateOrder.tsx, Invoices.tsx, etc.
- Namespace: `admin`
- No crítico para clientes pero importante para experiencia admin

### Fase 6: Componentes Compartidos
**Prioridad MEDIA**

#### 6.1 STLUploader.tsx
- Avisos de error
- Ayudas contextuales

#### 6.2 SendAdminMessage.tsx
- Labels de formulario

## Implementación Técnica

### Archivos de Traducción a Crear/Actualizar
```
public/locales/es/payment.json  ✅ CREAR
public/locales/en/payment.json  ✅ CREAR
public/locales/nl/payment.json  ✅ CREAR

public/locales/es/shipping.json ✅ ACTUALIZAR
public/locales/en/shipping.json ✅ ACTUALIZAR
public/locales/nl/shipping.json ✅ ACTUALIZAR

... (similar para todos los namespaces)
```

### Configuración i18n
Agregar nuevos namespaces en `src/i18n/config.ts`:
```typescript
ns: [
  'common', 'navigation', 'forms', 'products', 'admin', 
  'errors', 'home', 'blog', 'footer', 'blogPost', 
  'giftCards', 'reviews', 'cart', 'shipping', 'payment', 
  'invoice', 'quotes', 'gallery', 'auth'
],
```

### Edge Functions
Todos los emails deben recibir parámetro `lang` y usar plantillas traducidas:

```typescript
interface EmailRequest {
  to: string;
  customer_name: string;
  quote_type: string;
  description: string;
  lang?: 'es' | 'en' | 'nl'; // Nuevo parámetro
}

// Plantillas por idioma
const emailTemplates = {
  es: { subject: "...", body: "..." },
  en: { subject: "...", body: "..." },
  nl: { subject: "...", body: "..." }
};
```

## Verificación y Testing

### Por Cada Fase
1. **Traducción completa**: Buscar regex `"[A-Za-záéíóúñÑ]{5,}"` en archivo
2. **Testing 3 idiomas**: ES, EN, NL
3. **Verificar toasts**: Todos usando `t()`
4. **Verificar validaciones**: Mensajes de error traducidos

### Testing Final
- [ ] Flujo completo de compra (3 idiomas)
- [ ] Flujo de cotización 3D (3 idiomas)
- [ ] Flujo de cotización de servicio (3 idiomas)
- [ ] Gift cards (3 idiomas)
- [ ] Blog post público (3 idiomas)
- [ ] Galería (3 idiomas)
- [ ] Emails recibidos en idioma correcto

## Políticas RLS Requeridas

### quote-files bucket
```sql
-- Política de INSERT
CREATE POLICY "Users can upload quote files to their folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'quote-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política de SELECT
CREATE POLICY "Users can view their own quote files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'quote-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política de DELETE
CREATE POLICY "Users can delete their own quote files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'quote-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

## Próximos Pasos Inmediatos

1. ✅ Verificar políticas de quote-files
2. ⏳ Crear archivos payment.json (es/en/nl)
3. ⏳ Traducir Payment.tsx
4. ⏳ Traducir ShippingInfo.tsx
5. ⏳ Traducir Cart.tsx
6. ⏳ Parametrizar send-quote-email
7. ⏳ Testing flujo completo

## Tiempo Estimado
- **Fase 1 (Crítico)**: 2-3 horas
- **Fase 2 (Emails)**: 1 hora
- **Fase 3 (Públicas)**: 2 horas
- **Fase 4 (Blog)**: 1 hora
- **Fase 5 (Admin)**: 2 horas
- **Fase 6 (Componentes)**: 1 hora
- **Testing completo**: 2 horas

**TOTAL**: ~11-12 horas de trabajo enfocado
