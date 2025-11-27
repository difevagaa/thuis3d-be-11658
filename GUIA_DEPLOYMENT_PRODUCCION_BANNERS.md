# Guía de Deployment a Producción: Sistema de Banners con Múltiples Imágenes

**Fecha**: 23 de Noviembre, 2025  
**Versión**: 1.0  
**Prioridad**: Alta - Bloquea administración de banners

---

## Resumen Ejecutivo

Esta guía documenta los pasos necesarios para aplicar las correcciones del sistema de banners con múltiples imágenes en el entorno de producción. El sistema permite crear banners con carruseles de imágenes, pero requiere que la tabla `banner_images` esté correctamente configurada en la base de datos.

### ⚠️ Importante
- **Tiempo estimado**: 15-30 minutos
- **Requiere**: Acceso a Supabase Dashboard con permisos de administrador
- **Riesgo**: Bajo - Las migraciones son idempotentes y no afectan datos existentes
- **Rollback**: Disponible (ver sección de Rollback)

---

## Pre-requisitos

Antes de comenzar, asegúrate de tener:

- [ ] Acceso al Dashboard de Supabase del proyecto de producción
- [ ] Permisos de administrador en Supabase
- [ ] Backup reciente de la base de datos (recomendado)
- [ ] Usuario con rol `admin` en el sistema para pruebas
- [ ] Navegador web actualizado para pruebas del panel de administración

---

## Paso 1: Crear Backup de la Base de Datos

### 1.1 Backup Automático de Supabase

Supabase crea backups automáticos diarios. Verifica que exista un backup reciente:

1. Ir a Supabase Dashboard
2. Navegar a **Settings** → **Database**
3. Buscar sección **Backups**
4. Verificar que existe un backup de las últimas 24 horas

### 1.2 Backup Manual (Opcional pero Recomendado)

Si deseas un backup específico antes de los cambios:

```sql
-- Ejecutar en SQL Editor de Supabase
-- Backup de la tabla homepage_banners
CREATE TABLE IF NOT EXISTS homepage_banners_backup_20251123 AS 
SELECT * FROM public.homepage_banners;

-- Si existe, backup de banner_images
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'banner_images') THEN
    EXECUTE 'CREATE TABLE banner_images_backup_20251123 AS SELECT * FROM public.banner_images';
  END IF;
END $$;
```

---

## Paso 2: Verificar Estado Actual del Sistema

### 2.1 Verificar Existencia de la Tabla banner_images

Ejecutar en SQL Editor:

```sql
-- Verificar si la tabla existe
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'banner_images'
) AS table_exists;
```

**Resultados posibles:**
- `true`: La tabla existe (aún así, ejecutar las migraciones para asegurar configuración correcta)
- `false`: La tabla no existe (ejecutar todas las migraciones)

### 2.2 Verificar Foreign Key Constraints

```sql
-- Verificar constraints de banner_images
SELECT 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'banner_images'
ORDER BY tc.constraint_type, tc.constraint_name;
```

**Verificar que existe:**
- `banner_images_banner_id_fkey` (FOREIGN KEY a homepage_banners.id)

### 2.3 Verificar Políticas RLS

```sql
-- Verificar políticas RLS en banner_images
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'banner_images'
ORDER BY policyname;
```

**Debe mostrar 4 políticas:**
- `banner_images_select_policy`
- `banner_images_insert_policy`
- `banner_images_update_policy`
- `banner_images_delete_policy`

---

## Paso 3: Aplicar Migraciones

### Opción A: Supabase Dashboard (Recomendado)

#### 3.1 Abrir SQL Editor

1. Ir a Supabase Dashboard
2. Navegar a **SQL Editor**
3. Hacer clic en **New Query**

#### 3.2 Ejecutar Migración Principal

Copiar y pegar el contenido completo del archivo:
```
supabase/migrations/20251123161800_ensure_banner_images_schema_cache.sql
```

**Contenido de la migración:**

