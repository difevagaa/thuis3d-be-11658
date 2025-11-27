# Configuración de GitHub Copilot para Acceso a Base de Datos

## ✅ Errores Corregidos

Los siguientes errores han sido solucionados mediante migración de base de datos:

1. ✅ **Error de paletas de colores**: Se agregó la columna `header_bg_color` a la tabla `site_customization`
2. ✅ **Error de banner images**: Se creó la tabla `banner_images` con todas sus relaciones, índices y políticas RLS

## 🔑 Credenciales para GitHub Copilot

Para que GitHub Copilot pueda acceder a tu base de datos de Supabase, necesitas proporcionarle las siguientes credenciales:

### 1. URL del Proyecto Supabase
```
https://ljygreayxxpsdmncwzia.supabase.co
```

### 2. Service Role Key (Clave de Servicio)

⚠️ **IMPORTANTE**: La Service Role Key es una credencial SECRETA con acceso total a tu base de datos. Nunca la compartas públicamente.

**Cómo obtener tu Service Role Key:**

1. Ve a tu proyecto en Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/ljygreayxxpsdmncwzia
   ```

2. Haz clic en el ícono de configuración (⚙️) en la barra lateral izquierda

3. Ve a **Settings** → **API**

4. En la sección **Project API keys**, encontrarás:
   - `anon` / `public` key (clave pública) - NO uses esta
   - `service_role` key (clave de servicio) - **USA ESTA** ✅

5. Haz clic en el botón "Copy" junto a la `service_role` key

6. Proporciona esta clave a GitHub Copilot cuando la solicite

### 3. Configuración en GitHub Copilot

Cuando GitHub Copilot solicite las credenciales, configura:

```yaml
Database Type: PostgreSQL (Supabase)
Host: ljygreayxxpsdmncwzia.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [Tu Service Role Key]
Connection String (alternativo):
postgresql://postgres:[SERVICE_ROLE_KEY]@ljygreayxxpsdmncwzia.supabase.co:5432/postgres
```

### 4. Permisos Otorgados

Con la Service Role Key, GitHub Copilot podrá:

- ✅ Leer todas las tablas y esquemas
- ✅ Crear nuevas tablas y columnas
- ✅ Modificar estructuras existentes
- ✅ Ejecutar migraciones SQL
- ✅ Gestionar políticas RLS
- ✅ Crear funciones y triggers

⚠️ **Nota de Seguridad**: La Service Role Key **bypasses todas las políticas RLS**. Solo úsala en entornos de desarrollo seguros.

## 🔒 Alternativa: Variables de Entorno

Si prefieres no compartir la Service Role Key directamente, puedes configurar variables de entorno:

```bash
# En tu archivo .env local (NO subir a GitHub)
SUPABASE_URL=https://ljygreayxxpsdmncwzia.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[tu_service_role_key_aquí]
```

Luego, GitHub Copilot puede leer estas variables automáticamente.

## 📋 Verificación Post-Configuración

Después de configurar GitHub Copilot, verifica que puede acceder correctamente:

### 1. Test de Conexión

Pide a Copilot que ejecute:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Deberías ver todas tus tablas, incluyendo:
- `banner_images` (recién creada)
- `site_customization` (con columna `header_bg_color` nueva)
- `homepage_banners`
- Y todas las demás tablas del sistema

### 2. Verificar Tabla banner_images

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'banner_images' 
  AND table_schema = 'public';
```

Deberías ver 8 columnas: id, banner_id, image_url, display_order, alt_text, is_active, created_at, updated_at

### 3. Verificar site_customization

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'site_customization' 
  AND table_schema = 'public'
  AND column_name IN ('header_bg_color', 'selected_palette');
```

Deberías ver ambas columnas: `header_bg_color` y `selected_palette`

## ✅ Errores Ahora Solucionados

Una vez configurado GitHub Copilot, los siguientes errores ya NO deberían aparecer:

1. ❌ ~~"Could not find the 'header_bg_color' column of 'site_customization' in the schema cache"~~
   - ✅ **SOLUCIONADO**: Columna agregada correctamente

2. ❌ ~~"Could not find the table 'public.banner_images' in the schema cache"~~
   - ✅ **SOLUCIONADO**: Tabla creada con todas sus configuraciones

## 🎯 Próximos Pasos

1. **Obtén tu Service Role Key** del Supabase Dashboard
2. **Configura GitHub Copilot** con las credenciales proporcionadas
3. **Verifica la conexión** ejecutando las queries de prueba
4. **Prueba las funcionalidades corregidas**:
   - Guarda paletas de colores desde el Personalizador
   - Crea banners con múltiples imágenes (carrusel)

## 🆘 Soporte

Si encuentras problemas:
- Verifica que la Service Role Key sea correcta (comienza con `eyJ...`)
- Asegúrate de estar usando la clave `service_role`, NO la clave `anon`
- Confirma que la URL del proyecto sea exactamente: `https://ljygreayxxpsdmncwzia.supabase.co`
- Revisa los logs de Supabase Dashboard en la sección "Logs" para ver errores de conexión

---

**Última actualización**: 24 de Noviembre, 2025  
**Estado**: ✅ Migraciones aplicadas correctamente  
**Acceso GitHub Copilot**: 🔑 Pendiente de configurar por usuario
