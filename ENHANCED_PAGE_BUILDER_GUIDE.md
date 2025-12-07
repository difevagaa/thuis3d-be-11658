# Guía Completa del Editor de Páginas Mejorado

## 📋 Resumen de Mejoras

Se han añadido **más de 30 opciones nuevas** al editor de páginas, incluyendo:
- ✅ Carruseles de productos con 20+ configuraciones
- ✅ Carruseles de imágenes con 20+ configuraciones
- ✅ Selector de URLs con autocompletado
- ✅ 20+ tipos de secciones nuevas
- ✅ Todo sin crear nuevas tablas en la base de datos

---

## 🎨 Nuevos Tipos de Secciones

### 1. Carrusel de Productos (`products-carousel`)

Un carrusel completamente configurable para mostrar productos.

**Características principales:**
- Fuente de productos: destacados, recientes, más vendidos, por categoría, selección manual
- Ordenamiento personalizable
- Límite de productos ajustable
- Actualización automática de productos
- Rotación aleatoria de posiciones

**Configuraciones del Carrusel (20+ opciones):**

#### Pestaña "Visualización"
1. **Items por vista** (Desktop): 1-8 productos
2. **Items por vista** (Tablet): 1-6 productos
3. **Items por vista** (Móvil): 1-4 productos
4. **Espaciado entre items**: 0-100px
5. **Mostrar flechas de navegación**: Sí/No
6. **Mostrar puntos de paginación**: Sí/No
7. **Loop infinito**: Sí/No

#### Pestaña "Tiempo"
8. **Auto-reproducción**: Sí/No
9. **Retraso entre cambios**: 1-30 segundos
10. **Pausar al pasar el mouse**: Sí/No
11. **Detener después de interacción**: Sí/No
12. **Velocidad de transición**: 100-2000ms
13. **Tipo de transición**: Deslizar, Desvanecer, Cubo 3D, Coverflow, Voltear

#### Pestaña "Diseño"
14. **Dirección del carrusel**: Horizontal/Vertical
15. **Posición del carrusel**: Izquierda/Centro/Derecha
16. **Modo de visualización**: Carrusel/Cuadrícula/Mosaico/Apilado
17. **Altura del carrusel**: Personalizable (px, vh, auto)
18. **Ancho del carrusel**: Completo/Contenedor/Estrecho/Ancho
19. **Centrar diapositivas**: Sí/No
20. **Modo libre (Free mode)**: Sí/No

#### Pestaña "Avanzado"
21. **Lazy loading de imágenes**: Sí/No
22. **Fuente de productos**: Featured/Recent/Bestsellers/Category/Custom
23. **ID de categoría**: UUID (si fuente = categoría)
24. **Límite de productos**: 1-50
25. **Actualizar productos automáticamente**: Sí/No
26. **Intervalo de actualización**: 5-1440 minutos
27. **Rotar posiciones aleatoriamente**: Sí/No
28. **Keyboard navigation**: Sí/No
29. **Mouse wheel control**: Sí/No
30. **Breakpoint personalizado**: Número

---

### 2. Carrusel de Imágenes (`image-carousel`)

Carrusel para mostrar múltiples imágenes con las mismas 20+ configuraciones que el carrusel de productos.

**Campos por imagen:**
- URL de la imagen
- Texto alternativo (alt)
- Descripción/Caption
- Enlace (con selector de URL)

**Configuraciones:** Las mismas 30 opciones del carrusel de productos

---

### 3. Selector de URLs

Componente integrado en todos los campos de enlace con las siguientes características:

**URLs predefinidas:**
- Páginas estáticas (Inicio, Productos, Cotizaciones, etc.)
- Páginas personalizadas (desde la tabla `pages`)
- Categorías (con filtro dinámico)
- Productos (últimos 20)
- Posts de blog (si existen)

**Funcionalidades:**
- Búsqueda por nombre
- Agrupación por tipo
- Opción de escribir URL personalizada
- Botón para vista previa en nueva pestaña
- Autocompletado inteligente

