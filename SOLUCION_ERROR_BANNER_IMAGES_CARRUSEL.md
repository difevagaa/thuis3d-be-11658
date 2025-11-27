# Solución: Error al Guardar Banners en Modo Carrusel

**Fecha**: 23 de Noviembre, 2025  
**Estado**: ✅ SOLUCIÓN IMPLEMENTADA

---

## Problema Reportado

Al intentar guardar un banner desde el panel de administración **en modo carrusel (múltiples imágenes)**, se muestra el siguiente error:

```
Error al guardar banner: Could not find the table 'public.banner_images' in the schema cache
```

### Comportamiento Observado

- ✅ **Funciona correctamente**: Guardar banner con una sola imagen
- ❌ **Falla con error**: Guardar banner en modo carrusel (múltiples imágenes)

Esto indica que el problema está específicamente en las operaciones con la tabla `banner_images` cuando se usa el modo carrusel.

---

## Causa Raíz

El error "Could not find the table 'public.banner_images' in the schema cache" es un error de **PostgREST** (el motor de API de Supabase) que ocurre cuando:

1. La tabla `banner_images` existe en la base de datos, pero **no está registrada en el schema cache de PostgREST**
2. Las migraciones que crean la tabla no se han aplicado a la base de datos remota
3. El schema cache de Supabase no se ha actualizado después de crear la tabla
4. Las políticas RLS (Row Level Security) no están configuradas correctamente

### ¿Por qué funciona con imagen única pero no con carrusel?

- **Imagen única**: Solo se guarda el campo `image_url` en la tabla `homepage_banners` (que sí existe en el schema cache)
- **Modo carrusel**: Se intenta guardar en la tabla `banner_images` mediante:
  - `supabase.from("banner_images").delete()` → Eliminar imágenes antiguas
  - `supabase.from("banner_images").insert()` → Insertar imágenes nuevas

Estas operaciones fallan porque PostgREST no reconoce la tabla `banner_images`.

---

## Solución Implementada

### 1. Migración de Base de Datos Comprehensiva

Se ha creado una nueva migración SQL que garantiza que la tabla `banner_images` esté correctamente configurada:

**Archivo**: `supabase/migrations/20251123161800_ensure_banner_images_schema_cache.sql`

Esta migración realiza las siguientes acciones:

#### A. Crear/Verificar Tabla
```sql
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
```

#### B. Recrear Foreign Key Constraint
```sql
ALTER TABLE public.banner_images 
DROP CONSTRAINT IF EXISTS banner_images_banner_id_fkey;

ALTER TABLE public.banner_images 
ADD CONSTRAINT banner_images_banner_id_fkey 
FOREIGN KEY (banner_id) 
REFERENCES public.homepage_banners(id) 
ON DELETE CASCADE
ON UPDATE CASCADE;
```

**Importante**: El nombre del constraint `banner_images_banner_id_fkey` sigue la convención de PostgREST: `{tabla}_{columna}_fkey`

#### C. Crear Índices de Rendimiento
```sql
CREATE INDEX idx_banner_images_banner_id ON public.banner_images(banner_id);
CREATE INDEX idx_banner_images_display_order ON public.banner_images(display_order);
CREATE INDEX idx_banner_images_banner_display ON public.banner_images(banner_id, display_order);
CREATE INDEX idx_banner_images_active ON public.banner_images(is_active) WHERE is_active = true;
```

#### D. Configurar Políticas RLS Correctas
```sql
-- Habilitar RLS
ALTER TABLE public.banner_images ENABLE ROW LEVEL SECURITY;

-- SELECT: Todos pueden ver (público)
CREATE POLICY "banner_images_select_policy" 
ON public.banner_images FOR SELECT USING (true);

-- INSERT/UPDATE/DELETE: Solo administradores
CREATE POLICY "banner_images_insert_policy" 
ON public.banner_images FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

CREATE POLICY "banner_images_update_policy" 
ON public.banner_images FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::text))
WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

CREATE POLICY "banner_images_delete_policy" 
ON public.banner_images FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::text));
```

#### E. Forzar Refresh del Schema Cache
```sql
-- Notificar a PostgREST que recargue el schema cache
NOTIFY pgrst, 'reload schema';
```

