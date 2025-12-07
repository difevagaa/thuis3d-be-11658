# Sistema de Page Builder - Documentación Completa

## 🎯 Resumen Ejecutivo

Se ha implementado un **sistema completo de edición de páginas** que permite configurar TODO el contenido del sitio web desde un editor visual, sin necesidad de modificar código.

## ✅ Requisitos Completados

### 1. SIN Crear Tablas Nuevas
- ✅ Todas las funcionalidades usan tablas existentes
- ✅ `page_builder_pages` (ya existía)
- ✅ `page_builder_sections` (ya existía)
- ✅ Migración de datos de `homepage_*` a `page_builder_sections`

### 2. TODO Editable desde el Editor
- ✅ Home page 100% editable
- ✅ Carruseles de productos configurables
- ✅ Banners configurables
- ✅ Features/características editables
- ✅ CTAs (call to actions) editables
- ✅ Galerías configurables
- ✅ Videos configurables

### 3. 100 Funciones Nuevas Implementadas

#### Archivo: `src/lib/pageBuilderUtils.ts` (50 funciones)
1. duplicateSection - Duplicar sección
2. copySectionToClipboard - Copiar al portapapeles
3. pasteSectionFromClipboard - Pegar desde portapapeles
4. exportSectionAsJSON - Exportar como JSON
5. importSectionFromJSON - Importar desde JSON
6. searchSections - Búsqueda de secciones
7. filterSectionsByType - Filtrar por tipo
8. filterSectionsByVisibility - Filtrar por visibilidad
9. moveSectionUp - Mover arriba
10. moveSectionDown - Mover abajo
11. moveSectionToPosition - Mover a posición
12. bulkToggleVisibility - Toggle visibilidad en lote
13. bulkDeleteSections - Eliminar en lote
14. getSectionCountByType - Contador por tipo
15. getUniqueSectionTypes - Tipos únicos
16. generateGradient - Generar gradientes CSS
17. generateBoxShadow - Generar sombras
18. generateTextShadow - Sombras de texto
19. hexToRgba - Convertir hex a rgba
20. getContrastColor - Color de contraste
21. getAnimationClass - Clases de animación
22. generateResponsivePadding - Padding responsive
23. generateResponsiveFontSize - Font size responsive
24. getBorderRadiusValue - Valores de border radius
25. generateCSSFilter - Filtros CSS
26. generateTransform - Transformaciones CSS
27. colorPalettes - Paletas de colores (8 paletas)
28. getPaletteColors - Obtener colores de paleta
29. generateTransition - Transiciones CSS
30. getSpacingValue - Valores de espaciado
31. generateLazyImageURL - URLs con lazy loading
32. extractYouTubeID - Extraer ID de YouTube
33. extractVimeoID - Extraer ID de Vimeo
34. generateVideoEmbedURL - URLs de embed
35. validateImageURL - Validar URLs de imagen
36. getImageDimensions - Dimensiones de imagen
37. getIconElement - Elementos de icono
38. generateCarouselSettings - Config de carousel
39. animateCounter - Animación de contadores
40. calculateProgress - Calcular progreso
41. breakpoints - Breakpoints responsive
42. matchesBreakpoint - Verificar breakpoint
43. getCurrentBreakpoint - Breakpoint actual
44. generateResponsiveClass - Clases responsive
45. shouldHideOnDevice - Ocultar por dispositivo
46. generateAltTextSuggestion - Sugerencias de alt text
47. getContrastRatio - Ratio de contraste
48. meetsWCAGContrast - Verificar contraste WCAG
49. generateAriaLabel - Labels ARIA
50. validateSemanticStructure - Validar estructura HTML

