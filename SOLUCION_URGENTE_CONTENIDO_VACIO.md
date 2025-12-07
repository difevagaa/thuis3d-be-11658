# 🚨 SOLUCIÓN URGENTE - CONTENIDO VACÍO

## ✅ PROBLEMA SOLUCIONADO: Parpadeo de Conexión

**ACTUALIZACIÓN**: El parpadeo ya está solucionado. Era causado por un timeout muy corto (2 segundos), ahora aumentado a 10 segundos.

### ¿Qué se arregló?
- ✅ Timeout aumentado de 2s → 10s (evita cambios prematuros entre vacío y contenido)
- ✅ Diagnósticos agregados para ver tiempos de carga
- ✅ Confirmado: SOLO Supabase está conectado (no hay conflicto con Lovable)

**Lee `DIAGNOSTICO_CONEXION_BASE_DATOS.md` para detalles técnicos.**

---

## ❌ SI AÚN VES PÁGINAS VACÍAS

Las páginas cargan vacías (sin contenido, solo "carruseles malos") porque:
- Las tablas de Page Builder existen PERO están **VACÍAS**
- No hay secciones de contenido en la base de datos
- Las migraciones con datos de ejemplo no se ejecutaron

## ✅ SOLUCIÓN RÁPIDA (5 MINUTOS)

### Paso 1: Abrir Supabase SQL Editor
1. Ve a: https://supabase.com/dashboard/project/ljygreayxxpsdmncwzia
2. Inicia sesión en tu cuenta de Supabase
3. Click en **"SQL Editor"** en el menú lateral izquierdo

### Paso 2: Ejecutar el Script Maestro
1. Click en **"+ New query"** (Nueva consulta)
2. Copia TODO el contenido del archivo: `supabase/SCRIPT_MAESTRO_CORRECCION.sql`
3. Pega el contenido en el editor SQL
4. Click en **"Run"** (Ejecutar) o presiona `Ctrl+Enter`
5. Espera a que termine (debería tomar 10-30 segundos)

### Paso 3: Ejecutar Script de Datos de Ejemplo
1. Crea otra nueva consulta
2. Copia el contenido de: `supabase/migrations/20251207160000_add_sample_data_and_fix_pages.sql`
3. Pega y ejecuta con **"Run"**

### Paso 4: Verificar que funcionó
1. Refresca tu sitio web (F5)
2. Deberías ver contenido en:
   - Página de inicio (Hero, Features, etc.)
   - Blog (artículos de ejemplo)
   - Galería (imágenes de ejemplo)
   - Páginas legales (Privacidad, Términos)

## 🔍 VERIFICACIÓN RÁPIDA

Ejecuta esta consulta en el SQL Editor para verificar que hay datos:

```sql
-- Ver cuántas páginas hay
SELECT page_key, page_name, 
       (SELECT COUNT(*) FROM page_builder_sections WHERE page_id = page_builder_pages.id) as num_sections
FROM page_builder_pages;

-- Debería mostrar varias páginas con secciones (num_sections > 0)
```

## ⚠️ SI AÚN NO FUNCIONA

Si después de ejecutar los scripts las páginas siguen vacías:

### Verificar Errores en la Consola
1. Abre las Herramientas de Desarrollador (F12)
2. Ve a la pestaña "Console"
3. Busca errores rojos relacionados con Supabase o "page_builder"
4. Copia cualquier error que veas

### Verificar Políticas RLS
Ejecuta esto en SQL Editor:

```sql
-- Ver políticas de page_builder_pages
SELECT * FROM pg_policies WHERE tablename = 'page_builder_pages';

-- Ver políticas de page_builder_sections  
SELECT * FROM pg_policies WHERE tablename = 'page_builder_sections';
```

## 📋 ARCHIVOS IMPORTANTES

1. **Script Principal**: `supabase/SCRIPT_MAESTRO_CORRECCION.sql`
   - Crea tablas si no existen
   - Inserta páginas base
   - Configura permisos RLS

2. **Datos de Ejemplo**: `supabase/migrations/20251207160000_add_sample_data_and_fix_pages.sql`
   - Galería con 12 imágenes
   - Posts de blog de ejemplo
   - Contenido para páginas legales

3. **Contenido Home**: `supabase/migrations/20251207150000_populate_page_builder_content.sql`
   - Secciones para la página de inicio
   - Hero, Features, CTA, etc.

## 🆘 CONTACTO DE EMERGENCIA

Si necesitas ayuda adicional, comparte:
1. Captura de pantalla de los errores en la consola (F12)
2. Resultado de la consulta de verificación arriba
3. Mensaje de error (si hay) al ejecutar los scripts SQL

---

**Tiempo estimado**: 5-10 minutos
**Dificultad**: Fácil (solo copiar y pegar SQL)
**Resultado**: Sitio web con contenido funcionando correctamente
