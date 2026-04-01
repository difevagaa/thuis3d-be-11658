

## Plan: Auditoría SEO Completa + Depuración de Código

### Diagnóstico Principal: ¿Por qué Google no encuentra tu sitio?

**Causa raíz #1: Tu sitio es una SPA (Single Page Application).** Cuando Google visita `thuis3d.be`, solo ve un `<div id="root"></div>` vacío. Todo el contenido se renderiza con JavaScript del lado del cliente. Google puede ejecutar JS, pero lo hace con retraso (días/semanas) y frecuentemente falla. **Esto es el problema principal.**

**Causa raíz #2: Meta tags duplicados y conflictivos.** `index.html` tiene `og:title` definido DOS veces (líneas 73 y 174) con valores diferentes. Google penaliza esto.

**Causa raíz #3: Sitemap desactualizado y con dominio incorrecto.** El `sitemap.xml` estático usa rutas en español. La Edge Function `generate-sitemap` usa `thuis3d.com` en vez de `thuis3d.be`.

**Causa raíz #4: Google Site Verification probablemente inválido.** El valor `11397960639` no parece un código de verificación válido de Google (son tipo `aBcDeFgHiJkLmNoPqRsTuVwXyZ`).

**Causa raíz #5: Carga de 20+ fuentes en una sola petición** destruye los Core Web Vitals (LCP/FCP), y Google penaliza en ranking por rendimiento pobre.

---

### Bloque 1: Pre-rendering para SEO (Crítico)

Implementar un sistema de pre-rendering que genere HTML estático para las páginas principales. Dado que no podemos usar SSR (no hay servidor Node), la solución es:

1. **Edge Function `render-page`** que usa la API de metadata para generar HTML con meta tags completos para crawlers
2. **Mejorar el `index.html`** para incluir contenido semántico visible antes de que React cargue (texto real, no solo un div vacío)
3. **Agregar `<noscript>` fallback** con contenido textual de las páginas principales para crawlers que no ejecutan JS

### Bloque 2: Corregir index.html (10 fixes)

1. Eliminar meta tags duplicados (líneas 174-177)
2. Cambiar `lang="es"` → `lang="nl-BE"` (el mercado es belga, no español)
3. Reducir carga de fuentes de 20+ a solo las 3-4 que realmente se usan
4. Agregar contenido semántico real dentro de `<noscript>` para crawlers
5. Mover el script de tema al `<body>` para no bloquear el render
6. Agregar `<meta name="description">` más relevante en neerlandés
7. Corregir la imagen OG para que apunte al dominio propio
8. Agregar structured data JSON-LD directamente en el HTML (no depender de React)
9. Agregar `<link rel="preload">` para recursos críticos
10. Limpiar el bloque de Google Translate innecesario

### Bloque 3: Corregir sitemap.xml y robots.txt

1. **sitemap.xml**: Regenerar con rutas correctas, dominio `thuis3d.be`, y `lastmod` actualizado
2. **robots.txt**: Limpiar rutas y asegurar que `/galeria`, `/litofanias` estén incluidas
3. **Edge Function `generate-sitemap`**: Cambiar `thuis3d.com` → `thuis3d.be`
4. Agregar todas las rutas públicas que faltan al sitemap

### Bloque 4: Corregir SEOHead.tsx

1. Las descripciones en `seo_meta_tags` están en español — el mercado principal es Bélgica (neerlandés). Actualizar los fallbacks
2. Evitar que `SEOHead` genere meta tags que conflicten con los de `index.html`
3. Mejorar el `canonicalUrl` para que siempre incluya el dominio completo

### Bloque 5: Depuración de código (optimización de rendimiento)

1. **Fuentes**: Cargar solo Poppins (la fuente activa) en vez de 20+ fuentes → mejora LCP en ~2 segundos
2. **Eliminar código muerto** en `seoUtils.ts` (926 líneas con traducciones redundantes que nunca mejoran el ranking real)
3. **Optimizar `SEOHead`**: Hacer 5 queries paralelas en cada navegación es excesivo. Cachear en memoria con TTL
4. **Limpiar `useAutoSEO`**: Hace upsert keyword-por-keyword (N+1 queries). Refactorizar a batch insert
5. **Consolidar caches SEO duplicados**: `seoCache` existe tanto en `SEOHead.tsx` como en `seoCache.ts`

### Bloque 6: Verificación Google Search Console

1. Verificar que el código de verificación `11397960639` sea correcto (parece inválido)
2. Asegurar que el meta tag de verificación se renderice correctamente en el HTML inicial (no solo después de React)
3. Mover `google-site-verification` al `index.html` estático para que Google siempre lo vea

---

### Archivos a modificar

- `index.html` — Limpieza completa, lang, fuentes, structured data, noscript content
- `public/robots.txt` — Rutas actualizadas
- `public/sitemap.xml` — Regenerado con datos correctos
- `supabase/functions/generate-sitemap/index.ts` — Fix dominio
- `src/components/SEOHead.tsx` — Optimización y deduplicación
- `src/hooks/useAutoSEO.tsx` — Batch operations
- `src/lib/seoUtils.ts` — Limpieza de código muerto
- `src/lib/seoCache.ts` — Consolidación

### Lista de verificación final

1. `index.html` tiene `lang="nl-BE"` y meta tags sin duplicados
2. Google Site Verification está en HTML estático
3. Structured data JSON-LD visible sin JavaScript
4. Sitemap tiene dominio `thuis3d.be` y todas las rutas públicas
5. Solo se cargan 2-3 fuentes (no 20+)
6. `<noscript>` tiene contenido real para crawlers
7. No hay meta tags duplicados entre `index.html` y `SEOHead`
8. Core Web Vitals mejorados por reducción de fuentes
9. Edge Function sitemap usa dominio correcto