#### F. Trigger para updated_at
```sql
CREATE OR REPLACE FUNCTION public.update_banner_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_banner_images_updated_at_trigger
    BEFORE UPDATE ON public.banner_images
    FOR EACH ROW
    EXECUTE FUNCTION public.update_banner_images_updated_at();
```

### 2. Mejoras en el Código TypeScript

Se ha mejorado el manejo de errores en `src/pages/admin/content/HomepageBanners.tsx`:

#### Antes:
```typescript
const { error: imagesError } = await supabase
  .from("banner_images")
  .insert(imagesToInsert);

if (imagesError) {
  console.error("❌ Error guardando imágenes:", imagesError);
  throw imagesError;
}
```

#### Después:
```typescript
console.log(`📥 Insertando ${imagesToInsert.length} imágenes...`);
console.log("Datos a insertar:", imagesToInsert);

const { data: insertedImages, error: imagesError } = await supabase
  .from("banner_images")
  .insert(imagesToInsert)
  .select();

if (imagesError) {
  console.error("❌ Error guardando imágenes:", imagesError);
  console.error("Detalles del error:", JSON.stringify(imagesError, null, 2));
  throw new Error(`No se pudieron guardar las imágenes del carrusel: ${imagesError.message || imagesError.code || 'Error desconocido'}`);
}
console.log("✅ Imágenes guardadas:", insertedImages?.length || imagesToInsert.length);
```

#### Beneficios:
- ✅ **Logging detallado**: Muestra exactamente qué datos se están insertando
- ✅ **Mensajes de error más claros**: El usuario ve un mensaje descriptivo en español
- ✅ **Debugging facilitado**: Los logs en consola ayudan a identificar problemas
- ✅ **Verificación de resultados**: Confirma cuántas imágenes se guardaron exitosamente

---

## Pasos para Aplicar la Solución

### Opción A: Si tienes acceso a Supabase Dashboard

1. **Ir a tu proyecto en Supabase Dashboard**
2. **Navegar a "SQL Editor"**
3. **Ejecutar la migración**:
   - Copiar el contenido completo de `supabase/migrations/20251123161800_ensure_banner_images_schema_cache.sql`
   - Pegarlo en el SQL Editor
   - Ejecutar (botón "Run")
4. **Verificar la ejecución**:
   - Deberías ver mensajes de confirmación en la consola
   - Verificar que no hay errores
5. **Desplegar el código actualizado**:
   - El código con mejor manejo de errores ya está en el repositorio
   - Hacer deploy de la aplicación frontend

### Opción B: Si usas CLI de Supabase

```bash
# 1. Aplicar la migración
supabase db push

# 2. O aplicar manualmente
supabase db reset --db-url "tu-database-url"

# 3. Desplegar el frontend
npm run build
# Subir a tu hosting
```

### Opción C: Aplicación Automática (Lovable/Supabase Integration)

Si tu proyecto está integrado con Lovable:
1. Las migraciones en `supabase/migrations/` se aplican automáticamente al hacer push
2. Simplemente hacer commit y push de los cambios
3. Las migraciones se ejecutarán en el siguiente deploy

---

## Verificación de la Solución

### 1. Verificar que la Tabla Existe

En Supabase Dashboard > Table Editor, deberías ver:
- ✅ Tabla `banner_images` en la lista
- ✅ Estructura con columnas: id, banner_id, image_url, display_order, alt_text, is_active, created_at, updated_at

### 2. Verificar Políticas RLS

En Supabase Dashboard > Authentication > Policies:
- ✅ Tabla `banner_images` tiene 4 políticas activas:
  - `banner_images_select_policy`
  - `banner_images_insert_policy`
  - `banner_images_update_policy`
  - `banner_images_delete_policy`

### 3. Probar la Funcionalidad

**Prueba 1: Crear Banner con Carrusel**
1. Ir a Panel Admin → Gestión de Contenido → Banners
2. Hacer clic en "Nuevo Banner"
3. Completar:
   - Título: "Prueba Carrusel"
   - Activar switch "Modo de Imágenes" (carrusel)
   - Cargar 2-3 imágenes
4. Guardar
5. ✅ **Resultado esperado**: Banner se guarda sin errores
6. ✅ **Verificar**: Las imágenes aparecen en el listado del banner

