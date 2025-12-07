# 🔧 Guía Rápida de Solución de Problemas

## Problema: "Supabase aparece vacío"

### Paso 1: Ejecutar el Diagnóstico Automático

```bash
node scripts/diagnose-supabase.cjs
```

Este script te dirá exactamente qué está fallando y cómo solucionarlo.

---

## Soluciones Más Comunes

### Solución 1: Políticas RLS Demasiado Restrictivas (MÁS PROBABLE)

**Síntoma:** Las tablas existen pero no puedes verlas en el dashboard de Supabase.

**Cómo solucionarlo:**

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard/project/ljygreayxxpsdmncwzia

2. Ve a **Authentication → Policies**

3. Busca la tabla `products` y crea esta política:

```sql
-- En el SQL Editor de Supabase
CREATE POLICY "Public products are viewable by everyone"
ON products FOR SELECT
USING (
  -- Si el producto NO tiene roles, es público
  NOT EXISTS (
    SELECT 1 FROM product_roles 
    WHERE product_roles.product_id = products.id
  )
);

CREATE POLICY "Products with roles viewable by authenticated users"
ON products FOR SELECT
TO authenticated
USING (
  -- El usuario debe tener uno de los roles del producto
  EXISTS (
    SELECT 1 FROM user_roles
    INNER JOIN product_roles ON product_roles.role = user_roles.role
    WHERE product_roles.product_id = products.id
      AND user_roles.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can do everything with products"
ON products
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'administrator')
  )
);
```

4. Repite para otras tablas importantes:
   - `product_images`
   - `product_roles` 
   - `categories`
   - `orders`

---

### Solución 2: Migraciones No Aplicadas

**Síntoma:** Errores 404 o "tabla no existe".

**Cómo solucionarlo:**

1. Ve a **SQL Editor** en Supabase

2. Ejecuta esta consulta para ver qué tablas existen:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

3. Si no ves las tablas, necesitas ejecutar las migraciones:

**Opción A - Desde el código (si tienes Supabase CLI):**
```bash
npx supabase db push
```

**Opción B - Manualmente:**
- Abre cada archivo en `supabase/migrations/`
- Copia el SQL y ejecuta en SQL Editor de Supabase
- Empieza con: `20251110191419_remix_migration_from_pg_dump.sql`

---

### Solución 3: Base de Datos Vacía (Datos en Lovable)

**Síntoma:** Las tablas existen pero no tienen datos (COUNT = 0).

**Cómo verificar:**

```sql
-- En SQL Editor de Supabase
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM page_builder_pages;
```

**Si todo es 0, tienes dos opciones:**

#### Opción A: Poblar desde el Admin Panel
1. Ve a tu sitio web
2. Login como admin
3. Ve a Admin → Productos
4. Crea productos manualmente

#### Opción B: Migrar desde Lovable (RECOMENDADO)
1. En Lovable, exporta tus datos
2. En Supabase SQL Editor, inserta los datos
3. Usa el admin panel para verificar

---

## Verificación Rápida Manual

### Paso 1: Verifica que las tablas existen

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('products', 'orders', 'users')
ORDER BY table_name;
```

**Resultado esperado:** Deberías ver al menos estas tablas.

---

### Paso 2: Verifica que hay datos

```sql
-- Contar productos
SELECT COUNT(*) as total_products FROM products;

-- Ver algunos productos
SELECT id, name, price FROM products LIMIT 5;

-- Verificar relaciones
SELECT 
  p.id,
  p.name,
  COUNT(pr.id) as roles_count,
  COUNT(pi.id) as images_count
FROM products p
LEFT JOIN product_roles pr ON pr.product_id = p.id
LEFT JOIN product_images pi ON pi.product_id = p.id
GROUP BY p.id, p.name
LIMIT 5;
```

---

### Paso 3: Verifica políticas RLS

```sql
-- Ver políticas activas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('products', 'product_roles')
ORDER BY tablename, policyname;
```

---

## 🚨 Problemas Críticos Corregidos en Este PR

### 1. ✅ CORREGIDO: Filtro de productos por rol

**Antes (BUGGY):**
```typescript
// ❌ Usuarios no logueados NO veían productos con roles
if (!user || userRoles.length === 0) return false;
```

**Después (CORRECTO):**
```typescript
// ✅ Lógica correcta:
// - Productos SIN roles = públicos (todos los ven)
// - Productos CON roles = solo usuarios con esos roles
if (productRolesNormalized.length === 0) return true; // Público
if (!user || userRoles.length === 0) return false;    // Requiere login
return userRoles.some(r => productRolesNormalized.includes(r)); // Verificar rol
```

**Archivo:** `src/components/page-builder/SectionRenderer.tsx`

---

### 2. ✅ NUEVO: Hook de Autenticación Centralizado

**Problema:** Múltiples componentes consultaban la autenticación de forma independiente.

**Solución:** Creado `src/hooks/useAuth.ts`

**Uso:**
```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, isAdmin, userRoles, loading } = useAuth();
  
  if (loading) return <Spinner />;
  if (!isAuthenticated) return <Login />;
  
  return <div>Bienvenido {user.email}</div>;
}
```

**Beneficios:**
- ✅ Una sola fuente de verdad para autenticación
- ✅ Caché automático de sesión
- ✅ Suscripción a cambios de autenticación
- ✅ Menor número de llamadas a API
- ✅ Código más limpio y mantenible

---

## 📊 Resumen de Cambios

| Archivo | Cambios | Impacto |
|---------|---------|---------|
| `SectionRenderer.tsx` | ✅ Corregida lógica de filtrado | 🔴 CRÍTICO - Ahora funciona correctamente |
| `useAuth.ts` | ✅ Hook nuevo creado | 🟠 ALTO - Mejor arquitectura |
| `diagnose-supabase.cjs` | ✅ Script de diagnóstico | 🟢 UTILIDAD - Ayuda a debug |
| `COMPREHENSIVE_AUDIT_2025.md` | ✅ Auditoría completa | 📝 DOCUMENTACIÓN |

---

## 🎯 Próximos Pasos Recomendados

1. **Ejecutar el diagnóstico:**
   ```bash
   node scripts/diagnose-supabase.cjs
   ```

2. **Seguir las recomendaciones del diagnóstico**

3. **Configurar políticas RLS en Supabase** (ver Solución 1 arriba)

4. **Verificar que los productos se filtran correctamente:**
   - Login como usuario sin roles → solo debe ver productos públicos
   - Login como admin → debe ver todos los productos
   - Sin login → solo debe ver productos públicos

5. **Poblar la base de datos** si está vacía

---

## 📞 Soporte

Si después de seguir esta guía aún tienes problemas:

1. Ejecuta `node scripts/diagnose-supabase.cjs`
2. Copia el output completo
3. Toma screenshots del Supabase Dashboard:
   - Table Editor (¿se ven tablas?)
   - SQL Editor (resultado de SELECT * FROM products LIMIT 5)
   - Authentication → Policies (¿qué políticas hay?)
4. Comparte esta información para análisis más profundo

---

**Última actualización:** 2025-12-07  
**Versión:** 1.0
