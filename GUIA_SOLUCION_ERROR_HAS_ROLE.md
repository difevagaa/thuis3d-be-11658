# 🔧 Guía Completa: Solución del Error has_role en Supabase

> **Para principiantes** - Explicación sencilla paso a paso  
> **Tiempo estimado**: 10-15 minutos  
> **Dificultad**: ⭐ Fácil - No requiere conocimientos técnicos

---

## 📋 Índice

1. [¿Qué es este error?](#qué-es-este-error)
2. [¿Por qué ocurre?](#por-qué-ocurre)
3. [Diagnóstico simple](#diagnóstico-simple)
4. [Solución paso a paso](#solución-paso-a-paso)
5. [Verificación](#verificación)
6. [Solución alternativa](#solución-alternativa)
7. [Preguntas frecuentes](#preguntas-frecuentes)

---

## 🔍 ¿Qué es este error?

### El mensaje de error que ves:

```
ERROR: function public.has_role(uuid, text) does not exist
```

### Traducción simple:
La base de datos no encuentra una "herramienta" (función) llamada `has_role` que necesita para verificar si un usuario es administrador.

### ¿Qué es has_role?
Es como un "guardia de seguridad" que revisa si un usuario tiene permiso de administrador antes de permitirle hacer cambios en la base de datos.

---

## ❓ ¿Por qué ocurre?

### Causa principal:
La función `has_role` no fue creada en tu base de datos de Supabase. Esto puede pasar por:

1. **Las migraciones no se ejecutaron en orden** 
   - La base de datos necesita instrucciones en un orden específico
   - Si falta una instrucción al principio, las siguientes fallan

2. **La base de datos se creó desde cero recientemente**
   - Si borraste y recreaste la base de datos
   - La función no se volvió a crear

3. **La migración inicial no se ejecutó**
   - La función debió crearse con la primera configuración
   - Si ese paso se saltó, no existe

### Analogía sencilla:
Es como construir una casa - necesitas primero los cimientos antes de poner las paredes. La función `has_role` es un cimiento que necesitan las "paredes" (políticas de seguridad).

---

## 🔍 Diagnóstico Simple

### Paso 1: Verificar si la función existe

1. **Abre Supabase Dashboard**
   - Ve a: https://supabase.com/dashboard
   - Inicia sesión con tu cuenta
   - Selecciona tu proyecto

2. **Abre el SQL Editor**
   - En el menú izquierdo, busca "SQL Editor" (icono 📝)
   - Haz clic para abrir

3. **Ejecuta este código de diagnóstico**
   
   Copia y pega esto en el editor:
   
   ```sql
   -- 🔍 DIAGNÓSTICO: Verificar si la función has_role existe
   
   SELECT 
     routine_name as "Nombre de Función",
     routine_type as "Tipo"
   FROM information_schema.routines
   WHERE routine_schema = 'public' 
     AND routine_name = 'has_role';
   ```

4. **Haz clic en "RUN" (▶️ Ejecutar)**

### Interpretación de resultados:

#### ✅ Si ves una fila con "has_role":
```
Nombre de Función | Tipo
has_role         | FUNCTION
```
**Significado**: La función existe ✓  
**Acción**: El problema está en otro lado (revisa la sección de "Problemas Alternativos")

#### ❌ Si ves "No rows returned" o una tabla vacía:
```
(Sin resultados)
```
**Significado**: La función NO existe ✗  
**Acción**: Continúa con la solución paso a paso

---

## 🛠️ Solución Paso a Paso

### Opción A: Solución Automática (Recomendada)

Esta es la forma más fácil y segura de solucionar el problema.

#### Paso 1: Preparar el código

Abre el archivo de migración que arreglará todo:
- Archivo: `supabase/migrations/[TIMESTAMP]_fix_has_role_function.sql`
- O usa el código de abajo

#### Paso 2: Copiar el script de solución

```sql
-- ============================================================================
-- SOLUCIÓN COMPLETA: Crear función has_role y tabla user_roles
-- ============================================================================
-- Este script es IDEMPOTENTE: puedes ejecutarlo varias veces sin problemas
-- Fecha: 2024-11-24
-- Descripción: Crea la función has_role que verifica roles de usuario
-- ============================================================================

-- PASO 1: Crear el tipo app_role si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM (
      'admin',
      'client',
      'moderator'
    );
    RAISE NOTICE '✅ Tipo app_role creado exitosamente';
  ELSE
    RAISE NOTICE '✓ Tipo app_role ya existe';
  END IF;
END $$;

-- PASO 2: Crear la tabla user_roles si no existe
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: Un usuario solo puede tener un rol específico una vez
  UNIQUE(user_id, role)
);

-- Comentario para documentación
COMMENT ON TABLE public.user_roles IS 
  'Tabla que almacena los roles asignados a cada usuario del sistema';

COMMENT ON COLUMN public.user_roles.role IS 
  'Rol del usuario: admin (administrador), client (cliente), moderator (moderador)';

-- PASO 3: Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
  ON public.user_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role 
  ON public.user_roles(role);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_role 
  ON public.user_roles(user_id, role);

-- PASO 4: Habilitar Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- PASO 5: Crear políticas de seguridad para user_roles
DO $$
BEGIN
  -- Política: Los usuarios pueden ver sus propios roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'Los usuarios pueden ver sus propios roles'
  ) THEN
    CREATE POLICY "Los usuarios pueden ver sus propios roles"
      ON public.user_roles FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  -- Política: Solo admins pueden insertar roles (se creará después de has_role)
  -- Esta política se agregará más adelante
END $$;

-- PASO 6: Crear o reemplazar la función has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text) 
RETURNS boolean
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id 
      AND role = _role
  )
$$;

-- Comentario para documentación
COMMENT ON FUNCTION public.has_role(uuid, text) IS 
  'Verifica si un usuario tiene un rol específico asignado. Retorna true si el usuario tiene el rol, false en caso contrario.';

-- PASO 7: Crear políticas de administración para user_roles (ahora que has_role existe)
DO $$
BEGIN
  -- Política: Solo admins pueden insertar roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'Solo admins pueden insertar roles'
  ) THEN
    CREATE POLICY "Solo admins pueden insertar roles"
      ON public.user_roles FOR INSERT
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  -- Política: Solo admins pueden actualizar roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'Solo admins pueden actualizar roles'
  ) THEN
    CREATE POLICY "Solo admins pueden actualizar roles"
      ON public.user_roles FOR UPDATE
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  -- Política: Solo admins pueden eliminar roles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_roles' 
    AND policyname = 'Solo admins pueden eliminar roles'
  ) THEN
    CREATE POLICY "Solo admins pueden eliminar roles"
      ON public.user_roles FOR DELETE
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- PASO 8: Insertar rol de admin inicial (OPCIONAL - solo si no tienes admin)
-- Descomenta y reemplaza 'TU_EMAIL_AQUI' con tu email de usuario
/*
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Buscar el ID del usuario por email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'TU_EMAIL_AQUI';  -- 👈 REEMPLAZA ESTO
  
  IF v_user_id IS NOT NULL THEN
    -- Insertar el rol de admin si no existe
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE '✅ Rol de admin asignado al usuario: %', v_user_id;
  ELSE
    RAISE NOTICE '⚠️ Usuario no encontrado con ese email';
  END IF;
END $$;
*/

-- PASO 9: Verificación final
DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_table_exists BOOLEAN;
BEGIN
  -- Verificar que la función existe
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'has_role' 
      AND pg_catalog.pg_function_is_visible(oid)
  ) INTO v_function_exists;
  
  -- Verificar que la tabla existe
  SELECT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'user_roles'
  ) INTO v_table_exists;
  
  -- Mostrar resultados
  IF v_function_exists AND v_table_exists THEN
    RAISE NOTICE '✅✅✅ ¡TODO CORRECTO! La función has_role y la tabla user_roles están configuradas.';
  ELSE
    IF NOT v_function_exists THEN
      RAISE NOTICE '❌ La función has_role NO se creó correctamente';
    END IF;
    IF NOT v_table_exists THEN
      RAISE NOTICE '❌ La tabla user_roles NO se creó correctamente';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- FIN DE LA SOLUCIÓN
-- ============================================================================
-- Después de ejecutar este script:
-- 1. Espera 10 segundos para que Supabase actualice el cache
-- 2. Recarga la página de tu aplicación
-- 3. Intenta crear la política de seguridad nuevamente
-- ============================================================================
```

#### Paso 3: Ejecutar el script

1. **Copia TODO el código de arriba**
   - Selecciona todo con Ctrl+A (Windows) o Cmd+A (Mac)
   - Copia con Ctrl+C o Cmd+C

2. **Pega en el SQL Editor de Supabase**
   - Haz clic en el área de texto del SQL Editor
   - Pega con Ctrl+V o Cmd+V

3. **Haz clic en el botón "RUN" (▶️)**
   - Está en la esquina superior derecha
   - Espera a que termine (puede tomar unos segundos)

#### Paso 4: Revisar los resultados

Deberías ver mensajes como estos en la parte inferior:

```
NOTICE: ✅ Tipo app_role creado exitosamente
NOTICE: ✅✅✅ ¡TODO CORRECTO! La función has_role y la tabla user_roles están configuradas.
```

Si ves estos mensajes, **¡perfecto!** El problema está solucionado.

#### Paso 5: Asignar rol de administrador (IMPORTANTE)

Si aún no tienes un usuario administrador, necesitas asignarte ese rol:

1. **Busca tu email de usuario**
   - Es el email con el que iniciaste sesión en tu aplicación

2. **En el mismo SQL Editor, ejecuta este código**:

   ```sql
   -- Asignar rol de admin a mi usuario
   -- ⚠️  ADVERTENCIA DE SEGURIDAD:
   -- Este ejemplo usa concatenación directa de email solo para simplicidad.
   -- En código de aplicación, SIEMPRE usa parámetros preparados.
   DO $$
   DECLARE
     v_user_id UUID;
   BEGIN
     -- Buscar mi ID de usuario
     SELECT id INTO v_user_id
     FROM auth.users
     WHERE email = 'tu-email@ejemplo.com';  -- 👈 CAMBIA ESTO POR TU EMAIL
     
     IF v_user_id IS NOT NULL THEN
       -- Asignar rol de admin
       INSERT INTO public.user_roles (user_id, role)
       VALUES (v_user_id, 'admin')
       ON CONFLICT (user_id, role) DO NOTHING;
       
       RAISE NOTICE '✅ ¡Rol de admin asignado correctamente!';
     ELSE
       RAISE NOTICE '❌ No se encontró usuario con ese email';
     END IF;
   END $$;
   ```

3. **Reemplaza** `'tu-email@ejemplo.com'` con tu email real
4. **Ejecuta** haciendo clic en "RUN"

#### Paso 6: Esperar y recargar

1. **Espera 10 segundos** (cuenta hasta 10)
   - Esto da tiempo a que Supabase actualice su caché interno
   
2. **Recarga tu aplicación**
   - Presiona F5 o haz clic en el botón de recargar del navegador

---

## ✅ Verificación

### Verificar que todo funciona

Ejecuta este script de verificación en el SQL Editor:

```sql
-- ============================================================================
-- SCRIPT DE VERIFICACIÓN COMPLETA
-- ============================================================================

-- 1. Verificar que la función exists
SELECT 
  '1. Función has_role' as "Verificación",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'has_role'
    ) THEN '✅ Existe'
    ELSE '❌ No existe'
  END as "Estado";

-- 2. Verificar que la tabla user_roles existe
SELECT 
  '2. Tabla user_roles' as "Verificación",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE tablename = 'user_roles'
    ) THEN '✅ Existe'
    ELSE '❌ No existe'
  END as "Estado";

-- 3. Verificar que tienes usuarios con rol admin
SELECT 
  '3. Usuarios administradores' as "Verificación",
  COALESCE(COUNT(*)::text, '0') || ' admin(s)' as "Estado"
FROM public.user_roles
WHERE role = 'admin';

-- 4. Listar todos los roles asignados
SELECT 
  ur.role as "Rol",
  u.email as "Email",
  ur.created_at as "Fecha Asignación"
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
ORDER BY ur.created_at DESC;
```

### Resultado esperado:

```
Verificación                  | Estado
------------------------------|-------------
1. Función has_role          | ✅ Existe
2. Tabla user_roles          | ✅ Existe
3. Usuarios administradores  | 1 admin(s)

Rol    | Email                 | Fecha Asignación
-------|----------------------|------------------
admin  | tu-email@ejemplo.com | 2024-11-24 10:30:00
```

---

## 🔄 Solución Alternativa

Si por alguna razón la solución principal no funciona o prefieres un enfoque diferente, aquí hay alternativas:

### Alternativa 1: Verificación directa sin función

En lugar de usar `has_role()`, puedes verificar roles directamente en las políticas:

```sql
-- En lugar de:
public.has_role(auth.uid(), 'admin')

-- Usa:
EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid() 
    AND role = 'admin'
)
```

**Ejemplo completo de política:**

```sql
-- Política de ejemplo sin usar has_role
CREATE POLICY "Solo admins pueden insertar"
  ON public.mi_tabla FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
  );
```

### Alternativa 2: Usar columna is_admin en la tabla de usuarios

Si prefieres un enfoque más simple:

```sql
-- 1. Agregar columna is_admin a auth.users (requiere permisos especiales)
-- O crear una tabla de perfil

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas
CREATE POLICY "Los usuarios ven su perfil"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

-- 4. Usar en otras políticas
CREATE POLICY "Solo admins pueden insertar"
  ON public.mi_tabla FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() 
        AND is_admin = true
    )
  );
```

### Alternativa 3: Acceso solo para usuarios autenticados

Si solo necesitas restringir acceso a usuarios autenticados (sin verificar roles):

```sql
-- Política simple: Solo usuarios autenticados
CREATE POLICY "Solo usuarios autenticados pueden insertar"
  ON public.mi_tabla FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Política: El usuario solo puede editar sus propios datos
CREATE POLICY "Los usuarios editan sus propios datos"
  ON public.mi_tabla FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## ❓ Preguntas Frecuentes

### P1: ¿Qué pasa si ejecuto el script varias veces?

**R:** No hay problema. El script es "idempotente", lo que significa que puedes ejecutarlo múltiples veces sin causar errores. Solo crea las cosas que no existen.

### P2: ¿Perderé datos al ejecutar este script?

**R:** No. Este script **solo crea** cosas nuevas, nunca borra ni modifica datos existentes.

### P3: ¿Qué hago si veo un error al ejecutar el script?

**R:** Copia el mensaje de error completo y:
1. Verifica que copiaste TODO el script (desde el primer comentario hasta el final)
2. Revisa que tu usuario de Supabase tenga permisos de administrador en el proyecto
3. Si el error menciona "permission denied", contacta al administrador del proyecto

### P4: ¿Cómo asigno el rol de admin a otro usuario?

**R:** Usa este código (reemplaza el email):

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'email-del-usuario@ejemplo.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

### P5: ¿Puedo tener múltiples administradores?

**R:** Sí, puedes asignar el rol de admin a tantos usuarios como necesites usando el código de la P4.

### P6: ¿Qué otros roles existen además de 'admin'?

**R:** Por defecto hay tres roles:
- `admin` - Administrador (acceso completo)
- `client` - Cliente (acceso limitado)
- `moderator` - Moderador (acceso intermedio)

### P7: ¿Cómo quito el rol de admin a un usuario?

**R:** Usa este código:

```sql
DELETE FROM public.user_roles
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'email-del-usuario@ejemplo.com'
)
AND role = 'admin';
```

### P8: ¿Funciona esto en producción?

**R:** Sí, este script funciona tanto en desarrollo como en producción. Solo asegúrate de hacer una copia de seguridad antes de ejecutar en producción.

### P9: ¿Cuánto tiempo debo esperar después de ejecutar el script?

**R:** Espera al menos 10 segundos para que el caché de PostgREST se actualice. Si después de 30 segundos no funciona, prueba cerrar sesión y volver a iniciar sesión en tu aplicación.

### P10: ¿Necesito ejecutar este script en cada ambiente (desarrollo, producción)?

**R:** Sí. Cada ambiente tiene su propia base de datos, por lo que necesitas ejecutar el script en cada uno donde tengas el problema.

---

## 📚 Recursos Adicionales

### Documentación oficial de Supabase
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [SQL Functions](https://supabase.com/docs/guides/database/functions)
- [Managing User Roles](https://supabase.com/docs/guides/auth/managing-user-data)

### Capturas de pantalla de referencia

#### Error original:
```
ERROR: function public.has_role(uuid, text) does not exist
HINT: No function matches the given name and argument types
```

#### Éxito después de la solución:
```
NOTICE: ✅ Tipo app_role creado exitosamente
NOTICE: ✅✅✅ ¡TODO CORRECTO! La función has_role y la tabla user_roles están configuradas.
```

---

## 🎯 Resumen Rápido (TL;DR)

1. **Problema**: La función `has_role` no existe en tu base de datos de Supabase
2. **Causa**: La migración inicial que crea esta función no se ejecutó
3. **Solución**: 
   - Abre Supabase Dashboard → SQL Editor
   - Copia y ejecuta el "Script de Solución Completo"
   - Asigna rol de admin a tu usuario
   - Espera 10 segundos y recarga tu aplicación
4. **Verificación**: Ejecuta el script de verificación para confirmar que todo funciona

---

## 💡 Consejos Finales

1. ✅ **Guarda esta guía** - Puede ser útil en el futuro
2. ✅ **Haz copias de seguridad** - Siempre antes de ejecutar scripts en producción
3. ✅ **Prueba en desarrollo primero** - Si tienes un ambiente de desarrollo
4. ✅ **Documenta cambios** - Anota qué hiciste y cuándo
5. ✅ **No tengas miedo** - Este script es seguro y no borra datos

---

**¿Necesitas más ayuda?** Revisa los archivos de documentación relacionados:
- `SOLUCION_DEFINITIVA_ROLES.md` - Guía completa del sistema de roles
- `GUIA_VISUAL_PASO_A_PASO_SUPABASE.md` - Guía visual para trabajar con Supabase
- `supabase/migrations/20251110191419_remix_migration_from_pg_dump.sql` - Migración original

---

**Fecha de creación**: 2024-11-24  
**Última actualización**: 2024-11-24  
**Versión**: 1.0
