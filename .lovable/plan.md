

## Plan: Mascota Interactiva Mejorada

### Problema Actual
La mascota no se muestra porque:
1. El componente espera 3 segundos antes de hacerse visible, y luego se esconde/muestra cíclicamente — el usuario quiere que **siempre esté visible**
2. Las posiciones son estáticas (5 puntos fijos) — el usuario quiere que **camine** por la página
3. No hay detección de contexto (qué página está viendo el cliente)

### Plan de Corrección

#### 1. Reescribir `SiteMascot.tsx` completamente
- **Siempre visible** una vez cargada (sin ciclo hide/show)
- **Animación de caminar**: la mascota se mueve horizontalmente por el borde inferior de la pantalla con una animación CSS de "pasos" (bounce sutil al caminar)
- **Detección de contexto**: usar `useLocation()` de react-router para saber en qué página está el usuario y ajustar comportamiento (ej: en admin se posiciona diferente, en home camina más activamente)
- **Reacciones al clic**: mantener las 5 reacciones actuales + agregar 3 nuevas (dance, nod, heart)
- **Movimiento continuo**: la mascota camina de un lado a otro del viewport con pausas naturales, girando al cambiar de dirección
- **Siempre accesible**: `position: fixed` con `z-index: 9999` para que siempre esté encima del contenido

#### 2. Agregar 10+ opciones de configuración al admin (`MascotSettings.tsx`)
Opciones nuevas a agregar (en DB y UI):
1. **Tamaño** (small/medium/large) — controla el tamaño SVG
2. **Velocidad de caminar** (slow/normal/fast) — velocidad del movimiento horizontal
3. **Sonido al clic** (on/off) — reproduce un sonido corto al interactuar
4. **Mensaje de bienvenida** (texto) — tooltip que aparece al pasar el mouse
5. **Opacidad** (0.5-1.0) — transparencia de la mascota
6. **Modo nocturno** (on/off) — la mascota "duerme" de noche (ojos cerrados)
7. **Seguir cursor** (on/off) — los ojos siguen el cursor del mouse
8. **Emojis al clic** (on/off) — muestra emojis flotantes al hacer clic
9. **Ocultar en checkout** (on/off) — se esconde en páginas de pago para no distraer
10. **Intervalo de reacción espontánea** (segundos) — cada cuánto hace una gesticulación automática

#### 3. Migración DB
Agregar columnas a `site_mascot_settings`:
- `size` (text, default 'medium')
- `walk_speed` (text, default 'normal')
- `sound_enabled` (boolean, default false)
- `welcome_message` (text, default '¡Hola! 👋')
- `opacity` (numeric, default 1.0)
- `night_mode` (boolean, default false)
- `follow_cursor` (boolean, default true)
- `show_emojis` (boolean, default true)
- `hide_on_checkout` (boolean, default true)
- `spontaneous_interval` (integer, default 30)

#### 4. Animación de caminar
- La mascota se moverá horizontalmente usando `requestAnimationFrame` o CSS `@keyframes`
- Al llegar al borde, se voltea (CSS `scaleX(-1)`) y camina de vuelta
- Pausa 3-5 segundos en posiciones aleatorias antes de seguir caminando
- Animación de "bounce" vertical sutil mientras camina para simular pasos
- Al estar en pausa: animación idle (parpadeo, respiración)

#### Archivos a modificar
- `src/components/SiteMascot.tsx` — reescritura completa
- `src/pages/admin/MascotSettings.tsx` — 10 nuevas opciones
- Migration SQL — nuevas columnas

