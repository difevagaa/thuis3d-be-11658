# 🧪 Pruebas Exhaustivas del Sistema de Cotizaciones - Multiidioma

## ✅ Correcciones Implementadas

### 1. Sistema de Estados Independiente del Idioma
- ✅ Agregado campo `slug` a `quote_statuses`
- ✅ Estados configurados con slugs únicos:
  - `pending` → "Pendiente" (ES) / "Pending" (EN) / "Afwachtend" (NL)
  - `in_review` → "En revisión" (ES) / "Under Review" (EN) / "In beoordeling" (NL)
  - `approved` → "Aprobada" (ES) / "Approved" (EN) / "Goedgekeurd" (NL)
  - `rejected` → "Rechazada" (ES) / "Rejected" (EN) / "Afgewezen" (NL)
  - `completed` → "Completada" (ES) / "Completed" (EN) / "Voltooid" (NL)
- ✅ Código actualizado para buscar por `slug = 'pending'` en lugar de nombres traducidos

### 2. Storage y RLS Policies
- ✅ Bucket `quote-files` verificado y configurado como privado
- ✅ Políticas RLS actualizadas:
  - Usuarios autenticados pueden subir archivos
  - Usuarios pueden ver sus propios archivos
  - Administradores pueden ver y eliminar todos los archivos

### 3. Traducciones Completadas
- ✅ Página de Cotizaciones 100% traducida (ES/EN/NL)
- ✅ Formulario de Archivo 3D traducido
- ✅ Formulario de Servicio traducido
- ✅ Todos los toasts y mensajes de error traducidos
- ✅ Validaciones traducidas

---

## 📋 Protocolo de Pruebas (3 pruebas por idioma, 3 idiomas = 9 pruebas totales)

### FASE 1: Pruebas en ESPAÑOL 🇪🇸

#### Prueba ES-1: Cotización con Archivo 3D (Completa)
**Objetivo**: Verificar flujo completo de cotización 3D en español

**Pasos**:
1. Cambiar idioma a Español (ES)
2. Ir a `/cotizaciones`
3. Verificar que TODO el texto esté en español:
   - Título: "Solicitar una Cotización"
   - Pestañas: "Archivo 3D" y "Servicio"
   - Etiquetas de campos
   - Placeholders
   - Textos de ayuda
   - Botones
4. Seleccionar material (ej: PLA)
5. Seleccionar color (ej: Rojo)
6. Subir archivo STL válido (< 10MB)
7. Hacer clic en "Analizar archivo"
8. Verificar que aparezca el resultado del análisis
9. Ingresar cantidad: 2
10. Completar datos de envío:
    - Nombre completo
    - Email
    - Dirección
    - Ciudad
    - Código postal (de Bélgica)
    - País: Bélgica
    - Teléfono (opcional)
11. Agregar notas adicionales (opcional)
12. Hacer clic en "Enviar Cotización"
13. **VERIFICAR**:
    - ✅ Toast de éxito en español: "¡Cotización enviada! Nos pondremos en contacto pronto."
    - ✅ Redirección a la página de inicio
    - ✅ Email de confirmación recibido por el cliente
    - ✅ Notificación in-app para administradores
    - ✅ Cotización visible en `/admin/cotizaciones` con estado "Pendiente"
    - ✅ Archivo STL accesible desde el panel admin

**Resultado Esperado**: ✅ ÉXITO SIN ERRORES

---

#### Prueba ES-2: Cotización de Servicio con Adjuntos
**Objetivo**: Verificar flujo de cotización de servicio en español

**Pasos**:
1. Idioma: Español (ES)
2. Ir a `/cotizaciones`
3. Seleccionar pestaña "Servicio"
4. Verificar textos en español
5. Completar campos:
   - Nombre del servicio: "Reparación de pieza rota"
   - Descripción del proyecto: [Usar editor de texto enriquecido con formato]
   - Enlace opcional: (dejar vacío)
