# Plan Completo de Traducción Automática - Sistema i18n

## Estado Actual del Sistema

### ✅ Componentes Ya Implementados
1. **Sistema i18n básico** (react-i18next + i18next-browser-languagedetector + i18next-http-backend)
2. **Archivos de traducción estáticos** en `/public/locales/{lang}/` para:
   - common.json, navigation.json, forms.json, errors.json
   - products.json, cart.json, shipping.json, payment.json
   - home.json, blog.json, blogPost.json, footer.json
   - gallery.json, reviews.json, quotes.json, invoice.json
   - giftCards.json, auth.json, account.json, admin.json

3. **Base de datos de traducción dinámica** con tablas:
   - `translations` - Almacena traducciones de contenido dinámico
   - `translation_queue` - Cola de contenido pendiente de traducción
   - `translation_settings` - Configuración del sistema

4. **Edge Function `auto-translate`** - Procesa cola de traducción usando Lovable AI (gemini-2.5-flash)

5. **Panel de administración `/admin/traducciones`** - Gestión de traducciones

6. **Componente `LanguageSelector`** - Selector de idioma visible con banderas

### ❌ Problemas Identificados por el Usuario

1. **Traducciones incompletas en "Mi Cuenta"** - Solo algunas opciones están traducidas
2. **Mensajes toast no traducidos** - Aparecen en español independientemente del idioma
3. **Notificaciones sin traducir** - Notificaciones in-app y emails en español
4. **Páginas con traducción parcial** - Ej: Cotizaciones solo traducida hasta cierto punto
5. **Contenido dinámico no se traduce automáticamente** - Productos, blogs, etc. aparecen solo en español
6. **Falta de sistema para traducir nuevo contenido automáticamente**

---

## Plan de Acción - Ejecución Inmediata

### FASE 1: Completar Traducción de Interfaz Estática ✅ EN PROGRESO

#### 1.1 Actualizar MyAccount.tsx
- [x] Actualizar archivos account.json (es/en/nl) con TODOS los textos
- [ ] Reemplazar TODOS los textos hardcodeados en MyAccount.tsx con t()
- [ ] Traducir TODOS los mensajes toast usando t()
- [ ] Asegurar que fechas se formateen según idioma actual

#### 1.2 Auditar y Completar Otras Páginas
- [ ] **Quotes.tsx** - Revisar traducción completa (reportada como incompleta)
- [ ] **Products.tsx** - Verificar traducción
- [ ] **ProductDetail.tsx** - Verificar traducción
- [ ] **Home.tsx** - Verificar traducción
- [ ] **Gallery.tsx** - Verificar traducción
- [ ] **GiftCard.tsx** - Verificar traducción
- [ ] **Blog.tsx y BlogPost.tsx** - Verificar traducción
- [ ] **Cart.tsx** - Verificar traducción
- [ ] **ShippingInfo.tsx** - Verificar traducción
- [ ] **Payment.tsx** - Verificar traducción
- [ ] **PaymentSummary.tsx** - Verificar traducción

#### 1.3 Crear Sistema de Traducción de Toast Globalizado
```typescript
// src/lib/i18nToast.ts
import { toast } from 'sonner';
import i18n from '@/i18n/config';

export const i18nToast = {
  success: (key: string, options?: any) => {
    const message = i18n.t(key, options);
    toast.success(message);
  },
  error: (key: string, options?: any) => {
    const message = i18n.t(key, options);
    toast.error(message);
  },
  info: (key: string, options?: any) => {
    const message = i18n.t(key, options);
    toast.info(message);
  }
};
```

#### 1.4 Crear Namespace de Mensajes
```json
// public/locales/es/messages.json
{
  "success": {
    "profileUpdated": "Perfil actualizado exitosamente",
    "replySent": "✉️ Respuesta enviada al administrador",
    "codeCopied": "Código copiado al portapapeles",
    "quoteSubmitted": "Cotización enviada exitosamente",
    "orderCreated": "Pedido creado exitosamente",
    "paymentSuccess": "Pago procesado exitosamente"
  },
  "error": {
    "profileUpdateFailed": "Error al actualizar perfil",
    "replyFailed": "Error al enviar respuesta",
    "quoteSubmitFailed": "Error al enviar cotización",
    "fileTooLarge": "{filename} excede el límite de {size}MB",
    "uploadFailed": "Error al subir archivo",
    "paymentFailed": "Error al procesar el pago"
  },
  "info": {
    "uploadingFiles": "Subiendo archivos adjuntos...",
    "processing": "Procesando...",
    "loading": "Cargando..."
  }
}
```

---

### FASE 2: Sistema de Traducción Automática para Contenido Dinámico

#### 2.1 Verificar Triggers SQL Existentes
Asegurar que TODAS las tablas con contenido traducible tengan triggers que encolen automáticamente:
- `products` (name, description)
- `categories` (name, description)
- `materials` (name, description)
- `colors` (name)
- `blog_posts` (title, excerpt, content)
- `pages` (title, content)
- `legal_pages` (title, content)
- `homepage_banners` (title, subtitle, button_text)
- `gallery_items` (title, description)
- `footer_links` (label)
- `reviews` (comment)

