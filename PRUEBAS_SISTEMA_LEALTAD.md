# 🧪 GUÍA DE PRUEBAS - Sistema de Lealtad

## 📋 Pruebas Paso a Paso

### ✅ PRUEBA 1: Pedido Pagado al Crear

**Objetivo:** Verificar que se otorguen puntos al crear un pedido ya pagado.

**Pasos:**
1. Ir a Admin → Pedidos
2. Crear un nuevo pedido manualmente
3. Establecer `payment_status = 'paid'`
4. Asignar a un usuario registrado
5. Establecer total: €100

**Resultado Esperado:**
- Usuario recibe 100 puntos inmediatamente
- Verificar en Admin → Programa de Lealtad
- `points_balance = 100`
- `lifetime_points = 100`

**SQL para verificar:**
```sql
SELECT u.email, lp.points_balance, lp.lifetime_points
FROM loyalty_points lp
JOIN profiles u ON u.id = lp.user_id
WHERE u.email = 'email-del-usuario@test.com';
```

---

### ✅ PRUEBA 2: Cambio de Pending a Paid

**Objetivo:** Verificar que se otorguen puntos al confirmar el pago.

**Pasos:**
1. Crear pedido con `payment_status = 'pending'`
2. Total: €50
3. Verificar que NO tenga puntos todavía
4. Cambiar estado a `payment_status = 'paid'`
5. Guardar cambios

**Resultado Esperado:**
- Antes del cambio: 0 puntos
- Después del cambio: +50 puntos
- Total acumulado: 150 puntos (si hizo prueba 1)

**SQL para verificar:**
```sql
-- Ver historial de pedidos
SELECT 
  order_number,
  total,
  payment_status,
  created_at
FROM orders
WHERE user_id = (SELECT id FROM profiles WHERE email = 'email@test.com')
ORDER BY created_at DESC;
```

---

### ❌ PRUEBA 3: Cancelación de Pedido Pagado

**Objetivo:** Verificar que se resten puntos al cancelar.

**Pasos:**
1. Tomar un pedido pagado existente (€50 de prueba 2)
2. Cambiar `payment_status` de `'paid'` a `'cancelled'`
3. Guardar cambios

**Resultado Esperado:**
- Puntos antes: 150
- Puntos después: 100 (se restaron 50)
- `lifetime_points` permanece en 150 (histórico no cambia)

**SQL para verificar:**
```sql
SELECT 
  points_balance as puntos_actuales,
  lifetime_points as puntos_historicos
FROM loyalty_points
WHERE user_id = (SELECT id FROM profiles WHERE email = 'email@test.com');
```

---

### 🗑️ PRUEBA 4: Eliminación de Pedido (Soft Delete)

**Objetivo:** Verificar que se resten puntos al eliminar un pedido pagado.

**Pasos:**
1. Crear nuevo pedido pagado: €25
2. Verificar que se otorguen 25 puntos (total: 125)
3. Eliminar el pedido (moverlo a papelera)
4. Verificar que se resten automáticamente

**Resultado Esperado:**
- Antes de eliminar: 125 puntos
- Después de eliminar: 100 puntos (se restaron 25)

**SQL para verificar:**
```sql
-- Ver pedidos eliminados
SELECT 
  order_number,
  total,
  payment_status,
  deleted_at
FROM orders
WHERE user_id = (SELECT id FROM profiles WHERE email = 'email@test.com')
  AND deleted_at IS NOT NULL;
```

---

### ♻️ PRUEBA 5: Restauración de Pedido Eliminado

**Objetivo:** Verificar que se devuelvan puntos al restaurar.

**Pasos:**
1. Ir a Admin → Papelera
2. Buscar el pedido eliminado en prueba 4
3. Restaurar el pedido
4. Verificar que los puntos se devuelvan

**Resultado Esperado:**
- Antes de restaurar: 100 puntos
- Después de restaurar: 125 puntos (se devolvieron 25)

---

### 💰 PRUEBA 6: Cotización → Factura → Pago

**Objetivo:** Verificar el flujo completo de cotización aprobada.

**Pasos:**
1. Crear una cotización (Cliente → Cotizar Producto)
2. Como admin, aprobar la cotización
3. Verificar que se genere factura automáticamente
4. La factura debe estar en `payment_status = 'pending'`
5. Verificar que NO haya puntos todavía
6. Cambiar factura a `payment_status = 'paid'`
7. Verificar que se otorguen puntos

**Resultado Esperado:**
- Factura pendiente: 0 puntos nuevos
- Factura pagada: +puntos según monto
- Ejemplo: Factura de €75 → +75 puntos

---

### 🛡️ PRUEBA 7: Protección contra Balance Negativo

**Objetivo:** Verificar que el balance nunca sea negativo.

**Pasos:**
1. Usuario con 50 puntos
2. Cancelar pedido de €200 (que otorgó 200 puntos)
3. Verificar que el balance quede en 0, no negativo

**Resultado Esperado:**
- Balance antes: 50 puntos
- Se intenta restar: 200 puntos
- Balance final: 0 puntos (NO -150)

**SQL para forzar escenario:**
```sql
-- Establecer balance bajo
UPDATE loyalty_points 
SET points_balance = 50 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'email@test.com');

-- Ahora cancelar un pedido grande y verificar
```

---

### 🔄 PRUEBA 8: Múltiples Pedidos Simultáneos

**Objetivo:** Verificar acumulación correcta de múltiples pedidos.

**Pasos:**
1. Crear 3 pedidos pagados:
   - Pedido A: €30 → 30 puntos
   - Pedido B: €50 → 50 puntos
   - Pedido C: €20 → 20 puntos

2. Total esperado: 100 puntos