6. Adjuntar 2-3 archivos (fotos JPG, PDF)
7. Completar datos de contacto y envío
8. Hacer clic en "Solicitar Servicio"
9. **VERIFICAR**:
    - ✅ Toast de éxito en español
    - ✅ Archivos subidos correctamente a `quote-files/{user_id}/`
    - ✅ Cotización creada con `quote_type = 'service'`
    - ✅ Archivos adjuntos visibles en panel admin
    - ✅ Descripción con formato HTML preservado
    - ✅ Email enviado al cliente
    - ✅ Notificación a administradores

**Resultado Esperado**: ✅ ÉXITO SIN ERRORES

---

#### Prueba ES-3: Validaciones y Errores
**Objetivo**: Verificar mensajes de error en español

**Pasos**:
1. Idioma: Español (ES)
2. Intentar enviar cotización 3D SIN seleccionar material
   - **Verificar**: Toast "Por favor selecciona material y color" en español
3. Intentar enviar SIN analizar archivo
   - **Verificar**: Toast "Por favor analiza el archivo antes de enviar" en español
4. Intentar cotización de servicio SIN descripción
   - **Verificar**: Toast "Por favor describe tu proyecto" en español
5. Cerrar sesión e intentar crear cotización
   - **Verificar**: Toast "Debes iniciar sesión para solicitar cotizaciones" en español
   - **Verificar**: Redirección a `/auth`

**Resultado Esperado**: ✅ TODOS LOS MENSAJES EN ESPAÑOL

---

### FASE 2: Pruebas en INGLÉS 🇬🇧

#### Prueba EN-1: Cotización con Archivo 3D (Completa)
**Objetivo**: Verificar flujo completo en inglés

**Pasos**:
1. Cambiar idioma a English (EN)
2. Ir a `/cotizaciones`
3. Verificar que TODO el texto esté en inglés:
   - Título: "Request a Quote"
   - Pestañas: "3D File" y "Service"
   - Todos los campos y etiquetas
4. Completar flujo idéntico a ES-1
5. **VERIFICAR**:
    - ✅ Todos los textos en inglés
    - ✅ Toast de éxito: "Quote sent! We will contact you soon."
    - ✅ Email en inglés (si está configurado)
    - ✅ Cotización creada correctamente
    - ✅ Estado "Pending" (slug funciona independiente del idioma)

**Resultado Esperado**: ✅ ÉXITO SIN ERRORES, TODO EN INGLÉS

---

#### Prueba EN-2: Cotización de Servicio con Adjuntos
**Objetivo**: Verificar flujo de servicio en inglés

**Pasos**:
1. Idioma: English (EN)
2. Completar flujo idéntico a ES-2
3. **VERIFICAR**:
    - ✅ Todos los textos en inglés
    - ✅ Placeholders en inglés
    - ✅ Botones: "Request Service", "Choose files"
    - ✅ Toast: Error messages en inglés si aplica
    - ✅ Subida de archivos exitosa
    - ✅ Cotización visible en admin

**Resultado Esperado**: ✅ ÉXITO SIN ERRORES, TODO EN INGLÉS

---

#### Prueba EN-3: Validaciones y Errores
**Objetivo**: Verificar mensajes de error en inglés

**Pasos**:
1. Idioma: English (EN)
2. Intentar enviar sin material → "Please select material and color"
3. Intentar enviar sin analizar → "Please analyze the file before sending"
4. Intentar servicio sin descripción → "Please describe your project"
5. Sin autenticación → "You must sign in to request quotes"

**Resultado Esperado**: ✅ TODOS LOS MENSAJES EN INGLÉS

---

### FASE 3: Pruebas en NEERLANDÉS 🇳🇱

#### Prueba NL-1: Cotización con Archivo 3D (Completa)
**Objetivo**: Verificar flujo completo en neerlandés

**Pasos**:
1. Cambiar idioma a Nederlands (NL)
2. Ir a `/cotizaciones`
3. Verificar que TODO el texto esté en neerlandés:
   - Título: "Offerte Aanvragen"
   - Pestañas: "3D-bestand" y "Dienst"
   - Todos los campos y etiquetas
4. Completar flujo idéntico a ES-1
5. **VERIFICAR**:
    - ✅ Todos los textos en neerlandés
    - ✅ Toast de éxito: "Offerte verzonden! We nemen snel contact op."
    - ✅ Email en neerlandés (si está configurado)
    - ✅ Cotización creada correctamente
    - ✅ Estado "Afwachtend" (slug funciona)