#### 2.2 Mejorar Edge Function auto-translate
```typescript
// supabase/functions/auto-translate/index.ts
// Añadir contexto especializado por tipo de entidad:
- products: mantener términos técnicos 3D
- blog: tono conversacional
- legal: precisión legal
- reviews: mantener tono original del usuario

// Añadir rate limiting más robusto:
- 500ms entre traducciones
- Procesar en batches de 10
- Reintentos automáticos en caso de error
```

#### 2.3 Actualizar Panel de Administración de Traducciones
- [ ] Botón "Traducir Todo el Contenido" ejecuta:
  1. Encola TODO el contenido existente
  2. Procesa la cola completa
  3. Muestra progreso en tiempo real
  4. Genera reporte de éxito/errores

- [ ] Añadir estadísticas de cobertura:
  - % de productos traducidos (EN/NL)
  - % de blogs traducidos (EN/NL)
  - % de páginas traducidas (EN/NL)

- [ ] Permitir re-traducción manual de items específicos

---

### FASE 3: Traducción de Notificaciones y Emails

#### 3.1 Notificaciones In-App
Actualizar tabla `notifications` para incluir columna `language`:
```sql
ALTER TABLE public.notifications ADD COLUMN language VARCHAR(5) DEFAULT 'es';
```

Modificar triggers/funciones que crean notificaciones para:
1. Detectar idioma del usuario (desde profiles o preferencia guardada)
2. Generar mensaje en el idioma correcto
3. Guardar language junto con la notificación

#### 3.2 Edge Functions de Email
Parametrizar TODAS las Edge Functions de email con opción `lang`:
- `send-quote-email`
- `send-order-confirmation`
- `send-invoice-email`
- `send-quote-update-email`
- `send-loyalty-points-email`
- `send-gift-card-email`
- `send-welcome-email`
- `send-notification-email`

Crear plantillas de email en 3 idiomas para cada tipo.

---

### FASE 4: Hook Personalizado useTranslatedContent para Contenido Dinámico

```typescript
// src/hooks/useTranslatedContent.tsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

export function useTranslatedContent(
  entityType: string,
  entityId: string,
  fieldName: string,
  fallback: string
) {
  const { i18n } = useTranslation();
  const [content, setContent] = useState(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTranslation = async () => {
      // Si el idioma es español, usar el contenido original
      if (i18n.language === 'es') {
        setContent(fallback);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('translations')
          .select('translated_text')
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .eq('field_name', fieldName)
          .eq('language', i18n.language)
          .maybeSingle();

        if (error) throw error;

        // Fallback en cascada: idioma solicitado -> inglés -> español
        if (data?.translated_text) {
          setContent(data.translated_text);
        } else if (i18n.language !== 'en') {
          // Intentar obtener traducción en inglés como segundo fallback
          const { data: enData } = await supabase
            .from('translations')
            .select('translated_text')
            .eq('entity_type', entityType)
            .eq('entity_id', entityId)
            .eq('field_name', fieldName)
            .eq('language', 'en')
            .maybeSingle();

          setContent(enData?.translated_text || fallback);
        } else {
          setContent(fallback);
        }
      } catch (error) {
        console.error('Error fetching translation:', error);
        setContent(fallback);
      } finally {
        setLoading(false);
      }
    };

    fetchTranslation();
  }, [entityType, entityId, fieldName, fallback, i18n.language]);

  return { content, loading };
}
```

**Uso en componentes:**
```typescript
// En ProductCard.tsx
const { content: translatedName } = useTranslatedContent('product', product.id, 'name', product.name);
const { content: translatedDesc } = useTranslatedContent('product', product.id, 'description', product.description);
```

---

### FASE 5: Preferencia de Idioma del Usuario

#### 5.1 Añadir columna a profiles
```sql
ALTER TABLE public.profiles ADD COLUMN preferred_language VARCHAR(5) DEFAULT 'es';
CREATE INDEX idx_profiles_preferred_language ON public.profiles(preferred_language);
```

#### 5.2 Actualizar LanguageSelector
Cuando el usuario cambia idioma:
1. Guardar en localStorage (ya implementado)
2. Si está autenticado, guardar en profiles.preferred_language
3. Usar esta preferencia al enviar emails/notificaciones

#### 5.3 Detección Automática de Idioma al Registrarse
```typescript
// En el registro, detectar idioma del navegador y guardarlo
const browserLang = navigator.language.split('-')[0]; // 'es', 'en', 'nl'
const supportedLang = ['es', 'en', 'nl'].includes(browserLang) ? browserLang : 'es';
// Guardar en profiles.preferred_language
```

---

### FASE 6: Testing Exhaustivo (Protocolo del Usuario)

