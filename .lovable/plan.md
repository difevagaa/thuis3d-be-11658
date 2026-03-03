

## Plan de Corrección: Cotizaciones, Facturas, Rendimiento y Rediseño

Este plan aborda 4 bloques de trabajo solicitados por el usuario.

---

### BLOQUE 1: Corrección de Cotizaciones y Facturas

#### Bug 1: Cantidad no visible en el panel de administración de cotizaciones

**Problema:** La tabla de cotizaciones en `src/pages/admin/Quotes.tsx` (líneas 296-314) no tiene columna "Cantidad". El admin no puede ver cuántas unidades solicitó el cliente sin entrar al detalle.

**Corrección:**
- Agregar columna "Uds." (Unidades) entre "Peso" y "Precio Auto" en la tabla de cotizaciones
- Mostrar `quote.quantity || 1` en cada fila

#### Bug 2: Items duplicados en facturas

**Problema:** La base de datos muestra items duplicados para la misma factura (ej: invoice `707e11df` tiene 2 items idénticos). Esto ocurre porque:
1. La Edge Function `process-quote-approval` crea invoice_items al aprobar
2. El trigger `trigger_auto_generate_invoice` en la tabla `orders` ejecuta `auto_generate_invoice_on_payment()` que TAMBIÉN crea una factura con items cuando el pedido cambia a `paid`
3. Posiblemente la Edge Function se ejecuta más de una vez

**Corrección:**
- Agregar verificación en la Edge Function para no crear invoice_items si ya existen para ese invoice_id
- Modificar `auto_generate_invoice_on_payment()` para verificar si ya existen invoice_items antes de insertar duplicados
- Limpiar items duplicados existentes en la BD con una query de deduplicación

#### Bug 3: unit_price incorrecto cuando hay múltiples unidades

**Problema:** Para invoice `7a26c3f3`, 50 unidades tienen `unit_price: 100.00` y `total_price: 100.00`. El unit_price debería ser `100/50 = 2.00`. La línea 293 del edge function calcula correctamente `subtotal / quantity`, pero el registro muestra que no se aplicó.

**Corrección:** Verificar y corregir la lógica en el edge function para que `unit_price = subtotal / quantity` y `total_price = subtotal` siempre sean coherentes.

---

### BLOQUE 2: Auditoría de Rendimiento

**Acciones:**
- Auditar componentes pesados: `usePageSections`, `useVisitorTracking`, cargas de imágenes
- Verificar lazy loading de rutas en `App.tsx`
- Identificar queries redundantes o sin paginación
- Recomendar memoización donde sea necesario (listas grandes, re-renders)
- Implementar las mejoras que no alteren funcionalidad

---

### BLOQUE 3: Rediseño Visual del Sitio

**Acciones:**
- Actualizar la paleta de colores CSS variables en `index.css` con un diseño moderno y fresco
- Agregar transiciones y micro-animaciones en hover, scroll y navegación
- Mejorar gradientes del hero banner y cards
- Actualizar tipografía y espaciados para un look más premium
- Asegurar coherencia en modo claro/oscuro

---

### BLOQUE 4: Sistema de Mascota Interactiva

**Concepto:** Una mascota animada (sprite/SVG) que aparece en el sitio web con movimientos naturales, se esconde y reaparece en diferentes posiciones, y reacciona al clic del usuario con gesticulaciones.

**Implementación técnica:**
- Crear componente `SiteMascot.tsx` con animaciones CSS/JS puras (sin video)
- La mascota será un personaje SVG con partes articuladas (ojos, boca, brazos) animadas con CSS keyframes y transiciones
- Comportamiento autónomo: idle (parpadeo, movimiento sutil), aparición/desaparición aleatoria en los bordes de la pantalla
- Al hacer clic: animaciones de reacción (saludo, risa, sorpresa) seleccionadas aleatoriamente
- Posicionamiento: fixed en la esquina inferior, con movimiento ocasional a otras posiciones

**Panel de Administración:**
- Nueva sección "Mascota del Sitio" en el admin con opciones:
  - Habilitar/deshabilitar mascota
  - Seleccionar entre varios diseños de mascota predefinidos (robot, gato, pulpo, etc.)
  - Configurar frecuencia de aparición
  - Configurar posición predeterminada
  - Configurar colores de la mascota
- Tabla `site_mascot_settings` en la BD para persistir configuración

**Base de datos:**
- Crear tabla `site_mascot_settings` con campos: `id`, `enabled`, `mascot_type`, `primary_color`, `secondary_color`, `position`, `animation_frequency`, `click_reactions`

---

### Orden de Ejecución

1. **Bloque 1** — Corrección de bugs de cotizaciones/facturas (crítico)
2. **Bloque 4** — Sistema de mascota (funcionalidad nueva completa)
3. **Bloque 3** — Rediseño visual
4. **Bloque 2** — Optimización de rendimiento

### Archivos Principales a Modificar

- `src/pages/admin/Quotes.tsx` — Agregar columna cantidad
- `supabase/functions/process-quote-approval/index.ts` — Fix duplicados y unit_price
- `auto_generate_invoice_on_payment` — SQL migration para prevenir duplicados
- `src/components/SiteMascot.tsx` — Nuevo componente de mascota
- `src/pages/admin/MascotSettings.tsx` — Nuevo panel admin
- `src/index.css` — Rediseño de variables de colores
- `tailwind.config.ts` — Nuevas animaciones
- `src/App.tsx` — Lazy loading audit
- Migration SQL — Tabla mascot_settings + limpieza de duplicados

