# Arquitectura del Sistema de Personalización de Colores

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                    Panel de Administración                       │
│                     (SiteCustomizer.tsx)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌──────────────────┐   ┌──────────────┐
│   Paletas     │   │ Colores Avanzados│   │  Contraste   │
│ Profesionales │   │  por Sección     │   │  Verificador │
└───────────────┘   └──────────────────┘   └──────────────┘
        │                     │                     │
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────────────────────────────────────────────────┐
│              Capa de Procesamiento                        │
├───────────────────────────────────────────────────────────┤
│  • professionalPalettes.ts (21 paletas)                   │
│  • contrastChecker.ts (validación WCAG)                   │
│  • useGlobalColors.tsx (aplicación de temas)              │
└───────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌──────────────────┐   ┌──────────────┐
│  Supabase DB  │   │  localStorage    │   │  CSS Vars    │
│               │   │                  │   │              │
│ site_         │   │ selected_        │   │ --primary    │
│ customization │   │ palette          │   │ --secondary  │
│               │   │                  │   │ --accent     │
│ 7 campos      │   │ theme_           │   │ etc. (19)    │
│ nuevos        │   │ customization    │   │              │
└───────────────┘   └──────────────────┘   └──────────────┘
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Aplicación UI  │
                    │   (Todo el site) │
                    └──────────────────┘
```

## Flujo de Datos: Aplicación de Paleta

```
┌─────────────┐
│   Usuario   │
│ selecciona  │
│   paleta    │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────┐
│ applyPalette()               │
│ (SiteCustomizer.tsx)         │
└──────┬───────────────────────┘
       │
       ├─────────────────────────┐
       │                         │
       ▼                         ▼
┌────────────────┐      ┌──────────────────┐
│ CSS Variables  │      │  localStorage    │
│ Aplicadas      │      │  Cache           │
│ inmediatamente │      │  para próxima    │
│                │      │  carga           │
└────────┬───────┘      └────────┬─────────┘
         │                       │
         │                       │
         ▼                       ▼
┌────────────────┐      ┌──────────────────┐
│ UI se          │      │  Supabase DB     │
│ actualiza      │      │  Guardado para   │
│ visualmente    │      │  persistencia    │
└────────────────┘      └──────────────────┘
```

## Flujo de Datos: Verificación de Contraste

```
┌─────────────┐
│   Usuario   │
│  cambia     │
│  colores    │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────┐
│ onChange handler             │
│ (AdvancedColorCustomization) │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Vista Previa actualizada     │
│ (tiempo real)                │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ ContrastChecker invocado     │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ contrastChecker.ts           │
│ • parseHSL/hexToRgb          │
│ • getRelativeLuminance       │
│ • getContrastRatio           │
└──────┬───────────────────────┘
       │
       ▼
┌──────────────────────────────┐
│ Resultado mostrado:          │
│ • Ratio (ej. 7.5:1)          │
│ • Badge AA/AAA               │
│ • Recomendación              │
└──────────────────────────────┘
```

## Estructura de Componentes React

```
SiteCustomizer
│
├─ Tabs
│  │
│  ├─ TabsContent: "themes"
│  │  └─ Grid de Paletas (21)
│  │     └─ Card con vista previa
│  │
│  ├─ TabsContent: "advanced-colors"
│  │  └─ AdvancedColorCustomization
│  │     ├─ Tabs (Header/Sidebar/Home)
│  │     │  ├─ Color Pickers
│  │     │  ├─ Vista Previa
│  │     │  └─ ContrastChecker
│  │     └─ Save Button
│  │
│  ├─ TabsContent: "contrast"
│  │  └─ InteractiveContrastChecker
│  │     ├─ Color Inputs
│  │     ├─ Vista Previa Grande
│  │     ├─ Métricas de Ratio
│  │     └─ Guía WCAG
│  │
│  ├─ TabsContent: "typography"
│  │  └─ Configuración de fuentes
│  │
│  ├─ TabsContent: "identity"
│  │  └─ Logos y favicon
│  │
│  └─ TabsContent: "company"
│     └─ Datos de empresa
│
└─ Save Handler
   └─ Guarda en Supabase
