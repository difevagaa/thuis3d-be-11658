
Objetivo: restaurar y blindar la recuperación de datos del cliente (perfil + histórico completo), añadir selector de idioma preferido en “Mi Cuenta”, y asegurar que interfaz/comunicaciones usen ese idioma con fallback por defecto en inglés.

Diagnóstico confirmado (causa raíz)
1) Perfil bloqueado por RLS:
- La tabla `profiles` tiene RLS activado y 0 políticas activas.
- Efecto: SELECT/UPDATE de perfil fallan para cliente y administrador, por eso no se precargan nombre/email/teléfono/dirección/código postal/ciudad/país.

2) Notificaciones bloqueadas por RLS:
- La tabla `notifications` solo tiene políticas INSERT; no hay SELECT/UPDATE/DELETE para usuarios/admin.
- Efecto: notificaciones no se leen ni se marcan como leídas correctamente.

3) “Mi Cuenta” incompleta para idioma:
- `src/pages/user/MyAccount.tsx` no tiene campo editable `preferred_language`.
- `updateProfile()` no persiste idioma preferido.

4) Fallback de idioma inconsistente:
- Frontend global e i18n usan fallback neerlandés en varias partes (`src/i18n/config.ts`, `LanguageSelector`, `useUnifiedTranslation`).
- Helper compartido de correos (`supabase/functions/_shared/email-templates.ts`) también cae a `nl`.
- Requisito actual: fallback por defecto `en` cuando no haya idioma.

5) Robustez de carga:
- En varios puntos hay consultas que, al fallar por permisos/sesión, dejan estado vacío sin estrategia de recuperación clara (perfil nulo y datos dependientes no hidratan como se espera).

Plan de implementación (secuenciado)
Fase 1 — Corrección backend de acceso (bloqueante)
A. Nueva migración de seguridad para `profiles`:
- Crear políticas mínimas seguras:
  - SELECT own profile: `auth.uid() = id`
  - UPDATE own profile: `auth.uid() = id`
  - INSERT own profile (si aplica en flujos de reparación): `auth.uid() = id`
  - SELECT admin/superadmin: `is_admin_or_superadmin(auth.uid())`
  - UPDATE admin/superadmin: `is_admin_or_superadmin(auth.uid())`
- Mantener privacidad: nada público para datos personales (email, teléfono, dirección).

B. Nueva migración para `notifications`:
- SELECT own notifications (`auth.uid() = user_id`)
- UPDATE own notifications (marcar leída, soft-delete propia)
- DELETE own notifications (si aplica)
- SELECT admin/superadmin para panel admin (si requerido funcionalmente)
- Mantener INSERT admin/service-role ya existente.
- Resultado: campanas de notificación cliente/admin vuelven a funcionar.

C. Idioma por defecto en perfil:
- Asegurar `profiles.preferred_language` default `'en'`.
- Backfill de registros nulos/vacíos/idioma inválido a `'en'`.
- (Opcional recomendado) trigger de validación para normalizar a `es|en|nl` y fallback `en`.

Fase 2 — “Mi Cuenta” y perfil funcional completo
Archivo principal: `src/pages/user/MyAccount.tsx`
1) Añadir selector de idioma preferido en el tab de perfil (ES/EN/NL).
2) Incluir `preferred_language` en `updateProfile()`.
3) Al guardar idioma:
- persistir en perfil,
- actualizar i18n en runtime,
- guardar `i18nextLng` en localStorage.
4) Endurecer carga:
- manejar explícitamente errores de `profiles` y de cada bloque de datos (orders/invoices/quotes/messages/points/giftcards),
- evitar “silencio” de errores y mostrar feedback claro.
5) Mantener precarga de datos para checkout (si ya existe perfil) sin volver a pedir campos al cliente.

Fase 3 — Unificación de fallback e idioma activo
Ajustes frontend:
- `src/i18n/config.ts`: fallback global a `en`; mapeo de idioma no soportado => `en`.
- `src/components/LanguageSelector.tsx`: fallback visual a `en`.
- `src/hooks/useUnifiedTranslation.tsx`: default de `language` a `en` (no `es`).
- Añadir sincronización al iniciar sesión/cambiar sesión para aplicar `preferred_language` del perfil si existe (sin romper detección automática).

Ajustes backend de comunicaciones:
- `supabase/functions/_shared/email-templates.ts`:
  - `getEmailTemplate`, `translateQuoteType`, `translateStatus` con fallback `en`.