**Prueba 2: Editar Banner Existente con Carrusel**
1. Seleccionar un banner existente
2. Activar modo carrusel
3. Agregar/eliminar imágenes
4. Guardar
5. ✅ **Resultado esperado**: Cambios se guardan correctamente

**Prueba 3: Ver en Frontend**
1. Ir a la página principal del sitio
2. ✅ **Verificar**: Los banners con carrusel se muestran correctamente
3. ✅ **Verificar**: Las imágenes rotan automáticamente

---

## Logs Esperados en la Consola

Después de la solución, al guardar un banner con carrusel deberías ver:

```
💾 Guardando banner: {title: "...", ...}
✅ Banner creado: {id: "...", ...}
🖼️ Guardando múltiples imágenes para banner nuevo...
📥 Insertando 3 imágenes...
Datos a insertar: [{banner_id: "...", image_url: "...", ...}, ...]
✅ Imágenes guardadas: 3
```

### Si aún hay error:

```
❌ Error guardando imágenes: {...}
Detalles del error: {
  "message": "...",
  "code": "...",
  "details": "..."
}
```

Los detalles del error ayudarán a diagnosticar el problema específico.

---

## Troubleshooting

### Error persiste después de aplicar la migración

**Solución 1: Refrescar Schema Cache Manualmente**
```sql
-- Ejecutar en SQL Editor de Supabase
NOTIFY pgrst, 'reload schema';
```

**Solución 2: Verificar Permisos de Usuario**
```sql
-- Verificar que el usuario es admin
SELECT * FROM user_roles WHERE user_id = auth.uid();
-- Debería mostrar role = 'admin'
```

**Solución 3: Reiniciar PostgREST**
- En Supabase Dashboard: Settings → API → Restart API
- Esto fuerza la recarga del schema cache

### Error: "permission denied for table banner_images"

Significa que las políticas RLS no están aplicadas correctamente:
```sql
-- Re-aplicar políticas
-- Copiar la sección de RLS de la migración y ejecutarla nuevamente
```

### Error: "relation banner_images does not exist"

La tabla no se ha creado:
```sql
-- Verificar si existe
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'banner_images';

-- Si no existe, ejecutar la migración completa
```

---

## Archivos Modificados

### Nuevos
- `supabase/migrations/20251123161800_ensure_banner_images_schema_cache.sql` (238 líneas)

### Modificados
- `src/pages/admin/content/HomepageBanners.tsx` (mejoras en logging y manejo de errores)

---

## Resumen de la Solución

### El Problema
- ❌ Error "Could not find the table 'public.banner_images' in the schema cache"
- ❌ Solo ocurre en modo carrusel (múltiples imágenes)
- ✅ Funciona con imagen única

### La Causa
- PostgREST no reconoce la tabla `banner_images` en su schema cache
- Migraciones anteriores no se aplicaron correctamente o el cache no se actualizó

### La Solución
1. ✅ Migración SQL comprehensiva que garantiza la correcta creación de la tabla
2. ✅ Recreación del foreign key constraint con el nombre correcto
3. ✅ Configuración de políticas RLS usando `public.has_role()`
4. ✅ Forzar refresh del schema cache con `NOTIFY pgrst`
5. ✅ Mejor logging y manejo de errores en el código TypeScript

### Resultado Esperado
- ✅ Crear banners con carrusel funciona sin errores
- ✅ Editar banners con carrusel funciona correctamente
- ✅ Mensajes de error claros si algo falla
- ✅ Logs detallados para debugging

---

## Próximos Pasos

Después de aplicar la migración:

1. **Probar exhaustivamente**:
   - Crear varios banners con carrusel
   - Editar banners existentes
   - Eliminar imágenes de carruseles
   - Cambiar orden de imágenes

2. **Verificar en diferentes secciones**:
   - Hero (carrusel principal)
   - After products
   - After quick access
   - After features
   - Bottom

3. **Revisar rendimiento**:
   - Los índices deberían hacer las queries más rápidas
   - Verificar tiempos de carga en la página principal

4. **Documentar para el equipo**:
   - Compartir este documento con el equipo
   - Incluir en la documentación del proyecto

---

**Desarrollado por**: GitHub Copilot Agent  
**Fecha**: 23 de Noviembre, 2025  
**Estado**: ✅ SOLUCIÓN LISTA PARA APLICAR