---

### 4. Acordeón (`accordion`)

Sección de preguntas frecuentes o contenido expandible.

**Configuración:**
- Título de la sección
- Items ilimitados
- Cada item tiene:
  - Título
  - Contenido
  - Estado expandido/colapsado

---

### 5. Tabla de Precios (`pricing`)

Muestra planes de precios en formato de tarjetas.

**Configuración por plan:**
- Nombre del plan
- Precio
- Período (mes, año, etc.)
- Características (lista)
- Plan destacado (Sí/No)
- Texto del botón
- URL del botón

**Diseño automático:**
- 2 columnas para 2 planes o menos
- 3 columnas para 3+ planes
- Plan destacado con borde y escala aumentada

---

### 6. Formulario de Contacto (`form`)

Formulario funcional integrado.

**Campos disponibles:**
- Nombre (obligatorio)
- Email (obligatorio)
- Teléfono (opcional, configurable)
- Mensaje (obligatorio/opcional, configurable)

**Configuraciones:**
- Título del formulario
- Descripción
- Email de destino
- Incluir campo de teléfono: Sí/No
- Campo de mensaje obligatorio: Sí/No

---

### 7. Newsletter (`newsletter`)

Sección para suscripción a newsletter.

**Configuración:**
- Título
- Descripción
- Texto del botón
- Placeholder del email
- Estilos personalizables

---

### 8. Otros Tipos de Secciones Disponibles

Además de las secciones detalladas arriba, también están disponibles:

- **Hero Banner** (`hero`)
- **Texto** (`text`)
- **Imagen** (`image`)
- **Banner** (`banner`)
- **Llamada a la acción** (`cta`)
- **Características** (`features`)
- **Galería** (`gallery`)
- **Testimonios** (`testimonials`)
- **Video** (`video`)
- **Separador** (`divider`)
- **Espaciador** (`spacer`)
- **HTML Personalizado** (`custom`)
- **Pestañas** (`tabs`) - *En desarrollo*
- **Contador** (`countdown`) - *En desarrollo*
- **Equipo** (`team`) - *En desarrollo*
- **Estadísticas** (`stats`) - *En desarrollo*
- **Redes Sociales** (`social`) - *En desarrollo*

---

## 🎯 Cómo Usar el Editor

### Acceder al Editor

1. Ir a **Panel de Administración** > **Editor de Páginas**
2. Seleccionar la página a editar (ej: "Inicio")

### Añadir una Sección

1. Click en pestaña **"Añadir"** en la barra lateral
2. Seleccionar el tipo de sección deseada
3. La sección se añadirá al final de la página

### Configurar una Sección

1. Click en la sección en el canvas
2. Se abrirá el editor modal con 3 pestañas:
   - **Contenido**: Textos, imágenes, enlaces
   - **Configuración**: Opciones específicas de la sección
   - **Estilos**: Colores, padding, alineación, animaciones

### Configurar un Carrusel

1. Añadir sección "Carrusel de Productos" o "Carrusel de Imágenes"
2. En la pestaña **Contenido**:
   - Configurar título y subtítulo
   - Para productos: seleccionar fuente, ordenamiento, límite
   - Para imágenes: añadir imágenes con URLs
3. Expandir **"Configuración del Carrusel"**
4. Configurar las 4 sub-pestañas:
   - **Visualización**: Items por vista, espaciado, navegación
   - **Tiempo**: Auto-play, velocidad, transiciones
   - **Diseño**: Dirección, posición, modo, dimensiones
   - **Avanzado**: Lazy loading, actualización, controles

### Usar el Selector de URLs

1. En cualquier campo de URL (botones, enlaces, etc.)
2. Click en el botón desplegable a la izquierda
3. Buscar o seleccionar la URL deseada
4. O escribir una URL personalizada en el campo de texto
5. Click en el icono de enlace externo para vista previa

### Reordenar Secciones

- Usar los botones de flechas arriba/abajo
- O drag & drop (si está habilitado)

