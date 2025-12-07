# Guía del Editor de Páginas Mejorado

## 🎉 Nuevas Funcionalidades Implementadas

### 1. Opciones Completas de Edición (30+ por Sección)

**ANTES:** Solo se veían 3-5 opciones básicas en el sidebar derecho
**AHORA:** Haz clic en el botón ✏️ "Editar" en cualquier sección para abrir un diálogo completo con 30+ opciones

#### Cómo Acceder a Todas las Opciones:

1. **Abre el Editor de Páginas** desde Admin → Editor de Páginas
2. **Selecciona una página** del sidebar izquierdo (Inicio, Productos, etc.)
3. **Haz clic en el botón ✏️ (lápiz)** que aparece al pasar el mouse sobre cualquier sección
4. **Se abre un diálogo completo** con 4 pestañas:
   - **Contenido**: Textos, imágenes, URLs
   - **Configuración**: Comportamiento y opciones específicas
   - **Estilos**: Colores, espaciado, tipografía
   - **Avanzado**: Opciones técnicas y de rendimiento

### 2. Sidebar con Auto-Ocultación

**Sidebar derecho (panel de opciones):**
- Se oculta automáticamente después de 5 segundos sin actividad
- Reaparece automáticamente cuando mueves el mouse o teclado
- Puedes alternar manualmente con el botón ◀/▶

**Beneficio:** Más espacio para ver tu diseño sin distracciones

### 3. Barra de Desplazamiento en "Añadir Sección"

**ANTES:** No podías ver secciones debajo de "Banner Promocional"
**AHORA:** Scroll visible para acceder a TODAS las secciones disponibles (23 tipos)

### 4. Opciones Detalladas por Tipo de Sección

#### 🎨 **Separador/Divider (30 opciones)**
- Estilos: línea sólida, discontinua, punteada, doble, gradiente, con patrón
- Control total de grosor, color, altura, márgenes
- Iconos decorativos personalizables
- Animaciones de entrada
- Responsive (diferentes configuraciones para móvil/tablet/desktop)

#### 📏 **Espaciador (30 opciones)**
- Alturas independientes para desktop/tablet/móvil
- Fondos: transparente, color sólido, gradiente, con patrón
- Visibilidad por dispositivo (ocultar en móvil/tablet/desktop)
- ID y clases CSS personalizadas

#### 🛒 **Carrusel de Productos (35+ opciones)**
- **Visualización**: items por vista (desktop/tablet/móvil), espaciado
- **Tiempo**: auto-rotación, intervalos, pausar al hover
- **Diseño**: dirección, altura, efectos de transición
- **Filtrado**: por categoría, solo destacados, ordenamiento
- **Contenido**: límite de productos, mostrar precios/rating/botón carrito

#### 📝 **Texto (25+ opciones)**
- Tamaños de título y texto
- Alineación y espaciado entre líneas/párrafos
- Diseño multi-columna
- Letra capital (drop cap)
- Botón CTA integrado
- Colores independientes para título/texto/fondo
- Animaciones de entrada

#### 🖼️ **Imagen (30+ opciones)**
- Tamaño, posición, alineación
- Bordes redondeados y sombras
- Efectos hover (zoom, lift, brillo, escala de grises)
- Filtros (sepia, brightness, contrast, blur)
- Lightbox al hacer clic
- Lazy loading para optimización

#### 🎞️ **Galería (12+ opciones)**
- Columnas responsivas
- Espaciado entre imágenes
- Relación de aspecto
- Diseño mosaico (masonry)
- Efectos y lightbox

#### ⏱️ **Contador (40+ opciones)**
- Tipos: cuenta regresiva, progresiva, estático, animado
- Formatos de visualización
- Etiquetas personalizables
- Colores y estilos de cajas
- Efectos (parpadeo, volteo, deslizamiento)

## 📋 Páginas Disponibles en el Editor

El editor ahora gestiona **16 páginas**:

