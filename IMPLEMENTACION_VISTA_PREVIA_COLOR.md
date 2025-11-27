# Implementación: Vista Previa 3D con Color Seleccionado

## Fecha
2025-11-05

## Objetivo
Hacer que la vista previa 3D del archivo STL se renderice con el color que el usuario haya seleccionado al crear la cotización, en lugar de usar un color fijo azul.

---

## Cambios Implementados

### 1. **Modificación de `analyzeSTLFile()` - src/lib/stlAnalyzer.ts**

#### A. Nuevo Parámetro Opcional (Línea 286)
```typescript
export const analyzeSTLFile = async (
  fileURL: string,
  materialId: string,
  filePath: string,
  supportsRequired: boolean = false,
  layerHeightOverride?: number,
  quantity: number = 1,
  colorId?: string  // ← NUEVO PARÁMETRO OPCIONAL
): Promise<AnalysisResult> => {
```

**Descripción**: Se agregó un parámetro opcional `colorId` para recibir el ID del color seleccionado.

#### B. Consulta de Color desde Base de Datos (Líneas 637-650)
```typescript
// Obtener color seleccionado para la vista previa
let previewColor = '#3b82f6'; // Azul por defecto
if (colorId) {
  const { data: colorData } = await supabase
    .from('colors')
    .select('hex_code')
    .eq('id', colorId)
    .single();
  
  if (colorData?.hex_code) {
    previewColor = colorData.hex_code;
    console.log('🎨 Color de vista previa:', previewColor);
  }
}
```

**Descripción**: 
- Si se proporciona un `colorId`, consulta la tabla `colors` para obtener el código hexadecimal
- Si no hay colorId o falla la consulta, usa azul por defecto (`#3b82f6`)
- Muestra un log con el color aplicado (emoji 🎨)

#### C. Pasar Color a la Función de Renderizado (Línea 653)
```typescript
// Generar vista previa 3D con el color seleccionado
const preview = await generatePreviewImage(geometry, previewColor);
```

**Descripción**: Pasa el color hexadecimal a la función que genera la imagen.

---

### 2. **Modificación de `generatePreviewImage()` - src/lib/stlAnalyzer.ts**

#### A. Nuevo Parámetro de Color (Línea 823)
```typescript
async function generatePreviewImage(
  geometry: THREE.BufferGeometry, 
  hexColor: string = '#3b82f6'  // ← NUEVO PARÁMETRO CON DEFAULT
): Promise<string> {
```

**Descripción**: Acepta un color hexadecimal, con azul como valor por defecto.

#### B. Conversión y Aplicación del Color (Líneas 833-840)
```typescript
// Convertir color hexadecimal a THREE.Color
const color = new THREE.Color(hexColor);

const material = new THREE.MeshPhongMaterial({
  color: color,  // ← Usa el color convertido
  specular: 0x111111,
  shininess: 200
});
```

**Descripción**:
- Convierte el string hexadecimal a un objeto `THREE.Color`
- Aplica ese color al material del mesh 3D
- Mantiene las propiedades especular y shininess para buen acabado visual

---

### 3. **Modificación de `STLUploader` - src/components/STLUploader.tsx**

#### A. Nueva Prop `colorId` (Línea 12)
```typescript
interface STLUploaderProps {
  materialId: string;
  colorId?: string;  // ← NUEVA PROP OPCIONAL
  onAnalysisComplete: (result: AnalysisResult & { file: File }) => void;
  supportsRequired?: boolean;
  layerHeight?: number;
  quantity?: number;
}
```

#### B. Recibir y Usar `colorId` (Líneas 19, 91)
```typescript
export const STLUploader = ({ 
  materialId, 
  colorId,  // ← Recibe el nuevo prop
  onAnalysisComplete, 
  supportsRequired = false, 
  layerHeight, 
  quantity = 1 
}: STLUploaderProps) => {
  // ...
  
  // Pasar colorId al análisis
  const analysis = await analyzeSTLFile(
    fileURL, 
    materialId, 
    '', 
    supportsRequired, 
    layerHeight, 
    quantity, 
    colorId  // ← Pasa el colorId
  );
```

**Descripción**: El componente ahora recibe el `colorId` y lo pasa al análisis STL.

---

### 4. **Modificación de Quotes.tsx - src/pages/Quotes.tsx**

#### Pasar `colorId` a STLUploader (Línea 522)
```typescript
<STLUploader
  materialId={selectedMaterial}
  colorId={selectedColor}  // ← Pasa el color seleccionado
  supportsRequired={letTeamDecideSupports ? false : (supportsRequired || false)}
  layerHeight={letTeamDecideLayer ? undefined : (layerHeight || undefined)}
  quantity={quantity}
  onAnalysisComplete={setAnalysisResult}
/>
```