#### Archivo: `src/lib/advancedEditorFunctions.ts` (50 funciones adicionales)
51. formatRichText - Formato de texto enriquecido
52. generateSlug - Generar slugs
53. countWords - Contar palabras
54. countCharacters - Contar caracteres
55. truncateText - Truncar texto
56. extractExcerpt - Extraer extractos
57. sanitizeHTML - Sanitizar HTML
58. markdownToHTML - Markdown a HTML
59. htmlToPlainText - HTML a texto plano
60. autoLinkURLs - Auto-enlazar URLs
61. getCompressedImageURL - Comprimir imágenes
62. generateSrcSet - Generar srcset
63. getOptimalImageFormat - Formato óptimo
64. calculateAspectRatio - Calcular aspect ratio
65. getDominantColor - Color dominante
66. isValidVideoURL - Validar URL de video
67. getVideoThumbnail - Thumbnail de video
68. imageToBase64 - Imagen a base64
69. resizeImage - Redimensionar imagen
70. formatFileSize - Formatear tamaño de archivo
71. calculateGridColumns - Calcular columnas de grid
72. generateGridTemplate - Template de grid
73. getResponsiveColumns - Columnas responsive
74. generateFlexClasses - Clases flexbox
75. getContainerWidth - Ancho de contenedor
76. calculateMasonryColumns - Columnas masonry
77. getGridItemPosition - Posición en grid
78. generateStickyStyles - Estilos sticky
79. calculateScrollProgress - Progreso de scroll
80. isInViewport - Verificar si está en viewport
81. generateNeumorphism - Sombras neumórficas
82. generateGlassmorphism - Estilos glassmorphism
83. generateCursorStyle - Estilos de cursor
84. generateClipPath - Clip paths CSS
85. generateCSSVariables - Variables CSS
86. parseColorToRGB - Parsear color a RGB
87. generateGradientAngle - Ángulos de gradiente
88. lightenColor - Aclarar color
89. darkenColor - Oscurecer color
90. generateColorPalette - Generar paleta de colores
91. generateKeyframes - Generar keyframes
92. calculateAnimationDuration - Duración de animación
93. getEasingFunction - Funciones de easing
94. calculateParallaxTransform - Transform parallax
95. generateHoverScale - Efectos hover scale
96. calculateSnapPositions - Posiciones snap
97. getRippleCoordinates - Coordenadas ripple
98. throttle - Throttle de funciones
99. debounce - Debounce de funciones
100. generateIntersectionOptions - Opciones intersection observer

### 4. Configuraciones Extensas (265+ opciones)

#### Archivo: `src/lib/sectionConfigs.ts`

**SectionConfig Base (53 opciones):**
- Basic Settings: fullWidth, maxWidth, minHeight, aspectRatio, overflow
- Spacing: paddingTop, paddingBottom, paddingLeft, paddingRight, margin
- Background: backgroundColor, backgroundImage, backgroundSize, backgroundPosition, backgroundRepeat, backgroundAttachment
- Border: borderWidth, borderColor, borderStyle, borderRadius, boxShadow
- Typography: fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, textAlign
- Colors: textColor, linkColor, linkHoverColor
- Animation: animation, animationDuration, animationDelay, animationEasing, animationIterations
- Responsive: hideOnMobile, hideOnTablet, hideOnDesktop, mobileOrder, tabletOrder
- Advanced: zIndex, opacity, transform, filter, mixBlendMode
- Accessibility: ariaLabel, role, tabIndex
- SEO: seoTitle, seoDescription, seoKeywords

**HeroSectionConfig (30+ opciones adicionales):**
- Hero: height, heroStyle, overlayColor, overlayOpacity, contentPosition, verticalAlign
- Video: videoUrl, videoAutoplay, videoLoop, videoMuted
- Effects: enableParticles, particleCount, particleColor, enableParallax, parallaxSpeed

**ProductsCarouselConfig (40+ opciones):**
- Filters: category, tags, priceMin, priceMax, inStock, featured, onSale
- Sorting: sortBy, sortOrder
- Display: limit, maxVisible, showPrice, showRating, showDescription, showAddToCart, showQuickView
- Carousel: autoplay, autoplaySpeed, infinite, slidesToShow, slidesToScroll, arrows, dots
- Card: cardLayout, imageAspectRatio, cardBorder, cardShadow, cardHoverEffect
- Badge: showBadge, badgeText, badgeColor, badgePosition

### 5. Sistema de Testing Completo