```sql
-- Migración para asegurar que la tabla banner_images esté correctamente reconocida
-- en el schema cache de PostgREST y solucionar el error:
-- "Could not find the table 'public.banner_images' in the schema cache"

-- Esta migración es idempotente y puede ejecutarse múltiples veces de forma segura

-- ============================================================================
-- PASO 1: Verificar y recrear la tabla banner_images si es necesario
-- ============================================================================

-- Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS public.banner_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    banner_id UUID NOT NULL,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    alt_text TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- ============================================================================
-- PASO 2: Asegurar que la foreign key constraint existe con el nombre correcto
-- ============================================================================

-- Eliminar todas las constraints de foreign key existentes en banner_id
DO $$ 
DECLARE
    drop_commands TEXT;
BEGIN
    -- Construir comandos para eliminar constraints existentes
    SELECT string_agg('ALTER TABLE public.banner_images DROP CONSTRAINT IF EXISTS ' || constraint_name || ';', ' ')
    INTO drop_commands
    FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
      AND table_name = 'banner_images' 
      AND constraint_type = 'FOREIGN KEY';
    
    -- Ejecutar solo si hay comandos (evitar error de NULL)
    IF drop_commands IS NOT NULL THEN
        EXECUTE drop_commands;
    END IF;
END $$;

-- Crear la foreign key constraint con el nombre explícito que PostgREST espera
-- Este nombre sigue la convención de PostgREST: {tabla}_{columna}_fkey
ALTER TABLE public.banner_images 
DROP CONSTRAINT IF EXISTS banner_images_banner_id_fkey;

ALTER TABLE public.banner_images 
ADD CONSTRAINT banner_images_banner_id_fkey 
FOREIGN KEY (banner_id) 
REFERENCES public.homepage_banners(id) 
ON DELETE CASCADE
ON UPDATE CASCADE;

-- ============================================================================
-- PASO 3: Crear o recrear índices para mejor rendimiento
-- ============================================================================

-- Índice en banner_id para joins rápidos
DROP INDEX IF EXISTS idx_banner_images_banner_id;
CREATE INDEX idx_banner_images_banner_id 
ON public.banner_images(banner_id);

-- Índice en display_order para ordenamiento
DROP INDEX IF EXISTS idx_banner_images_display_order;
CREATE INDEX idx_banner_images_display_order 
ON public.banner_images(display_order);

-- Índice compuesto para consultas filtradas por banner_id y ordenadas por display_order
DROP INDEX IF EXISTS idx_banner_images_banner_display;
CREATE INDEX idx_banner_images_banner_display 
ON public.banner_images(banner_id, display_order);

-- Índice para imágenes activas
DROP INDEX IF EXISTS idx_banner_images_active;
CREATE INDEX idx_banner_images_active 
ON public.banner_images(is_active) 
WHERE is_active = true;

-- ============================================================================
-- PASO 4: Habilitar RLS y configurar políticas
-- ============================================================================

-- Habilitar Row Level Security
ALTER TABLE public.banner_images ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para recrearlas
DROP POLICY IF EXISTS "banner_images_select_policy" ON public.banner_images;
DROP POLICY IF EXISTS "banner_images_insert_policy" ON public.banner_images;
DROP POLICY IF EXISTS "banner_images_update_policy" ON public.banner_images;
DROP POLICY IF EXISTS "banner_images_delete_policy" ON public.banner_images;

-- Política para SELECT: Todos pueden ver todas las imágenes
-- (el filtrado por is_active se hace en la aplicación)
CREATE POLICY "banner_images_select_policy" 
ON public.banner_images
FOR SELECT
USING (true);

-- Política para INSERT: Solo administradores pueden insertar
CREATE POLICY "banner_images_insert_policy" 
ON public.banner_images
FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'admin'::text)
);

-- Política para UPDATE: Solo administradores pueden actualizar
CREATE POLICY "banner_images_update_policy" 
ON public.banner_images
FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::text)
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin'::text)
);

-- Política para DELETE: Solo administradores pueden eliminar
CREATE POLICY "banner_images_delete_policy" 
ON public.banner_images
FOR DELETE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin'::text)
);

-- ============================================================================
-- PASO 5: Configurar trigger para updated_at
-- ============================================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_banner_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS update_banner_images_updated_at_trigger ON public.banner_images;

-- Crear trigger
CREATE TRIGGER update_banner_images_updated_at_trigger
    BEFORE UPDATE ON public.banner_images
    FOR EACH ROW
    EXECUTE FUNCTION public.update_banner_images_updated_at();

-- ============================================================================
-- PASO 6: Agregar comentarios de documentación
-- ============================================================================

COMMENT ON TABLE public.banner_images IS 
'Almacena múltiples imágenes para cada banner, permitiendo carruseles/slideshow. Relación 1:N con homepage_banners.';

COMMENT ON COLUMN public.banner_images.id IS 
'Identificador único de la imagen';

COMMENT ON COLUMN public.banner_images.banner_id IS 
'ID del banner al que pertenece esta imagen (FK a homepage_banners.id)';

COMMENT ON COLUMN public.banner_images.image_url IS 
'URL completa de la imagen almacenada (puede ser de Supabase Storage o externa)';

COMMENT ON COLUMN public.banner_images.display_order IS 
'Orden de visualización en el carrusel (menor número = aparece primero)';

COMMENT ON COLUMN public.banner_images.alt_text IS 
'Texto alternativo para accesibilidad (SEO y screen readers)';

COMMENT ON COLUMN public.banner_images.is_active IS 
'Indica si la imagen está activa y debe mostrarse en el frontend';

COMMENT ON COLUMN public.banner_images.created_at IS 
'Fecha y hora de creación del registro';

COMMENT ON COLUMN public.banner_images.updated_at IS 
'Fecha y hora de la última actualización (actualizada automáticamente por trigger)';

COMMENT ON CONSTRAINT banner_images_banner_id_fkey ON public.banner_images IS 
'Relación con homepage_banners. Elimina en cascada si se borra el banner padre.';

-- ============================================================================
-- PASO 7: Forzar actualización del schema cache de PostgREST
-- ============================================================================

-- Notificar a PostgREST que recargue el schema cache
-- Esto se hace mediante una notificación en el canal 'pgrst'
NOTIFY pgrst, 'reload schema';

-- Nota: En Supabase, el schema cache se actualizará automáticamente
-- después de ejecutar esta migración. Si el problema persiste, puede
-- ser necesario reiniciar el servicio de API desde el Dashboard de Supabase.

-- ============================================================================
-- VERIFICACIÓN: Mostrar información sobre la tabla creada
-- ============================================================================

DO $$
DECLARE
    constraint_count INTEGER;
    policy_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Contar constraints
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints
    WHERE table_schema = 'public' 
      AND table_name = 'banner_images';
    
    -- Contar políticas RLS
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'banner_images';
    
    -- Contar índices
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public' 
      AND tablename = 'banner_images';
    
    RAISE NOTICE '✓ Tabla banner_images verificada:';
    RAISE NOTICE '  - Constraints: %', constraint_count;
    RAISE NOTICE '  - Políticas RLS: %', policy_count;
    RAISE NOTICE '  - Índices: %', index_count;
END $$;
```