### Guardar Cambios

- Click en **"Guardar"** en la barra superior
- Los cambios se aplicarán inmediatamente en el sitio

---

## 📊 Ejemplos de Uso

### Ejemplo 1: Carrusel de Productos Destacados

```javascript
// Configuración de ejemplo
{
  "section_type": "products-carousel",
  "content": {
    "title": "Productos Destacados",
    "subtitle": "Descubre nuestras mejores impresiones 3D"
  },
  "settings": {
    // Visualización
    "itemsPerView": 4,
    "itemsPerViewTablet": 2,
    "itemsPerViewMobile": 1,
    "spaceBetween": 20,
    "showNavigation": true,
    "showPagination": true,
    "loop": true,
    
    // Tiempo
    "autoplay": true,
    "autoplayDelay": 5,
    "pauseOnHover": true,
    "transitionSpeed": 300,
    "transitionEffect": "slide",
    
    // Diseño
    "direction": "horizontal",
    "position": "center",
    "displayMode": "carousel",
    "height": "400px",
    
    // Avanzado
    "productSource": "featured",
    "productLimit": 10,
    "autoRefreshProducts": false
  }
}
```

### Ejemplo 2: Sección de Precios

```javascript
{
  "section_type": "pricing",
  "content": {
    "title": "Planes y Precios",
    "plans": [
      {
        "name": "Básico",
        "price": "9.99",
        "period": "mes",
        "features": [
          "Hasta 5 impresiones",
          "Soporte por email",
          "Acceso a biblioteca básica"
        ],
        "highlighted": false
      },
      {
        "name": "Pro",
        "price": "29.99",
        "period": "mes",
        "features": [
          "Impresiones ilimitadas",
          "Soporte prioritario",
          "Acceso a biblioteca completa",
          "Diseños personalizados"
        ],
        "highlighted": true
      }
    ]
  }
}
```

---

## 🔧 Notas Técnicas

### Sin Nuevas Tablas

Todas las nuevas funcionalidades utilizan las tablas existentes:
- `page_builder_pages`
- `page_builder_sections`

Los datos se almacenan en los campos JSONB:
- `settings`: Configuraciones de la sección
- `content`: Contenido de la sección
- `styles`: Estilos visuales

### Compatibilidad

- ✅ No requiere migraciones de base de datos
- ✅ Compatible con todas las secciones existentes
- ✅ Responsive en todos los dispositivos
- ✅ Optimizado para rendimiento

### Seguridad

- Sanitización HTML con DOMPurify
- Validación de URLs
- Prevención de XSS
- Lazy loading de imágenes

---

## 🚀 Funcionalidades Futuras

Las siguientes secciones están disponibles en la barra lateral pero pendientes de implementación completa:

1. **Pestañas** (`tabs`): Contenido organizado en pestañas
2. **Contador** (`countdown`): Contador regresivo para eventos
3. **Equipo** (`team`): Perfiles del equipo
4. **Estadísticas** (`stats`): Números y métricas destacadas
5. **Redes Sociales** (`social`): Enlaces a redes sociales

---

## 📞 Soporte

Para preguntas o problemas:
1. Revisar esta documentación
2. Verificar los logs del navegador (F12 > Console)
3. Contactar al equipo de desarrollo

---

## ✅ Checklist de Características Implementadas

- [x] Carrusel de productos con 30+ configuraciones
- [x] Carrusel de imágenes con 30+ configuraciones
- [x] Selector de URLs con autocompletado
- [x] Sección de acordeón
- [x] Sección de precios
- [x] Sección de formulario de contacto
- [x] Sección de newsletter
- [x] 20+ tipos de secciones en total
- [x] Todo sin crear nuevas tablas
- [x] Editor modal con pestañas
- [x] Vista previa en tiempo real
- [x] Responsive design
- [x] Seguridad y sanitización

**Total de opciones añadidas: 40+ configuraciones nuevas en carruseles, 20+ tipos de secciones, selector de URLs inteligente**
