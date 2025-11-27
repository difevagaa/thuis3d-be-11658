# Solución al Error de Banner Images - Guía Paso a Paso

**Problema**: Error al guardar banners con múltiples imágenes (modo carrusel)  
**Error**: "Could not find the table 'public.banner_images' in the schema cache"  
**Fecha**: 23 de Noviembre, 2025

---

## 🎯 Solución Rápida (5 minutos)

### Paso 1: Ejecutar Diagnóstico

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard) → Tu proyecto (`ljygreayxxpsdmncwzia`)
2. Ir a **SQL Editor** → **+ New query**
3. Copiar y pegar el contenido del archivo: `supabase/migrations/diagnostic_banner_images.sql`
4. Hacer clic en **Run** (o Ctrl/Cmd + Enter)
5. Leer el resultado del diagnóstico

**Resultado esperado**: El diagnóstico mostrará qué está fallando.

### Paso 2: Aplicar Migración Completa

1. En el mismo **SQL Editor**, hacer clic en **+ New query**
2. Copiar y pegar el contenido completo del archivo:
   ```
   supabase/migrations/20251123161800_ensure_banner_images_schema_cache.sql
   ```
3. Hacer clic en **Run**
4. Esperar a que termine (debería tomar 1-2 segundos)
5. Verificar que no haya errores

### Paso 3: Recargar Schema Cache

1. En el mismo **SQL Editor**, hacer clic en **+ New query**
2. Pegar y ejecutar:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
3. Esperar 10-30 segundos

### Paso 4: Probar en Panel Admin

1. Ir a **Panel de Administración** → **Gestión de Contenido** → **Banners**
2. Hacer clic en **Nuevo Banner**
3. Activar el switch **"Modo de Imágenes"** (múltiples imágenes)
4. Cargar 2-3 imágenes de prueba
5. Hacer clic en **Guardar**

**Resultado esperado**: Banner creado exitosamente sin errores.

---

## 🔍 Si el Error Persiste

### Opción A: Reiniciar API de Supabase

1. Ir a **Settings** → **API**
2. Hacer clic en **Restart API Service**
3. Esperar 30 segundos
4. Intentar crear el banner nuevamente

### Opción B: Verificar Permisos de Usuario

Ejecutar en SQL Editor:

```sql
-- Verificar rol del usuario
SELECT * FROM public.user_roles 
WHERE user_id = auth.uid();
```

Si no muestra `role = 'admin'`, ejecutar:

```sql
-- Asignar rol de admin
INSERT INTO public.user_roles (user_id, role)
VALUES (auth.uid(), 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Opción C: Ejecutar Diagnóstico Nuevamente

Ejecutar el script de diagnóstico otra vez para ver qué ha cambiado:
- `supabase/migrations/diagnostic_banner_images.sql`

---

## 📋 Verificación Final

### 1. Verificar tabla existe

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'banner_images';
```

**Resultado esperado**: 1 fila con `table_name = 'banner_images'`

### 2. Verificar políticas RLS

```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'banner_images';
```

**Resultado esperado**: 4 filas (SELECT, INSERT, UPDATE, DELETE)

### 3. Verificar foreign key

```sql
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'banner_images' 
  AND constraint_type = 'FOREIGN KEY';
```

**Resultado esperado**: 1 fila con `constraint_name = 'banner_images_banner_id_fkey'`

### 4. Verificar índices

```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'banner_images';
```

**Resultado esperado**: 4-5 índices

---

## 🧪 Pruebas Funcionales

### Test 1: Crear Banner con Carrusel

```
1. Panel Admin → Banners → Nuevo Banner
2. Título: "Prueba Carrusel"
3. Activar "Modo de Imágenes"
4. Cargar 3 imágenes
5. Guardar
✅ Resultado: Banner creado sin errores
```

### Test 2: Ver Banner en Frontend

```
1. Abrir página principal
2. Verificar carrusel se muestra
3. Verificar rotación automática
✅ Resultado: Carrusel funciona correctamente
```

### Test 3: Editar Banner Existente

```
1. Panel Admin → Banners → Editar banner
2. Cambiar a modo carrusel
3. Agregar/eliminar imágenes
4. Guardar
✅ Resultado: Cambios guardados correctamente
```

---

## 🆘 Troubleshooting

### Error: "relation 'public.banner_images' does not exist"

**Solución**: La tabla no se creó. Ejecutar migración completa nuevamente.

### Error: Schema cache no se actualiza

**Solución**: 
1. Ejecutar `NOTIFY pgrst, 'reload schema';`
2. Esperar 30 segundos
3. Reiniciar API desde Dashboard

### Error: "permission denied"

**Solución**: Verificar que tienes rol de admin (ver Opción B arriba)

### Frontend muestra "Error al cargar banners"

**Solución**:
1. Abrir consola del navegador (F12)
2. Ver errores específicos
3. Verificar políticas RLS existen
4. Limpiar caché del navegador

---

## 📝 Archivos de Referencia

### Migraciones SQL
- `supabase/migrations/20251123142100_add_banner_images_table.sql` - Crea tabla básica
- `supabase/migrations/20251123144700_fix_banner_images_relationship.sql` - Corrige FK
- `supabase/migrations/20251123161800_ensure_banner_images_schema_cache.sql` - **Migración completa (USAR ESTA)**

### Documentación
- `GUIA_APLICACION_MIGRACION_BANNER_IMAGES.md` - Guía detallada
- `INFORME_FINAL_SOLUCION_BANNERS.md` - Análisis técnico completo
- `AUDITORIA_SISTEMA_BANNERS_COMPLETA.md` - Auditoría del sistema

### Scripts de Diagnóstico
- `supabase/migrations/diagnostic_banner_images.sql` - Verificar estado del sistema

---

## 🔄 Rollback (Revertir)

**⚠️ ADVERTENCIA**: Esto eliminará todos los datos de banner_images

```sql
-- Eliminar políticas
DROP POLICY IF EXISTS "banner_images_select_policy" ON public.banner_images;
DROP POLICY IF EXISTS "banner_images_insert_policy" ON public.banner_images;
DROP POLICY IF EXISTS "banner_images_update_policy" ON public.banner_images;
DROP POLICY IF EXISTS "banner_images_delete_policy" ON public.banner_images;

-- Eliminar trigger y función
DROP TRIGGER IF EXISTS update_banner_images_updated_at_trigger ON public.banner_images;
DROP FUNCTION IF EXISTS public.update_banner_images_updated_at();

-- Eliminar tabla
DROP TABLE IF EXISTS public.banner_images CASCADE;

-- Recargar schema
NOTIFY pgrst, 'reload schema';
```

---

## ✅ Checklist de Completitud

- [ ] Diagnóstico ejecutado y revisado
- [ ] Migración completa aplicada
- [ ] Schema cache recargado
- [ ] Tabla banner_images existe
- [ ] Foreign key correcta
- [ ] 4 políticas RLS activas
- [ ] 4-5 índices creados
- [ ] Trigger de updated_at funciona
- [ ] Banner de prueba creado exitosamente
- [ ] Carrusel se muestra en frontend
- [ ] Imágenes rotan automáticamente

---

**Versión**: 1.0  
**Actualizado**: 23 de Noviembre, 2025  
**Soporte**: Ver documentación técnica detallada en archivos de referencia
