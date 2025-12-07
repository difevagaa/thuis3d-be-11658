# Guía de Pruebas - Editor de Páginas Reconstruido

## 🎯 Objetivo
Verificar que el editor de páginas funciona completamente como un sistema tipo Shopify, donde TODOS los cambios se guardan y aplican correctamente.

## ✅ Pruebas a Realizar

### 1. Verificar que todas las páginas están disponibles
1. Abrir `/admin/page-builder`
2. En la barra lateral izquierda, verificar que aparecen TODAS estas páginas:
   - ✓ Página de Inicio
   - ✓ Productos
   - ✓ Blog
   - ✓ Galería
   - ✓ Cotizaciones
   - ✓ Tarjetas de Regalo
   - ✓ Mi Cuenta
   - ✓ Política de Privacidad
   - ✓ Términos y Condiciones
   - ✓ Política de Cookies
   - ✓ Aviso Legal
   - ✓ Política de Envíos
   - ✓ Política de Devoluciones
   - ✓ Sobre Nosotros
   - ✓ Contacto
   - ✓ Preguntas Frecuentes

### 2. Probar Creación de Sección
1. Seleccionar cualquier página (ej: "Galería")
2. Hacer clic en el botón "+" para añadir una sección
3. Elegir un tipo de sección (ej: "Hero")
4. **RESULTADO ESPERADO**: La sección aparece inmediatamente en el canvas

### 3. Probar Edición de Contenido
1. Hacer clic en el ícono de lápiz de una sección
2. En la pestaña "Contenido":
   - Cambiar el título
   - Cambiar el subtítulo
   - Modificar cualquier texto
3. Hacer clic en "Guardar cambios"
4. **RESULTADO ESPERADO**: 
   - Toast de confirmación "Sección guardada correctamente"
   - Los cambios se ven inmediatamente en el canvas
   - En la consola del navegador (F12) ver logs "=== SECTION SAVED SUCCESSFULLY ==="

### 4. Probar Edición de Configuración (Settings)
1. Abrir el editor de una sección (ícono de lápiz)
2. Ir a la pestaña "Configuración"
3. Cambiar opciones como:
   - Ancho completo (ON/OFF)
   - Altura (para Hero)
   - Alineación del contenido
4. Guardar cambios
5. **RESULTADO ESPERADO**: 
   - Los cambios se aplican visualmente
   - La sección se renderiza con las nuevas configuraciones

### 5. Probar Edición de Estilos
1. Abrir el editor de una sección
2. Ir a la pestaña "Estilos"
3. Cambiar:
   - Color de fondo
   - Color de texto
   - Padding (usar el slider)
   - Alineación del texto (izquierda/centro/derecha)
4. Guardar cambios
5. **RESULTADO ESPERADO**: 
   - Los estilos se aplican inmediatamente
   - Los colores y espaciados se ven correctamente

### 6. Probar Sección de Productos
1. Ir a la página "Productos"
2. Añadir una sección "Carrusel de Productos"
3. En Contenido:
   - Agregar título: "Nuestros Productos"
   - Agregar subtítulo: "Descubre nuestra colección"
4. En Configuración:
   - Cambiar "Ordenar por" a "Más recientes"
   - Ajustar "Límite de productos" a 8
5. En Estilos:
   - Cambiar alineación del texto a "Centro"
6. Guardar y verificar
7. **RESULTADO ESPERADO**: 
   - Se muestran los productos en un carrusel
   - El título está centrado
   - Se muestran máximo 8 productos

### 7. Probar Vista en Vivo
1. Después de guardar cambios en cualquier página
2. Abrir esa página en una nueva pestaña (ej: `/galeria`, `/productos`, `/blog`)
3. **RESULTADO ESPERADO**: 
   - La página muestra las secciones configuradas
   - Los cambios guardados están visibles
   - El diseño se ve como en el editor

### 8. Probar Actualizaciones en Tiempo Real
1. Tener abierta una página pública (ej: `/productos`)
2. En otra pestaña, abrir el editor (`/admin/page-builder`)
3. Hacer cambios y guardar
4. Volver a la página pública
5. **RESULTADO ESPERADO**: 
   - Los cambios aparecen automáticamente sin recargar
   - La página se actualiza en tiempo real

### 9. Probar Eliminación de Sección
1. Seleccionar una sección
2. Hacer clic en el ícono de papelera
3. Confirmar la eliminación
4. **RESULTADO ESPERADO**: 
   - La sección desaparece del canvas
   - Toast de confirmación

### 10. Probar Reordenamiento
1. Crear al menos 2 secciones
2. Usar drag & drop para cambiar el orden
3. **RESULTADO ESPERADO**: 
   - Las secciones cambian de posición
   - El orden se guarda automáticamente

## 🐛 Debugging

Si algo no funciona:
1. Abrir la consola del navegador (F12)
2. Buscar mensajes que empiecen con:
   - `=== SAVING SECTION ===`
   - `=== SECTION SAVED SUCCESSFULLY ===`
   - `Loading sections for page`
   - `Real-time update for page`
3. Verificar que no hay errores en rojo

## 📝 Notas Importantes

- **TODAS las páginas** ahora usan el page builder
- **NO hay contenido hardcodeado** - todo es editable
- Los cambios se guardan en `page_builder_sections` table
- Las actualizaciones son en tiempo real gracias a Supabase Realtime
- El sistema funciona exactamente como Shopify

## 🚀 Próximos Pasos

Si todas las pruebas pasan:
1. ✅ El editor está completamente funcional
2. ✅ Puedes crear contenido para todas las páginas
3. ✅ Los cambios se aplican y guardan correctamente
4. ✅ El sistema está listo para producción

Si alguna prueba falla:
1. Revisar la consola del navegador
2. Verificar que la migración se ejecutó correctamente
3. Reportar el problema específico con capturas de pantalla