3. Cancelar Pedido B (€50)
   - Nuevo total: 50 puntos

4. Restaurar Pedido B
   - Total final: 100 puntos

---

### 📊 PRUEBA 9: Verificar Lifetime vs Balance

**Objetivo:** Confirmar que lifetime_points es histórico.

**Escenario:**
```
1. Pedido €100 pagado → Balance: 100, Lifetime: 100
2. Pedido €50 pagado  → Balance: 150, Lifetime: 150
3. Cancelar €50       → Balance: 100, Lifetime: 150 ✓
4. Cancelar €100      → Balance: 0,   Lifetime: 150 ✓
```

**Resultado Esperado:**
- `lifetime_points` NUNCA disminuye
- `points_balance` sube y baja según estado de pagos

---

### ⚙️ PRUEBA 10: Sistema Deshabilitado

**Objetivo:** Verificar que no se otorguen puntos si está deshabilitado.

**Pasos:**
1. Desactivar sistema de lealtad:
   ```sql
   UPDATE loyalty_settings SET is_enabled = false;
   ```

2. Crear pedido pagado de €100

3. Verificar que NO se otorguen puntos

4. Reactivar sistema:
   ```sql
   UPDATE loyalty_settings SET is_enabled = true;
   ```

5. Crear otro pedido pagado de €50

6. Verificar que SÍ se otorguen 50 puntos

---

## 📈 Consultas SQL Útiles para Pruebas

### Ver todos los puntos de usuarios
```sql
SELECT 
  p.email,
  p.full_name,
  lp.points_balance,
  lp.lifetime_points,
  lp.updated_at
FROM loyalty_points lp
JOIN profiles p ON p.id = lp.user_id
ORDER BY lp.points_balance DESC;
```

### Ver pedidos pagados de un usuario
```sql
SELECT 
  o.order_number,
  o.total,
  o.payment_status,
  o.deleted_at,
  o.created_at,
  FLOOR(o.total * ls.points_per_dollar) as puntos_esperados
FROM orders o
CROSS JOIN loyalty_settings ls
WHERE o.user_id = (SELECT id FROM profiles WHERE email = 'email@test.com')
ORDER BY o.created_at DESC;
```

### Calcular puntos esperados vs reales
```sql
WITH expected_points AS (
  SELECT 
    o.user_id,
    SUM(CASE 
      WHEN o.payment_status = 'paid' AND o.deleted_at IS NULL 
      THEN FLOOR(o.total * ls.points_per_dollar)
      ELSE 0 
    END) as puntos_calculados
  FROM orders o
  CROSS JOIN loyalty_settings ls
  GROUP BY o.user_id
)
SELECT 
  p.email,
  lp.points_balance as puntos_reales,
  ep.puntos_calculados as puntos_esperados,
  (lp.points_balance = ep.puntos_calculados) as es_correcto
FROM expected_points ep
JOIN loyalty_points lp ON lp.user_id = ep.user_id
JOIN profiles p ON p.id = ep.user_id;
```

### Resetear puntos de un usuario (para pruebas)
```sql
-- SOLO PARA PRUEBAS - NO USAR EN PRODUCCIÓN
UPDATE loyalty_points 
SET points_balance = 0, lifetime_points = 0
WHERE user_id = (SELECT id FROM profiles WHERE email = 'email@test.com');
```

---

## ✅ Checklist de Validación Final

- [ ] Pedido nuevo con paid → Otorga puntos ✓
- [ ] Pedido pending → paid → Otorga puntos ✓
- [ ] Pedido paid → cancelled → Resta puntos ✓
- [ ] Pedido paid → eliminado → Resta puntos ✓
- [ ] Pedido eliminado → restaurado → Devuelve puntos ✓
- [ ] Cotización → Factura → Pago → Otorga puntos ✓
- [ ] Balance nunca negativo ✓
- [ ] Lifetime_points solo sube ✓
- [ ] Múltiples pedidos acumulan correctamente ✓
- [ ] Sistema deshabilitado no otorga puntos ✓

---

## 🔍 Solución de Problemas

### Problema: No se otorgan puntos
**Verificar:**
1. Sistema habilitado: `SELECT is_enabled FROM loyalty_settings;`
2. Usuario tiene ID válido: `user_id IS NOT NULL`
3. Payment_status es 'paid': `SELECT payment_status FROM orders WHERE id = 'xxx';`
4. Trigger activo: Ver sección de verificación de triggers
5. Revisar logs de PostgreSQL

### Problema: Se otorgan puntos duplicados
**Causa probable:**
- Trigger ejecutándose múltiples veces
- Verificar que solo haya un trigger por tabla

### Problema: Puntos no se restan al cancelar
**Verificar:**
1. Trigger de UPDATE está activo
2. El pedido estaba efectivamente en 'paid' antes
3. Revisar logs: `RAISE NOTICE` debe aparecer

---

## 📝 Notas Importantes

1. **Facturas con order_id NO otorgan puntos adicionales**
   - Los puntos ya fueron otorgados por el pedido original
   
2. **Solo facturas independientes (sin order_id) otorgan puntos**
   - Ejemplo: Facturas de cotizaciones aprobadas

3. **El sistema usa `FLOOR()` para redondear hacia abajo**
   - €99.99 × 1 punto/$ = 99 puntos (no 100)

4. **Lifetime_points es inmutable hacia abajo**
   - Solo aumenta, representa el total histórico

5. **Los triggers se ejecutan automáticamente**
   - No requieren intervención manual
   - Son atómicos (parte de la transacción)

---

**Fecha de Creación:** 5 de Noviembre 2025  
**Versión Sistema:** 1.0.0  
**Estado:** ✅ LISTO PARA PRUEBAS
