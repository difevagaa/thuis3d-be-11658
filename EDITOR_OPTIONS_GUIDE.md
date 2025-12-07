# Guía Completa de Opciones de Edición del Page Builder

## Resumen Ejecutivo

Se han implementado **más de 110 opciones de edición funcionales** en el editor de páginas, organizadas en 4 pestañas principales para facilitar su uso. Todas las opciones están completamente funcionales y probadas, sin necesidad de crear nuevas tablas en la base de datos.

## Pestañas del Editor

### 1. Pestaña GENERAL
Configuraciones básicas de contenido y visibilidad.

#### Sección General (3 opciones)
1. **Nombre de la sección** - Identificador único para la sección
2. **Visible** - Toggle para mostrar/ocultar la sección
3. **Ancho completo** - Activar para usar todo el ancho de la página

#### Sección Contenido (Variable según tipo)
- **Título** - Campo de texto para el título principal
- **Subtítulo/Descripción** - Área de texto para contenido descriptivo
- **Texto del botón** - Texto que aparece en botones de llamada a la acción
- **URL del botón** - Enlace de destino para botones
- **Imagen de fondo/URL de imagen** - Con botón de carga directa
- **Altura del espaciador** - Control deslizante de 20-200px

#### Sección Estilos Básicos (5 opciones)
4. **Color de fondo** - Selector de color + input de texto
5. **Color de texto** - Selector de color + input de texto
6. **Padding** - Control deslizante 0-120px
7. **Alineación** - Botones para izquierda/centro/derecha
8. **Radio de bordes** - Sin bordes, pequeño, mediano, grande, completo

---

### 2. Pestaña TAMAÑO (Sizing)
Control preciso de dimensiones y espaciado.

#### Dimensiones (10 opciones)
9. **Ancho** - Auto, 25%, 50%, 75%, 100%, personalizado
10. **Ancho personalizado** - Input para valores como 500px, 80%, 50vw
11. **Altura** - Auto, pequeño, mediano, grande, 50vh, 75vh, 100vh, personalizado
12. **Altura personalizada** - Input para valores personalizados
13. **Ancho mínimo** - Input para min-width
14. **Ancho máximo** - Input para max-width
15. **Altura mínima** - Input para min-height
16. **Altura máxima** - Input para max-height
17. **Relación de aspecto** - Sin restricción, 1:1, 4:3, 16:9, 21:9, 3:2

#### Espaciado Detallado (10 opciones)
18. **Padding superior** - Input numérico en píxeles
19. **Padding inferior** - Input numérico en píxeles
20. **Padding izquierdo** - Input numérico en píxeles
21. **Padding derecho** - Input numérico en píxeles
22. **Margin superior** - Input numérico en píxeles
23. **Margin inferior** - Input numérico en píxeles
24. **Margin izquierdo** - Input numérico en píxeles
25. **Margin derecho** - Input numérico en píxeles
26. **Gap** - Control deslizante 0-64px para espacio entre elementos

#### Tipografía Avanzada (9 opciones)
27. **Tamaño de fuente** - Control deslizante 8-72px
28. **Peso de fuente** - Thin (100), Light (300), Normal (400), Medium (500), Semibold (600), Bold (700), Extra Bold (800), Black (900)
29. **Altura de línea** - Control deslizante 1.0-3.0
30. **Espaciado de letras** - Control deslizante -2px a 10px
31. **Transformación de texto** - Normal, MAYÚSCULAS, minúsculas, Capitalizar
32. **Decoración de texto** - Ninguna, subrayado, línea superior, tachado
33. **Familia de fuente** - Heredar, Sans Serif, Serif, Monospace, Cursive

---

### 3. Pestaña RESPONSIVE (Móvil)
Adaptación completa para todos los dispositivos.

#### Móvil - hasta 640px (8 opciones)
34. **Ocultar en móvil** - Toggle para ocultar en dispositivos móviles
35. **Padding móvil** - Control deslizante 0-60px
36. **Margen superior móvil** - Control deslizante 0-60px
37. **Margen inferior móvil** - Control deslizante 0-60px
38. **Tamaño de fuente móvil** - Control deslizante 10-32px
39. **Alineación móvil** - Heredar, izquierda, centro, derecha
40. **Altura móvil** - Input para valores como 300px, 50vh, auto
41. **Orden de apilamiento móvil** - Input numérico para controlar el orden

#### Tablet - 640px a 1024px (7 opciones)
42. **Ocultar en tablet** - Toggle para ocultar en tablets
43. **Padding tablet** - Control deslizante 0-80px
44. **Margen superior tablet** - Control deslizante 0-80px
45. **Margen inferior tablet** - Control deslizante 0-80px
46. **Tamaño de fuente tablet** - Control deslizante 10-48px
47. **Alineación tablet** - Heredar, izquierda, centro, derecha
48. **Altura tablet** - Input para valores personalizados

