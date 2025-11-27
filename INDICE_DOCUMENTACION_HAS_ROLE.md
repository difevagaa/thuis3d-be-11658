# 📚 Índice de Documentación - Error has_role

> **Centro de recursos** para solucionar el error de función has_role  
> Elige la guía que mejor se adapte a tu estilo de aprendizaje

---

## 🎯 ¿Qué guía debo usar?

```
┌─────────────────────────────────────────────────────────────┐
│  Elige tu guía según tu necesidad:                          │
└─────────────────────────────────────────────────────────────┘

¿Tienes solo 5 minutos?
  → 📄 TARJETA_REFERENCIA_HAS_ROLE.md
    Solución ultra-rápida, solo lo esencial

¿Prefieres explicaciones detalladas?
  → 📘 GUIA_SOLUCION_ERROR_HAS_ROLE.md
    Guía completa con explicaciones paso a paso

¿Aprendes mejor con diagramas?
  → 🎨 GUIA_VISUAL_ERROR_HAS_ROLE.md
    Guía visual con diagramas y flujos

¿Necesitas diagnosticar el problema?
  → 🔍 scripts/diagnostico_has_role.sql
    Script de diagnóstico completo

¿Quieres aplicar la solución automáticamente?
  → 💾 supabase/migrations/20251124171853_fix_has_role_function.sql
    Migración idempotente lista para usar
```

---

## 📖 Catálogo de Recursos

### 1. 🎴 Tarjeta de Referencia Rápida

**Archivo**: `TARJETA_REFERENCIA_HAS_ROLE.md`

**Ideal para**:
- ✅ Usuarios con experiencia en Supabase
- ✅ Solución rápida (5 minutos)
- ✅ Recordatorio de pasos ya conocidos

**Contenido**:
- Solución en 3 pasos
- Código listo para copiar y pegar
- Verificación rápida
- Comandos útiles
- Checklist de verificación

**Empieza aquí si**: Ya conoces Supabase y solo necesitas el código.

---

### 2. 📘 Guía Completa de Solución

**Archivo**: `GUIA_SOLUCION_ERROR_HAS_ROLE.md`

**Ideal para**:
- ✅ Principiantes sin experiencia técnica
- ✅ Usuarios que quieren entender el problema
- ✅ Solución paso a paso con explicaciones

**Contenido**:
- Explicación del error en lenguaje sencillo
- Diagnóstico del problema
- Causas comunes
- Solución detallada paso a paso
- Verificación completa
- Soluciones alternativas
- Preguntas frecuentes (FAQ)
- Enlaces a recursos adicionales

**Empieza aquí si**: Eres nuevo en Supabase o quieres entender qué está pasando.

---

### 3. 🎨 Guía Visual

**Archivo**: `GUIA_VISUAL_ERROR_HAS_ROLE.md`

**Ideal para**:
- ✅ Aprendices visuales
- ✅ Usuarios que prefieren diagramas
- ✅ Seguir flujos de trabajo ilustrados

**Contenido**:
- Diagramas del problema
- Arquitectura del sistema de roles
- Flujos de trabajo ilustrados
- Capturas de pantalla simuladas
- Diagramas de estados
- Ejemplos prácticos visuales
- Tests visuales

**Empieza aquí si**: Prefieres ver diagramas y flujos en lugar de texto.

---

### 4. 🔍 Script de Diagnóstico

**Archivo**: `scripts/diagnostico_has_role.sql`

**Ideal para**:
- ✅ Identificar exactamente qué está mal
- ✅ Verificar el estado actual del sistema
- ✅ Depurar problemas

**Qué hace**:
- Verifica si la función `has_role` existe
- Verifica si la tabla `user_roles` existe
- Comprueba el tipo ENUM `app_role`
- Lista políticas RLS configuradas
- Muestra roles asignados
- Identifica usuarios sin roles
- Prueba la función `has_role`
- Genera reporte completo

**Úsalo cuando**: Necesites saber exactamente qué componentes faltan.

---

### 5. 💾 Migración de Corrección

**Archivo**: `supabase/migrations/20251124171853_fix_has_role_function.sql`

