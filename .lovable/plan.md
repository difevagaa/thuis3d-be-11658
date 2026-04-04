

## Plan: Corrección de Selector de País + Auditoría de Traducción Completa

### Problema 1: Selector de país no selecciona (Quotes.tsx)

**Causa raíz:** En `src/pages/Quotes.tsx` línea 841, el `SelectItem` usa `value={c.country_name}` (ej: "Bélgica"), pero cuando se carga el perfil del usuario (línea 132), se usa `profile.country` que almacena el **código** de país (ej: "BE"). El valor del Select no coincide con ningún SelectItem, así que aparece desmarcado.

**Solución:** Cambiar el Select en Quotes.tsx para usar `country_code` como valor en vez de `country_name`, igual que ShippingInfo.tsx. Ajustar la inicialización del estado `country` para usar códigos.

### Problema 2: Texto hardcoded "FREE" en ProductCard.tsx

**Causa raíz:** Línea 51 de ProductCard.tsx tiene `<span className="sm:hidden">FREE</span>` hardcoded en inglés. Debería usar `t('freeShipping')` igual que la versión desktop.

**Solución:** Reemplazar el texto hardcoded con la traducción existente.

### Problema 3: Placeholders hardcoded en español en Page Builder

Archivos `PageBuilderSidebar.tsx`, `SectionEditor.tsx`, `PageBuilderSettings.tsx` tienen `placeholder="Ver más"` hardcoded. Cambiar a `t('pageBuilder:common.viewMore')` o similar.

### Problema 4: Texto hardcoded en admin/Loyalty.tsx

Línea 391: `"Añadir"` / `"Restar"` hardcoded en español.

### Problema 5: SectionEditor.tsx texto hardcoded

Línea 356: `"No hay características. Haz clic en "Añadir" para crear una."` hardcoded en español.

---

### Archivos a modificar

1. **`src/pages/Quotes.tsx`** — Cambiar SelectItem value a `country_code`, ajustar estado
2. **`src/components/ProductCard.tsx`** — Reemplazar "FREE" hardcoded con `t('freeShipping')`  
3. **`src/components/page-builder/PageBuilderSidebar.tsx`** — Traducir placeholder
4. **`src/components/page-builder/SectionEditor.tsx`** — Traducir placeholder y mensaje vacío
5. **`src/components/page-builder/PageBuilderSettings.tsx`** — Traducir placeholder
6. **`src/pages/admin/Loyalty.tsx`** — Traducir "Añadir"/"Restar"
7. **`public/locales/*/pageBuilder.json`** — Agregar claves faltantes si no existen

### Verificación
- Selector de país en Quotes funciona al hacer clic
- Badges "FREE" se muestran en el idioma correcto en móvil
- Placeholders del Page Builder se muestran traducidos
- No se rompe ninguna funcionalidad existente

