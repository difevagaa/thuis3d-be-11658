# Guía de Aplicación de Migraciones para Banner Images

**Fecha**: 23 de Noviembre, 2025  
**Versión**: 1.0  
**Problema**: Error "Could not find the table 'public.banner_images' in the schema cache"

## Resumen del Problema

Al intentar crear o editar banners con múltiples imágenes (modo carrusel) desde el panel de administración, aparece el error:

```
La tabla de imágenes no está disponible en el sistema. Por favor contacta al 
administrador para aplicar las migraciones necesarias. Detalles técnicos: 
Could not find the table 'public.banner_images' in the schema cache.
```

Este error indica que la tabla `banner_images` no existe en la base de datos o no está registrada correctamente en el schema cache de PostgREST.

## Solución: Aplicar Migraciones SQL

### Método 1: Aplicar migración completa (RECOMENDADO)

Este método aplica la migración más comprehensiva que asegura que todo esté correctamente configurado.

#### Paso 1: Acceder al SQL Editor de Supabase

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleccionar tu proyecto: `ljygreayxxpsdmncwzia`
3. En el menú lateral, ir a **SQL Editor**
4. Hacer clic en **+ New query**

#### Paso 2: Copiar y ejecutar la migración

Copiar el contenido completo del archivo:
```
supabase/migrations/20251123161800_ensure_banner_images_schema_cache.sql
```

Y pegarlo en el editor SQL.

#### Paso 3: Ejecutar la migración

1. Hacer clic en el botón **Run** (o presionar Ctrl/Cmd + Enter)
2. Verificar que la ejecución sea exitosa
3. Deberías ver mensajes de tipo:
   ```
   ✓ Tabla banner_images verificada:
     - Constraints: 4
     - Políticas RLS: 4
     - Índices: 5
   ```

#### Paso 4: Verificar que la tabla existe

Ejecutar esta consulta en el SQL Editor:

```sql
-- Verificar que la tabla existe
SELECT 
  table_name, 
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'banner_images';

-- Debería retornar 1 fila con table_name = 'banner_images'
```

#### Paso 5: Verificar columnas de la tabla

```sql
-- Ver estructura de la tabla
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'banner_images'
ORDER BY ordinal_position;

-- Debería mostrar 8 columnas:
-- id, banner_id, image_url, display_order, alt_text, is_active, created_at, updated_at
```

#### Paso 6: Verificar políticas RLS

```sql
-- Ver políticas de seguridad
SELECT 
  schemaname,
  tablename, 
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename = 'banner_images';

-- Debería mostrar 4 políticas:
-- banner_images_select_policy (SELECT)
-- banner_images_insert_policy (INSERT)
-- banner_images_update_policy (UPDATE)
-- banner_images_delete_policy (DELETE)
```

#### Paso 7: Recargar schema cache (IMPORTANTE)

Ejecutar esta consulta para forzar a PostgREST a recargar el schema:

```sql
-- Notificar a PostgREST que recargue el schema
NOTIFY pgrst, 'reload schema';
```

**NOTA**: En algunos casos, puede ser necesario reiniciar el servicio de API desde el Dashboard de Supabase:
- Settings → API → Restart API Service

### Método 2: Aplicar migraciones incrementales

Si prefieres aplicar las migraciones en orden, ejecuta estos archivos en secuencia:

1. **Primera migración**: `20251123142100_add_banner_images_table.sql`
   - Crea la tabla básica
   
2. **Segunda migración**: `20251123144700_fix_banner_images_relationship.sql`
   - Corrige la relación de foreign key
   
3. **Tercera migración**: `20251123161800_ensure_banner_images_schema_cache.sql`
   - Asegura configuración completa y recarga schema cache

**IMPORTANTE**: Ejecutar en orden. La tercera migración es idempotente (puede ejecutarse múltiples veces sin problemas).

## Verificación de la Solución

### Prueba 1: Crear banner con carrusel desde el panel admin

1. Ir a **Panel de Administración** → **Gestión de Contenido** → **Banners de Página de Inicio**
2. Hacer clic en **Nuevo Banner**
3. Llenar los campos básicos:
   - Título: "Prueba Carrusel"
   - Descripción: "Banner de prueba con múltiples imágenes"
4. Activar el switch **"Modo de Imágenes"** (múltiples imágenes)
5. Hacer clic en **"Seleccionar archivos"** y elegir 2-3 imágenes
6. Hacer clic en **Guardar**
7. **Resultado esperado**: Banner creado exitosamente sin errores

### Prueba 2: Verificar datos en la base de datos

```sql
-- Ver banners creados
SELECT id, title, is_active, created_at 
FROM public.homepage_banners 
ORDER BY created_at DESC 
LIMIT 5;

-- Ver imágenes del banner (reemplazar {banner_id} con un ID real)
SELECT 
  id, 
  banner_id, 
  image_url, 
  display_order, 
  is_active 
FROM public.banner_images 
WHERE banner_id = '{banner_id}'
ORDER BY display_order;
```

### Prueba 3: Verificar visualización en frontend

1. Abrir la página principal del sitio
2. Verificar que los banners con carrusel se muestren correctamente
3. Verificar que las imágenes roten automáticamente (cada 4-5 segundos)
4. Verificar que los controles de navegación funcionen