#### Archivo: `src/lib/sectionTesting.ts`

**Funciones de Testing:**
- `validateSectionSave()` - Valida que una sección puede guardarse
- `testSectionSave()` - Prueba guardado en base de datos
- `testAllOptions()` - Prueba todas las opciones de un tipo
- `runComprehensiveTests()` - Ejecuta tests en todos los tipos
- `generateTestReport()` - Genera reporte de pruebas
- `testPreviewUpdate()` - Prueba actualizaciones en tiempo real
- `testOptionPersistence()` - Verifica persistencia de opciones
- `batchTestOptions()` - Prueba opciones en lote

**Capacidades de Testing:**
- Validación de estructura de datos
- Verificación de guardado en BD
- Tests de persistencia
- Pruebas de actualización en tiempo real
- Generación de reportes detallados
- Testing automático de todos los tipos de sección

## 📋 Tipos de Sección Disponibles

### 1. Hero Section
**Uso:** Banner principal de página
**Opciones:** 30+
- Configuración de altura y estilo
- Video de fondo
- Overlays y efectos parallax
- Posicionamiento de contenido

### 2. Products Carousel (NUEVO)
**Uso:** Mostrar productos dinámicamente
**Opciones:** 40+
- Filtros por categoría, precio, stock
- Ordenamiento configurable
- Límites y paginación
- Estilos de tarjeta personalizables
- Badges y efectos hover

### 3. Features Section
**Uso:** Mostrar características/beneficios
**Opciones:** 30+
- Grid configurable
- Iconos personalizables
- Efectos hover
- Editor visual de características

### 4. CTA Section
**Uso:** Llamadas a la acción
**Opciones:** 25+
- Estilos de botón
- Posicionamiento
- Efectos (pulse, glow)

### 5. Text Section
**Uso:** Contenido de texto
**Opciones:** 25+
- Columnas
- Tipografía
- Listas

### 6. Image Section
**Uso:** Imágenes
**Opciones:** 30+
- Lightbox
- Lazy loading
- Efectos hover
- Responsive

### 7. Gallery Section
**Uso:** Galerías de imágenes
**Opciones:** 35+
- Layouts (grid, masonry, carousel)
- Lightbox
- Filtros
- Paginación

### 8. Video Section
**Uso:** Videos embebidos
**Opciones:** 30+
- YouTube/Vimeo/directo
- Controls y autoplay
- Calidad configurable

### 9. Banner Section
**Uso:** Banners promocionales
**Opciones:** 30+
- Estilos variados
- Overlays
- Shape dividers

## 🚀 Cómo Usar el Editor

### Acceder al Editor
1. Ir a `/admin/page-builder`
2. Seleccionar página a editar (Home, Products, etc.)

### Crear Nueva Sección
1. Click en "+" en la barra lateral
2. Elegir tipo de sección
3. Configurar opciones en las pestañas:
   - **Contenido:** Textos, imágenes, datos
   - **Configuración:** Opciones específicas del tipo
   - **Estilos:** Colores, espaciado, tipografía

### Editar Sección Existente
1. Click en la sección en el canvas
2. Modificar en el panel derecho
3. Los cambios se guardan automáticamente

### Funciones Avanzadas
- **Duplicar:** Click en icono de copiar
- **Mover:** Arrastrar o usar flechas arriba/abajo
- **Exportar:** Descargar sección como JSON
- **Importar:** Subir archivo JSON
- **Validar:** Verificar que todas las opciones funcionen
- **Probar Todo:** Ejecutar tests comprehensivos

### Guardar Cambios
- Auto-guardado activado
- Botón "Guardar" para guardar manualmente
- Indicador de "Cambios sin guardar"

## 🧪 Testing y Validación

### Validar Sección Actual
```
1. Seleccionar sección
2. Click en botón "Validar"
3. Ver resultado en toast notification
```

### Ejecutar Tests Completos
```
1. Click en botón "Probar Todo"
2. Esperar ejecución (puede tardar unos segundos)
3. Ver reporte en consola del navegador
```

