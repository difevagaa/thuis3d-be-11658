# 🔑 Credenciales para GitHub Copilot Agent

## Información del Proyecto Supabase

**URL del Proyecto:**
```
https://ljygreayxxpsdmncwzia.supabase.co
```

**Project ID:**
```
ljygreayxxpsdmncwzia
```

## Cómo Obtener tu Service Role Key

La Service Role Key es necesaria para que GitHub Copilot pueda crear y modificar tablas en tu base de datos.

### Pasos:

1. **Ir al Dashboard de Supabase**
   ```
   https://supabase.com/dashboard/project/ljygreayxxpsdmncwzia
   ```

2. **Navegar a Settings → API**
   - En la barra lateral izquierda, haz clic en el ícono de configuración ⚙️
   - Selecciona "API"

3. **Localizar la Service Role Key**
   - En la sección "Project API keys"
   - Encontrarás dos keys:
     - `anon` / `public` → ❌ NO usar esta
     - `service_role` → ✅ Usar esta

4. **Copiar la Key**
   - Haz clic en el botón "Copy" junto a `service_role`
   - Aparece algo como: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Configuración en GitHub Copilot

Cuando GitHub Copilot solicite las credenciales de base de datos, proporciona:

### Opción 1: Connection String (Recomendado)

```
postgresql://postgres:[TU_SERVICE_ROLE_KEY]@db.ljygreayxxpsdmncwzia.supabase.co:5432/postgres
```

Reemplaza `[TU_SERVICE_ROLE_KEY]` con la key que copiaste.

### Opción 2: Credenciales Individuales

```
Host: db.ljygreayxxpsdmncwzia.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [TU_SERVICE_ROLE_KEY]
```

## ⚠️ Advertencias de Seguridad

- **NUNCA** compartas la Service Role Key públicamente
- **NUNCA** la subas a GitHub o repositorios públicos
- Esta key tiene **acceso completo** a tu base de datos
- Solo úsala en entornos de desarrollo seguros

## Permisos que Otorga

Con la Service Role Key, GitHub Copilot podrá:

- ✅ Crear nuevas tablas
- ✅ Modificar estructuras existentes
- ✅ Agregar/modificar columnas
- ✅ Ejecutar migraciones SQL
- ✅ Gestionar políticas RLS
- ✅ Crear funciones y triggers
- ✅ Leer y escribir datos

⚠️ La Service Role Key **bypasses todas las políticas RLS** - tiene acceso total.

## Verificar Conexión

Después de configurar GitHub Copilot, pídele que ejecute:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Deberías ver todas tus tablas incluyendo:
- `banner_images` ✅
- `site_customization` ✅
- `homepage_banners` ✅
- Y todas las demás tablas del sistema

## Columnas Ahora Disponibles

Las siguientes columnas han sido agregadas a `site_customization`:

- ✅ `header_bg_color` - Color de fondo del header
- ✅ `header_text_color` - Color del texto del header
- ✅ `sidebar_bg_color` - Color de fondo del sidebar admin
- ✅ `sidebar_active_bg_color` - Color del item activo en sidebar
- ✅ `home_menu_bg_color` - Color de fondo del menú principal
- ✅ `home_menu_text_color` - Color del texto del menú
- ✅ `home_menu_hover_bg_color` - Color hover en menú
- ✅ `selected_palette` - Paleta de colores seleccionada

## Tabla banner_images Creada

La tabla `banner_images` ha sido creada con:

- ✅ Columnas completas (id, banner_id, image_url, display_order, alt_text, is_active, timestamps)
- ✅ Foreign key a `homepage_banners`
- ✅ Índices para rendimiento
- ✅ Políticas RLS (admins pueden gestionar, todos pueden ver)
- ✅ Trigger para updated_at

## ✅ Errores Corregidos

Los siguientes errores YA NO deberían aparecer:

1. ❌ ~~"Could not find the 'header_text_color' column of 'site_customization' in the schema cache"~~
   - ✅ **RESUELTO**: Columna agregada

2. ❌ ~~"Could not find the table 'public.banner_images' in the schema cache"~~
   - ✅ **RESUELTO**: Tabla creada completamente

## Próximos Pasos

1. ✅ Obtén tu Service Role Key del Supabase Dashboard
2. ✅ Configura GitHub Copilot con las credenciales
3. ✅ Verifica la conexión con la query de prueba
4. ✅ GitHub Copilot ya podrá crear y modificar tablas sin problemas

---

**Última Actualización:** 24 de Noviembre, 2025  
**Estado:** ✅ Base de datos lista para GitHub Copilot  
**Configuración Pendiente:** Usuario debe obtener y configurar Service Role Key
