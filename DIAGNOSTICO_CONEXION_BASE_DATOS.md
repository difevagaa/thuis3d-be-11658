# 🔍 DIAGNÓSTICO: Conexión a Base de Datos

## ✅ CONFIRMACIÓN: Solo hay UNA base de datos

**NO hay conflicto entre Lovable y Supabase**. La aplicación está configurada **ÚNICAMENTE** para usar Supabase.

### Evidencia:
1. ✅ El archivo `src/integrations/supabase/client.ts` solo conecta a Supabase
2. ✅ No hay referencias a Lovable en el código fuente
3. ✅ El `.env` solo contiene credenciales de Supabase:
   - URL: `https://ljygreayxxpsdmncwzia.supabase.co`
   - Project ID: `ljygreayxxpsdmncwzia`

## 🐛 PROBLEMA REAL: Timeout Agresivo

El "parpadeo" que observas es causado por:

### Causa Principal
El hook `usePageSections` tenía un **timeout de 2 segundos** muy agresivo:

```typescript
// ANTES (Problema)
setTimeout(() => {
  // Si la consulta tarda más de 2 segundos, muestra contenido vacío
  setLoading(false);
  setSections([]);
}, 2000); // 2 segundos
```

### Qué Pasaba
1. 🔄 Usuario navega a una página
2. ⏳ Se inicia consulta a Supabase
3. ⏱️ Si tarda más de 2 segundos → muestra contenido de respaldo (vacío)
4. ✅ Cuando llega la respuesta de Supabase → muestra contenido real
5. 👁️ **RESULTADO: Parpadeo entre vacío y contenido real**

## ✅ SOLUCIÓN APLICADA

### 1. Timeout Aumentado
```typescript
// DESPUÉS (Solucionado)
setTimeout(() => {
  setLoading(false);
  setSections([]);
}, 10000); // 10 segundos - evita parpadeo de consultas lentas
```

### 2. Diagnósticos Mejorados
Ahora la consola mostrará:
- ✅ URL de Supabase conectado
- ⏱️ Tiempo que tarda cada consulta
- 📊 Cuántas secciones se cargaron

## 📊 CÓMO VERIFICAR

### Paso 1: Abrir Consola del Navegador
1. Presiona `F12` en tu navegador
2. Ve a la pestaña "Console"

### Paso 2: Navegar por el sitio
Cuando navegues, deberías ver mensajes como:

```
✓ Loading sections for page 'home' (uuid-aqui)
🔌 Connected to Supabase: https://ljygreayxxpsdmncwzia.supabase.co
⏱️ Sections loaded in 450ms
✓ Loaded 5 sections for page 'home'
```

### Paso 3: Interpretar los Tiempos

| Tiempo de Carga | Estado | Acción |
|-----------------|--------|---------|
| < 1000ms | ✅ Excelente | Ninguna |
| 1000-3000ms | ⚠️ Aceptable | Verificar índices en DB |
| 3000-10000ms | 🐌 Lento | Optimizar consultas |
| > 10000ms | ❌ Muy lento | Revisar conexión/plan Supabase |

## 🔧 SI AÚN VES PARPADEO

### Posibles Causas Restantes

#### 1. **Supabase está Lento** (Más común)
**Síntoma**: Consultas tardan >3 segundos

**Solución**:
- Verifica tu plan de Supabase (free tier tiene límites)
- Revisa uso de recursos en Supabase Dashboard
- Considera actualizar a plan de pago

#### 2. **Tablas sin Índices**
**Síntoma**: Consultas tardan más con más datos

**Solución**: Ejecuta en SQL Editor de Supabase:
```sql
-- Verificar índices existentes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('page_builder_pages', 'page_builder_sections');

-- Los índices necesarios:
-- idx_page_builder_sections_page_id ✓
-- idx_page_builder_sections_display_order ✓
```

#### 3. **Suscripciones Real-Time Múltiples**
**Síntoma**: Parpadeo solo después de estar un rato en el sitio

**Solución**: 
- Cierra y reabre el navegador
- Limpia localStorage: `localStorage.clear()` en consola
- Recarga la página (Ctrl+F5)

#### 4. **Caché de Navegador**
**Síntoma**: Ves contenido viejo mezclado con nuevo

**Solución**:
```javascript
// En consola del navegador:
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

## 📈 MONITOREO DE RENDIMIENTO

### Ver Estadísticas de Supabase
1. Ve a: https://supabase.com/dashboard/project/ljygreayxxpsdmncwzia
2. Click en "Database" → "Performance"
3. Revisa:
   - Consultas lentas (>1000ms)
   - Uso de CPU/Memoria
   - Conexiones activas

### Optimizar Consultas
Si ves consultas lentas, ejecuta:

```sql
-- Ver consultas más lentas
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## 🎯 CONFIRMACIÓN FINAL

Para confirmar que TODO está funcionando correctamente:

1. **Abre la consola del navegador (F12)**
2. **Navega entre páginas** (Home → Blog → Productos)
3. **Verifica que veas**:
   - ✅ Mensajes "Connected to Supabase"
   - ✅ Tiempos de carga < 2000ms
   - ✅ "Loaded X sections" con X > 0
   - ❌ NO deberías ver timeouts (⏱️)

4. **Si ves el contenido de ejemplo** = ✅ Supabase funcionando
5. **Si ves páginas vacías** = ❌ Necesitas ejecutar los scripts SQL

## 🆘 SIGUIENTE PASO

Si después de estos cambios TODAVÍA ves parpadeo:

1. Copia TODOS los mensajes de la consola
2. Toma captura de pantalla del parpadeo
3. Ejecuta esto en la consola y comparte el resultado:

```javascript
// Test de conectividad
console.log('=== DIAGNÓSTICO ===');
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('localStorage keys:', Object.keys(localStorage));

// Test de velocidad
const start = performance.now();
fetch('https://ljygreayxxpsdmncwzia.supabase.co')
  .then(() => console.log('Ping to Supabase:', (performance.now() - start) + 'ms'))
  .catch(err => console.error('Connection failed:', err));
```

---

**Resumen**: Tu app solo usa Supabase. El parpadeo era por timeout muy corto. Ahora está solucionado.