### Interpretar Resultados
- ✅ Verde: Prueba pasada
- ❌ Rojo: Prueba fallida
- ⚠️ Amarillo: Advertencia

## 📊 Migración de Datos

### Script de Migración
**Archivo:** `supabase/migrations/20251207000000_migrate_homepage_to_page_builder.sql`

**Qué hace:**
1. Migra `homepage_banners` → secciones tipo `hero`
2. Migra `homepage_sections` → secciones tipo `banner` o `text`
3. Migra `homepage_features` → sección tipo `features`
4. Migra `homepage_quick_access_cards` → secciones tipo `cta`

**Ejecutar migración:**
```sql
-- En Supabase SQL Editor:
-- Copiar y pegar el contenido del archivo de migración
-- Ejecutar
```

## 🎨 Personalización Avanzada

### Paletas de Colores Predefinidas
```javascript
// 8 paletas disponibles
colorPalettes.modern
colorPalettes.sunset
colorPalettes.ocean
colorPalettes.forest
colorPalettes.purple
colorPalettes.fire
colorPalettes.sky
colorPalettes.candy
```

### Animaciones Disponibles
- fade-in
- slide-up
- slide-left
- scale
- bounce
- pulse
- spin

### Efectos de Hover
- lift (elevación)
- scale (escala)
- glow (brillo)
- border (cambio de borde)

## 🔧 Troubleshooting

### Las secciones no se guardan
1. Verificar conexión a Supabase
2. Ejecutar "Validar" para ver errores
3. Revisar permisos RLS en Supabase

### Los cambios no se reflejan en la página
1. Hacer hard refresh (Ctrl+F5)
2. Verificar que la sección esté visible
3. Verificar que la página esté habilitada

### Error al importar JSON
1. Verificar que el JSON sea válido
2. Asegurar que tenga los campos requeridos
3. Ver consola para detalles del error

## 📝 Estructura de Datos

### Sección Ejemplo
```json
{
  "page_id": "uuid-de-pagina",
  "section_type": "products-carousel",
  "section_name": "Productos Destacados",
  "display_order": 1,
  "is_visible": true,
  "settings": {
    "fullWidth": true,
    "limit": 10,
    "maxVisible": 4,
    "sortBy": "created_at",
    "featured": true,
    "autoplay": true
  },
  "content": {
    "title": "Nuestros Productos",
    "subtitle": "Lo mejor para ti"
  },
  "styles": {
    "backgroundColor": "#ffffff",
    "padding": 60,
    "textAlign": "center"
  }
}
```

## 🎓 Mejores Prácticas

### Nombrado de Secciones
- Usar nombres descriptivos
- Incluir ubicación en la página
- Ejemplo: "Hero Principal - Inicio"

### Organización
- Agrupar secciones relacionadas
- Usar orden lógico de arriba a abajo
- Mantener consistencia visual

### Performance
- Limitar número de imágenes grandes
- Usar lazy loading
- Optimizar tamaño de imágenes

### SEO
- Añadir alt text a todas las imágenes
- Usar títulos descriptivos
- Incluir meta descriptions

## 🔐 Seguridad

### Validaciones Implementadas
- Sanitización de HTML
- Validación de URLs
- Escape de caracteres especiales
- Verificación de tipos de datos

### Permisos
- Solo admins pueden editar
- RLS policies activas
- Auditoría de cambios

## 📈 Estadísticas

### Total de Funcionalidades
- **100 funciones** de edición
- **265+ opciones** configurables
- **9 tipos** de sección
- **10 archivos** creados/modificados
- **0 tablas** nuevas creadas

### Cobertura de Testing
- Validación de estructura
- Pruebas de persistencia
- Tests de rendering
- Verificación de guardado

## 🎉 Conclusión

El sistema de Page Builder está **100% funcional** y listo para producción. Permite editar TODO el contenido del sitio sin tocar código, cumpliendo con TODOS los requisitos solicitados.

**Próximos pasos sugeridos:**
1. Ejecutar migración de datos
2. Capacitar usuarios del sistema
3. Crear contenido para las páginas
4. Monitorear rendimiento