**Descripción**: 
- Pasa el `selectedColor` del estado al componente STLUploader
- El color ya está disponible en el estado (línea 37)
- Se actualiza cuando el usuario selecciona un color

---

### 5. **Modificación de CalibrationSettings.tsx - src/pages/admin/CalibrationSettings.tsx**

#### Actualizar Llamada a `analyzeSTLFile` (Líneas 120-128)
```typescript
const analysis = await analyzeSTLFile(
  fileURL, 
  formData.material_id, 
  selectedFile.name,
  formData.supports_enabled,
  formData.layer_height,
  1, // quantity = 1 para calibraciones
  undefined // sin colorId específico en calibraciones
);
```

**Descripción**: 
- Actualiza la llamada para incluir todos los parámetros requeridos
- Pasa `undefined` para colorId (usa color por defecto en calibraciones)
- Mantiene quantity en 1 para calibraciones

---

## Flujo Completo del Sistema

### Usuario en `/cotizaciones`

1. **Selecciona Material**
   - Estado: `selectedMaterial` se actualiza
   - Filtra colores disponibles

2. **Selecciona Color**
   - Estado: `selectedColor` se actualiza con el ID del color
   - Ejemplo: `"550e8400-e29b-41d4-a716-446655440000"`

3. **Sube Archivo STL**
   - STLUploader recibe `materialId` y `colorId`
   - Crea URL temporal del archivo local

4. **Análisis del Archivo**
   ```
   analyzeSTLFile(fileURL, materialId, '', supports, layerHeight, quantity, colorId)
     ↓
   Consulta colors table para obtener hex_code
     ↓
   generatePreviewImage(geometry, "#FF5733")
     ↓
   Renderiza mesh 3D con el color seleccionado
     ↓
   Retorna imagen base64 con el color correcto
   ```

5. **Resultado**
   - Vista previa muestra el modelo en el color seleccionado
   - Usuario ve exactamente cómo se verá su pieza

### Administrador en `/admin/calibracion`

1. **Sube Archivo de Calibración**
   - No selecciona color específico
   - `colorId = undefined`

2. **Análisis del Archivo**
   - Usa color por defecto (azul `#3b82f6`)
   - Vista previa siempre en azul

---

## Tabla de Colores (Base de Datos)

### Estructura: `colors`
```sql
CREATE TABLE colors (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  hex_code TEXT NOT NULL,
  deleted_at TIMESTAMP
);
```

### Ejemplo de Datos
| id | name | hex_code | deleted_at |
|----|------|----------|------------|
| uuid-1 | Rojo | #FF0000 | NULL |
| uuid-2 | Azul | #0000FF | NULL |
| uuid-3 | Verde | #00FF00 | NULL |
| uuid-4 | Negro | #000000 | NULL |
| uuid-5 | Blanco | #FFFFFF | NULL |

---

## Casos de Uso

### ✅ Caso 1: Usuario Selecciona Rojo
```
Usuario selecciona: Color "Rojo" (hex_code: #FF0000)
  ↓
STLUploader recibe: colorId="uuid-1"
  ↓
analyzeSTLFile consulta DB: hex_code="#FF0000"
  ↓
generatePreviewImage renderiza: Modelo rojo
  ↓
Vista previa: 🔴 Modelo en rojo
```

### ✅ Caso 2: Usuario Selecciona Blanco
```
Usuario selecciona: Color "Blanco" (hex_code: #FFFFFF)
  ↓
STLUploader recibe: colorId="uuid-5"
  ↓
analyzeSTLFile consulta DB: hex_code="#FFFFFF"
  ↓
generatePreviewImage renderiza: Modelo blanco
  ↓
Vista previa: ⚪ Modelo en blanco
```

### ✅ Caso 3: Usuario No Selecciona Color
```
Usuario NO selecciona color (formulario incompleto)
  ↓
STLUploader recibe: colorId=undefined
  ↓
analyzeSTLFile usa: previewColor="#3b82f6" (azul)
  ↓
generatePreviewImage renderiza: Modelo azul
  ↓
Vista previa: 🔵 Modelo en azul por defecto
```

### ✅ Caso 4: Admin en Calibración
```
Admin sube archivo de calibración
  ↓
analyzeSTLFile recibe: colorId=undefined
  ↓
Usa color por defecto: "#3b82f6" (azul)
  ↓
Vista previa: 🔵 Modelo en azul
```

---

## Beneficios de la Implementación

### 1. **Experiencia de Usuario Mejorada** ✨
- El usuario ve **exactamente** cómo se verá su pieza
- Reduce confusión y expectativas incorrectas
- Aumenta confianza en el pedido

### 2. **Retroalimentación Visual Inmediata** 👁️
- Vista previa realista del color seleccionado
- Ayuda a tomar decisiones informadas
- Permite verificar combinación material + color

