# Plan de Pruebas: Sistema de Banners con Múltiples Imágenes

**Fecha**: 23 de Noviembre, 2025  
**Versión**: 1.0  
**Tipo**: Pruebas Manuales Funcionales

---

## Objetivo

Este documento describe las pruebas manuales que deben ejecutarse para validar el correcto funcionamiento del sistema de banners con soporte para múltiples imágenes (carrusel). 

**Nota**: Este proyecto no cuenta con infraestructura de tests automatizados (Jest, Vitest, etc.), por lo que las pruebas deben realizarse manualmente.

---

## Pre-requisitos para Ejecutar las Pruebas

- [ ] Migraciones aplicadas en la base de datos
- [ ] Código frontend desplegado con los cambios más recientes
- [ ] Usuario con rol `admin` para acceder al panel de administración
- [ ] Navegador web actualizado (Chrome, Firefox, Edge, Safari)
- [ ] DevTools del navegador abierto (para verificar logs y errores)
- [ ] Acceso a Supabase Dashboard para verificar datos en la base de datos

---

## Suite de Pruebas

### Test Suite 1: Creación de Banners

#### Test 1.1: Crear Banner con Imagen Única
**Objetivo**: Verificar que se puede crear un banner con una sola imagen.

**Precondiciones**:
- Usuario autenticado como admin
- Panel de administración accesible

**Pasos**:
1. Ir a Panel Admin → Gestión de Contenido → Banners
2. Hacer clic en "Nuevo Banner"
3. Completar el formulario:
   - **Título**: "Banner Prueba Imagen Única"
   - **Descripción**: "Descripción de prueba"
   - **Modo de Imágenes**: DESACTIVADO (imagen única)
   - **Cargar imagen**: Seleccionar archivo JPG/PNG (ej: banner-test-1.jpg)
   - **URL de Destino**: "/productos"
   - **Sección de Página**: "Hero (Carrusel Superior)"
   - **Estado**: Activo
4. Hacer clic en "Guardar"

**Resultado Esperado**:
- ✅ Toast de éxito: "Banner creado exitosamente"
- ✅ Modal se cierra automáticamente
- ✅ Banner aparece en la lista con la imagen cargada
- ✅ En consola del navegador:
  ```
  💾 Guardando banner: {title: "Banner Prueba Imagen Única", ...}
  ✅ Banner creado: {id: "...", ...}
  ```

**Verificación en Base de Datos**:
```sql
SELECT id, title, image_url, is_active 
FROM homepage_banners 
WHERE title = 'Banner Prueba Imagen Única';
```

**Criterio de Aceptación**: El banner se crea sin errores y aparece en el listado.

---

#### Test 1.2: Crear Banner con Múltiples Imágenes (Carrusel)
**Objetivo**: Verificar que se puede crear un banner con carrusel de imágenes.

**Precondiciones**:
- Usuario autenticado como admin
- Al menos 3 archivos de imagen disponibles (JPG/PNG)

**Pasos**:
1. Ir a Panel Admin → Gestión de Contenido → Banners
2. Hacer clic en "Nuevo Banner"
3. Completar el formulario:
   - **Título**: "Banner Prueba Carrusel"
   - **Descripción**: "Carrusel de prueba con 3 imágenes"
   - **Modo de Imágenes**: ACTIVADO (carrusel)
   - **Cargar imágenes**: Seleccionar 3 archivos simultáneamente
     - banner-carousel-1.jpg
     - banner-carousel-2.jpg
     - banner-carousel-3.jpg
   - **URL de Destino**: "/ofertas"
   - **Sección de Página**: "Hero (Carrusel Superior)"
   - **Estado**: Activo
