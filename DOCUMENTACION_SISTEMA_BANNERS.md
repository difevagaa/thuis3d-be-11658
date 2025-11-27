# Sistema de Banners - Documentación para Administradores

## Descripción General

El sistema de banners de Thuis3D te permite crear y gestionar banners promocionales en diferentes secciones de tu página de inicio. Ahora incluye soporte completo para múltiples imágenes en formato carrusel.

## Características Principales

### 1. **Ubicaciones de Banners**

Los banners pueden mostrarse en las siguientes secciones de la página de inicio:

- **Hero (Carrusel Superior)**: Carrusel principal en la parte superior de la página
- **Después de Productos Destacados**: Sección inmediatamente después del carrusel de productos
- **Después de Accesos Rápidos**: Después de las tarjetas de acceso rápido
- **Después de "Por Qué Elegirnos"**: Después de la sección de características
- **Al Final de la Página**: En la parte inferior de la página de inicio

### 2. **Modos de Imagen**

#### Imagen Única
- Selecciona y carga una sola imagen para el banner
- La imagen se ajusta automáticamente según el tamaño configurado
- Ideal para banners simples y directos

#### Múltiples Imágenes (Carrusel)
- Carga múltiples imágenes que se muestran en un carrusel automático
- Cada imagen rota automáticamente (4-5 segundos por imagen)
- Perfecto para mostrar varios productos o promociones
- Las imágenes se pueden reordenar usando las flechas ↑↓

### 3. **Estilos de Visualización**

#### Pantalla Completa (Fullscreen)
- El banner ocupa todo el ancho de la pantalla
- La imagen de fondo cubre toda la sección
- Texto centrado sobre la imagen con overlay oscuro para mejor legibilidad
- **Ancho recomendado**: 100% (predeterminado)
- **Altura recomendada**: 400px a 600px

#### Parcial (Card Style)
- El banner se muestra como una tarjeta
- Puede configurarse con ancho personalizado
- La imagen se muestra en la parte superior y el texto en la parte inferior
- **Ancho recomendado**: 100% o valores específicos como 80%, 1200px
- **Altura recomendada**: 300px a 500px

### 4. **Modos de Tamaño de Imagen**

- **Cover (Cubrir todo)**: La imagen cubre todo el espacio, puede cortarse en los bordes
- **Contain (Contener)**: La imagen completa es visible, puede haber espacio vacío
- **Fill (Rellenar)**: La imagen se estira para llenar todo el espacio

## Cómo Crear un Banner

### Paso 1: Acceder al Panel de Banners
1. Inicia sesión como administrador
2. Ve a **Gestión de Contenido** → **Banners de Página de Inicio**

### Paso 2: Crear un Nuevo Banner
1. Haz clic en el botón **"Nuevo Banner"**
2. Completa la información básica:
   - **Título**: Texto principal del banner (obligatorio)
   - **Descripción**: Texto adicional o call-to-action (opcional)
   - **URL de Destino**: Enlace al hacer clic en el banner (opcional)

### Paso 3: Configurar Imágenes

#### Para Imagen Única:
1. Deja el switch **"Modo de Imágenes"** desactivado
2. Haz clic en **"Cargar"** para subir una imagen desde tu computadora
3. O pega la URL de una imagen existente
4. Verás una vista previa de la imagen cargada

#### Para Múltiples Imágenes (Carrusel):
1. Activa el switch **"Modo de Imágenes"**
2. Haz clic en **"Seleccionar archivos"** y selecciona múltiples imágenes (puedes seleccionar varias a la vez)
3. Las imágenes se cargarán y mostrarán en una cuadrícula
4. Puedes:
   - **Eliminar una imagen**: Haz clic en la X roja que aparece al pasar el mouse
   - **Reordenar**: Usa las flechas ↑↓ para cambiar el orden de las imágenes
5. El número de la esquina indica el orden de aparición en el carrusel

### Paso 4: Configurar Visualización
1. **Modo de Tamaño**: Elige cómo se ajusta la imagen (Cover, Contain, Fill)
2. **Estilo de Visualización**: Selecciona Pantalla Completa o Parcial
3. **Sección de la Página**: Elige dónde aparecerá el banner
4. **Altura del Banner**: Ejemplo: `400px`, `50vh`, `100%`
5. **Ancho del Banner**: Ejemplo: `100%`, `80%`, `1200px`