```

## Estructura de Datos: Paleta Profesional

```typescript
interface ProfessionalPalette {
  id: string              // "ocean-blue"
  name: string            // "Océano Azul"
  description: string     // "Azul profundo con..."
  
  light: {                // Tema claro
    // Colores base (4)
    background: string    // "0 0% 100%"
    foreground: string    // "222 47% 11%"
    card: string
    cardForeground: string
    
    // Overlays (4)
    popover: string
    popoverForeground: string
    muted: string
    mutedForeground: string
    
    // Marca (6)
    primary: string
    primaryForeground: string
    secondary: string
    secondaryForeground: string
    accent: string
    accentForeground: string
    
    // Estados (6)
    destructive: string
    destructiveForeground: string
    success: string
    successForeground: string
    warning: string
    warningForeground: string
    
    // UI (3)
    border: string
    input: string
    ring: string
  }
  
  dark: {
    // ... misma estructura para tema oscuro
  }
}
```

## Mapeo de Variables CSS

```css
/* Generadas desde paleta */
:root {
  /* Colores base */
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  
  /* Marca */
  --primary: 210 100% 45%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 40% 45%;
  --secondary-foreground: 0 0% 100%;
  --accent: 185 75% 40%;
  --accent-foreground: 0 0% 100%;
  
  /* Estados */
  --success: 142 76% 36%;
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%;
  --warning-foreground: 0 0% 10%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  
  /* UI */
  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: 210 100% 45%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 35%;
  
  /* Sidebar (específicas) */
  --sidebar-background: 210 40% 45%;
  --sidebar-foreground: 0 0% 100%;
  --sidebar-primary: 210 100% 45%;
  --sidebar-accent: 185 75% 40%;
}
```

## Flujo de Carga Inicial

```
┌────────────────┐
│  Página carga  │
└───────┬────────┘
        │
        ▼
┌──────────────────────────────┐
│ useGlobalColors hook         │
│ se ejecuta                   │
└───────┬──────────────────────┘
        │
        ├──────────────────────────────┐
        │                              │
        ▼                              ▼
┌────────────────┐          ┌──────────────────┐
│ localStorage   │          │  localStorage    │
│ selected_      │   NO     │  theme_          │
│ palette        ├─────────▶│  customization   │
│     ↓          │          │     ↓            │
│   EXISTE       │          │   EXISTE         │
└────┬───────────┘          └────┬─────────────┘
     │ SÍ                        │ SÍ
     │                           │
     ▼                           ▼
┌────────────────┐          ┌──────────────────┐
│ Aplicar        │          │ Aplicar colores  │
│ paleta desde   │          │ individuales     │
│ cache          │          │ legacy           │
└────┬───────────┘          └────┬─────────────┘
     │                           │
     └───────────┬───────────────┘
                 │
                 ▼
┌──────────────────────────────┐
│ Cargar desde Supabase        │
│ (versión más reciente)       │
└───────┬──────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ Actualizar UI y cache        │
└──────────────────────────────┘
```

## Integración con Sistema Existente

```
Sistema Legacy              Sistema Nuevo
     │                           │
     ▼                           ▼
┌──────────────┐          ┌──────────────────┐
│ Colores      │          │ Paletas          │
│ individuales │          │ profesionales    │
│ (hex)        │          │ (HSL completo)   │
└──────┬───────┘          └────┬─────────────┘
       │                       │
       └───────────┬───────────┘
                   │
                   ▼
         ┌──────────────────┐
         │ Coexistencia:    │
         │ - Paleta tiene   │
         │   prioridad      │
         │ - Legacy como    │
         │   fallback       │
         │ - Fuentes son    │
         │   independientes │
         └──────────────────┘
```

---

**Nota:** Este diagrama muestra la arquitectura completa del sistema implementado.
Todos los componentes están integrados y funcionando correctamente.
