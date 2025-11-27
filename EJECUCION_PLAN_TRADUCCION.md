# Ejecución del Plan de Traducción Automática

## ✅ COMPLETADO HASTA AHORA

### Fase 1 - Parcialmente Completada
1. ✅ Archivos `account.json`, `messages.json` creados en ES/EN/NL
2. ✅ Sistema `i18nToast` implementado para mensajes traducidos
3. ✅ Namespace 'messages' añadido a i18n config
4. ✅ MyAccount.tsx: Imports actualizados (i18nToast, useTranslation con 'messages')
5. ✅ MyAccount.tsx: Todos los toast reemplazados por i18nToast
6. ⚠️ MyAccount.tsx: **FALTA traducir textos hardcodeados en JSX** (ver lista abajo)

### Textos Pendientes de Traducir en MyAccount.tsx
```
Línea 430: "Información Personal" → {t('account:profile.title')}
Línea 431: "Actualiza tu información de perfil" → {t('account:profile.description')}
Línea 435: "Nombre Completo" → {t('account:profile.fullName')}
Línea 442: "Email" → {t('account:profile.email')}
Línea 446: "Teléfono" → {t('account:profile.phone')}
Línea 453: "Dirección" → {t('account:profile.address')}
Línea 462: "Ciudad" → {t('account:profile.city')}
Línea 470: "Código Postal" → {t('account:profile.postalCode')}
Línea 479: "País" → {t('account:profile.country')}
Línea 489: "Guardar Cambios" → {t('account:profile.saveChanges')}

Línea 493: "Historial de Pedidos" → {t('account:orders.title')}
Línea 495: "Revisa el estado de tus pedidos..." → {t('account:orders.description')}
Línea 518: "Pagado" / "Pendiente" → {t('account:orders.paid')} / {t('account:orders.pending')}
Línea 525: "Ver Detalles" → {t('account:orders.viewDetails')}
Línea 533: "No tienes pedidos todavía" → {t('account:orders.noOrders')}

Línea 541: "Mis Cotizaciones" → {t('account:quotes.title')}
Línea 542: "Revisa el estado..." → {t('account:quotes.description')}
Línea 557-558: "Archivo 3D" / "Servicio" → {t('account:quotes.file3d')} / {t('account:quotes.service')}
Línea 582: "Ver Detalles" → {t('account:quotes.viewDetails')}
Línea 590: "No tienes cotizaciones" → {t('account:quotes.noQuotes')}

Línea 599: "Mis Tarjetas Regalo" → {t('account:giftcards.title')}
Línea 600: "Tarjetas regalo recibidas..." → {t('account:giftcards.description')}
Línea 636: "Ver Detalles" → {t('account:giftcards.viewCard')}
Línea 644: "No tienes tarjetas regalo" → {t('account:giftcards.noGiftCards')}

Línea 652: "Mis Mensajes" → {t('account:messages.title')}
Línea 654: "Conversaciones con el administrador" → {t('account:messages.description')}
Línea 671: "Administrador" / "Tú" → {t('account:messages.admin')} / {t('account:messages.you')}
Línea 698: "Responder" → {t('account:messages.reply')}
Línea 705: "Escribe tu respuesta..." → {t('account:messages.writeReply')}
Línea 725: "Adjuntar Archivos" → {t('account:messages.attachFiles')}
Línea 737: "Eliminar" → {t('account:messages.remove')}
Línea 759: "Enviar Respuesta" → {t('account:messages.sendReply')}
Línea 764: "Cancelar" → {t('account:messages.cancel')}
Línea 776: "No tienes mensajes" → {t('account:messages.noMessages')}

Línea 784: "Programa de Lealtad" → {t('account:points.title')}
Línea 785: "Gana puntos..." → {t('account:points.description')}
Línea 791: "Tus Puntos" → {t('account:points.yourPoints')}
Línea 792: "puntos actuales" → {t('account:points.currentPoints')}
Línea 798: "Puntos Totales" → {t('account:points.lifetimePoints')}
Línea 799: "ganados en total" → {t('account:points.earnedAllTime')}
Línea 805: "Mis Canjes" → {t('account:points.myRedemptions')}
Línea 806: "recompensas canjeadas" → {t('account:points.redeemed')}
Línea 816: "Cupones Disponibles para Canjear" → {t('account:points.availableCoupons')}
Línea 817: "Canjea tus puntos..." → {t('account:points.availableCouponsDesc')}
Línea 864: "Canjear" / "Bloqueado" → {t('account:points.redeem')} / {t('account:points.locked')}
Línea 880: "Mis Cupones" → {t('account:points.myCoupons')}
Línea 882: "Cupones que has canjeado..." → {t('account:points.myCouponsDesc')}
Línea 895: "Activo" → {t('account:points.active')}
Línea 898: "Canjeado el" → {t('account:points.redeemed_on')}
Línea 911: "Copiar" → {t('account:points.copy')}
Línea 917: "No has canjeado..." → {t('account:points.noCouponsRedeemed')}
Línea 924: "Otras Recompensas" → {t('account:points.otherRewards')}
Línea 926: "Recompensas adicionales..." → {t('account:points.otherRewardsDesc')}
Línea 966: "Canjear" / "Bloqueado" → {t('account:points.redeem')} / {t('account:points.locked')}

Línea 1012: "Mis Facturas" → {t('account:invoices.title')}
Línea 1013: "Facturas emitidas..." → {t('account:invoices.description')}
Línea 1030: "Pendiente" / "Pagada" → {t('account:invoices.status')}
Línea 1092: "No tienes facturas" → {t('account:invoices.noInvoices')}
```

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

