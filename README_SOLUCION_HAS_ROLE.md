# 🔧 Solución Completa: Error "function public.has_role does not exist"

> **Documentación completa** para solucionar el error de función has_role en Supabase  
> **Fecha**: 2024-11-24  
> **Estado**: ✅ Solución probada y documentada

---

## 🚨 ¿Tienes este error?

```
ERROR: function public.has_role(uuid, text) does not exist
HINT: No function matches the given name and argument types
```

**¡No te preocupes!** Esta documentación te guiará paso a paso para solucionarlo.

---

## ⚡ Inicio Rápido (5 minutos)

Si tienes prisa, sigue estos 3 pasos:

### 1️⃣ Abre Supabase SQL Editor
```
https://supabase.com/dashboard → Tu Proyecto → SQL Editor
```

### 2️⃣ Ejecuta este código
```sql
-- Crear tabla user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Crear función has_role
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

-- Verificar
SELECT 'has_role instalada correctamente' as estado;
```

### 3️⃣ Asigna tu rol de admin
```sql
-- IMPORTANTE: Reemplaza 'tu-email@ejemplo.com' con tu email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'tu-email@ejemplo.com'
ON CONFLICT (user_id, role) DO NOTHING;
```

**¡Listo!** Espera 10 segundos, recarga tu aplicación (F5) y prueba de nuevo.

---

## 📚 Documentación Completa

Tenemos **5 recursos** diferentes según tu necesidad:

### 🎴 Para solución rápida (5 min)
→ **[TARJETA_REFERENCIA_HAS_ROLE.md](./TARJETA_REFERENCIA_HAS_ROLE.md)**
- Código listo para copiar y pegar
- Verificación rápida
- Comandos útiles

### 📘 Para entender el problema (15 min)
→ **[GUIA_SOLUCION_ERROR_HAS_ROLE.md](./GUIA_SOLUCION_ERROR_HAS_ROLE.md)**
- Explicación detallada del error
- Solución paso a paso
- Preguntas frecuentes (FAQ)
- Soluciones alternativas

### 🎨 Para aprender visualmente (10 min)
→ **[GUIA_VISUAL_ERROR_HAS_ROLE.md](./GUIA_VISUAL_ERROR_HAS_ROLE.md)**
- Diagramas ilustrados
- Flujos de trabajo visuales
- Capturas de pantalla simuladas

### 🔍 Para diagnosticar (2 min)
→ **[scripts/diagnostico_has_role.sql](./scripts/diagnostico_has_role.sql)**
- Script de diagnóstico automático
- Identifica qué falta exactamente
- Genera reporte completo

### 💾 Para aplicar automáticamente
→ **[supabase/migrations/20251124171853_fix_has_role_function.sql](./supabase/migrations/20251124171853_fix_has_role_function.sql)**
- Migración idempotente completa
- Crea todos los componentes necesarios
- Incluye verificación automática

### 📖 Índice completo
→ **[INDICE_DOCUMENTACION_HAS_ROLE.md](./INDICE_DOCUMENTACION_HAS_ROLE.md)**
- Descripción de todos los recursos
- Casos de uso
- Flujos de trabajo recomendados

---

## 🎯 ¿Qué guía usar?

```
┌─────────────────────────────────────────────────────┐
│  Elige según tu situación:                          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ⏱️  Tengo 5 minutos                                │
│  → TARJETA_REFERENCIA_HAS_ROLE.md                   │
│                                                      │
│  🎓 Soy principiante                                │
│  → GUIA_SOLUCION_ERROR_HAS_ROLE.md                  │
│                                                      │
│  👁️  Prefiero diagramas                             │
│  → GUIA_VISUAL_ERROR_HAS_ROLE.md                    │
│                                                      │
│  🔍 No sé qué está mal                              │
│  → scripts/diagnostico_has_role.sql                 │
│                                                      │
│  🚀 Quiero automatizar                              │
│  → supabase/migrations/...fix_has_role_function.sql │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 ¿Qué causa este error?

El error ocurre cuando intentas crear una política de seguridad (RLS Policy) que usa la función `has_role`, pero esta función no existe en tu base de datos.

### Causas comunes:

1. ✗ La migración inicial no se ejecutó
2. ✗ La base de datos se recreó desde cero
3. ✗ Las migraciones no se aplicaron en orden
4. ✗ La función se eliminó accidentalmente

### La solución:

✅ Crear la función `has_role` y la tabla `user_roles` que necesita

---

## 📋 Checklist de Verificación

Antes de empezar, verifica:

- [ ] Tienes acceso al Dashboard de Supabase
- [ ] Tienes permisos de administrador en el proyecto
- [ ] Sabes tu email de usuario de la aplicación
- [ ] (Opcional) Hiciste backup de la base de datos

Después de aplicar la solución:

- [ ] Ejecutaste el script completo
- [ ] Viste mensajes de confirmación (✅)
- [ ] Asignaste rol de admin a tu usuario
- [ ] Ejecutaste el script de verificación
- [ ] Esperaste 10 segundos
- [ ] Recargaste la aplicación
- [ ] Probaste crear una política RLS

---

## 🎯 Resultado Esperado

Después de aplicar la solución, podrás:

✅ Crear políticas RLS usando `has_role()`  
✅ Restringir acceso solo a administradores  
✅ Gestionar roles de usuarios  
✅ Implementar seguridad granular

**Ejemplo de política que funcionará**:

```sql
CREATE POLICY "Solo admins pueden editar"
  ON public.mi_tabla FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));
