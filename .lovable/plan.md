

# Sistema Completo de Inventario para Impresion 3D

## Resumen

Crear un sistema de inventario completo para gestionar filamentos, piezas y suministros de impresion 3D. El sistema se integrara con el flujo de pedidos existente para descontar automaticamente materiales cuando un pedido se marca como impreso/completado, y proporcionara metricas de margen de ganancia.

---

## 1. Base de Datos - Nuevas Tablas

### Tabla `inventory_items` (inventario principal)
Almacena todos los items de inventario: filamentos, piezas, accesorios (bombillas, cadenas, aretes, etc.)

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | uuid PK | Identificador |
| name | text | Nombre del item |
| type | text | Tipo: `filament`, `part`, `accessory`, `consumable` |
| category | text | Categoria libre (ej: "Colgantes", "Bombillas", "Cadenas") |
| material_id | uuid FK nullable | Vinculo a tabla materials existente |
| color_id | uuid FK nullable | Vinculo a tabla colors existente |
| sku | text | Codigo interno |
| brand | text | Marca |
| quantity_in_stock | numeric | Cantidad actual |
| unit | text | Unidad: `kg`, `g`, `m`, `units` |
| min_stock_alert | numeric | Alerta de stock bajo |
| cost_per_unit | numeric | Costo por unidad de compra |
| supplier | text | Proveedor |
| location | text | Ubicacion en taller |
| notes | text | Notas |
| image_url | text | Foto del item |
| is_active | boolean | Activo o archivado |
| weight_per_spool | numeric | Para filamentos: peso por bobina (g) |
| diameter | numeric | Para filamentos: diametro (1.75, 2.85) |
| print_temp_min/max | int | Temperatura impresion |
| bed_temp_min/max | int | Temperatura cama |
| created_at, updated_at | timestamptz | Fechas |

### Tabla `inventory_movements` (historial de movimientos)
Registra cada entrada/salida de inventario con trazabilidad completa.

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | uuid PK | Identificador |
| inventory_item_id | uuid FK | Item afectado |
| movement_type | text | `purchase`, `sale`, `adjustment`, `order_deduction`, `return`, `waste` |
| quantity | numeric | Cantidad (+entrada, -salida) |
| previous_stock | numeric | Stock antes del movimiento |
| new_stock | numeric | Stock despues |
| cost_per_unit | numeric | Costo unitario en este movimiento |
| total_cost | numeric | Costo total |
| order_id | uuid FK nullable | Pedido relacionado |
| notes | text | Observaciones |
| created_by | uuid FK | Quien realizo el movimiento |
| created_at | timestamptz | Fecha |

### Tabla `inventory_production_logs` (registro de produccion)
Para registrar datos reales de cada impresion: filamento usado, tiempo, energia, etc.

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | uuid PK | Identificador |
| order_id | uuid FK nullable | Pedido vinculado |
| order_item_id | uuid FK nullable | Item del pedido |
| inventory_item_id | uuid FK | Filamento usado |
| filament_used_g | numeric | Gramos de filamento reales |
| print_time_minutes | numeric | Tiempo real de impresion |
| energy_cost | numeric | Costo de energia estimado |
| labor_cost | numeric | Costo de mano de obra |
| other_costs | numeric | Otros costos |
| sale_price | numeric | Precio de venta |
| total_cost | numeric | Costo total calculado |
| profit | numeric | Ganancia calculada |
| profit_margin_pct | numeric | % de margen |
| notes | text | Notas del admin |
| auto_calculated | boolean | Si los datos vienen de la calculadora |
| manually_adjusted | boolean | Si el admin los edito |
| created_by | uuid FK | Admin |
| created_at | timestamptz | Fecha |

### RLS Policies
- Solo admins/superadmins pueden leer y escribir en las 3 tablas (usando `has_role`)
- Realtime habilitado en las 3 tablas

---

## 2. Trigger de Descuento Automatico

Crear una funcion de base de datos que, al cambiar el estado de un pedido a "impreso" o "completado" (configurable), descuente automaticamente del inventario el filamento usado, generando un `inventory_movement` con tipo `order_deduction`.

---

## 3. Pagina de Admin: Inventario (`/admin/inventario`)

Una pagina completa con **tabs**:

### Tab 1: Items de Inventario
- Tabla con todos los items, filtrable por tipo/categoria/material/color
- CRUD completo: crear, editar, eliminar items
- Indicadores visuales de stock bajo (rojo), stock medio (amarillo), stock ok (verde)
- Busqueda y filtros avanzados
- Los campos numericos permiten borrar todos los digitos para escribir valores nuevos (sin el bug de "no deja borrar el ultimo digito")

### Tab 2: Movimientos
- Historial de todos los movimientos de inventario
- Filtros por tipo de movimiento, fecha, item
- Boton para registrar compras (entrada) y ajustes manuales

### Tab 3: Registro de Produccion
- Lista de registros de produccion vinculados a pedidos
- Formulario para ingresar datos reales: filamento usado, tiempo, costos
- Muestra tanto los datos auto-calculados (de la calculadora 3D) como los reales ingresados manualmente
- Calculo automatico de ganancia y margen

### Tab 4: Resumen / Dashboard de Inventario
- Valor total del inventario (cantidad x costo)
- Items con stock bajo (alertas)
- Grafica de consumo por periodo
- Margen de ganancia promedio
- Gastos vs ingresos por produccion

---

## 4. Integracion con Dashboard Principal

Agregar al dashboard existente (`AdminDashboard.tsx`):
- Card con "Valor del Inventario" total
- Card con "Alertas de Stock Bajo" (cuantos items estan por debajo del minimo)
- Enlace rapido al inventario

---

## 5. Integracion con Pedidos

En la pagina de detalle de pedido admin (`OrderDetail.tsx`):
- Seccion para registrar produccion: filamento usado, tiempo, costos reales
- Boton "Registrar Produccion" que crea el log y descuenta del inventario
- Vista del margen de ganancia de ese pedido especifico

---

## 6. Navegacion

- Agregar "Inventario" al menu lateral del admin (seccion "Catalogo" o nueva seccion)
- Ruta: `/admin/inventario`
- Permisos en `adminMenu.ts`

---

## Detalles Tecnicos

### Archivos nuevos:
- `supabase/migrations/XXXX_inventory_system.sql` - Tablas, RLS, triggers, realtime
- `src/pages/admin/Inventory.tsx` - Pagina principal con 4 tabs
- Componentes auxiliares si es necesario para formularios de produccion

### Archivos modificados:
- `src/App.tsx` - Nueva ruta `/admin/inventario`
- `src/constants/adminMenu.ts` - Menu item + permisos de inventario
- `src/pages/admin/AdminDashboard.tsx` - Cards de inventario
- `src/integrations/supabase/types.ts` - Se actualiza automaticamente

### Manejo de inputs numericos:
Todos los campos numericos usaran `value={field || ''}` con `onChange` que permite string vacio, evitando el bug de no poder borrar el ultimo digito.

### Calculo de margen de ganancia:
```
profit = sale_price - (filament_cost + energy_cost + labor_cost + other_costs)
margin_pct = (profit / sale_price) * 100
```
El sistema mostrara tanto los valores auto-calculados como los ingresados manualmente por el admin.