### Paso 5: Personalización de Colores (Opcional)
- **Color del título**: Código hexadecimal para el color del título (ej: `#FFFFFF`)
- **Color del texto**: Código hexadecimal para el texto descriptivo

### Paso 6: Configurar Orden
- **Orden en Sección**: Define la posición relativa dentro de su sección
- **Orden de Visualización (Hero)**: Solo relevante para banners tipo Hero

### Paso 7: Activar y Guardar
1. Asegúrate de que el switch **"Activo"** esté activado
2. Haz clic en **"Guardar"**

## Mejores Prácticas

### Tamaños de Imagen Recomendados

#### Banners Hero (Fullscreen)
- **Resolución**: 1920x600px o superior
- **Formato**: JPG o PNG
- **Peso**: Máximo 500KB por imagen (optimiza para web)

#### Banners de Sección (Cards)
- **Resolución**: 1200x400px
- **Formato**: JPG o PNG
- **Peso**: Máximo 300KB por imagen

### Para Carruseles con Múltiples Imágenes
- Usa imágenes del mismo tamaño para una transición suave
- Mantén un estilo visual consistente entre todas las imágenes
- Límite recomendado: 3-5 imágenes por carrusel
- Cada imagen debe comunicar un mensaje claro

### Configuración de Altura y Ancho

#### Fullscreen
```
Altura: 500px (o 50vh para responsive)
Ancho: 100%
```

#### Card Style
```
Altura: 400px
Ancho: 100% (o 80% para márgenes laterales)
```

### Colores de Texto
- Para imágenes oscuras: Usa `#FFFFFF` (blanco)
- Para imágenes claras: Usa `#000000` (negro)
- Asegúrate de que el texto sea legible sobre la imagen

## Solución de Problemas

### El banner no se muestra
- ✅ Verifica que el switch **"Activo"** esté activado
- ✅ Confirma que has seleccionado la sección correcta
- ✅ Asegúrate de que la URL de la imagen sea válida

### El banner no tiene el tamaño correcto
- ✅ Verifica los valores de altura y ancho
- ✅ Usa unidades correctas: `px`, `vh`, `%`
- ✅ Para fullscreen, usa `width: 100%`

### Las imágenes del carrusel no rotan
- ✅ Verifica que hayas activado el modo de múltiples imágenes
- ✅ Asegúrate de que todas las imágenes estén activas
- ✅ Comprueba que el banner esté guardado correctamente

### El texto no es legible
- ✅ Ajusta los colores del título y texto
- ✅ El sistema agrega automáticamente un overlay oscuro para mejorar la legibilidad
- ✅ Usa imágenes con áreas claras u oscuras consistentes para el texto

## Ejemplos de Uso

### Ejemplo 1: Banner Hero con Carrusel de Promociones
```
Título: "Ofertas de la Semana"
Descripción: "Descuentos especiales en productos seleccionados"
Modo: Múltiples Imágenes (3 imágenes)
Estilo: Pantalla Completa
Sección: Hero (Carrusel Superior)
Altura: 500px
Ancho: 100%
```

### Ejemplo 2: Banner de Producto Individual
```
Título: "Nueva Colección de Miniaturas"
Descripción: "Descubre nuestros nuevos diseños exclusivos"
Modo: Imagen Única
Estilo: Parcial
Sección: Después de Productos Destacados
Altura: 400px
Ancho: 100%
```

### Ejemplo 3: Banner de Call-to-Action
```
Título: "¿Necesitas un presupuesto?"
Descripción: "Obtén una cotización personalizada en minutos"
URL: /quotes
Modo: Imagen Única
Estilo: Pantalla Completa
Sección: Al Final de la Página
Altura: 300px
Ancho: 100%
```

## Notas Técnicas

- Los banners se cargan en tiempo real al actualizar la página
- Las imágenes se almacenan en Supabase Storage
- Los carruseles tienen transición automática cada 4-5 segundos
- El sistema es completamente responsive para móviles y tablets
- Soporte para videos (opcional) además de imágenes

## Soporte

Si encuentras algún problema o necesitas ayuda adicional, contacta al equipo de soporte técnico.

---

**Versión del documento**: 1.0  
**Fecha de actualización**: 23 de Noviembre, 2025