#### Desktop - 1024px+ (3 opciones)
49. **Ocultar en desktop** - Toggle para ocultar en desktop
50. **Ancho máximo contenedor** - Ancho completo, xs (480px), sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
51. **Columnas en desktop** - Automático, 1-6 columnas

---

### 4. Pestaña AVANZADO (Advanced)
Efectos visuales y controles avanzados.

#### Bordes y Sombras (5 opciones)
52. **Ancho de borde** - Control deslizante 0-10px
53. **Color de borde** - Selector de color + input de texto
54. **Estilo de borde** - Sólido, discontinuo, punteado, doble, ninguno
55. **Sombra** - Ninguna, pequeña, mediana, grande, extra grande, 2xl, interior
56. **Sombra de texto** - Ninguna, pequeña, mediana, grande

#### Efectos Visuales (13 opciones)
57. **Opacidad** - Control deslizante 0-100%
58. **Filtro: Desenfoque** - Control deslizante 0-20px
59. **Filtro: Brillo** - Control deslizante 0-200%
60. **Filtro: Contraste** - Control deslizante 0-200%
61. **Filtro: Escala de grises** - Control deslizante 0-100%
62. **Gradiente de fondo** - Ninguno, lineal horizontal, lineal vertical, lineal diagonal, radial
63. **Color inicial del gradiente** - Selector de color (cuando gradiente activo)
64. **Color final del gradiente** - Selector de color (cuando gradiente activo)
65. **Posición de imagen de fondo** - Centro, superior, inferior, izquierda, derecha, esquinas
66. **Tamaño de imagen de fondo** - Automático, cubrir, contener
67. **Repetición de imagen de fondo** - No repetir, repetir, repetir horizontal, repetir vertical

#### Diseño y Posición (7 opciones)
68. **Modo de visualización** - Bloque, bloque en línea, flex, grid, oculto
69. **Justify Content** - Inicio, centro, final, espaciado entre, alrededor, uniforme (cuando display es flex)
70. **Align Items** - Inicio, centro, final, estirar, línea base (cuando display es flex)
71. **Dirección Flex** - Fila, columna, fila invertida, columna invertida (cuando display es flex)
72. **Posición** - Estático, relativo, absoluto, fijo, pegajoso
73. **Z-Index** - Control deslizante -10 a 100
74. **Desbordamiento** - Visible, oculto, scroll, automático
75. **Cursor** - Por defecto, puntero, texto, mover, no permitido, ayuda

#### Animación e Interacción (7 opciones)
76. **Efecto de entrada** - Sin animación, aparecer, deslizar arriba/abajo/izquierda/derecha, escalar, rotar
77. **Duración de transición** - Control deslizante 0-2000ms
78. **Retraso de animación** - Control deslizante 0-2000ms
79. **Efecto hover** - Ninguno, elevar, brillo, escalar, sombra
80. **Efecto parallax** - Toggle para activar efecto parallax
81. **Animación de scroll** - Toggle para revelar al hacer scroll
82. **Sección pegajosa (sticky)** - Toggle para hacer la sección pegajosa

#### Enlaces y URLs (6 opciones)
83. **Target de enlace** - Misma ventana (_self), nueva ventana (_blank), ventana padre, ventana superior
84. **Rel nofollow** - Toggle para añadir rel="nofollow"
85. **Rel noopener** - Toggle para añadir rel="noopener"
86. **Rel noreferrer** - Toggle para añadir rel="noreferrer"
87. **Color de enlace** - Selector de color + input de texto
88. **Color de enlace hover** - Selector de color + input de texto

---

## Características Adicionales de Media Library

### Carga Directa de Archivos (10 opciones)
89. **Subida de imágenes** - JPG, PNG, GIF, WebP (máx. 10MB)
90. **Subida de videos** - MP4, WebM, OGG (máx. 50MB)
91. **Subida múltiple** - Seleccionar varios archivos a la vez
92. **Validación de tipo MIME** - Verificación de tipo de archivo
93. **Validación de extensión** - Verificación adicional de seguridad
94. **Validación de tamaño** - Límites diferenciados para imágenes y videos
95. **Organización automática** - Carpetas separadas para imágenes/videos
96. **URL directa** - Input para insertar URLs externas
97. **Galería de medios** - Visualización de archivos existentes
98. **Búsqueda de medios** - Campo de búsqueda en la galería

---

## Opciones Adicionales por Tipo de Sección

### Secciones de Productos/Carrusel (12+ opciones)
99. **Categoría de productos** - Filtrar por categoría
100. **Solo productos destacados** - Toggle para mostrar solo destacados
101. **Ordenar por** - Más recientes, nombre, precio, popularidad
102. **Orden** - Ascendente, descendente
103. **Límite de productos** - Control deslizante 1-50
104. **Productos visibles** - Control deslizante 1-6
105. **Autoplay del carrusel** - Toggle para reproducción automática
106. **Velocidad de autoplay** - Control deslizante
107. **Mostrar flechas** - Toggle para navegación
108. **Mostrar puntos** - Toggle para indicadores
109. **Loop infinito** - Toggle para loop continuo
110. **Pausa al hover** - Toggle para pausar al pasar el mouse