### 3. **Consistencia** 🎯
- Color de vista previa = Color que recibirá
- Elimina discrepancias entre expectativa y realidad
- Profesionalismo mejorado

### 4. **Flexibilidad** 🔧
- Sistema usa color real de la base de datos
- Fácil agregar/modificar colores sin cambiar código
- Soporte para cualquier color hexadecimal

### 5. **Compatibilidad hacia Atrás** ♻️
- Si no se proporciona color, usa azul por defecto
- No rompe funcionalidad existente
- Calibraciones siguen funcionando normalmente

---

## Validación

### ✅ Checklist de Verificación

- [x] Parámetro `colorId` agregado a `analyzeSTLFile`
- [x] Consulta a base de datos implementada
- [x] Conversión hexadecimal a THREE.Color funcional
- [x] Prop `colorId` agregada a STLUploader
- [x] Quotes.tsx pasa `selectedColor` correctamente
- [x] CalibrationSettings.tsx actualizado con todos los parámetros
- [x] Color por defecto funciona si no hay colorId
- [x] Logs agregados para debugging (🎨)
- [x] TypeScript compila sin errores
- [x] Retrocompatibilidad mantenida

---

## Pruebas Recomendadas

### Prueba 1: Color Estándar
```
1. Ir a /cotizaciones
2. Seleccionar material "PLA"
3. Seleccionar color "Rojo"
4. Subir archivo STL
5. Verificar: Vista previa en rojo ✓
```

### Prueba 2: Color Claro (Blanco)
```
1. Seleccionar color "Blanco"
2. Subir archivo STL
3. Verificar: Vista previa en blanco sobre fondo gris ✓
```

### Prueba 3: Color Oscuro (Negro)
```
1. Seleccionar color "Negro"
2. Subir archivo STL
3. Verificar: Vista previa en negro con iluminación adecuada ✓
```

### Prueba 4: Sin Seleccionar Color
```
1. NO seleccionar color
2. Subir archivo STL
3. Verificar: Error "Selecciona material y color" ✓
```

### Prueba 5: Calibración (Admin)
```
1. Ir a /admin/calibracion
2. Subir archivo STL de referencia
3. Verificar: Vista previa en azul por defecto ✓
```

### Prueba 6: Consola del Navegador
```
1. Abrir DevTools → Console
2. Realizar análisis con color seleccionado
3. Verificar log: "🎨 Color de vista previa: #FF0000" ✓
```

---

## Notas Técnicas

### Conversión de Colores
```typescript
// Entrada: String hexadecimal
const hexColor = "#FF5733";

// Conversión: THREE.Color
const color = new THREE.Color(hexColor);

// Resultado: RGB normalizado (0-1)
// color.r = 1.0
// color.g = 0.341
// color.b = 0.2
```

### Iluminación de la Escena
La escena 3D usa:
- **Luz ambiental**: Ilumina uniformemente (evita sombras duras)
- **Luz direccional 1**: Desde (1, 1, 1) - luz principal
- **Luz direccional 2**: Desde (-1, -1, -1) - luz de relleno
- **Material Phong**: Refleja luz de manera realista

Esto asegura que **todos los colores se vean correctamente**, incluso blancos y negros.

---

## Archivos Modificados

1. **src/lib/stlAnalyzer.ts**
   - Línea 286: Nuevo parámetro `colorId`
   - Líneas 637-653: Consulta y uso del color
   - Línea 823: Parámetro en `generatePreviewImage`
   - Líneas 833-840: Conversión y aplicación del color

2. **src/components/STLUploader.tsx**
   - Línea 12: Nueva prop `colorId` en interface
   - Línea 19: Recibe prop `colorId`
   - Línea 91: Pasa `colorId` a `analyzeSTLFile`

3. **src/pages/Quotes.tsx**
   - Línea 522: Pasa `selectedColor` a STLUploader

4. **src/pages/admin/CalibrationSettings.tsx**
   - Líneas 120-128: Actualiza llamada con todos los parámetros

---

## Conclusión

✅ **Sistema Implementado Exitosamente**

El sistema ahora:
1. ✅ Detecta el color seleccionado por el usuario
2. ✅ Consulta el código hexadecimal desde la base de datos
3. ✅ Renderiza la vista previa 3D con ese color
4. ✅ Usa color por defecto si no se selecciona
5. ✅ Mantiene compatibilidad con calibraciones
6. ✅ Compila sin errores de TypeScript

**Estado**: LISTO PARA PRODUCCIÓN

**Próximo paso**: Realizar pruebas con usuarios reales en diferentes navegadores y verificar que todos los colores se visualicen correctamente.

---

**Firma de Implementación:** ✅ Lovable AI - 2025-11-05
