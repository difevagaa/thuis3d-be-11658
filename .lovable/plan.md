

## Auditoría y Corrección del Sistema de Calculadora 3D

### Problemas Identificados

**1. Bug crítico: Valores almacenados como strings JSON vs números**
El campo `setting_value` es `jsonb`. Cuando el admin guarda, algunos valores se guardan como strings JSON (`"20"`) en lugar de números (`20`). La función `saveSettings` guarda valores escalares directamente como strings:
```js
{ key: 'electricity_cost_per_kwh', value: settings.electricityCostPerKwh } // "0.19" (string)
```
Pero `stlAnalyzer.ts` los lee con `parseFloat(String(...))`, lo cual funciona... excepto cuando el tipo cambia entre guardados. El problema real es que al guardar, si el admin borra un campo y lo deja vacío, `parseFloat("")` devuelve `NaN` y la calculadora colapsa.

**2. Bug crítico: profitMultiplier = 6 (multiplicador muy alto)**
Con la configuración actual:
- `profit_multiplier_retail = 6` significa que el costo base se multiplica por 6
- `error_margin_percentage = 20` agrega 20% al costo base
- Fórmula: `(costoBase × 1.20) × 6`

Si el usuario cambió el precio del filamento y el sistema recargó, un resultado de €16 para 16 piezas grandes sugiere que **el cálculo está colapsando a `minimumPrice = 9`** o que los valores del filamento no se guardaron correctamente (quedaron en 0 o NaN).

**3. Falta de validación al guardar configuración**
No hay validación de rangos ni de valores vacíos/NaN en `saveSettings()`. Si alguien deja un campo vacío, se guarda `""` o `0`, lo que puede hacer que divisiones como `replacementPartsCost / printerLifespanHours` den resultados absurdos.

**4. La calculadora no diferencia bien piezas pequeñas vs grandes en múltiples unidades**
El sistema actual aplica un 10% de economía de escala fija, pero no hay una lógica que escale los costos fijos de preparación de forma proporcional al tamaño de la pieza.

### Plan de Corrección

#### Tarea 1: Robustez del guardado de configuración
**Archivo:** `src/pages/admin/PrintingCalculatorSettings.tsx`
- Agregar validación antes de guardar: cada campo numérico debe ser `> 0` (o `>= 0` donde aplique)
- Convertir todos los valores escalares a número con `parseFloat()` antes de guardar en la DB para asegurar que se almacenen como `jsonb` numérico, no como string
- Agregar validación de rangos lógicos (ej: `profitMultiplier` entre 1 y 20, `errorMargin` entre 0 y 100)
- Mostrar errores inline si los valores no son válidos

#### Tarea 2: Protección contra NaN/0 en stlAnalyzer
**Archivo:** `src/lib/stlAnalyzer.ts`
- Agregar guardas `isNaN` y valores por defecto seguros para CADA parámetro leído de la DB
- Si algún parámetro crítico es 0 o NaN (ej: `printerLifespanHours`, `profitMultiplier`), usar valor por defecto y loguear advertencia
- Función helper `safeParse(value, defaultValue)` para centralizar la lógica

#### Tarea 3: Mejorar lógica de precios para múltiples piezas grandes
**Archivo:** `src/lib/stlAnalyzer.ts`
- La economía de escala actual (10% fijo) es insuficiente. Implementar escala progresiva:
  - 2-5 piezas: 8% descuento por pieza adicional
  - 6-15 piezas: 12% descuento
  - 16-50 piezas: 15% descuento
  - 51+: 18% descuento
- Los costos fijos por trabajo (calentamiento, preparación) se dividen entre todas las piezas, no se cobran completos
- El `minimumPrice` debe aplicarse **por pieza**, no al total (para evitar que 16 piezas cuesten solo €9)

#### Tarea 4: Asegurar coherencia entre tamaño de pieza y precio
**Archivo:** `src/lib/stlAnalyzer.ts`
- Verificar que el cálculo de `materialCost` escale correctamente con el volumen
- Asegurar que `weight × costPerKg / 1000` no colapse a valores ridículos
- Agregar logging de diagnóstico cuando el precio por pieza sea menor a €1 (sospechoso)

#### Tarea 5: Guardar valores numéricos consistentes en la DB
**Archivo:** `src/pages/admin/PrintingCalculatorSettings.tsx`
- En `saveSettings()`, cambiar:
```js
// ANTES (guarda string)
{ key: 'electricity_cost_per_kwh', value: settings.electricityCostPerKwh }
// DESPUÉS (guarda número)
{ key: 'electricity_cost_per_kwh', value: parseFloat(settings.electricityCostPerKwh) || 0.15 }
```
- Aplicar esto a TODOS los campos escalares

#### Tarea 6: Verificación post-cambio
- Verificar que la página de cotizaciones (`/cotizaciones`) siga funcionando correctamente
- Verificar que el desglose de precios en el paso de Review sea coherente
- Verificar que los descuentos por cantidad (`quantity_discount_tiers`) se apliquen correctamente sobre el nuevo cálculo
- Verificar que el admin panel de calculadora guarde y recargue valores correctamente
- Comprobar que el precio mínimo se aplique por pieza, no al total

### Lista de Verificación Final
1. Subir archivo STL pequeño (< 5cm³), 1 unidad → precio razonable (€5-15)
2. Subir archivo STL grande (> 50cm³), 1 unidad → precio mayor proporcionalmente
3. Subir archivo STL grande, 16 unidades → precio total coherente (no €16)
4. Cambiar precio de filamento en admin → recotizar → precio cambia proporcionalmente
5. Dejar un campo vacío en admin → no se rompe la calculadora
6. Verificar que descuentos por cantidad se aplican correctamente
7. Verificar que envío se calcula y suma correctamente al total

