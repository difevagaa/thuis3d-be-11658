# 🎨 DIAGRAMA VISUAL - Arquitectura del Proyecto

## 🏗️ CÓMO ESTÁ ORGANIZADO TU PROYECTO

```
┌────────────────────────────────────────────────────────────────┐
│                         🌐 INTERNET                            │
│                                                                │
│      Usuario visita: https://thuis3d.be                       │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                ↓
┌────────────────────────────────────────────────────────────────┐
│                    📱 FRONTEND (Tu Sitio Web)                  │
│                                                                │
│  • React + TypeScript + Vite                                  │
│  • Código en: /home/runner/work/thuis3d-be-11658              │
│  • Desplegado en: Lovable + GitHub Pages                      │
│                                                                │
│  Componentes principales:                                     │
│  ├─ Home.tsx                 (Página principal)               │
│  ├─ Blog.tsx                 (Blog)                           │
│  ├─ Products.tsx             (Productos)                      │
│  └─ SectionRenderer.tsx      (Carga contenido desde DB)       │
│                                                                │
└───────────────────────────────┬────────────────────────────────┘
                                │
                                │ Consultas API
                                ↓
┌────────────────────────────────────────────────────────────────┐
│              💾 BACKEND (Base de Datos de Lovable)             │
│                                                                │
│  Supabase Instance: ljygreayxxpsdmncwzia.supabase.co          │
│  ↑                                                             │
│  └─── ESTO ES LA "BASE DE DATOS DE LOVABLE" ───┐              │
│                                                 │              │
│  Servicios:                                     │              │
│  ├─ 🗄️  PostgreSQL Database                     │              │
│  │   • page_builder_pages                      │              │
│  │   • page_builder_sections                   │              │
│  │   • products, blog_posts, gallery_items     │              │
│  │   • users, orders, quotes, etc.             │              │
│  │                                              │              │
│  ├─ 🔐 Authentication (Auth)                    │              │
│  │   • Login/Registro de usuarios              │              │
│  │   • JWT tokens                               │              │
│  │                                              │              │
│  ├─ 📦 Storage (Archivos)                       │              │
│  │   • Imágenes de productos                   │              │
│  │   • STL files                                │              │
│  │   • Avatares de usuario                     │              │
│  │                                              │              │
│  └─ 🔄 Real-time (Subscripciones)              │              │
│      • Actualizaciones en vivo                 │              │
│      • Notificaciones                          │              │
│                                                                │
│  Gestionado por: Lovable + Supabase                           │
└────────────────────────────────────────────────────────────────┘
```

## 🔄 FLUJO DE DATOS

### Cuando un usuario visita una página:

```
1. Usuario → https://thuis3d.be/
           ↓
2. Navegador carga → index.html + JavaScript
           ↓
3. React se inicia → App.tsx
           ↓
4. Ruta detectada → /blog (ejemplo)
           ↓
5. Componente Blog.tsx se carga
           ↓
6. usePageSections('blog') se ejecuta
           ↓
7. Consulta a Supabase:
   GET https://ljygreayxxpsdmncwzia.supabase.co/rest/v1/page_builder_pages
           ↓
8. Supabase responde con:
   { page_id: "uuid", page_key: "blog" }
           ↓
9. Segunda consulta:
   GET .../page_builder_sections?page_id=uuid
           ↓
10. Supabase responde con secciones:
    [ { section_type: "hero", content: {...} },
      { section_type: "text", content: {...} } ]
           ↓
11. SectionRenderer renderiza cada sección
           ↓
12. ✅ Usuario ve la página completa
```

## 🔧 ¿DÓNDE HACER CAMBIOS?

### Cambiar Apariencia (Frontend)
```
Editar archivos en:
src/
├── pages/          ← Páginas (Home, Blog, etc.)
├── components/     ← Componentes reutilizables
├── index.css       ← Estilos globales
└── App.tsx         ← Configuración de rutas
```

### Cambiar Datos (Backend)
```
Opción 1 - Supabase Dashboard:
https://supabase.com/dashboard → ljygreayxxpsdmncwzia
  └── SQL Editor → Ejecutar consultas SQL

Opción 2 - Lovable Panel:
https://lovable.dev/projects/57e87420-5c56-4a91-a41f-e22bd87955e0
  └── Database → Migrations → Run

Opción 3 - Archivos de Migración:
supabase/migrations/
  ├── 20251207140000_ensure_all_pages_exist.sql
  ├── 20251207150000_populate_page_builder_content.sql
  └── 20251207160000_add_sample_data_and_fix_pages.sql
```