**Ideal para**:
- ✅ Aplicación automática de la solución
- ✅ Proyectos con sistema de migraciones
- ✅ Ejecución manual en SQL Editor

**Qué hace**:
- Crea el tipo ENUM `app_role` si no existe
- Crea la tabla `user_roles` si no existe
- Crea índices para optimización
- Crea o reemplaza la función `has_role`
- Habilita Row Level Security
- Configura políticas RLS básicas
- Verifica la instalación

**Características**:
- ✅ Idempotente (se puede ejecutar múltiples veces)
- ✅ No destructivo (no borra datos)
- ✅ Comentado y documentado
- ✅ Con verificación automática

**Úsalo cuando**: Quieras aplicar la solución de forma automatizada.

---

## 🚀 Flujo de Trabajo Recomendado

### Para Principiantes

```
1. Lee primero: GUIA_SOLUCION_ERROR_HAS_ROLE.md
   ↓ Entender el problema
   
2. Ejecuta: scripts/diagnostico_has_role.sql
   ↓ Ver qué falta exactamente
   
3. Aplica: supabase/migrations/20251124171853_fix_has_role_function.sql
   ↓ Solucionar el problema
   
4. Verifica: Sección de verificación en GUIA_SOLUCION_ERROR_HAS_ROLE.md
   ↓ Confirmar que funciona
   
5. Guarda: TARJETA_REFERENCIA_HAS_ROLE.md
   ↓ Para referencia futura
```

### Para Usuarios Experimentados

```
1. Revisa: TARJETA_REFERENCIA_HAS_ROLE.md
   ↓ Ver pasos rápidos
   
2. Ejecuta (opcional): scripts/diagnostico_has_role.sql
   ↓ Diagnóstico rápido
   
3. Aplica: Código de TARJETA_REFERENCIA_HAS_ROLE.md
   ↓ Solución rápida
   
4. Verifica: Script de verificación rápida
   ↓ Confirmar que funciona
```

### Para Aprendices Visuales

```
1. Lee: GUIA_VISUAL_ERROR_HAS_ROLE.md
   ↓ Ver diagramas y flujos
   
2. Ejecuta: scripts/diagnostico_has_role.sql
   ↓ Ver estado actual
   
3. Sigue: Flujo de trabajo visual en GUIA_VISUAL_ERROR_HAS_ROLE.md
   ↓ Paso a paso con diagramas
   
4. Aplica: supabase/migrations/20251124171853_fix_has_role_function.sql
   ↓ Solucionar siguiendo el flujo
```

---

## 📊 Comparativa de Guías

| Característica | Tarjeta | Guía Completa | Guía Visual | Diagnóstico | Migración |
|----------------|---------|---------------|-------------|-------------|-----------|
| **Tiempo lectura** | 5 min | 15-20 min | 10-15 min | 2 min | 5 min |
| **Nivel** | Intermedio | Principiante | Principiante | Todos | Todos |
| **Explicaciones** | Mínimas | Detalladas | Visuales | Técnicas | Comentadas |
| **Diagramas** | No | Pocos | Muchos | No | No |
| **Ejecutable** | Parcial | Parcial | Parcial | Sí | Sí |
| **FAQ** | No | Sí | No | No | No |
| **Alternativas** | Sí | Sí | Sí | No | No |

---

## 🎯 Casos de Uso

### Caso 1: Error al crear política RLS

**Síntoma**: 
```
ERROR: function public.has_role(uuid, text) does not exist
```

**Solución**:
1. Lee: `GUIA_SOLUCION_ERROR_HAS_ROLE.md` (sección "¿Qué es este error?")
2. Ejecuta: `supabase/migrations/20251124171853_fix_has_role_function.sql`
3. Verifica con: Script de verificación en la guía

---

### Caso 2: No sé qué está mal

**Síntoma**: 
Algo no funciona pero no estoy seguro qué es

**Solución**:
1. Ejecuta: `scripts/diagnostico_has_role.sql`
2. Lee el reporte generado
3. Sigue las recomendaciones del diagnóstico
4. Consulta la guía correspondiente según el problema detectado

---

### Caso 3: Migración inicial de proyecto

**Síntoma**: 
Proyecto nuevo, configurando desde cero