```

---

## 🏗️ Arquitectura de la Solución

```
┌──────────────────────────────────────────────┐
│  auth.users                                   │  ← Usuarios de Supabase
│  ────────────────────────────────────────    │
│  • id                                         │
│  • email                                      │
└──────────────┬───────────────────────────────┘
               │
               │ 1:N (Un usuario puede tener múltiples roles)
               ↓
┌──────────────────────────────────────────────┐
│  public.user_roles                            │  ← Tabla de roles
│  ────────────────────────────────────────    │
│  • user_id → auth.users.id                   │
│  • role (admin / client / moderator)         │
└──────────────┬───────────────────────────────┘
               │
               │ Usada por ↓
               ↓
┌──────────────────────────────────────────────┐
│  public.has_role(user_id, role)               │  ← Función helper
│  ────────────────────────────────────────    │
│  Verifica si usuario tiene un rol             │
│  Retorna: true / false                        │
└──────────────┬───────────────────────────────┘
               │
               │ Usada en ↓
               ↓
┌──────────────────────────────────────────────┐
│  RLS Policies                                 │  ← Políticas de seguridad
│  ────────────────────────────────────────    │
│  • Solo admins pueden INSERT/UPDATE/DELETE   │
│  • Todos pueden SELECT                        │
└──────────────────────────────────────────────┘
```

---

## 🔐 Seguridad

### ✅ Esta solución es segura porque:

1. **Usa Row Level Security (RLS)** - Control de acceso a nivel de fila
2. **SECURITY DEFINER** - La función se ejecuta con permisos del creador
3. **No expone datos sensibles** - Solo verifica roles
4. **Idempotente** - Se puede ejecutar múltiples veces sin riesgo
5. **No destructiva** - No borra ni modifica datos existentes

### 🔒 Mejores prácticas:

- ✅ Asigna rol admin solo a usuarios de confianza
- ✅ Revisa periódicamente los roles asignados
- ✅ Usa la función `has_role` en todas las políticas sensibles
- ✅ Mantén las migraciones versionadas

---

## ❓ Preguntas Frecuentes

### P: ¿Puedo ejecutar la solución varias veces?
**R**: Sí, todos los scripts son idempotentes (seguros para ejecutar múltiples veces).

### P: ¿Perderé datos?
**R**: No, los scripts solo crean componentes nuevos, nunca eliminan datos.

### P: ¿Funciona en producción?
**R**: Sí, pero te recomendamos probar primero en desarrollo y hacer backup.

### P: ¿Cuántos administradores puedo tener?
**R**: Todos los que necesites, ejecuta el script de asignación para cada uno.

### P: ¿Qué hago si el error persiste?
**R**: Ejecuta el script de diagnóstico y consulta la guía completa.

**Más preguntas**: Ver sección FAQ en `GUIA_SOLUCION_ERROR_HAS_ROLE.md`

---

## 🆘 Soporte

### Si algo sale mal:

1. **Ejecuta el diagnóstico**:
   ```
   → scripts/diagnostico_has_role.sql
   ```

2. **Consulta la guía completa**:
   ```
   → GUIA_SOLUCION_ERROR_HAS_ROLE.md
   ```

3. **Revisa casos de uso**:
   ```
   → INDICE_DOCUMENTACION_HAS_ROLE.md (sección "Casos de Uso")
   ```

4. **Documentación oficial**:
   - [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
   - [PostgreSQL Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)

---

## 📊 Estructura de Archivos

```
├── README_SOLUCION_HAS_ROLE.md                    ← Estás aquí
├── INDICE_DOCUMENTACION_HAS_ROLE.md               ← Índice de recursos
├── TARJETA_REFERENCIA_HAS_ROLE.md                 ← Solución rápida (5 min)
├── GUIA_SOLUCION_ERROR_HAS_ROLE.md                ← Guía completa (15 min)
├── GUIA_VISUAL_ERROR_HAS_ROLE.md                  ← Guía visual (10 min)
├── scripts/
│   └── diagnostico_has_role.sql                   ← Script diagnóstico
└── supabase/
    └── migrations/
        └── 20251124171853_fix_has_role_function.sql  ← Migración
```

---

## 🎓 Recursos Adicionales

### Documentación relacionada en este proyecto:

- `SOLUCION_DEFINITIVA_ROLES.md` - Sistema completo de roles
- `GUIA_VISUAL_PASO_A_PASO_SUPABASE.md` - Guía visual de Supabase
- `supabase/migrations/20251110191419_remix_migration_from_pg_dump.sql` - Migración original

### Enlaces externos útiles:

- [Documentación oficial de Supabase](https://supabase.com/docs)
- [Row Level Security en PostgreSQL](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Funciones en PostgreSQL](https://www.postgresql.org/docs/current/xfunc.html)

---

## 🚀 Siguiente Paso

1. **Elige tu guía** según la tabla de arriba
2. **Sigue los pasos** de la guía elegida
3. **Verifica** que todo funciona correctamente
4. **Guarda esta documentación** para futuras referencias

---

## 💡 Consejo Final

**Guarda este README** - Te será útil si en el futuro:
- Creas un nuevo ambiente (dev/staging/prod)
- Restauras un backup de base de datos
- Reinicias la base de datos desde cero
- Necesitas ayudar a otro desarrollador

---

**¿Listo para empezar?** → Abre la guía que elegiste y ¡manos a la obra! 🚀

---

**Creado**: 2024-11-24  
**Versión**: 1.0  
**Mantenido por**: Equipo Thuis3D  
**Licencia**: Documentación de uso interno