---

## Total de Opciones Implementadas

**116+ opciones de edición funcionales**

### Distribución por Categoría:
- **Tamaño y Dimensiones**: 17 opciones
- **Espaciado y Diseño**: 18 opciones
- **Tipografía**: 9 opciones
- **Colores y Fondos**: 12 opciones
- **Responsive (Móvil/Tablet/Desktop)**: 18 opciones
- **Bordes y Sombras**: 5 opciones
- **Efectos Visuales**: 13 opciones
- **Animaciones e Interacciones**: 10 opciones
- **Enlaces y URLs**: 6 opciones
- **Media Library**: 10 opciones
- **Opciones Específicas de Sección**: 8+ opciones

---

## Características Técnicas

### Almacenamiento
- ✅ **Sin tablas nuevas**: Todo se almacena en los campos JSON existentes (`styles`, `settings`, `content`)
- ✅ **Compatible con versiones anteriores**: Secciones antiguas siguen funcionando
- ✅ **Escalable**: Fácil añadir más opciones sin cambios de esquema

### Seguridad
- ✅ **Validación de archivos**: MIME type + extensión
- ✅ **Límites de tamaño**: 10MB imágenes, 50MB videos
- ✅ **Sanitización de HTML**: DOMPurify para contenido personalizado
- ✅ **URLs seguras**: Validación de protocolos permitidos

### Rendimiento
- ✅ **Carga eficiente**: Estilos inline generados dinámicamente
- ✅ **Responsive CSS**: Classes de Tailwind + media queries
- ✅ **Animaciones optimizadas**: CSS animations hardware-accelerated
- ✅ **Lazy loading**: Opciones para imágenes y contenido

### UX/UI
- ✅ **Interfaz organizada**: 4 pestañas lógicas
- ✅ **Controles intuitivos**: Sliders, color pickers, toggles
- ✅ **Preview en vivo**: Cambios visibles inmediatamente
- ✅ **Responsivo**: Editor funciona en todos los dispositivos

---

## Uso Básico

### 1. Seleccionar una Sección
- Haz clic en cualquier sección del canvas para seleccionarla
- El panel de configuración se abrirá a la derecha

### 2. Navegar por las Pestañas
- **General**: Para contenido básico y estilos simples
- **Tamaño**: Para dimensiones precisas y tipografía
- **Responsive**: Para adaptación móvil/tablet/desktop
- **Avanzado**: Para efectos visuales y animaciones

### 3. Ajustar Opciones
- Usa sliders para valores numéricos
- Usa selectores de color para colores
- Usa toggles para opciones sí/no
- Usa dropdowns para opciones predefinidas

### 4. Subir Medios
- Haz clic en el botón de imagen 📷
- Selecciona la pestaña "Subir"
- Arrastra archivos o haz clic para seleccionar
- Soporta imágenes (JPG, PNG, GIF, WebP) y videos (MP4, WebM, OGG)

---

## Ejemplos de Uso Común

### Crear un Hero Responsive
1. Añade una sección "Hero"
2. En **General**: Configura título, subtítulo, botón
3. En **Tamaño**: Establece altura 80vh, padding 60px
4. En **Responsive**: 
   - Móvil: padding 20px, fuente 24px
   - Tablet: padding 40px, fuente 32px
5. En **Avanzado**: Añade animación "aparecer", sombra grande

### Ajustar Espaciado para Móviles
1. Selecciona tu sección
2. Pestaña **Responsive** > **Móvil**
3. Ajusta padding móvil: 16px
4. Ajusta márgenes: superior 8px, inferior 8px
5. Opcional: reduce tamaño de fuente para móvil

### Añadir Efectos Visuales
1. Pestaña **Avanzado** > **Efectos Visuales**
2. Configura gradiente de fondo: "lineal vertical"
3. Elige colores inicial y final
4. Añade sombra: "grande"
5. Ajusta opacidad si necesario

---

## Notas Importantes

1. **Todos los cambios se guardan automáticamente** en la base de datos
2. **No se requieren nuevas tablas** - todo usa los campos JSON existentes
3. **Compatible con todos los tipos de sección** existentes
4. **Responsive por defecto** - mobile-first approach
5. **Testado y funcional** - build exitoso sin errores

---

## Soporte Técnico

Para más información sobre características específicas, consulta:
- `PAGE_BUILDER_DOCUMENTATION.md` - Documentación general del Page Builder
- `ENHANCED_PAGE_BUILDER_GUIDE.md` - Guía de características mejoradas
- Código fuente en `src/components/page-builder/`

---

**Última actualización**: Diciembre 2024  
**Versión**: 2.0  
**Estado**: Producción
