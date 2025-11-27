# Documentación del Sistema de Personalización de Colores

## Resumen General

Este documento describe la estructura, lógica y uso del sistema avanzado de personalización de colores para el panel de administración de Thuis3D.

## 1. Estructura de Paletas Profesionales

### Ubicación
- Archivo principal: `src/data/professionalPalettes.ts`
- Total de paletas: **21 paletas profesionales**

### Estructura de una Paleta

Cada paleta incluye dos temas completos (claro y oscuro) con colores en formato HSL:

```typescript
{
  id: string,              // Identificador único
  name: string,            // Nombre descriptivo en español
  description: string,     // Descripción del estilo de la paleta
  light: PaletteTheme,     // Tema para modo claro
  dark: PaletteTheme       // Tema para modo oscuro
}
```

### Colores en cada Tema

Cada tema (light/dark) contiene 19 variables de color:

1. **Colores de Fondo**
   - `background`: Color de fondo principal
   - `foreground`: Color de texto principal
   - `card`: Color de fondo de tarjetas
   - `cardForeground`: Color de texto en tarjetas

2. **Colores de Componentes**
   - `popover`: Color de fondo de popovers
   - `popoverForeground`: Color de texto en popovers
   - `muted`: Color apagado para contenido secundario
   - `mutedForeground`: Color de texto apagado

3. **Colores de Marca**
   - `primary`: Color primario (acciones principales)
   - `primaryForeground`: Texto sobre color primario
   - `secondary`: Color secundario (acciones secundarias)
   - `secondaryForeground`: Texto sobre color secundario
   - `accent`: Color de acento (destacados)
   - `accentForeground`: Texto sobre color de acento

4. **Colores de Estado**
   - `destructive`: Color para acciones destructivas
   - `destructiveForeground`: Texto sobre destructive
   - `success`: Color para éxito
   - `successForeground`: Texto sobre success
   - `warning`: Color para advertencias
   - `warningForeground`: Texto sobre warning

5. **Colores de Interfaz**
   - `border`: Color de bordes
   - `input`: Color de fondo de inputs
   - `ring`: Color del anillo de foco

## 2. Criterios de Contraste WCAG

### Niveles de Cumplimiento

El sistema verifica contraste según WCAG 2.1:

| Nivel | Ratio Mínimo | Uso |
|-------|--------------|-----|
| **AA Texto Normal** | 4.5:1 | Mínimo recomendado para texto regular |
| **AA Texto Grande** | 3:1 | Para texto 18pt+ o 14pt+ negrita |
| **AAA Texto Normal** | 7:1 | Excelente accesibilidad para texto regular |
| **AAA Texto Grande** | 4.5:1 | Excelente accesibilidad para texto grande |

### Utilidad de Verificación

**Archivo:** `src/utils/contrastChecker.ts`

**Funciones principales:**

```typescript
// Calcula el ratio de contraste entre dos colores
getContrastRatio(color1: string, color2: string): number | null

// Verifica si cumple con un nivel WCAG
meetsWCAG(foreground: string, background: string, 
          level: 'AA' | 'AAA', isLargeText: boolean): boolean

// Obtiene información completa sobre el contraste
getContrastInfo(foreground: string, background: string): ContrastInfo
```

**Formatos soportados:**
- Hexadecimal: `#FFFFFF`, `#000000`
- HSL: `210 100% 45%` o `hsl(210, 100%, 45%)`

### Validación en Paletas

Todas las paletas profesionales cumplen con:
- ✅ **Contraste AA** en todas las combinaciones de texto
- ✅ **Compatibilidad** con modo claro y oscuro
- ✅ **Legibilidad** de textos, títulos y botones

## 3. Personalización Avanzada por Sección

### Nuevos Campos en la Base de Datos

**Tabla:** `site_customization`

```sql
header_bg_color             -- Color de fondo del header
header_text_color           -- Color de texto del header
sidebar_bg_color            -- Color de fondo del sidebar
sidebar_active_bg_color     -- Color de elementos activos
sidebar_text_color          -- Color de texto del sidebar
home_menu_bg_color          -- Color de fondo de menús inicio
home_menu_text_color        -- Color de texto de menús inicio
home_menu_hover_bg_color    -- Color hover de menús inicio
```

### Componente de Personalización Avanzada

**Archivo:** `src/components/admin/AdvancedColorCustomization.tsx`

Este componente permite:
- ✅ Seleccionar colores individuales por sección
- ✅ Vista previa en tiempo real de cada sección
- ✅ Verificación automática de contraste WCAG
- ✅ Alertas si el contraste es insuficiente

### Secciones Personalizables

1. **Header / Barra Superior**
   - Color de fondo
   - Color de texto
   - Vista previa de navegación

2. **Sidebar / Menú Lateral**
   - Color de fondo del sidebar
   - Color de texto
   - Color de elementos activos
   - Vista previa del menú

3. **Menús de Vista de Inicio**
   - Color de fondo de menús
   - Color de texto
   - Color hover/destacado
   - Vista previa interactiva

## 4. Componentes UI

### ContrastChecker

**Archivo:** `src/components/admin/ContrastChecker.tsx`

Dos componentes disponibles:

1. **ContrastChecker** - Verificador simple para mostrar contraste de un par de colores
   ```tsx
   <ContrastChecker 
     foreground="#000000" 
     background="#FFFFFF"
     label="Texto sobre fondo"
   />
   ```

2. **InteractiveContrastChecker** - Herramienta interactiva completa
   - Selectores de color
   - Vista previa en tiempo real
   - Información detallada WCAG
   - Guía de requisitos

## 5. Aplicación de Temas

### Hook useGlobalColors

**Archivo:** `src/hooks/useGlobalColors.tsx`

Este hook:
- ✅ Carga paletas desde la base de datos
- ✅ Aplica estilos CSS en tiempo real
- ✅ Guarda en localStorage para carga instantánea
- ✅ Sincroniza con cambios de modo claro/oscuro
- ✅ Actualiza en tiempo real con cambios en la BD

### Prioridad de Aplicación

1. **Paleta Profesional** (si está seleccionada)
   - Sobrescribe todos los colores con la paleta completa
   - Se almacena en `localStorage.selected_palette`

2. **Colores Individuales** (si no hay paleta)
   - Usa colores individuales legacy
   - Se almacena en `localStorage.theme_customization`

3. **Fuentes** (siempre se aplican)
   - Independientes de paletas
   - Se almacenan en `localStorage.font_customization`

## 6. Mantenimiento y Extensión

### Añadir una Nueva Paleta

1. Editar `src/data/professionalPalettes.ts`
2. Agregar nuevo objeto al array `professionalPalettes`:

```typescript
{
  id: 'nuevo-tema',
  name: 'Nombre Descriptivo',
  description: 'Descripción del estilo',
  light: {
    // 19 variables de color en formato HSL
    background: '0 0% 100%',
    foreground: '0 0% 10%',
    // ... resto de colores
  },
  dark: {
    // 19 variables de color en formato HSL
    background: '0 0% 8%',
    foreground: '0 0% 98%',
    // ... resto de colores
  }
}
```

### Verificar Contraste de Nueva Paleta

Usar la herramienta de verificación de contraste en el panel de administración:

1. Ir a **Personalizador del Sitio** > **Contraste**
2. Probar combinaciones principales:
   - Primary sobre background
   - Secondary sobre background
   - Text sobre card
   - Etc.

### Mejores Prácticas

1. **Contraste**: Siempre verificar que las combinaciones cumplan AA mínimo
2. **Nombres**: Usar nombres descriptivos y evocadores
3. **Coherencia**: Mantener coherencia entre modo claro y oscuro
4. **Pruebas**: Probar en ambos modos antes de publicar
5. **Documentación**: Actualizar este documento al añadir funcionalidades

## 7. Variables CSS Generadas

El sistema genera las siguientes variables CSS:

```css
/* Colores principales */
--background
--foreground
--card
--card-foreground
--popover
--popover-foreground

/* Marca */
--primary
--primary-foreground
--secondary
--secondary-foreground
--accent
--accent-foreground

/* Estados */
--muted
--muted-foreground
--destructive
--destructive-foreground
--success
--success-foreground
--warning
--warning-foreground

/* Interfaz */
--border
--input
--ring

/* Sidebar (específicas del panel admin) */
--sidebar-background
--sidebar-foreground
--sidebar-primary
--sidebar-primary-foreground
--sidebar-accent
--sidebar-accent-foreground
--sidebar-border
--sidebar-ring
```

## 8. Ejemplos de Uso

### Aplicar Paleta Profesional

```typescript
import { professionalPalettes } from '@/data/professionalPalettes';

const palette = professionalPalettes.find(p => p.id === 'ocean-blue');
applyPalette(palette); // Función del SiteCustomizer
```

### Verificar Contraste

```typescript
import { getContrastInfo, meetsWCAG } from '@/utils/contrastChecker';

// Verificar si cumple AA
const isAccessible = meetsWCAG('#000000', '#FFFFFF', 'AA');

// Obtener información completa
const info = getContrastInfo('#000000', '#FFFFFF');
console.log(info.ratio); // 21
console.log(info.recommendation); // "✅ Excelente contraste (AAA)"
```

### Personalizar Colores por Sección

```typescript
// En SiteCustomizer
setCustomization({
  ...customization,
  header_bg_color: '#1E293B',
  header_text_color: '#FFFFFF',
  sidebar_bg_color: '#0F172A',
  sidebar_active_bg_color: '#3B82F6'
});
```

## 9. Solución de Problemas

### Las paletas no se aplican correctamente

- Verificar que `selected_palette` esté en localStorage
- Limpiar cache: `localStorage.removeItem('theme_customization')`
- Recargar la página

### Colores no cumplen contraste

- Usar la herramienta de verificación de contraste
- Ajustar luminosidad manteniendo el tono
- Considerar usar una paleta profesional pre-validada

### Cambios no se guardan

- Verificar permisos RLS en Supabase
- Revisar consola del navegador para errores
- Verificar que el usuario es admin

## 10. Referencias

- [WCAG 2.1 Contraste](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [HSL Color Space](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/hsl)
- [Tailwind CSS Variables](https://tailwindcss.com/docs/customizing-colors)

---

**Última actualización:** 2025-11-23  
**Versión:** 1.0  
**Mantenedores:** Equipo de Desarrollo Thuis3D