### Paso 1: Completar MyAccount.tsx (30-40 reemplazos)
Crear script de búsqueda y reemplazo para todos los textos identificados arriba.

### Paso 2: Auditar Quotes.tsx (Reportada como Incompleta)
El usuario reportó específicamente que esta página tiene traducción parcial.

### Paso 3: Verificar Triggers SQL de Auto-Traducción
Asegurar que todas las tablas con contenido traducible tienen triggers automáticos:

```sql
-- Verificar triggers existentes
SELECT trigger_name, event_object_table, action_statement 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%translation%';

-- Tablas que DEBEN tener triggers:
- products (name, description)
- categories (name, description)
- materials (name, description)
- colors (name)
- blog_posts (title, excerpt, content)
- pages (title, content)
- legal_pages (title, content)
- homepage_banners (title, subtitle, button_text)
- gallery_items (title, description)
- footer_links (label)
- reviews (comment)
```

### Paso 4: Mejorar Edge Function auto-translate

**Cambios necesarios:**

1. **Rate Limiting más Robusto**
```typescript
// Cambiar de 500ms a 600ms entre traducciones
await new Promise(resolve => setTimeout(resolve, 600));
```

2. **Contexto Especializado Ampliado**
```typescript
const contextMap: Record<string, string> = {
  'products': 'Producto de impresión 3D. Mantén términos técnicos (PLA, PETG, STL, FDM, etc.) sin traducir. Tono profesional.',
  'blog_posts': 'Contenido de blog sobre impresión 3D. Tono conversacional pero informativo. Mantén acrónimos técnicos.',
  'legal_pages': 'Documento legal. Máxima precisión legal. Tono formal y profesional.',
  'categories': 'Categoría de productos. Conciso, máximo 3-4 palabras.',
  'materials': 'Material de impresión 3D. Nombre técnico preciso del material.',
  'colors': 'Nombre de color. Traducir literalmente manteniendo claridad.',
  'homepage_banners': 'Banner promocional. Tono marketing atractivo, CTA claro.',
  'gallery_items': 'Descripción de trabajo realizado. Tono showcase profesional.',
  'footer_links': 'Enlace de navegación. Máximo 2-3 palabras.',
  'reviews': 'Comentario de cliente. Mantener tono original del usuario, NO editar opinión.',
  'pages': 'Página informativa. Tono profesional e informativo.',
};
```

3. **Manejo de Errores Mejorado**
```typescript
try {
  const translated = await translateText(/*...*/);
  
  // Validar que la traducción no esté vacía
  if (!translated || translated.trim().length === 0) {
    throw new Error('Traducción vacía recibida');
  }
  
  // Guardar traducción
  await supabaseAdmin.from('translations').upsert({/*...*/});
  
} catch (error) {
  console.error(`Error traduciendo ${task.entity_type}.${task.field_name}:`, error);
  
  // Marcar como error pero NO bloquear otras traducciones
  await supabaseAdmin
    .from('translation_queue')
    .update({ 
      status: 'error',
      error_message: error.message,
      retry_count: task.retry_count + 1
    })
    .eq('id', task.id);
  
  errors++;
  continue; // Seguir con la siguiente traducción
}
```

4. **Sistema de Reintentos**
```typescript
// Al procesar cola, considerar reintentar tareas con error
const { data: tasks } = await supabaseAdmin
  .from('translation_queue')
  .select('*')
  .or('status.eq.pending,and(status.eq.error,retry_count.lt.3)')
  .limit(10);
```

### Paso 5: Crear Migration para Preferencias de Idioma

```sql
-- Añadir columna preferred_language a profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'es';

CREATE INDEX IF NOT EXISTS idx_profiles_preferred_language 
ON public.profiles(preferred_language);

-- Función para detectar y guardar idioma al registrarse
CREATE OR REPLACE FUNCTION public.set_user_preferred_language()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Intentar obtener idioma del navegador desde metadata
  NEW.preferred_language := COALESCE(
    NEW.raw_user_meta_data->>'preferred_language',
    'es'
  );
  RETURN NEW;
END;
$$;

-- Trigger para detectar idioma al registrarse
CREATE TRIGGER on_auth_user_set_language
  BEFORE INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.set_user_preferred_language();
```

### Paso 6: Actualizar LanguageSelector para Guardar Preferencia

```typescript
// En LanguageSelector.tsx
const changeLanguage = async (lng: string) => {
  i18n.changeLanguage(lng);
  localStorage.setItem('i18nextLng', lng);
  
  // Si el usuario está autenticado, guardar en BD
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from('profiles')
      .update({ preferred_language: lng })
      .eq('id', user.id);
  }
};
```