### Páginas Principales (7)
- ✅ Inicio
- ✅ Productos
- ✅ Cotizaciones
- ✅ Tarjetas Regalo
- ✅ Blog
- ✅ Galería
- ✅ Mi Cuenta

### Páginas Legales (9)
- ✅ Política de Privacidad
- ✅ Términos y Condiciones
- ✅ Política de Cookies
- ✅ Aviso Legal
- ✅ Política de Envíos
- ✅ Política de Devoluciones
- ✅ Sobre Nosotros
- ✅ Contacto
- ✅ Preguntas Frecuentes

**Nota:** Si no ves alguna página, verifica que:
1. La base de datos tiene la migración aplicada (`20251207130000_add_legal_pages_to_page_builder.sql`)
2. La página está habilitada (`is_enabled = true`)

## 🎯 Flujo de Trabajo Recomendado

1. **Navegar**: Selecciona la página del sidebar izquierdo
2. **Añadir Secciones**: Usa el panel derecho "Añadir Sección"
3. **Editar Completo**: Haz clic en ✏️ para abrir el editor completo
4. **Configurar**: Usa las 4 pestañas para personalizar completamente
5. **Guardar**: Los cambios se guardan automáticamente al cerrar el diálogo
6. **Vista Previa**: Usa el botón 👁️ para ver la página en vivo

## 🔧 Tipos de Secciones Disponibles (23)

1. Hero Banner
2. Carrusel de Productos ⭐ 35+ opciones
3. Carrusel de Imágenes
4. Texto ⭐ 25+ opciones
5. Imagen ⭐ 30+ opciones
6. Galería
7. Características
8. Estadísticas
9. Llamada a la acción
10. Banner
11. Testimonios
12. Video
13. Formulario
14. Acordeón
15. Pestañas
16. Contador ⭐ 40+ opciones
17. Precios
18. Equipo
19. Newsletter
20. Redes Sociales
21. Separador ⭐ 30+ opciones
22. Espaciador ⭐ 30+ opciones
23. HTML Personalizado

## 💡 Tips y Trucos

### Para Mejor Rendimiento
- Usa "Lazy loading" en imágenes y carruseles
- Activa "Responsive" para ajustes automáticos móvil

### Para Mejor Diseño
- Usa espaciadores con patrones sutiles entre secciones
- Aplica animaciones de entrada suaves (fade-up)
- Mantén consistencia en colores usando el selector de color

### Para Mejor UX
- Configura alturas responsivas diferentes (desktop/tablet/móvil)
- Usa efectos hover sutiles en imágenes
- Activa lightbox en galerías para mejor visualización

## ❗ Importante

- **Todos los cambios se guardan en JSONB**: No hay nuevas tablas
- **Sin migraciones necesarias**: Todo usa la estructura existente
- **Compatible con versiones anteriores**: Las secciones antiguas siguen funcionando
- **Construcción exitosa**: Build pasa sin errores

## 🐛 Resolución de Problemas

### "No veo el botón Editar (✏️)"
- Pasa el mouse sobre la sección, debe aparecer al lado de los botones 👁️, 📋, 🗑️

### "No se guardan mis cambios"
- Haz clic en "Guardar" en el diálogo antes de cerrar
- Verifica que no haya errores en la consola del navegador

### "No veo todas las páginas"
- Verifica que estés en el Editor de Páginas (no en Gestión de Contenido)
- Revisa que la migración de base de datos esté aplicada

### "El sidebar no se oculta"
- Es normal, se oculta después de 5 segundos SIN actividad
- Cualquier movimiento de mouse/teclado lo vuelve a mostrar

## 📞 Soporte

Si encuentras algún problema o necesitas ayuda adicional, revisa:
1. Console del navegador (F12) para errores
2. Documentación completa en `PAGE_BUILDER_DOCUMENTATION.md`
3. Guía de opciones en `EDITOR_OPTIONS_GUIDE.md`