4. Verificar que las 3 imágenes aparecen en la lista de "Imágenes cargadas"
5. Verificar que cada imagen tiene un número de orden (#1, #2, #3)
6. Hacer clic en "Guardar"

**Resultado Esperado**:
- ✅ Toast de éxito: "Banner creado exitosamente"
- ✅ Modal se cierra automáticamente
- ✅ Banner aparece en la lista mostrando las 3 imágenes en miniatura
- ✅ Indica "(3 img)" junto a las miniaturas
- ✅ En consola del navegador:
  ```
  💾 Guardando banner: {title: "Banner Prueba Carrusel", ...}
  ✅ Banner creado: {id: "...", ...}
  🖼️ Guardando múltiples imágenes para banner nuevo...
  📥 Insertando 3 imágenes...
  Datos a insertar: [{...}, {...}, {...}]
  ✅ Imágenes guardadas: 3
  ```

**Verificación en Base de Datos**:
```sql
-- Verificar banner
SELECT id, title, image_url 
FROM homepage_banners 
WHERE title = 'Banner Prueba Carrusel';

-- Verificar imágenes (usar el ID del banner de arriba)
SELECT id, banner_id, image_url, display_order, is_active
FROM banner_images
WHERE banner_id = '[ID_DEL_BANNER]'
ORDER BY display_order;
```

**Criterio de Aceptación**: 
- Banner se crea con `image_url` vacío (porque usa carrusel)
- 3 registros en `banner_images` con el mismo `banner_id`
- `display_order` es 0, 1, 2 respectivamente

---

#### Test 1.3: Validación - Crear Banner sin Imagen
**Objetivo**: Verificar que el sistema previene crear un banner sin imagen.

**Pasos**:
1. Ir a Panel Admin → Gestión de Contenido → Banners
2. Hacer clic en "Nuevo Banner"
3. Completar solo:
   - **Título**: "Banner sin Imagen"
   - **Modo de Imágenes**: DESACTIVADO
   - NO cargar ninguna imagen
4. Hacer clic en "Guardar"

**Resultado Esperado**:
- ✅ Toast de error: "Debes cargar una imagen para el banner"
- ✅ Modal NO se cierra
- ✅ Datos del formulario se mantienen
- ✅ Banner NO se crea en la base de datos

**Criterio de Aceptación**: La validación previene la creación sin imagen.

---

#### Test 1.4: Validación - Crear Carrusel sin Imágenes
**Objetivo**: Verificar que el sistema previene crear un carrusel vacío.

**Pasos**:
1. Ir a Panel Admin → Gestión de Contenido → Banners
2. Hacer clic en "Nuevo Banner"
3. Completar:
   - **Título**: "Carrusel Vacío"
   - **Modo de Imágenes**: ACTIVADO (carrusel)
   - NO cargar ninguna imagen
4. Hacer clic en "Guardar"

**Resultado Esperado**:
- ✅ Toast de error: "Debes agregar al menos una imagen al carrusel"
- ✅ Modal NO se cierra
- ✅ Datos del formulario se mantienen

**Criterio de Aceptación**: La validación previene la creación de carrusel vacío.

---

### Test Suite 2: Edición de Banners

#### Test 2.1: Editar Banner - Cambiar de Imagen Única a Carrusel
**Objetivo**: Verificar que se puede convertir un banner de imagen única a carrusel.

**Precondiciones**:
- Banner con imagen única ya creado (Test 1.1)

**Pasos**:
1. Ir a Panel Admin → Gestión de Contenido → Banners
2. Localizar "Banner Prueba Imagen Única"
3. Hacer clic en el botón "Editar" (icono de lápiz)
4. Verificar que los datos se cargan correctamente
5. Cambiar:
   - **Modo de Imágenes**: ACTIVAR (cambiar a carrusel)
6. Cargar 2 nuevas imágenes:
   - banner-carousel-4.jpg
   - banner-carousel-5.jpg
7. Verificar que aparecen en la lista (debe mostrar 2 imágenes)
8. Hacer clic en "Guardar"

**Resultado Esperado**:
- ✅ Toast de éxito: "Banner actualizado exitosamente"
- ✅ Modal se cierra
- ✅ Banner ahora muestra las 2 imágenes en miniatura
- ✅ Indica "(2 img)"
- ✅ En consola:
  ```
  💾 Guardando banner: {title: "Banner Prueba Imagen Única", ...}
  ✅ Banner actualizado: {id: "...", ...}
  🖼️ Procesando múltiples imágenes para banner existente...
  🗑️ Eliminando imágenes antiguas del banner [ID]...
  ✅ Imágenes antiguas eliminadas
  📥 Insertando 2 imágenes nuevas...
  ✅ Imágenes guardadas: 2
  ```

**Verificación en Base de Datos**:
```sql
-- El banner debe tener image_url vacío
SELECT id, title, image_url 
FROM homepage_banners 
WHERE title = 'Banner Prueba Imagen Única';

-- Debe haber 2 imágenes en banner_images
SELECT COUNT(*) as total_images
FROM banner_images
WHERE banner_id = '[ID_DEL_BANNER]';
```

**Criterio de Aceptación**: 
- `image_url` del banner se limpia
- 2 registros nuevos en `banner_images`

---

#### Test 2.2: Editar Carrusel - Reemplazar Imágenes
**Objetivo**: Verificar que se pueden reemplazar las imágenes de un carrusel existente.

**Precondiciones**:
- Banner con carrusel ya creado (Test 1.2)

**Pasos**:
1. Ir a Panel Admin → Gestión de Contenido → Banners
2. Localizar "Banner Prueba Carrusel"
3. Hacer clic en "Editar"
4. Verificar que aparecen las 3 imágenes originales
5. Eliminar la segunda imagen (hacer clic en X roja)
6. Cargar una nueva imagen:
   - banner-carousel-6.jpg
7. Verificar que ahora hay 3 imágenes (2 originales + 1 nueva)
8. Hacer clic en "Guardar"

**Resultado Esperado**:
- ✅ Toast de éxito: "Banner actualizado exitosamente"
- ✅ Las imágenes antiguas se eliminan
- ✅ Las nuevas imágenes se insertan
- ✅ En consola:
  ```
  🗑️ Eliminando imágenes antiguas del banner...
  ✅ Imágenes antiguas eliminadas
  📥 Insertando 3 imágenes nuevas...
  ✅ Imágenes guardadas: 3
  ```

**Verificación en Base de Datos**:
```sql
-- Debe haber exactamente 3 imágenes
SELECT id, image_url, display_order
FROM banner_images
WHERE banner_id = '[ID_DEL_BANNER]'
ORDER BY display_order;
```

**Criterio de Aceptación**: Las imágenes se actualizan correctamente.

---

#### Test 2.3: Editar Carrusel - Reordenar Imágenes
**Objetivo**: Verificar que se puede cambiar el orden de las imágenes en el carrusel.

**Precondiciones**:
- Banner con carrusel con al menos 3 imágenes

**Pasos**:
1. Ir a Panel Admin → Gestión de Contenido → Banners
2. Editar un banner con carrusel
3. Identificar las imágenes por su posición (#1, #2, #3)
4. En la imagen #2, hacer clic en la flecha ↑ (mover arriba)
5. Verificar que la imagen #2 ahora es #1
6. En la imagen ahora en posición #3, hacer clic en ↑
7. Hacer clic en "Guardar"

**Resultado Esperado**:
- ✅ Las imágenes se reordenan visualmente en el modal
- ✅ Al guardar, el nuevo orden se persiste
- ✅ `display_order` se actualiza en base de datos

**Verificación en Base de Datos**:
```sql
SELECT id, display_order, image_url
FROM banner_images
WHERE banner_id = '[ID_DEL_BANNER]'
ORDER BY display_order;
```

**Criterio de Aceptación**: El orden de `display_order` coincide con el orden visual.

---

### Test Suite 3: Eliminación de Banners

#### Test 3.1: Eliminar Banner con Imagen Única
**Objetivo**: Verificar que se puede eliminar un banner con imagen única.

**Precondiciones**:
- Banner con imagen única existente

**Pasos**:
1. Ir a Panel Admin → Gestión de Contenido → Banners
2. Localizar un banner con imagen única
3. Hacer clic en el botón "Eliminar" (icono de papelera)
4. Confirmar la eliminación en el diálogo

**Resultado Esperado**:
- ✅ Toast de éxito: "Banner eliminado"
- ✅ Banner desaparece de la lista
- ✅ Banner se elimina de la base de datos

**Verificación en Base de Datos**:
```sql
SELECT COUNT(*) FROM homepage_banners WHERE id = '[ID_DEL_BANNER_ELIMINADO]';
-- Debe retornar 0
```

**Criterio de Aceptación**: Banner se elimina sin errores.

---

#### Test 3.2: Eliminar Banner con Carrusel (Cascade Delete)
**Objetivo**: Verificar que al eliminar un banner con carrusel, también se eliminan sus imágenes (ON DELETE CASCADE).

**Precondiciones**:
- Banner con carrusel con al menos 3 imágenes

**Pasos**:
1. Ir a Panel Admin → Gestión de Contenido → Banners
2. Anotar el ID del banner con carrusel a eliminar
3. Verificar en base de datos cuántas imágenes tiene:
   ```sql
   SELECT COUNT(*) FROM banner_images WHERE banner_id = '[ID_DEL_BANNER]';
   ```
4. Hacer clic en "Eliminar" en el banner
5. Confirmar la eliminación

**Resultado Esperado**:
- ✅ Toast de éxito: "Banner eliminado"
- ✅ Banner desaparece de la lista

**Verificación en Base de Datos**:
```sql
-- Banner eliminado
SELECT COUNT(*) FROM homepage_banners WHERE id = '[ID_DEL_BANNER]';
-- Debe retornar 0

-- Imágenes también eliminadas (CASCADE)
SELECT COUNT(*) FROM banner_images WHERE banner_id = '[ID_DEL_BANNER]';
-- Debe retornar 0
```

**Criterio de Aceptación**: 
- Banner y todas sus imágenes se eliminan
- No quedan registros huérfanos en `banner_images`

---

### Test Suite 4: Manejo de Errores

#### Test 4.1: Error de Red - Banner NO se Guarda
**Objetivo**: Verificar que el modal permanece abierto y los datos se preservan si hay un error de red.

**Pasos**:
1. Abrir DevTools → Network tab
2. Activar "Offline" o "Throttling: Offline"
3. Ir a Panel Admin → Gestión de Contenido → Banners
4. Crear un nuevo banner con carrusel y 2 imágenes
5. Hacer clic en "Guardar"

**Resultado Esperado**:
- ✅ Toast de error con mensaje descriptivo (ej: "Error al crear el banner: ...")
- ✅ Modal NO se cierra
- ✅ Datos del formulario se mantienen (título, descripción, etc.)
- ✅ Las 2 imágenes cargadas permanecen visibles
- ✅ Usuario puede desactivar "Offline" y reintentar sin perder datos

**Criterio de Aceptación**: 
- Los datos NO se pierden
- El usuario puede reintentar sin volver a cargar imágenes

---

#### Test 4.2: Error de Tabla No Encontrada (Schema Cache)
**Objetivo**: Verificar el mensaje de error específico si la tabla `banner_images` no está en el schema cache.

**Nota**: Este test solo se puede realizar si intencionalmente se simula el error o en un ambiente donde las migraciones no se han aplicado.

**Pasos** (simulados):
1. En un ambiente de desarrollo/staging SIN las migraciones aplicadas
2. Intentar crear un banner con carrusel
3. Hacer clic en "Guardar"

**Resultado Esperado**:
- ✅ Toast de error con mensaje específico:
  ```
  "La tabla de imágenes no está disponible en el sistema. 
   Por favor contacta al administrador para aplicar las migraciones necesarias. 
   Detalles técnicos: Could not find the table 'public.banner_images' in the schema cache"
  ```
- ✅ Modal NO se cierra
- ✅ Imágenes cargadas se preservan
- ✅ En consola del navegador, log con detalles técnicos del error

**Criterio de Aceptación**: 
- Error detectado específicamente
- Mensaje claro para el usuario
- Detalles técnicos en consola para debugging

---

### Test Suite 5: Visualización en Frontend

#### Test 5.1: Visualizar Banner con Imagen Única en Home
**Objetivo**: Verificar que los banners con imagen única se muestran correctamente en la página principal.

**Precondiciones**:
- Banner activo con imagen única en sección "Hero"

**Pasos**:
1. Ir a la página principal del sitio (Home)
2. Verificar que el banner aparece en el carrusel hero
3. Verificar que la imagen carga correctamente (no 404)
4. Hacer clic en el banner (si tiene `link_url` configurado)

**Resultado Esperado**:
- ✅ Banner visible en la sección hero
- ✅ Imagen carga sin errores
- ✅ Si tiene link_url, redirige correctamente
- ✅ Título y descripción se muestran (si aplica)

**Criterio de Aceptación**: Banner se visualiza correctamente en frontend.

---

#### Test 5.2: Visualizar Banner con Carrusel en Home
**Objetivo**: Verificar que los banners con múltiples imágenes rotan automáticamente.

**Precondiciones**:
- Banner activo con carrusel de al menos 3 imágenes en sección "Hero"

**Pasos**:
1. Ir a la página principal del sitio (Home)
2. Observar el carrusel hero
3. Esperar al menos 10 segundos
4. Verificar que las imágenes cambian automáticamente
5. Verificar que todas las imágenes del banner aparecen en rotación

**Resultado Esperado**:
- ✅ Primera imagen aparece al cargar la página
- ✅ Después de unos segundos, cambia a la segunda imagen
- ✅ Continúa rotando por todas las imágenes
- ✅ Vuelve a la primera imagen después de la última (loop)
- ✅ Todas las imágenes cargan sin errores 404

**Criterio de Aceptación**: 
- Carrusel funciona correctamente
- Todas las imágenes se muestran en orden

---

#### Test 5.3: Banners en Diferentes Secciones
**Objetivo**: Verificar que los banners aparecen en las secciones correctas.

**Precondiciones**:
- Banners activos en diferentes secciones:
  - "after-products"
  - "after-quick-access"
  - "after-features"
  - "bottom"

**Pasos**:
1. Ir a la página principal (Home)
2. Hacer scroll por toda la página
3. Verificar que cada banner aparece en su sección asignada

**Resultado Esperado**:
- ✅ Banner de "after-products" aparece después de productos destacados
- ✅ Banner de "after-quick-access" aparece después de accesos rápidos
- ✅ Banner de "after-features" aparece después de características
- ✅ Banner de "bottom" aparece al final de la página

**Criterio de Aceptación**: Los banners aparecen en las posiciones configuradas.

---

### Test Suite 6: Casos Edge

#### Test 6.1: Crear Banner con Video (Opcional)
**Objetivo**: Verificar que el sistema permite agregar videos a los banners.

**Pasos**:
1. Crear un nuevo banner
2. Cargar una imagen
3. Cargar también un video (MP4, máx 20MB)
4. Guardar

**Resultado Esperado**:
- ✅ Banner se crea con imagen y video
- ✅ Video se muestra en preview en el frontend (si el componente lo soporta)

---

#### Test 6.2: Banner con Carrusel de 1 Sola Imagen
**Objetivo**: Verificar que funciona un carrusel con solo 1 imagen.

**Pasos**:
1. Crear banner en modo carrusel
2. Cargar solo 1 imagen
3. Guardar

**Resultado Esperado**:
- ✅ Banner se crea sin errores
- ✅ Se guarda 1 registro en `banner_images`
- ✅ En frontend, se muestra la imagen (sin rotar, porque es solo 1)

---

#### Test 6.3: Banner Inactivo No se Muestra
**Objetivo**: Verificar que banners inactivos no aparecen en el frontend.

**Pasos**:
1. Crear o editar un banner
2. Desactivar el switch "Estado del Banner"
3. Guardar
4. Ir al frontend y buscar el banner

**Resultado Esperado**:
- ✅ Banner se guarda con `is_active = false`
- ✅ Banner NO aparece en el frontend
- ✅ Banner aparece en el panel de admin (para editarlo si se desea)

---

## Registro de Ejecución de Pruebas

Usa esta tabla para documentar los resultados de las pruebas:

| Test ID | Descripción | Fecha | Ejecutado Por | Resultado | Notas |
|---------|-------------|-------|---------------|-----------|-------|
| 1.1 | Crear banner imagen única | | | ☐ Pass ☐ Fail | |
| 1.2 | Crear banner carrusel | | | ☐ Pass ☐ Fail | |
| 1.3 | Validación sin imagen | | | ☐ Pass ☐ Fail | |
| 1.4 | Validación carrusel vacío | | | ☐ Pass ☐ Fail | |
| 2.1 | Cambiar a carrusel | | | ☐ Pass ☐ Fail | |
| 2.2 | Reemplazar imágenes | | | ☐ Pass ☐ Fail | |
| 2.3 | Reordenar imágenes | | | ☐ Pass ☐ Fail | |
| 3.1 | Eliminar imagen única | | | ☐ Pass ☐ Fail | |
| 3.2 | Eliminar carrusel (cascade) | | | ☐ Pass ☐ Fail | |
| 4.1 | Error de red | | | ☐ Pass ☐ Fail | |
| 4.2 | Error tabla no encontrada | | | ☐ Pass ☐ Fail | |
| 5.1 | Visualizar imagen única | | | ☐ Pass ☐ Fail | |
| 5.2 | Visualizar carrusel | | | ☐ Pass ☐ Fail | |
| 5.3 | Banners en secciones | | | ☐ Pass ☐ Fail | |
| 6.1 | Banner con video | | | ☐ Pass ☐ Fail | |
| 6.2 | Carrusel con 1 imagen | | | ☐ Pass ☐ Fail | |
| 6.3 | Banner inactivo | | | ☐ Pass ☐ Fail | |

---

## Criterios de Aceptación General

El sistema de banners con múltiples imágenes se considera **validado y funcional** si:

- ✅ Todos los tests de Suite 1 (Creación) pasan
- ✅ Todos los tests de Suite 2 (Edición) pasan
- ✅ Todos los tests de Suite 3 (Eliminación) pasan
- ✅ Al menos Test 4.1 (Error de red) pasa
- ✅ Todos los tests de Suite 5 (Visualización) pasan
- ✅ No hay errores en consola del navegador durante las operaciones
- ✅ No quedan registros huérfanos en `banner_images` después de eliminar banners

---

## Reporte de Bugs

Si encuentras un bug durante las pruebas, documentarlo así:

**Plantilla de Bug Report**:
```
ID del Bug: BUG-BANNERS-001
Severidad: Alta / Media / Baja
Test ID: [Test donde se encontró]
Descripción: [Qué salió mal]
Pasos para Reproducir:
  1. ...
  2. ...
Resultado Actual: [Lo que pasó]
Resultado Esperado: [Lo que debería pasar]
Logs/Screenshots: [Adjuntar]
Navegador: Chrome 120 / Firefox 121 / etc.
Fecha: [Fecha del hallazgo]
```

---

**Preparado por**: GitHub Copilot Agent  
**Fecha**: 23 de Noviembre, 2025  
**Versión**: 1.0
