# ⚡ SOLUCIÓN INMEDIATA - Banner Images

## 🎯 Problema
Error al guardar banners con carrusel (múltiples imágenes): 
**"Could not find the table 'public.banner_images' in the schema cache"**

## ✅ Solución (2 minutos)

### Paso 1: Ir a Supabase Dashboard
Abrir este enlace en tu navegador:
```
https://supabase.com/dashboard/project/ljygreayxxpsdmncwzia/sql/new
```

### Paso 2: Copiar SQL
1. Abrir el archivo: **`MIGRACION_BANNER_IMAGES_APLICAR.sql`**
2. Seleccionar TODO el contenido (Ctrl+A o Cmd+A)
3. Copiar (Ctrl+C o Cmd+C)

### Paso 3: Ejecutar en Supabase
1. Pegar en el SQL Editor de Supabase (Ctrl+V o Cmd+V)
2. Hacer clic en botón verde **"Run"** (o Ctrl+Enter / Cmd+Enter)
3. Esperar a que termine (unos segundos)
4. Verificar que dice "Success" ✅

### Paso 4: Recargar Schema
En el mismo editor, ejecutar este comando:
```sql
NOTIFY pgrst, 'reload schema';
```
Hacer clic en **"Run"** nuevamente.

### Paso 5: Probar
1. Ir al **Panel de Administración**
2. **Gestión de Contenido** → **Banners de Página de Inicio**
3. Hacer clic en **"Nuevo Banner"**
4. Activar el switch **"Modo de Imágenes"** (para carrusel)
5. Cargar 2-3 imágenes
6. Hacer clic en **"Guardar"**

**Resultado esperado:** ✅ Banner creado exitosamente sin errores

---

## 🔍 ¿Sigue sin funcionar?

### Opción 1: Reiniciar API
1. En Supabase Dashboard: **Settings** → **API**
2. Clic en **"Restart API Service"**
3. Esperar 30 segundos
4. Intentar crear banner nuevamente

### Opción 2: Verificar con Diagnóstico
1. Ir a SQL Editor
2. Copiar contenido de: `supabase/migrations/diagnostic_banner_images.sql`
3. Ejecutar
4. Revisar los resultados para ver qué falta

### Opción 3: Limpiar Caché del Navegador
1. Ctrl+Shift+Delete (o Cmd+Shift+Delete)
2. Seleccionar "Caché" o "Archivos en caché"
3. Limpiar
4. Recargar la página del panel admin

---

## 📞 Contacto
Si después de estos pasos el problema persiste:
1. Ejecutar diagnóstico (ver Opción 2 arriba)
2. Capturar pantalla del error
3. Revisar documentación detallada en:
   - `SOLUCION_RAPIDA_BANNER_IMAGES.md`
   - `README_SOLUCION_BANNER_IMAGES.md`

---

## ✨ Archivos Importantes

- **`MIGRACION_BANNER_IMAGES_APLICAR.sql`** ← Copiar y ejecutar ESTE
- **`README_SOLUCION_BANNER_IMAGES.md`** ← Leer si necesitas más detalles
- **`scripts/apply-banner-images-migration.cjs`** ← Script automatizado

---

**¡Eso es todo!** 🎉

Una vez aplicada la migración, podrás crear banners con múltiples imágenes sin problemas.
