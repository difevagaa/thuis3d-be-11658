

## Plan: Corrección de Flash Visual, Tarjetas de Regalo y Mejora de Mascota

### Problema 1: Flash de colores antiguos al cargar por primera vez

**Causa raíz:** Cuando un visitante nuevo abre la página, no tiene caché en `localStorage`. Los colores CSS por defecto en `index.css` (Electric Coral/Ocean Blue) se muestran primero. Luego, `useGlobalColors` carga la paleta real desde la base de datos (~1-2 seg) y la aplica, causando el "flash" de colores.

**Corrección:**
- En `index.css`, hacer que los colores base `:root` sean neutros/mínimos (blanco/gris) para que el flash sea imperceptible
- Agregar un overlay de carga en `index.html` (inline CSS, sin JS) que cubra la pantalla con fondo blanco hasta que React monte y aplique los colores reales
- En `App.tsx` o `useGlobalColors`, remover el overlay una vez los colores estén aplicados
- Esto elimina completamente el flash visible de "versión antigua"

### Problema 2: Error al comprar tarjeta de regalo sin sesión

**Causa raíz:** La Edge Function `create-gift-card` requiere autenticación (`Authorization` header). Cuando un usuario no ha iniciado sesión, `supabase.functions.invoke` no envía el header, y la función devuelve 401.

**Corrección:**
- En `GiftCard.tsx`, antes de llamar a `create-gift-card`, verificar si el usuario tiene sesión activa
- Si no tiene sesión: mostrar un toast amigable pidiendo iniciar sesión y redirigir a `/auth` con un `returnTo` parameter
- No permitir compras anónimas (la función necesita `buyer_id` para el tracking)
- Verificar que el mismo patrón se aplique en otros flujos de compra (Cart checkout, etc.)

### Problema 3: Build errors - `NodeJS.Timeout`

**Causa raíz:** El `tsconfig.app.json` actual no incluye `"types": ["node"]` y la librería `@types/node` puede no estar instalada. Los archivos usan `NodeJS.Timeout` para refs de timers.

**Corrección:** Cambiar todas las ocurrencias de `NodeJS.Timeout` a `ReturnType<typeof setTimeout>` en los 7 archivos afectados. Esto es compatible con el entorno del navegador sin necesidad de tipos de Node.

**Archivos afectados:**
- `src/components/AdminLayout.tsx` (líneas 35-36)
- `src/components/GlobalSearchBar.tsx` (línea 25)
- `src/components/page-builder/AdvancedCarousel.tsx` (línea 70)
- `src/contexts/ResponsiveContext.tsx` (línea 57)
- `src/hooks/useVisitorTracking.tsx` (línea 21)
- `src/lib/advancedEditorFunctions.ts` (línea 641)

### Problema 4: Mascota con 50+ movimientos más naturales

**Estado actual:** La mascota tiene 48 reacciones definidas pero los movimientos anatómicos son básicos (solo `walkPhase` sinusoidal para piernas/brazos).

**Corrección:**
- Agregar 50 nuevas reacciones específicas por tipo de mascota:
  - **Gato:** `washFace`, `kneadPaws`, `archBack`, `chaseTail`, `batAtToy`, `boxPush`, `sunbathe`, `purrVibrate`, `hiss`, `slowBlink`
  - **Perro/genéricos:** `shakeFur`, `sitPretty`, `rollOnBack`, `sniffGround`, `pointNose`, `tipTap`, `zoomies`, `headShake`, `pawGive`, `playDead`
  - **Pingüino:** `waddle`, `slideBelly`, `fishCatch`, `huddle`, `flipperClap`
  - **Robot:** `glitch`, `scanMode`, `reboot`, `laserEyes`, `systemUpdate`
  - **Fantasma:** `phase`, `spook`, `vanish`, `haunt`, `ghostFloat`
  - **Universales:** `sneakWalk`, `peekAround`, `doubleJump`, `cartwheel`, `tipHat`, `thinking`, `confetti`, `flexMuscle`, `facepalm`, `dab`, `meditation`, `electricShock`, `bubbleBlow`, `rainbow`, `tornado`
- Mejorar la fluidez del movimiento con:
  - Curvas Bézier en lugar de sinusoidales simples
  - Micro-movimientos de "idle" más variados (respiración irregular, pestañeo aleatorio, movimiento de orejas esporádico)
  - Transiciones suaves entre estados (ease-in-out en lugar de cambios abruptos)
  - Velocidad variable al caminar (aceleración/desaceleración)
  - Pausas con comportamiento idle contextual (el gato se sienta y se lame, el perro olfatea el suelo)

### Orden de ejecución

1. Fix build errors (`NodeJS.Timeout` → `ReturnType<typeof setTimeout>`)
2. Fix flash de colores (overlay en `index.html` + colores neutros en CSS)
3. Fix gift card auth check en frontend
4. Mascota: 50+ nuevos movimientos naturales

### Archivos a modificar

- `src/components/AdminLayout.tsx`
- `src/components/GlobalSearchBar.tsx`
- `src/components/page-builder/AdvancedCarousel.tsx`
- `src/contexts/ResponsiveContext.tsx`
- `src/hooks/useVisitorTracking.tsx`
- `src/lib/advancedEditorFunctions.ts`
- `index.html` — agregar overlay anti-flash
- `src/index.css` — colores base neutros
- `src/hooks/useGlobalColors.tsx` — remover overlay al cargar
- `src/pages/GiftCard.tsx` — auth check antes de comprar
- `src/components/SiteMascot.tsx` — 50+ movimientos naturales