- Revisar funciones de email/notificación que ya consultan `preferred_language` para confirmar fallback final `en` en toda la cadena.

Fase 4 — Cobertura de todos los puntos donde “se recupera cliente”
Revisión y ajuste (si procede) en:
- Cliente:
  - `src/pages/user/MyAccount.tsx`
  - `src/pages/ShippingInfo.tsx`
  - `src/pages/Quotes.tsx` (prefill + upsert perfil)
  - `src/pages/user/GiftCardView.tsx`
  - `src/pages/user/Messages.tsx`
  - `src/pages/user/OrderDetail.tsx`
  - `src/pages/user/InvoiceView.tsx`
  - `src/pages/user/QuoteDetail.tsx`
- Admin:
  - `src/pages/admin/CreateOrder.tsx` (búsqueda/carga de perfil cliente)
  - `src/pages/admin/Quotes.tsx` (listado clientes/perfiles)
  - `src/pages/AdminDashboard.tsx` y `src/pages/admin/AdminDashboard.tsx` (métricas/perfiles)
  - `src/components/admin/UserSearchSelector.tsx`

Criterio de ajuste: donde haya dependencia de `profiles`, asegurar manejo de error + fallback funcional, sin exponer PII.

Fase 5 — Traducciones para la nueva UX de perfil/idioma
Actualizar:
- `public/locales/es/account.json`
- `public/locales/en/account.json`
- `public/locales/nl/account.json`
Claves nuevas sugeridas:
- `profile.preferredLanguage`
- `profile.languageHint`
- `profile.languageSaved`
- `profile.languageError`
- etiquetas de opciones de idioma (si no se reutilizan de `auth`).

Detalles técnicos y decisiones
1) Seguridad:
- No abrir `profiles` a lectura pública.
- Políticas de `notifications` restringidas por `user_id`.
- Uso de `is_admin_or_superadmin()` para controles admin evitando lógica duplicada y evitando riesgos de recursión.

2) Compatibilidad:
- No tocar archivos autogenerados (`src/integrations/supabase/client.ts`, `types.ts`, `.env`, `supabase/config.toml`).
- Mantener estructura actual de tablas y relaciones.

3) Riesgos controlados:
- Con RLS corregido en `profiles`, podrían reaparecer datos antiguos “vacíos”: se mitigará con fallback al `auth.user` mientras se edita perfil.
- Ajuste de fallback a inglés puede cambiar idioma inicial en usuarios sin preferencia; esto es intencional por requerimiento.

Checklist de validación final (obligatorio)
A. Perfil y autofill
- Cliente autenticado entra a `/mi-cuenta?tab=profile` y ve: nombre, email, teléfono, dirección, ciudad, código postal, país.
- Edita perfil + idioma preferido y persiste al recargar sesión/página.
- Checkout (`/informacion-envio`) precarga datos sin volver a pedirlos si ya existen.

B. Datos del cliente en todos los módulos
- En “Mi Cuenta” cargan correctamente:
  - pedidos,
  - facturas,
  - cotizaciones,
  - mensajes,
  - puntos/lealtad,
  - tarjetas regalo.
- En admin “Crear pedido” se recuperan correctamente datos del cliente seleccionado.

C. Notificaciones
- Cliente ve notificaciones propias, puede marcar leídas/eliminar.
- Admin ve notificaciones administrativas.
- Realtime sigue operando con filtros por usuario.

D. Idioma y comunicaciones
- Si `preferred_language = es|en|nl`, UI y comunicaciones salen en ese idioma.
- Si no existe preferencia, fallback efectivo en inglés.
- Verificación de emails transaccionales clave: confirmación de pedido, cotización, actualización de cotización, factura, bienvenida, notificaciones.

E. Prueba end-to-end recomendada (completa)
1) Cliente actualiza perfil + idioma.
2) Hace flujo de compra (carrito → envío → pago) validando autofill.
3) Envía cotización y revisa su historial en cuenta.
4) Admin crea pedido manual con selección de cliente.
5) Confirmar datos consistentes en panel cliente/admin y comunicaciones en idioma correcto.

Entregables al implementar
1) 1 migración de backend (RLS `profiles` + `notifications` + default/backfill `preferred_language`).
2) Cambios frontend en páginas/componentes de perfil, idioma y recuperación robusta.
3) Ajustes de fallback de idioma (frontend + helper de emails).
4) Actualización de traducciones account (es/en/nl).
5) Informe corto de verificación con evidencia por flujo (perfil, compra, cotización, admin, notificaciones, idioma).