## Troubleshooting

### Error: "relation 'public.banner_images' does not exist"

**Causa**: La tabla no fue creada correctamente.

**Solución**:
1. Ejecutar la migración completa nuevamente (`20251123161800_ensure_banner_images_schema_cache.sql`)
2. Verificar permisos del usuario de Supabase
3. Verificar que no haya errores de sintaxis en la migración

### Error: "Could not find the table 'public.banner_images' in the schema cache" persiste

**Causa**: PostgREST no ha recargado el schema cache.

**Solución**:
1. Ejecutar: `NOTIFY pgrst, 'reload schema';`
2. Esperar 10-30 segundos
3. Si persiste, reiniciar el servicio de API desde Supabase Dashboard:
   - Settings → API → Restart API Service
4. Limpiar caché del navegador y recargar la página del panel admin

### Error: "permission denied for table banner_images"

**Causa**: Las políticas RLS no están configuradas correctamente o el usuario no tiene rol de admin.

**Solución**:
1. Verificar que las políticas RLS existan (ver Paso 6 arriba)
2. Verificar que el usuario tenga rol de admin:
   ```sql
   SELECT * FROM public.user_roles 
   WHERE user_id = auth.uid();
   -- Debería mostrar role = 'admin'
   ```
3. Si no tiene el rol, asignarlo:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES (auth.uid(), 'admin')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

### Error: "insert or update on table 'banner_images' violates foreign key constraint"

**Causa**: El `banner_id` que se está intentando insertar no existe en la tabla `homepage_banners`.

**Solución**:
1. Verificar que el banner padre existe:
   ```sql
   SELECT id, title FROM public.homepage_banners 
   WHERE id = '{banner_id}';
   ```
2. Si no existe, crear primero el banner en `homepage_banners`
3. Luego insertar las imágenes en `banner_images`

### El frontend muestra error "Error al cargar banners"

**Causa**: Error en la consulta de carga o problema de permisos.

**Solución**:
1. Abrir la consola del navegador (F12)
2. Ver los errores específicos en la pestaña Console
3. Verificar la pestaña Network para ver la respuesta de la API
4. Verificar políticas RLS (ver arriba)

## Rollback (Revertir cambios)

Si necesitas revertir las migraciones:

```sql
-- ADVERTENCIA: Esto eliminará TODOS los datos de banner_images
-- Solo ejecutar si estás seguro

-- 1. Eliminar todas las políticas RLS
DROP POLICY IF EXISTS "banner_images_select_policy" ON public.banner_images;
DROP POLICY IF EXISTS "banner_images_insert_policy" ON public.banner_images;
DROP POLICY IF EXISTS "banner_images_update_policy" ON public.banner_images;
DROP POLICY IF EXISTS "banner_images_delete_policy" ON public.banner_images;

-- 2. Eliminar trigger
DROP TRIGGER IF EXISTS update_banner_images_updated_at_trigger ON public.banner_images;

-- 3. Eliminar función del trigger
DROP FUNCTION IF EXISTS public.update_banner_images_updated_at();

-- 4. Eliminar tabla (esto eliminará todos los datos)
DROP TABLE IF EXISTS public.banner_images CASCADE;

-- 5. Notificar a PostgREST
NOTIFY pgrst, 'reload schema';
```

**NOTA**: Después del rollback, los banners con modo carrusel no funcionarán. Solo funcionarán banners con imagen única.

## Estructura de la Tabla banner_images

Para referencia, esta es la estructura completa de la tabla:

```sql
CREATE TABLE public.banner_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    banner_id UUID NOT NULL,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    alt_text TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    -- Foreign key constraint
    CONSTRAINT banner_images_banner_id_fkey 
    FOREIGN KEY (banner_id) 
    REFERENCES public.homepage_banners(id) 
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Índices
CREATE INDEX idx_banner_images_banner_id ON public.banner_images(banner_id);
CREATE INDEX idx_banner_images_display_order ON public.banner_images(display_order);
CREATE INDEX idx_banner_images_banner_display ON public.banner_images(banner_id, display_order);
CREATE INDEX idx_banner_images_active ON public.banner_images(is_active) WHERE is_active = true;
```

## Relación con homepage_banners

```
homepage_banners (1) ←──────→ (N) banner_images
      id                           banner_id
      
Tipo: One-to-Many
DELETE CASCADE: Sí (eliminar banner elimina sus imágenes)
UPDATE CASCADE: Sí
```

## Contacto y Soporte

Si después de seguir esta guía el problema persiste:

1. Verificar los logs del navegador (consola de desarrollador)
2. Verificar los logs de Supabase (Dashboard → Logs)
3. Revisar la documentación técnica detallada en:
   - `INFORME_FINAL_SOLUCION_BANNERS.md`
   - `SOLUCION_ERROR_BANNER_IMAGES_CARRUSEL.md`
   - `AUDITORIA_SISTEMA_BANNERS_COMPLETA.md`

---

**Versión del documento**: 1.0  
**Última actualización**: 23 de Noviembre, 2025  
**Autor**: Sistema de Documentación Thuis3D
