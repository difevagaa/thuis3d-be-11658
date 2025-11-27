# Sistema de Cupones de Lealtad Completo

## Cambios Implementados

### 1. Base de Datos
- ✅ Agregados campos a tabla `coupons`:
  - `points_required`: Puntos necesarios para canjear
  - `product_id`: Producto específico al que aplica
  - `is_loyalty_reward`: Marca si es recompensa de lealtad
- ✅ Trigger para inicializar puntos automáticamente en nuevos usuarios
- ✅ Inicializados puntos para usuarios existentes

### 2. Selector de Usuarios Corregido
**Problema**: No aparecían usuarios en la lista
**Solución**: Componente `UserSearchSelector` ahora:
- Carga usuarios con y sin puntos
- Maneja casos donde no hay registros en loyalty_points
- Muestra toast de error cuando falla
- Funciona en todas las páginas admin

### 3. Admin - Gestión de Cupones (`/admin/coupons`)
**Nuevas opciones al crear cupón:**
- Switch "Recompensa de Programa de Lealtad"
- Campo "Puntos Requeridos" (cuando es recompensa)
- Selector "Producto Específico" (opcional)
- Tabla muestra: Producto, Puntos, indicador 🎁 Lealtad

### 4. Edge Function: `redeem-loyalty-coupon`
**Funcionalidad:**
- Verifica puntos del usuario
- Genera código único para cada canje
- Crea nuevo cupón con 1 uso máximo
- Resta puntos automáticamente
- Registra en loyalty_adjustments
- Envía notificación al usuario

### 5. Panel de Usuario (`/cuenta?tab=points`)
**Tres secciones nuevas:**

1. **Cupones Disponibles para Canjear**
   - Muestra cupones con puntos requeridos
   - Indica producto específico si aplica
   - Botón "Canjear" (bloqueado si no tiene puntos)
   - Al canjear: genera código único y resta puntos

2. **Mis Cupones**
   - Lista cupones canjeados por el usuario
   - Muestra código, descuento, condiciones
   - Botón para copiar código
   - Estado: Activo/Usado

3. **Otras Recompensas**
   - Sistema anterior de loyalty_rewards
   - Mantiene compatibilidad

## Flujo Completo

1. **Admin crea cupón de lealtad:**
   - Marca "Recompensa de Lealtad"
   - Define puntos requeridos (ej: 200)
   - Opcionalmente: asigna a producto específico
   - Configura descuento (%, fijo, envío gratis)

2. **Usuario acumula puntos:**
   - Por compras pagadas (automático via triggers)
   - Por ajustes manuales del admin

3. **Usuario canjea cupón:**
   - Ve cupones disponibles en su panel
   - Click en "Canjear" si tiene puntos suficientes
   - Sistema genera código único (ej: DESCUENTO-X7H9K2)
   - Puntos se restan automáticamente
   - Recibe notificación

4. **Usuario usa cupón:**
   - Copia código desde "Mis Cupones"
   - Lo aplica en checkout
   - Válido según configuración (producto, monto mínimo, etc.)

## Archivos Modificados

- `supabase/migrations/[timestamp]_loyalty_coupons.sql`
- `src/components/admin/UserSearchSelector.tsx`
- `src/pages/admin/Coupons.tsx`
- `src/pages/user/MyAccount.tsx`
- `supabase/functions/redeem-loyalty-coupon/index.ts`

## Pruebas Recomendadas

1. Crear usuario y verificar puntos inicializados
2. Crear cupón de lealtad con puntos requeridos
3. Ajustar puntos manualmente a un usuario
4. Canjear cupón desde panel de usuario
5. Verificar código generado en "Mis Cupones"
6. Usar cupón en checkout
7. Crear cupón con producto específico y validar restricción