### Agregar Nuevas Tablas
```
1. Crear archivo: supabase/migrations/YYYYMMDDHHMMSS_my_table.sql

2. Contenido:
   CREATE TABLE IF NOT EXISTS public.my_table (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     created_at TIMESTAMPTZ DEFAULT now()
   );

3. Commit a GitHub

4. En Lovable: Database → Run Migrations
   O
   En Supabase: SQL Editor → Copiar/pegar → Run
```

## 🗂️ ESTRUCTURA DE DATOS

### Tablas Principales

```
page_builder_pages
├─ id (UUID)
├─ page_key (TEXT) ← "home", "blog", "products"
├─ page_name (TEXT)
└─ is_enabled (BOOLEAN)
     │
     └─── page_builder_sections
          ├─ id (UUID)
          ├─ page_id (UUID) ← FK a page_builder_pages
          ├─ section_type (TEXT) ← "hero", "text", "cta"
          ├─ content (JSONB) ← Datos de la sección
          ├─ settings (JSONB)
          ├─ styles (JSONB)
          └─ display_order (INTEGER)

products
├─ id (UUID)
├─ name (TEXT)
├─ description (TEXT)
├─ price (NUMERIC)
└─ image_url (TEXT)

blog_posts
├─ id (UUID)
├─ title (TEXT)
├─ slug (TEXT)
├─ content (TEXT)
└─ published_at (TIMESTAMPTZ)

gallery_items
├─ id (UUID)
├─ title (TEXT)
├─ description (TEXT)
├─ media_url (TEXT)
└─ is_published (BOOLEAN)
```

## 🎯 ENTENDIENDO EL PROBLEMA ORIGINAL

### ❌ Antes (Problema)

```
Usuario visita /blog
      ↓
SectionRenderer consulta Supabase
      ↓
Timeout de 2 segundos: "Si no responde, muestra vacío"
      ↓
Consulta tarda 3 segundos
      ↓
😢 Usuario ve página vacía por 1 segundo
      ↓
Datos llegan de Supabase
      ↓
😕 Página cambia de vacía a llena (PARPADEO)
```

### ✅ Ahora (Solucionado)

```
Usuario visita /blog
      ↓
SectionRenderer consulta Supabase
      ↓
Timeout de 10 segundos: "Espera hasta 10s"
      ↓
Consulta tarda 3 segundos (normal)
      ↓
Datos llegan de Supabase
      ↓
😊 Usuario ve página completa (SIN parpadeo)
```

## 📊 EJEMPLO PRÁCTICO

### Agregar una nueva sección a la página Home

#### Método 1: Via SQL Editor
```sql
-- 1. Obtener el ID de la página Home
SELECT id FROM page_builder_pages WHERE page_key = 'home';
-- Resultado: 12345678-abcd-efgh-ijkl-mnopqrstuvwx

-- 2. Insertar nueva sección
INSERT INTO page_builder_sections (
  page_id,
  section_type,
  section_name,
  display_order,
  is_visible,
  content
) VALUES (
  '12345678-abcd-efgh-ijkl-mnopqrstuvwx',
  'text',
  'Nueva Sección',
  10,
  true,
  '{"title": "¡Bienvenidos!", "text": "Esta es mi nueva sección"}'::jsonb
);
```

#### Método 2: Via Page Builder Admin
```
1. Ve a: /admin/page-builder
2. Selecciona página: "Home"
3. Click "Add Section"
4. Elige tipo: "Text"
5. Completa formulario:
   - Título: ¡Bienvenidos!
   - Texto: Esta es mi nueva sección
   - Display Order: 10
   - Visible: ✓
6. Click "Save"
```

## 🔍 VERIFICACIÓN

### Ver qué páginas tienen contenido:

```sql
SELECT 
  p.page_key,
  p.page_name,
  COUNT(s.id) as secciones,
  CASE 
    WHEN COUNT(s.id) = 0 THEN '❌ SIN CONTENIDO'
    WHEN COUNT(s.id) < 3 THEN '⚠️ POCO CONTENIDO'
    ELSE '✅ CON CONTENIDO'
  END as estado
FROM page_builder_pages p
LEFT JOIN page_builder_sections s ON s.page_id = p.id
GROUP BY p.page_key, p.page_name
ORDER BY secciones DESC;
```

### Resultado esperado:
```
page_key    | page_name           | secciones | estado
------------|--------------------|-----------|-----------------
home        | Página de Inicio   | 5         | ✅ CON CONTENIDO
blog        | Blog               | 3         | ✅ CON CONTENIDO
products    | Productos          | 4         | ✅ CON CONTENIDO
faq         | FAQ                | 1         | ⚠️ POCO CONTENIDO
about-us    | Sobre Nosotros     | 0         | ❌ SIN CONTENIDO
```

Si ves "❌ SIN CONTENIDO" → Ejecuta las migraciones!

---

**¿Preguntas?** Lee `RESUMEN_ESTADO_PROYECTO.md` para el estado completo.
