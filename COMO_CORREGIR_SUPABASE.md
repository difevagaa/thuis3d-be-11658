# 🔧 CÓMO CORREGIR EL ERROR DE SUPABASE - GUÍA PASO A PASO

## ⚡ Solución Rápida (5 minutos)

### Opción 1: Desde Lovable (MÁS FÁCIL) ⭐ RECOMENDADO

1. **Abre tu proyecto en Lovable**
   - Ve a https://lovable.dev
   - Abre el proyecto `thuis3d-be-11658`

2. **Accede a Supabase**
   - En el menú lateral izquierdo, busca el ícono de **base de datos** o **Supabase**
   - O haz clic en "Supabase" en el panel superior

3. **Abre el SQL Editor**
   - Busca una opción que diga **"SQL Editor"**, **"Query"** o **"Ejecutar SQL"**
   - Debería abrirse un editor de código

4. **Copia y pega el script**
   - Abre el archivo: `supabase/SCRIPT_MAESTRO_CORRECCION.sql`
   - **Copia TODO el contenido** del archivo
   - **Pega** en el SQL Editor de Lovable

5. **Ejecuta el script**
   - Busca el botón **"Run"**, **"Execute"** o **"▶ Ejecutar"**
   - Haz clic para ejecutar el script
   - ⏱️ Espera 5-10 segundos

6. **Verifica el resultado**
   - Deberías ver mensajes como:
     ```
     Created table: page_builder_pages
     Created table: page_builder_sections
     ```
   - Y al final, un resumen de páginas y secciones creadas

7. **¡Listo!** 🎉
   - Recarga tu aplicación
   - Las páginas ahora deberían mostrar contenido

---

### Opción 2: Desde Supabase Dashboard (ALTERNATIVA)

Si no encuentras el SQL Editor en Lovable, ve directamente a Supabase:

1. **Abre Supabase**
   - Ve a https://supabase.com
   - Haz login con tu cuenta

2. **Encuentra tu proyecto**
   - Tu proyecto debería llamarse algo como `thuis3d-be-11658` o similar
   - Haz clic en el proyecto

3. **Abre el SQL Editor**
   - En el menú lateral izquierdo, busca el ícono **</> SQL Editor**
   - Haz clic en **"+ New query"** (Nueva consulta)

4. **Copia y pega el script**
   - Abre el archivo: `supabase/SCRIPT_MAESTRO_CORRECCION.sql`
   - Copia TODO el contenido
   - Pega en el editor de Supabase

5. **Ejecuta el script**
   - Haz clic en el botón **"Run"** (▶) en la esquina superior derecha
   - O presiona `Ctrl+Enter` (Windows/Linux) o `Cmd+Enter` (Mac)

6. **Verifica el resultado**
   - En la parte inferior, verás el resultado de la ejecución
   - Deberías ver tablas creadas y un resumen

---

## 🔍 Verificación (Confirmar que funcionó)

### Método 1: Ver las tablas en Supabase

1. En Supabase, ve a **"Table Editor"** (Editor de Tablas)
2. Deberías ver estas tablas:
   - ✅ `page_builder_pages`
   - ✅ `page_builder_sections`

3. Haz clic en `page_builder_pages`
   - Deberías ver ~13 filas (páginas)
   - Con page_key como: `home`, `faq`, `contact`, etc.

4. Haz clic en `page_builder_sections`
   - Deberías ver varias filas (secciones)
   - Con datos en las columnas `content`, `settings`, `styles`

### Método 2: Ejecutar consulta de verificación

En el SQL Editor, ejecuta esta consulta:

```sql
-- Ver cuántas páginas tienes
SELECT COUNT(*) as total_paginas FROM page_builder_pages;

-- Ver cuántas secciones tiene cada página
SELECT 
  p.page_key,
  COUNT(s.id) as secciones
FROM page_builder_pages p
LEFT JOIN page_builder_sections s ON s.page_id = p.id
GROUP BY p.page_key
ORDER BY p.page_key;
```

**Resultado esperado:**
```
total_paginas: 13

page_key       | secciones
---------------|----------
about-us       | 1
blog           | 0
contact        | 1
faq            | 1
gallery        | 0
home           | 3
...etc
```

### Método 3: Probar la aplicación

