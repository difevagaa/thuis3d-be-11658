# ✅ VERIFICACIÓN TÉCNICA - Triggers del Sistema de Lealtad

## 🔍 Estado de los Triggers

### Trigger: `trigger_order_loyalty_points`
- **Tabla:** `orders`
- **Timing:** AFTER
- **Eventos:** INSERT, UPDATE
- **Función:** `handle_order_loyalty_points()`
- **Estado:** ✅ ACTIVO

### Trigger: `trigger_invoice_loyalty_points`
- **Tabla:** `invoices`
- **Timing:** AFTER
- **Eventos:** INSERT, UPDATE
- **Función:** `handle_invoice_loyalty_points()`
- **Estado:** ✅ ACTIVO

## 📊 Decodificación de tgtype

PostgreSQL almacena la configuración de triggers en un campo `tgtype` como máscara de bits:

```
tgtype = 21 (binario: 10101)
├─ bit 0 (1):  ROW trigger ✓
├─ bit 2 (4):  INSERT event ✓
└─ bit 4 (16): UPDATE event ✓

Resultado: AFTER INSERT OR UPDATE FOR EACH ROW
```

## 🧪 Consulta de Verificación

```sql
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgtype,
  (tgtype & 1) > 0 as is_row_trigger,
  (tgtype & 2) > 0 as is_before,
  (tgtype & 4) > 0 as has_insert,
  (tgtype & 8) > 0 as has_delete,
  (tgtype & 16) > 0 as has_update,
  (tgtype & 64) > 0 as is_instead_of
FROM pg_trigger
WHERE tgname IN ('trigger_order_loyalty_points', 'trigger_invoice_loyalty_points')
  AND NOT tgisinternal;
```

**Resultado Esperado:**
```
trigger_order_loyalty_points:
  - is_row_trigger: true
  - is_before: false (es AFTER)
  - has_insert: true
  - has_delete: false
  - has_update: true
  - is_instead_of: false

trigger_invoice_loyalty_points:
  - is_row_trigger: true
  - is_before: false (es AFTER)
  - has_insert: true
  - has_delete: false
  - has_update: true
  - is_instead_of: false
```

## 🎯 Funciones Asociadas

### 1. `handle_order_loyalty_points()`
**Propósito:** Gestionar puntos según cambios en pedidos

**Lógica:**
```sql
IF TG_OP = 'INSERT' AND NEW.payment_status = 'paid' THEN
  → Otorgar puntos
  
IF TG_OP = 'UPDATE' THEN
  IF OLD.payment_status != 'paid' AND NEW.payment_status = 'paid' THEN
    → Otorgar puntos
    
  IF OLD.payment_status = 'paid' AND NEW.payment_status != 'paid' THEN
    → Restar puntos
    
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    → Restar puntos (eliminado)
    
  IF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    → Devolver puntos (restaurado)
```

### 2. `handle_invoice_loyalty_points()`
**Propósito:** Gestionar puntos según cambios en facturas

**Condición especial:**
- Solo procesa facturas SIN `order_id` (facturas independientes)
- Evita duplicar puntos de pedidos con factura asociada

**Lógica:** Idéntica a `handle_order_loyalty_points()`

## 🔧 Funciones Auxiliares

### `award_loyalty_points(user_id, amount, order_id)`
```sql
-- Verifica si sistema está habilitado
-- Calcula: puntos = FLOOR(amount × points_per_dollar)
-- Actualiza: INSERT ... ON CONFLICT DO UPDATE
-- Incrementa: points_balance y lifetime_points
```

### `remove_loyalty_points(user_id, amount, order_id)`
```sql
-- Calcula: puntos = FLOOR(amount × points_per_dollar)
-- Resta de: points_balance (con protección contra negativo)
-- NO afecta: lifetime_points (es histórico)
```

## 📈 Índices para Performance

```sql
-- Índice en orders
idx_orders_payment_status_user
ON orders(payment_status, user_id)
WHERE deleted_at IS NULL

-- Índice en invoices
idx_invoices_payment_status_user  
ON invoices(payment_status, user_id)
WHERE deleted_at IS NULL
```

**Beneficio:** Acelera consultas de pedidos pagados por usuario

## ⚡ Prueba Rápida de Funcionamiento

### Test 1: Crear pedido pagado
```sql
-- Esto debería ejecutar el trigger automáticamente
INSERT INTO orders (
  user_id, 
  order_number, 
  total, 
  subtotal, 
  payment_status
) VALUES (
  'user-uuid-aqui',
  'TEST-001',
  100.00,
  100.00,
  'paid'
);

-- Verificar puntos otorgados
SELECT * FROM loyalty_points 
WHERE user_id = 'user-uuid-aqui';
-- Esperado: points_balance = 100, lifetime_points = 100
```

### Test 2: Cambiar a cancelled
```sql
-- Esto debería restar puntos automáticamente
UPDATE orders 
SET payment_status = 'cancelled'
WHERE order_number = 'TEST-001';

-- Verificar puntos restados
SELECT * FROM loyalty_points 
WHERE user_id = 'user-uuid-aqui';
-- Esperado: points_balance = 0, lifetime_points = 100
```

## 🚨 Troubleshooting

### Problema: Trigger no se ejecuta

**Verificar:**
1. **¿Existe el trigger?**
   ```sql
   SELECT tgname FROM pg_trigger 
   WHERE tgname = 'trigger_order_loyalty_points';
   ```

2. **¿Trigger habilitado?**
   ```sql
   SELECT tgenabled FROM pg_trigger 
   WHERE tgname = 'trigger_order_loyalty_points';
   -- Debe ser 'O' (Origin, habilitado)
   ```

3. **¿Función existe?**
   ```sql
   SELECT proname FROM pg_proc 
   WHERE proname = 'handle_order_loyalty_points';
   ```

4. **Ver logs de PostgreSQL:**
   ```sql
   -- Los RAISE NOTICE deberían aparecer en logs
   -- Buscar: "[LOYALTY]"
   ```

### Problema: Puntos incorrectos

**Verificar configuración:**
```sql
SELECT 
  is_enabled,
  points_per_dollar
FROM loyalty_settings;
```

**Recalcular puntos esperados:**
```sql
SELECT 
  order_number,
  total,
  FLOOR(total * ls.points_per_dollar) as puntos_esperados
FROM orders o
CROSS JOIN loyalty_settings ls
WHERE o.user_id = 'user-uuid'
  AND o.payment_status = 'paid'
  AND o.deleted_at IS NULL;
```

## 📝 Comandos Útiles

### Deshabilitar trigger temporalmente
```sql
ALTER TABLE orders DISABLE TRIGGER trigger_order_loyalty_points;
```

### Habilitar trigger
```sql
ALTER TABLE orders ENABLE TRIGGER trigger_order_loyalty_points;
```

### Ver definición de función
```sql
SELECT pg_get_functiondef('handle_order_loyalty_points'::regproc);
```

### Ver todos los triggers de una tabla
```sql
SELECT 
  t.tgname,
  pg_get_triggerdef(t.oid) as definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'orders'
  AND NOT t.tgisinternal;
```

## ✅ Estado Final

- ✅ Triggers creados correctamente
- ✅ Configurados para INSERT y UPDATE
- ✅ Funciones implementadas con search_path seguro
- ✅ Protección contra balance negativo
- ✅ Logging habilitado
- ✅ Índices creados para performance
- ✅ Sistema listo para producción

**Fecha:** 5 de Noviembre 2025  
**Versión:** 1.0.0  
**Estado:** ✅ VERIFICADO Y OPERATIVO