**Resultado Esperado**: ✅ ÉXITO SIN ERRORES, TODO EN NEERLANDÉS

---

#### Prueba NL-2: Cotización de Servicio con Adjuntos
**Objetivo**: Verificar flujo de servicio en neerlandés

**Pasos**:
1. Idioma: Nederlands (NL)
2. Completar flujo idéntico a ES-2
3. **VERIFICAR**:
    - ✅ Todos los textos en neerlandés
    - ✅ Placeholders en neerlandés
    - ✅ Botones: "Dienst Aanvragen", "Kies bestanden"
    - ✅ Toast: Error messages en neerlandés
    - ✅ Subida de archivos exitosa
    - ✅ Cotización visible en admin

**Resultado Esperado**: ✅ ÉXITO SIN ERRORES, TODO EN NEERLANDÉS

---

#### Prueba NL-3: Validaciones y Errores
**Objetivo**: Verificar mensajes de error en neerlandés

**Pasos**:
1. Idioma: Nederlands (NL)
2. Intentar enviar sin material → "Selecteer materiaal en kleur"
3. Intentar enviar sin analizar → "Analyseer het bestand voordat je verzendt"
4. Intentar servicio sin descripción → "Beschrijf je project"
5. Sin autenticación → "Je moet inloggen om offertes aan te vragen"

**Resultado Esperado**: ✅ TODOS LOS MENSAJES EN NEERLANDÉS

---

## 🔍 Verificaciones Adicionales del Sistema

### Backend y Base de Datos
- [ ] Tabla `quotes` acepta inserts con `user_id` autenticado
- [ ] Campo `slug` en `quote_statuses` funciona correctamente
- [ ] Bucket `quote-files` permite uploads de usuarios autenticados
- [ ] Políticas RLS permiten a usuarios ver solo sus propios archivos
- [ ] Administradores pueden ver todos los archivos

### Edge Functions (No Bloqueantes)
- [ ] `send-quote-email` envía emails correctamente (error no bloquea flujo)
- [ ] `send-admin-notification` crea notificaciones in-app
- [ ] Rate limiting funciona sin errores

### Consistencia de Idioma
- [ ] Idioma seleccionado se mantiene durante todo el flujo
- [ ] No hay regresión a español en ningún punto
- [ ] LocalStorage guarda preferencia de idioma
- [ ] Recarga de página respeta idioma guardado

---

## 📊 Resumen de Resultados

| Idioma | Prueba 1 | Prueba 2 | Prueba 3 | Estado |
|--------|----------|----------|----------|--------|
| 🇪🇸 Español | ⬜ | ⬜ | ⬜ | Pendiente |
| 🇬🇧 Inglés | ⬜ | ⬜ | ⬜ | Pendiente |
| 🇳🇱 Neerlandés | ⬜ | ⬜ | ⬜ | Pendiente |

**Marcar con**:
- ✅ = Prueba exitosa
- ❌ = Prueba fallida
- ⚠️ = Prueba con advertencias

---

## 🐛 Registro de Problemas Encontrados

### Problema 1:
**Descripción**: 
**Idioma afectado**: 
**Pasos para reproducir**: 
**Solución propuesta**: 

### Problema 2:
**Descripción**: 
**Idioma afectado**: 
**Pasos para reproducir**: 
**Solución propuesta**: 

---

## 📝 Notas de Implementación

### Cambios Realizados:
1. ✅ Campo `slug` agregado a `quote_statuses`
2. ✅ Estados configurados con slugs únicos
3. ✅ Código actualizado para buscar por slug
4. ✅ Políticas RLS del bucket `quote-files` corregidas
5. ✅ Traducciones completadas en `quotes.json` (ES/EN/NL)
6. ✅ Todos los textos hardcodeados reemplazados por `t()`

### Próximos Pasos:
- Ejecutar pruebas sistemáticas en orden (ES → EN → NL)
- Documentar cualquier problema encontrado
- Corregir problemas antes de pasar al siguiente idioma
- Verificar que correos electrónicos usen plantillas traducidas