1. Abre tu aplicación en Lovable (botón "Run")
2. Navega a las páginas:
   - `/` (Home)
   - `/faq`
   - `/contacto`
   - `/sobre-nosotros`

3. **Abre la consola del navegador** (F12)
4. Ve a la pestaña "Console"
5. Deberías ver mensajes como:
   ```
   ✓ Loading sections for page 'home'
   ✓ Loaded 3 sections for page 'home'
   ```

6. **Las páginas deberían mostrar contenido** 🎉

---

## 🎨 Agregar Más Contenido (Opcional)

Si quieres personalizar o agregar más contenido:

### Opción A: Usar el Page Builder (Visual)

1. En tu aplicación, ve a `/admin`
2. Haz login como administrador
3. Busca **"Page Builder"** en el menú
4. Selecciona una página (ej: "home")
5. Agrega secciones con el editor visual:
   - Hero
   - Features
   - Text
   - Gallery
   - etc.
6. Guarda los cambios

### Opción B: Ejecutar más SQL (Avanzado)

Si quieres agregar secciones específicas, puedes ejecutar más SQL.

Ejemplo para agregar una sección de texto a la página de Blog:

```sql
INSERT INTO page_builder_sections (page_id, section_type, section_name, display_order, is_visible, content, settings, styles)
SELECT 
  id,
  'text',
  'Introducción del Blog',
  0,
  true,
  jsonb_build_object(
    'title', 'Blog y Noticias',
    'text', '<p>Mantente al día con las últimas tendencias en impresión 3D.</p>'
  ),
  jsonb_build_object('fullWidth', false),
  jsonb_build_object('backgroundColor', '#ffffff', 'padding', 60)
FROM page_builder_pages
WHERE page_key = 'blog';
```

---

## ❌ Solución de Problemas

### Problema 1: "Permission denied" o "Access denied"

**Solución:**
- Asegúrate de estar ejecutando el script en TU proyecto de Supabase
- Verifica que tienes permisos de administrador

### Problema 2: "Table already exists"

**Solución:**
- Esto es NORMAL, significa que las tablas ya existían
- El script está diseñado para NO duplicar datos
- Continúa con la verificación

### Problema 3: Las páginas aún están vacías

**Verificar:**

1. **¿El script se ejecutó correctamente?**
   ```sql
   SELECT COUNT(*) FROM page_builder_sections;
   ```
   Si da 0, el script no insertó las secciones.

2. **¿Las secciones están visibles?**
   ```sql
   SELECT * FROM page_builder_sections WHERE is_visible = false;
   ```
   Si hay resultados, actualiza:
   ```sql
   UPDATE page_builder_sections SET is_visible = true;
   ```

3. **¿Las páginas están habilitadas?**
   ```sql
   SELECT * FROM page_builder_pages WHERE is_enabled = false;
   ```
   Si hay resultados, actualiza:
   ```sql
   UPDATE page_builder_pages SET is_enabled = true;
   ```

### Problema 4: Error "relation does not exist"

**Solución:**
Ejecuta SOLO esta parte del script primero:

```sql
-- Crear tablas
CREATE TABLE IF NOT EXISTS public.page_builder_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT UNIQUE NOT NULL,
  page_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.page_builder_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.page_builder_pages(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  section_name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  content JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  styles JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Luego ejecuta el script completo de nuevo.

---

## 📞 ¿Necesitas Ayuda?

Si después de seguir estos pasos las páginas siguen vacías:

1. **Copia los logs de la consola** (F12 → Console)
2. **Toma screenshots** de:
   - El resultado de ejecutar el script
   - Las tablas en Supabase
   - La consola del navegador
3. **Comparte** esta información

---

## ✅ Checklist Final

- [ ] Script ejecutado en Supabase sin errores
- [ ] Tabla `page_builder_pages` tiene ~13 filas
- [ ] Tabla `page_builder_sections` tiene varias filas  
- [ ] Consulta de verificación muestra secciones
- [ ] Aplicación recargada
- [ ] Páginas muestran contenido
- [ ] Consola del navegador muestra "✓ Loaded X sections"

**Si todos los checks están ✅, ¡el problema está RESUELTO!** 🎉

---

**Última actualización:** 2024-12-07  
**Archivo del script:** `supabase/SCRIPT_MAESTRO_CORRECCION.sql`