#### 3.3 Ejecutar la Migración

1. Hacer clic en **Run** (o presionar `Ctrl+Enter`)
2. Esperar a que termine la ejecución (debería tomar 1-2 segundos)
3. Verificar que no hay errores en la consola

**Resultado esperado:**
```
✓ Tabla banner_images verificada:
  - Constraints: 2
  - Políticas RLS: 4
  - Índices: 5
```

### Opción B: Supabase CLI

Si prefieres usar la línea de comandos:

```bash
# 1. Conectar a la base de datos de producción
supabase db push --db-url "postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]"

# 2. O aplicar migraciones específicas
supabase migration up --db-url "postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]"
```

---

## Paso 4: Recargar Schema Cache (Si es Necesario)

### 4.1 Verificación Automática

En la mayoría de casos, Supabase recarga automáticamente el schema cache después de ejecutar migraciones SQL. Para verificar:

```sql
-- Esta query debería funcionar sin errores
SELECT COUNT(*) FROM public.banner_images;
```

### 4.2 Recarga Manual del Schema Cache

Si la verificación falla o persisten errores de "tabla no encontrada":

#### Método 1: Notificación PGRST (Ya incluida en la migración)
```sql
NOTIFY pgrst, 'reload schema';
```

#### Método 2: Reiniciar la API de Supabase
1. Ir a Supabase Dashboard
2. Navegar a **Settings** → **API**
3. Hacer clic en **Restart API Server**
4. Esperar 30-60 segundos