**Solución**:
1. Lee: `GUIA_SOLUCION_ERROR_HAS_ROLE.md` para entender el sistema
2. Ejecuta: `supabase/migrations/20251124171853_fix_has_role_function.sql`
3. Asigna admin usando el script de la guía
4. Guarda: `TARJETA_REFERENCIA_HAS_ROLE.md` para referencia

---

### Caso 4: Sistema de roles ya existe

**Síntoma**: 
Tengo `user_roles` pero no `has_role`

**Solución**:
1. Ejecuta: `scripts/diagnostico_has_role.sql` para confirmar
2. Usa solo la sección de creación de función de la migración
3. Verifica que no afecta tus datos existentes

---

### Caso 5: Múltiples ambientes

**Síntoma**: 
Necesito aplicar en dev, staging y prod

**Solución**:
1. Prueba primero en dev con: `supabase/migrations/20251124171853_fix_has_role_function.sql`
2. Verifica con: `scripts/diagnostico_has_role.sql`
3. Replica en staging
4. Finalmente en producción
5. Usa `TARJETA_REFERENCIA_HAS_ROLE.md` para recordar pasos en cada ambiente

---

## 🔗 Enlaces Externos Útiles

### Documentación Oficial de Supabase

- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Functions](https://supabase.com/docs/guides/database/functions)
- [User Management](https://supabase.com/docs/guides/auth/managing-user-data)
- [SQL Editor Guide](https://supabase.com/docs/guides/database/overview#the-sql-editor)

### Recursos PostgreSQL

- [CREATE FUNCTION](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html)
- [Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

## 📝 Notas Importantes

### ⚠️ Antes de Empezar

1. **Haz backup**: Siempre respalda tu base de datos antes de ejecutar scripts
2. **Lee primero**: Revisa al menos la tarjeta de referencia antes de ejecutar
3. **Prueba en dev**: Si es posible, prueba en desarrollo antes de producción

### ✅ Después de Aplicar

1. **Espera 10 segundos**: Para que el schema cache se actualice
2. **Recarga la app**: Presiona F5 en tu navegador
3. **Verifica**: Ejecuta el script de verificación
4. **Documenta**: Anota qué hiciste y cuándo

### 🔒 Seguridad

- ✅ Los scripts son seguros y no destructivos
- ✅ No exponen credenciales ni datos sensibles
- ✅ Las políticas RLS están correctamente configuradas
- ✅ Solo los admins pueden gestionar roles

---

## 🆘 Problemas Comunes

### "No tengo permisos para ejecutar"

**Solución**: Verifica que eres admin del proyecto en Supabase Dashboard

### "El script no hace nada"

**Solución**: Es probable que los componentes ya existan (idempotencia)

### "Veo errores después de ejecutar"

**Solución**: 
1. Copia el error completo
2. Ejecuta el script de diagnóstico
3. Consulta la sección FAQ de la guía completa

### "No aparece ningún admin"

**Solución**: Ejecuta el script de asignación de admin en la guía

---

## 🎓 Glosario

- **has_role**: Función que verifica si un usuario tiene un rol específico
- **RLS**: Row Level Security - Seguridad a nivel de fila
- **Política**: Regla que controla quién puede acceder a qué datos
- **Migración**: Script que modifica la estructura de la base de datos
- **Idempotente**: Se puede ejecutar múltiples veces sin causar errores
- **UUID**: Identificador único universal
- **ENUM**: Tipo de dato con valores predefinidos

---

## 📅 Historial de Cambios

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2024-11-24 | Versión inicial con todas las guías |

---

## 🤝 Contribuciones

Si encuentras errores o tienes sugerencias:
1. Revisa primero las guías existentes
2. Ejecuta el diagnóstico para confirmar el problema
3. Documenta el problema específico
4. Sugiere mejoras a la documentación

---

## 📞 Soporte

**Orden de consulta recomendado**:

1. ✅ Tarjeta de referencia rápida
2. ✅ Script de diagnóstico
3. ✅ Guía completa (sección FAQ)
4. ✅ Guía visual (para entender el flujo)
5. ✅ Documentación oficial de Supabase

---

**Mantenido por**: Equipo Thuis3D  
**Última actualización**: 2024-11-24  
**Versión del índice**: 1.0