### Paso 7: Parametrizar Edge Functions de Email con `lang`

**Actualizar TODAS las Edge Functions de email:**

```typescript
// Ejemplo: send-quote-email/index.ts
interface EmailRequest {
  quote_id: string;
  recipient_email: string;
  lang?: string; // 'es' | 'en' | 'nl'
}

serve(async (req) => {
  const { quote_id, recipient_email, lang = 'es' } = await req.json();
  
  // Obtener idioma preferido del usuario si no se especificó
  if (!lang) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_language')
      .eq('email', recipient_email)
      .single();
    
    lang = profile?.preferred_language || 'es';
  }
  
  // Cargar plantilla en el idioma correcto
  const templates = {
    es: {
      subject: 'Nueva cotización recibida',
      body: `Hemos recibido tu solicitud de cotización...`
    },
    en: {
      subject: 'New quote received',
      body: `We have received your quote request...`
    },
    nl: {
      subject: 'Nieuwe offerte ontvangen',
      body: `We hebben uw offerte-aanvraag ontvangen...`
    }
  };
  
  const template = templates[lang] || templates.es;
  
  // Enviar email con plantilla correspondiente
  await resend.emails.send({/*...*/});
});
```

**Edge Functions a actualizar:**
- `send-quote-email`
- `send-order-confirmation`
- `send-invoice-email`
- `send-quote-update-email`
- `send-loyalty-points-email`
- `send-gift-card-email`
- `send-welcome-email`
- `send-notification-email`

---

## 📊 ESTADÍSTICAS DE PROGRESO

### Fase 1: Interfaz Estática
- ✅ Archivos de traducción: 100% (account.json, messages.json en 3 idiomas)
- ⚠️ MyAccount.tsx: 40% (toast completado, textos JSX pendientes)
- ⏸️ Otras páginas: 0% (Quotes.tsx prioritario)
- ⏸️ Validaciones y formularios: 0%

### Fase 2: Contenido Dinámico
- ⏸️ Verificación de triggers: 0%
- ⏸️ Mejora Edge Function: 0%
- ⏸️ Panel Admin actualizado: 0%

### Fase 3: Notificaciones y Emails
- ⏸️ Notificaciones in-app: 0%
- ⏸️ Edge Functions parametrizadas: 0%
- ⏸️ Plantillas multiidioma: 0%

### Fase 4: Hook useTranslatedContent
- ⏸️ Implementación: 0%
- ⏸️ Aplicación en componentes: 0%

### Fase 5: Preferencias de Usuario
- ⏸️ Migration BD: 0%
- ⏸️ LanguageSelector actualizado: 0%
- ⏸️ Auto-detección: 0%

### Fase 6: Testing
- ⏸️ Protocolo en Español: 0%
- ⏸️ Protocolo en Inglés: 0%
- ⏸️ Protocolo en Neerlandés: 0%

---

## 🎯 ORDEN DE EJECUCIÓN RECOMENDADO

1. **AHORA**: Completar Fase 1 (MyAccount.tsx + Quotes.tsx)
2. **SIGUIENTE**: Verificar y crear triggers SQL faltantes (Fase 2)
3. **DESPUÉS**: Mejorar auto-translate Edge Function (Fase 2)
4. **LUEGO**: Implementar preferencias de idioma (Fase 5)
5. **DESPUÉS**: Parametrizar Edge Functions de email (Fase 3)
6. **FINALMENTE**: Testing exhaustivo (Fase 6)

---

## ⚠️ PUNTOS CRÍTICOS

1. **MyAccount.tsx tiene 40+ textos hardcodeados** que requieren reemplazo manual
2. **Quotes.tsx reportada como incompleta** - requiere auditoría completa
3. **Triggers SQL deben verificarse** - contenido nuevo no se traducirá automáticamente sin ellos
4. **Edge Functions de email SIN parametrizar** - todos los emails se envían en español
5. **Sin preferencias de idioma persistentes** - usuarios deben re-seleccionar en cada sesión

---

## 💡 SOLUCIÓN ESTRATÉGICA

Dado el volumen de trabajo, propongo ejecutar en modo "batch":

### Batch 1 (Interfaz - 1 hora)
- Completar MyAccount.tsx (40 reemplazos)
- Auditar y completar Quotes.tsx
- Crear script de verificación de traducciones

### Batch 2 (Backend - 1 hora)
- Verificar/crear todos los triggers SQL
- Mejorar Edge Function auto-translate
- Ejecutar "Traducir Todo" desde panel admin

### Batch 3 (Emails - 1 hora)
- Implementar preferencias de idioma en BD
- Parametrizar 3 Edge Functions críticas (quote, order, invoice)
- Crear plantillas multiidioma

### Batch 4 (Testing - 1 hora)
- Ejecutar protocolo de pruebas en ES
- Ejecutar protocolo de pruebas en EN
- Ejecutar protocolo de pruebas en NL
- Corregir errores encontrados

**TOTAL ESTIMADO: 4 horas de trabajo enfocado**

---

Este plan está listo para ejecución secuencial siguiendo el orden especificado.