#### Método 3: Reiniciar el Proyecto (Último Recurso)
1. Ir a Supabase Dashboard
2. Navegar a **Settings** → **General**
3. Hacer clic en **Pause Project**
4. Esperar a que se pause completamente
5. Hacer clic en **Resume Project**
6. Esperar a que vuelva a estar activo (2-3 minutos)

---

## Paso 5: Desplegar Código Frontend Actualizado

### 5.1 Verificar Cambios en el Código

Los cambios principales están en:
- `src/pages/admin/content/HomepageBanners.tsx`

**Mejoras implementadas:**
- Mensajes de error más descriptivos
- Detección específica de error "tabla no encontrada"
- Preservación de imágenes cargadas si hay error
- Modal permanece abierto en caso de error para permitir reintentos
- Logging mejorado para debugging

### 5.2 Build de Producción

```bash
# En el directorio del proyecto
npm run build
```

### 5.3 Desplegar

El método depende de tu plataforma de hosting:

#### Vercel/Netlify/Similar:
```bash
# Push a la rama principal
git push origin main
# El deploy se hará automáticamente
```

#### Manual:
```bash
# Subir carpeta dist/ a tu servidor web
```

---

## Paso 6: Verificación Post-Deployment

### 6.1 Verificar Tabla en Base de Datos

```sql
-- Verificar estructura de la tabla
\d public.banner_images

-- Verificar que no hay datos corruptos
SELECT 
  COUNT(*) as total_images,
  COUNT(DISTINCT banner_id) as unique_banners
FROM public.banner_images;
```

### 6.2 Verificar Políticas RLS

```sql
-- Debe retornar 4 políticas
SELECT COUNT(*) FROM pg_policies 
WHERE tablename = 'banner_images';
```

### 6.3 Pruebas Funcionales en Panel de Administración

#### Test 1: Crear Banner con Imagen Única
1. Ir a Panel Admin → Gestión de Contenido → Banners
2. Clic en "Nuevo Banner"
3. Completar:
   - Título: "Test Banner Único"
   - Cargar 1 imagen
   - Dejar modo carrusel **desactivado**
4. Guardar
5. **✅ Resultado esperado**: Banner se crea sin errores

#### Test 2: Crear Banner con Carrusel (Múltiples Imágenes)
1. Ir a Panel Admin → Gestión de Contenido → Banners
2. Clic en "Nuevo Banner"
3. Completar:
   - Título: "Test Banner Carrusel"
   - **Activar** modo carrusel
   - Cargar 3-4 imágenes
4. Guardar
5. **✅ Resultado esperado**: Banner se crea sin errores
6. **✅ Verificar**: En la lista, el banner muestra las múltiples imágenes

#### Test 3: Editar Banner - Cambiar a Modo Carrusel
1. Seleccionar un banner existente con imagen única
2. Hacer clic en "Editar"
3. Activar modo carrusel
4. Agregar 2-3 imágenes
5. Guardar
6. **✅ Resultado esperado**: Cambios se guardan correctamente
7. **✅ Verificar**: Las nuevas imágenes aparecen en el listado