#### 6.1 Pruebas en Español (3 pruebas de cada tipo)
- [ ] Crear 3 productos diferentes
- [ ] Realizar 3 cotizaciones (3D file, servicio, diferentes materiales)
- [ ] Comprar 3 tarjetas de regalo
- [ ] Crear 3 artículos de blog
- [ ] Subir 3 items a galería
- [ ] Verificar 3 mensajes toast diferentes
- [ ] Revisar 3 notificaciones diferentes

#### 6.2 Repetir EXACTAMENTE las Mismas Pruebas en Inglés
- [ ] Cambiar idioma a inglés
- [ ] Verificar que productos se muestren en inglés
- [ ] Realizar las mismas 3 cotizaciones y verificar emails
- [ ] Comprar tarjetas y verificar emails en inglés
- [ ] Verificar blogs en inglés
- [ ] Verificar galerías en inglés
- [ ] Verificar TODOS los mensajes toast están en inglés
- [ ] Verificar TODAS las notificaciones están en inglés

#### 6.3 Repetir EXACTAMENTE las Mismas Pruebas en Neerlandés
- [ ] Cambiar idioma a neerlandés
- [ ] Verificar productos en neerlandés
- [ ] Realizar cotizaciones y verificar emails
- [ ] Comprar tarjetas y verificar emails
- [ ] Verificar blogs
- [ ] Verificar galerías
- [ ] Verificar mensajes toast en neerlandés
- [ ] Verificar notificaciones en neerlandés

#### 6.4 Generar Reporte de Problemas Identificados
- Listar TODOS los textos que no se tradujeron
- Listar TODOS los errores encontrados
- Crear plan de corrección completo
- Implementar TODAS las correcciones
- Re-ejecutar pruebas hasta 100% success

---

## Checklist de Verificación Final

### Contenido Estático
- [ ] Todas las páginas públicas traducidas completamente
- [ ] Todos los mensajes toast traducidos
- [ ] Todas las validaciones de formulario traducidas
- [ ] Todas las etiquetas de botones traducidas
- [ ] Todos los mensajes de error traducidos

### Contenido Dinámico
- [ ] Nombres de productos traducidos automáticamente
- [ ] Descripciones de productos traducidas
- [ ] Títulos de blog traducidos
- [ ] Contenido de blog traducido
- [ ] Nombres de categorías traducidos
- [ ] Nombres de materiales traducidos
- [ ] Nombres de colores traducidos
- [ ] Comentarios de reviews mantienen idioma original

### Notificaciones y Emails
- [ ] Notificaciones in-app en idioma del usuario
- [ ] Emails de cotización en idioma del usuario
- [ ] Emails de pedido en idioma del usuario
- [ ] Emails de factura en idioma del usuario
- [ ] Emails de tarjeta regalo en idioma del usuario
- [ ] Emails de bienvenida en idioma del usuario
- [ ] Emails de puntos de lealtad en idioma del usuario

### Panel de Administración
- [ ] Botón "Traducir Todo" funcional
- [ ] Estadísticas de cobertura visibles
- [ ] Cola de traducción en tiempo real
- [ ] Re-traducción manual disponible
- [ ] Exportar/importar traducciones

### Experiencia de Usuario
- [ ] Idioma persiste entre sesiones
- [ ] Idioma se aplica a TODO el contenido visible
- [ ] Sin mezcla de idiomas en ninguna página
- [ ] Fallback inteligente (idioma solicitado → inglés → español)
- [ ] Nuevo contenido se traduce automáticamente

---

## Próximos Pasos Inmediatos

1. ✅ **COMPLETADO**: Actualizar archivos account.json con traducciones completas
2. **AHORA**: Actualizar MyAccount.tsx para usar t() en TODOS los textos
3. **SIGUIENTE**: Crear helper i18nToast.ts y namespace messages.json
4. **SIGUIENTE**: Auditar y completar traducciones en Quotes.tsx
5. **SIGUIENTE**: Implementar auto-detección de idioma y persistencia en profiles
6. **SIGUIENTE**: Parametrizar Edge Functions de email con lang
7. **SIGUIENTE**: Ejecutar protocolo de testing exhaustivo

---

## Estimación de Tiempo

- Fase 1 (Interfaz Estática): 2-3 horas
- Fase 2 (Contenido Dinámico): 1-2 horas
- Fase 3 (Notificaciones/Emails): 2-3 horas  
- Fase 4 (Hook useTranslatedContent): 1 hora
- Fase 5 (Preferencias Usuario): 1 hora
- Fase 6 (Testing Exhaustivo): 2-3 horas

**Total Estimado: 9-13 horas de trabajo**

---

## Objetivo Final

**Sistema i18n 100% funcional donde:**
1. El cliente selecciona UN idioma (es/en/nl)
2. TODO el contenido visible se muestra en ESE idioma
3. Sin mezcla de idiomas en ninguna parte
4. Nuevo contenido se traduce automáticamente
5. Emails y notificaciones en idioma correcto
6. Sistema completamente gestionable desde panel admin
7. Listo para usar, no para probar
