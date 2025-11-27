# 🎴 Tarjeta de Referencia Rápida - Error has_role

> **Guía ultra-rápida** para solucionar el error de función has_role  
> **Tiempo**: 5 minutos  
> **Nivel**: Principiante ⭐

---

## 🚨 ¿Ves este error?

```
ERROR: function public.has_role(uuid, text) does not exist
```

---

## 🔧 Solución en 3 Pasos

### 1️⃣ Abre Supabase SQL Editor

```
🌐 https://supabase.com/dashboard
   ↓
📝 SQL Editor (menú izquierdo)
```

### 2️⃣ Ejecuta el script de solución

Opción A - **Usar el archivo de migración**:
```
📁 Archivo: supabase/migrations/20251124171853_fix_has_role_function.sql
```

Opción B - **Código rápido** (copia y pega):

```sql
-- SOLUCIÓN RÁPIDA: Crear función has_role

-- 1. Crear tabla user_roles si no existe
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 3. Crear función has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text) 
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Habilitar seguridad
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Política para que usuarios vean sus roles
CREATE POLICY "Los usuarios pueden ver sus propios roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- 6. Verificar
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') 
    THEN '✅ has_role instalada correctamente'
    ELSE '❌ Error en la instalación'
  END as "Estado";
```

### 3️⃣ Asigna rol de admin a tu usuario

**Reemplaza `tu-email@ejemplo.com` con tu email real:**

> ⚠️ **NOTA DE SEGURIDAD**: Este ejemplo usa concatenación directa de email solo para simplicidad en el SQL Editor de Supabase. En código de aplicación, SIEMPRE usa parámetros preparados para prevenir SQL injection.

```sql
-- Asignar rol de administrador
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'tu-email@ejemplo.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verificar
SELECT 
  u.email, 
  ur.role,
  '✅ Admin asignado' as "Estado"
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.role = 'admin';
```

---

## ✅ Verificación Rápida

**Ejecuta esto para verificar que todo funciona:**

```sql
-- Script de verificación de 1 minuto
SELECT 
  '1. Función has_role' as "Componente",
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'has_role') 
    THEN '✅ OK' 
    ELSE '❌ Falta' 
  END as "Estado"

UNION ALL

SELECT 
  '2. Tabla user_roles',
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_roles') 
    THEN '✅ OK' 
    ELSE '❌ Falta' 
  END

UNION ALL

SELECT 
  '3. Usuarios admin',
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') 
    THEN '✅ OK - ' || COUNT(*)::text || ' admin(s)'
    ELSE '❌ Sin admins' 
  END
FROM public.user_roles
WHERE role = 'admin';
```

**Resultado esperado:**
```
Componente              | Estado
------------------------|------------------
1. Función has_role    | ✅ OK
2. Tabla user_roles    | ✅ OK
3. Usuarios admin      | ✅ OK - 1 admin(s)
```

---

## 🆘 Si algo sale mal

### Error: "permission denied"
➡️ Verifica que tienes permisos de admin en el proyecto Supabase

### Error: "relation auth.users does not exist"
➡️ Espera unos segundos y vuelve a intentar (el schema puede estar cargando)

### Error persiste después de ejecutar el script
➡️ Ejecuta el diagnóstico completo:
```
📁 scripts/diagnostico_has_role.sql
```

### Necesitas más ayuda
➡️ Consulta la guía completa:
```
📁 GUIA_SOLUCION_ERROR_HAS_ROLE.md
```

---

## 📋 Comandos Útiles

### Ver todos los roles asignados
```sql
SELECT u.email, ur.role, ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
ORDER BY ur.created_at DESC;
```

### Asignar rol a otro usuario
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'  -- o 'client' o 'moderator'
FROM auth.users
WHERE email = 'otro-usuario@ejemplo.com'
ON CONFLICT DO NOTHING;
```

### Quitar rol de un usuario
```sql
DELETE FROM public.user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'usuario@ejemplo.com')
  AND role = 'admin';
```

### Ver usuarios sin roles
```sql
SELECT u.email, u.created_at
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.id IS NULL;
```

---

## 🎯 Checklist Rápido

- [ ] ✅ Abrí Supabase SQL Editor
- [ ] ✅ Ejecuté el script de solución completo
- [ ] ✅ Vi mensajes de confirmación (✅)
- [ ] ✅ Asigné rol de admin a mi usuario
- [ ] ✅ Ejecuté el script de verificación
- [ ] ✅ Todos los componentes muestran "✅ OK"
- [ ] ✅ Esperé 10 segundos
- [ ] ✅ Recargué mi aplicación (F5)
- [ ] ✅ Probé crear una política de seguridad

---

## 💡 Consejo Pro

**Guarda esta tarjeta** - Te será útil si:
- Creas un nuevo ambiente (dev/staging/prod)
- Restauras un backup de base de datos
- Reinicias la base de datos desde cero

---

## 🔗 Enlaces Relacionados

| Documento | Para qué sirve |
|-----------|----------------|
| `GUIA_SOLUCION_ERROR_HAS_ROLE.md` | Guía completa y detallada |
| `supabase/migrations/20251124171853_fix_has_role_function.sql` | Script de migración automático |
| `scripts/diagnostico_has_role.sql` | Diagnóstico profundo del sistema |
| `SOLUCION_DEFINITIVA_ROLES.md` | Contexto del sistema de roles |

---

## 📞 Soporte

**¿Tienes preguntas?**

1. Revisa las **Preguntas Frecuentes** en `GUIA_SOLUCION_ERROR_HAS_ROLE.md`
2. Ejecuta el **diagnóstico** con `scripts/diagnostico_has_role.sql`
3. Consulta la documentación oficial de [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)

---

**Creado**: 2024-11-24  
**Versión**: 1.0  
**Mantenido por**: Equipo Thuis3D