#### Test 4: Editar Carrusel - Reemplazar Imágenes
1. Seleccionar un banner con carrusel
2. Hacer clic en "Editar"
3. Eliminar una imagen existente (botón X)
4. Agregar una imagen nueva
5. Reordenar con flechas ↑↓
6. Guardar
7. **✅ Resultado esperado**: Cambios se reflejan correctamente

#### Test 5: Eliminar Banner con Carrusel
1. Seleccionar un banner de prueba con carrusel
2. Hacer clic en "Eliminar"
3. Confirmar eliminación
4. **✅ Resultado esperado**: Banner y sus imágenes se eliminan

#### Test 6: Visualización en Frontend
1. Ir a la página principal del sitio (Home)
2. **✅ Verificar**: Los banners se muestran correctamente
3. **✅ Verificar**: Los carruseles rotan automáticamente
4. **✅ Verificar**: Las imágenes cargan sin errores 404

### 6.4 Verificar Logs

En la consola del navegador (DevTools), deberías ver:

**Al crear un banner con carrusel:**
```
💾 Guardando banner: {title: "...", ...}
✅ Banner creado: {id: "...", ...}
🖼️ Guardando múltiples imágenes para banner nuevo...
📥 Insertando 3 imágenes...
Datos a insertar: [{...}, {...}, {...}]
✅ Imágenes guardadas: 3
```

**Si hay un error (para verificar mejora en mensajes):**
```
❌ Error guardando imágenes: {...}
Detalles del error: {...}
Error: [Mensaje descriptivo en español]
```

---

## Paso 7: Monitoreo Post-Deployment

### 7.1 Métricas a Monitorear (Primeras 24 horas)

- [ ] Errores en logs de Supabase relacionados con `banner_images`
- [ ] Reportes de usuarios sobre problemas al guardar banners
- [ ] Tiempos de respuesta de queries a `banner_images`
- [ ] Uso de CPU/memoria de la base de datos

### 7.2 Queries de Monitoreo

```sql
-- Ver actividad reciente en banner_images
SELECT 
  bi.id,
  bi.banner_id,
  bi.created_at,
  hb.title as banner_title
FROM public.banner_images bi
JOIN public.homepage_banners hb ON hb.id = bi.banner_id
WHERE bi.created_at > NOW() - INTERVAL '24 hours'
ORDER BY bi.created_at DESC;

-- Verificar integridad referencial
SELECT 
  bi.id,
  bi.banner_id,
  CASE 
    WHEN hb.id IS NULL THEN 'ORPHAN - Banner no existe'
    ELSE 'OK'
  END as status
FROM public.banner_images bi
LEFT JOIN public.homepage_banners hb ON hb.id = bi.banner_id
WHERE hb.id IS NULL;
```

---

## Troubleshooting

### Error: "Could not find the table 'public.banner_images' in the schema cache"

**Causa**: PostgREST no ha actualizado su schema cache.

**Solución 1**: Ejecutar
```sql
NOTIFY pgrst, 'reload schema';
```

**Solución 2**: Reiniciar API desde Dashboard (Settings → API → Restart)

**Solución 3**: Si persiste, reiniciar el proyecto completo (Pause/Resume)

### Error: "permission denied for table banner_images"

**Causa**: Las políticas RLS no están correctamente configuradas o el usuario no tiene rol de admin.

**Solución 1**: Verificar políticas RLS
```sql
SELECT * FROM pg_policies WHERE tablename = 'banner_images';
-- Debe mostrar 4 políticas
```

**Solución 2**: Verificar rol del usuario
```sql
SELECT * FROM user_roles WHERE user_id = auth.uid();
-- Debe mostrar role = 'admin'
```

**Solución 3**: Re-ejecutar la sección de políticas RLS de la migración

### Error: "relation 'banner_images' does not exist"

**Causa**: La tabla no fue creada.

**Solución**: Re-ejecutar la migración completa desde el principio

### Error al Insertar: "violates foreign key constraint"

**Causa**: Intentando insertar imagen con banner_id que no existe.

**Solución**: Verificar que el banner existe:
```sql
SELECT id, title FROM public.homepage_banners WHERE id = '[BANNER_ID]';
```

### Imágenes No se Eliminan al Borrar Banner

**Causa**: ON DELETE CASCADE no está configurado en la FK.

**Solución**: Recrear la FK:
```sql
ALTER TABLE public.banner_images 
DROP CONSTRAINT IF EXISTS banner_images_banner_id_fkey;

ALTER TABLE public.banner_images 
ADD CONSTRAINT banner_images_banner_id_fkey 
FOREIGN KEY (banner_id) 
REFERENCES public.homepage_banners(id) 
ON DELETE CASCADE;
```

---

## Plan de Rollback

Si algo sale mal y necesitas revertir los cambios:

### Rollback Opción 1: Restaurar desde Backup

Si creaste el backup manual del Paso 1:

```sql
-- 1. Eliminar tabla actual
DROP TABLE IF EXISTS public.banner_images CASCADE;

-- 2. Restaurar desde backup
CREATE TABLE public.banner_images AS 
SELECT * FROM banner_images_backup_20251123;

-- 3. Restaurar banners si es necesario
DELETE FROM public.homepage_banners;
INSERT INTO public.homepage_banners 
SELECT * FROM homepage_banners_backup_20251123;
```

### Rollback Opción 2: Usar Backup Automático de Supabase

1. Ir a Settings → Database → Backups
2. Seleccionar el backup anterior al deployment
3. Hacer clic en "Restore"
4. Confirmar la restauración

### Rollback Opción 3: Eliminar Solo la Tabla banner_images

Si solo quieres revertir la tabla:

```sql
-- Eliminar tabla y todo su contenido
DROP TABLE IF EXISTS public.banner_images CASCADE;
```

**Nota**: Los banners con imagen única seguirán funcionando. Solo se perderán los carruseles.

---

## Checklist Final de Verificación

Antes de considerar el deployment completado:

- [ ] Migración SQL ejecutada sin errores
- [ ] Schema cache recargado
- [ ] Tabla `banner_images` visible en Table Editor
- [ ] 4 políticas RLS activas en `banner_images`
- [ ] Foreign key constraint `banner_images_banner_id_fkey` existe
- [ ] 4+ índices creados en `banner_images`
- [ ] Código frontend actualizado y desplegado
- [ ] Test 1: Crear banner con imagen única - ✅ PASA
- [ ] Test 2: Crear banner con carrusel - ✅ PASA
- [ ] Test 3: Editar banner a modo carrusel - ✅ PASA
- [ ] Test 4: Reemplazar imágenes de carrusel - ✅ PASA
- [ ] Test 5: Eliminar banner con carrusel - ✅ PASA
- [ ] Test 6: Visualización en frontend - ✅ PASA
- [ ] Logs del navegador muestran mensajes esperados
- [ ] No hay errores en Supabase logs
- [ ] Monitoreo configurado para las próximas 24 horas
- [ ] Equipo notificado del deployment
- [ ] Documentación actualizada

---

## Contacto y Soporte

Si encuentras problemas durante el deployment:

1. **Verificar logs de Supabase**: Dashboard → Logs
2. **Verificar consola del navegador**: DevTools → Console
3. **Consultar esta guía**: Sección de Troubleshooting
4. **Contactar al equipo técnico** con:
   - Captura de pantalla del error
   - Logs de la consola del navegador
   - Logs de Supabase
   - Pasos que realizaste antes del error

---

## Registro de Cambios

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2025-11-23 | Versión inicial de la guía de deployment |

---

**Preparado por**: GitHub Copilot Agent  
**Fecha de Preparación**: 23 de Noviembre, 2025  
**Última Actualización**: 23 de Noviembre, 2025
