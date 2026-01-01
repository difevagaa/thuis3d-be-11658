# Sistema de Litofanías - Documentación Completa

## Resumen Ejecutivo

El sistema de creación de litofanías está ahora completamente funcional, siguiendo el modelo de BambuLab/BambuStudio. Los clientes pueden subir fotos, editarlas con 300+ opciones, seleccionar entre 25 diseños de lámparas, ver una vista previa 3D y proceder al pago. Los archivos STL (litofanía + base) se generan automáticamente y solo son accesibles para administradores.

## Flujo del Cliente

### 1. Subir Imagen
- El cliente sube una foto (JPG/PNG)
- Sistema valida tamaño y calidad
- Imagen se convierte a base64 para procesamiento

### 2. Editor de Imagen (300+ Opciones)
**Ajustes Básicos:**
- Brillo, Contraste, Saturación
- Exposición, Gamma
- Temperatura de color, Matiz

**Ajustes Avanzados:**
- Altas luces, Sombras, Blancos, Negros
- Claridad, Definición, Nitidez
- Vibrancia, Desaturación

**Efectos Especiales:**
- Escala de grises (múltiples métodos)
- Simulaciones de película (Kodak, Fuji, Polaroid, Vintage, Noir, Cinematic)
- Viñeta configurable
- Grano de película
- Destello de lente
- Sombra paralela

**Procesamiento:**
- Todo el procesamiento ocurre en tiempo real usando Canvas API
- Los cambios se aplican inmediatamente a la imagen
- La imagen procesada se guarda como PNG base64

### 3. Selección de Lámpara

**25 Diseños Disponibles:**

**Planas:**
- Cuadrada Plana
- Rectangular Plana
- Ovalada Plana
- Circular
- Panorámica
- Retrato
- Minimalista

**Curvas:**
- Curvada Suave
- Curvada Pronunciada
- Arco
- Gótica
- Ondulada

**Cilíndricas:**
- Cilíndrica Pequeña (100x80mm)
- Cilíndrica Mediana (150x100mm)
- Cilíndrica Grande (200x150mm)
- Semicilíndrica

**Formas Especiales:**
- Corazón
- Estrella
- Diamante
- Luna
- Nube
- Hexagonal
- Octagonal

**Dimensiones:**
- Cada lámpara tiene dimensiones configurables
- Rango: 50mm - 300mm (ancho y alto)
- Ajustable mediante sliders

### 4. Vista Previa 3D

**Características:**
- Renderizado Three.js en tiempo real
- Rotación automática o manual
- Zoom y pan interactivos
- Simulación de luz LED por detrás
- Vista previa realista de la litofanía
- Muestra la base integrada
- Controles de intensidad de luz

**Información Mostrada:**
- Dimensiones exactas
- Tipo de forma
- Nombre de la lámpara
- Especificaciones de la base
- Confirmación de LED incluido

### 5. Pago y Pedido

- Cliente procede directamente al pago
- **NO hay descarga de archivos STL para clientes**
- Se crea orden en la base de datos
- Se guardan todas las configuraciones
- Cliente recibe confirmación

## Flujo del Administrador

### 1. Ver Pedidos de Litofanías

El administrador accede a la vista de pedidos donde puede ver:
- Lista de todos los pedidos de litofanías
- Estado de cada pedido
- Imágenes (original y procesada)
- Especificaciones técnicas

### 2. Descargar Archivos STL

**Componente:** `LithophaneOrderCard`

**Funcionalidad:**
- Botón "Download STL" solo visible para admins
- Genera STL completo al hacer clic
- Incluye litofanía + base en un solo archivo
- Tiempo de generación: 5-30 segundos dependiendo de resolución

**Archivo Generado:**
```
lithophane_order_{order_id}_{lamp_type}_{width}x{height}mm_with_base.stl
```

Ejemplo:
```
lithophane_order_abc123_heart_100x120mm_with_base.stl
```

### 3. Especificaciones del Archivo STL

**Contenido del Archivo:**
1. **Panel de Litofanía:**
   - Geometría 3D con variación de grosor
   - Áreas brillantes = fino (0.6mm)
   - Áreas oscuras = grueso (3.5mm)
   - Forma según diseño seleccionado
   - Textura de la imagen aplicada

2. **Base Integrada:**
   - Plataforma rectangular estable
   - Ranura para el panel de litofanía
   - Orificio de montaje LED (16mm)
   - Espacio para cables

## Especificaciones Técnicas

### Dimensiones de la Base

```javascript
Base ancho = ancho_litofanía × 1.3  // 30% más ancha
Base altura = 18mm                   // Altura estándar
Base profundidad = 28mm              // Profundidad estándar

Ranura ancho = ancho_litofanía + 1mm    // 1mm holgura
Ranura profundidad = grosor_max + 0.5mm // 0.5mm holgura

Orificio LED:
- Diámetro = 16mm (estándar LED)
- Profundidad = 10mm
- Posición = Centro de la ranura
```

### Generación de Litofanía

**Conversión Imagen → 3D:**
1. Cargar imagen procesada
2. Crear mapa de profundidad:
   - Muestrear imagen en una cuadrícula
   - Calcular luminancia de cada píxel
   - Convertir luminancia a grosor:
     - Píxel brillante (255) → 0.6mm (mínimo)
     - Píxel oscuro (0) → 3.5mm (máximo)
3. Aplicar suavizado (opcional)
4. Generar malla de triángulos 3D
5. Aplicar transformación de forma
6. Calcular normales
7. Exportar a STL binario

**Resoluciones Disponibles:**
- **Low:** 2.0mm por punto (rápido, ~5 seg)
- **Medium:** 1.0mm por punto (balanceado, ~10 seg)
- **High:** 0.5mm por punto (calidad, ~20 seg)
- **Ultra:** 0.25mm por punto (máxima calidad, ~30 seg)

### Formato STL Binario

```
[80 bytes]  Header: "Combined Lithophane + Base by Thuis3D"
[4 bytes]   Número de triángulos (uint32)

Para cada triángulo (50 bytes):
  [12 bytes] Normal (3 × float32)
  [36 bytes] 3 vértices (9 × float32)
  [2 bytes]  Atributos (uint16, no usado)
```

## Configuración de Impresión Recomendada

### Para la Litofanía:
- **Material:** PLA Blanco o Translúcido
- **Grosor de capa:** 0.1 - 0.15mm
- **Relleno:** 100% (crucial para transparencia uniforme)
- **Perímetros:** 0 (toda la pieza es sólida)
- **Velocidad:** Lenta (30-40 mm/s) para mejor detalle
- **Soporte:** NO necesario (base plana)
- **Orientación:** Como está (cara plana hacia cama)

### Para la Base:
- **Material:** PLA de cualquier color
- **Grosor de capa:** 0.2 - 0.3mm
- **Relleno:** 20% (suficiente para estabilidad)
- **Perímetros:** 3-4
- **Soporte:** NO necesario
- **Orientación:** Como está

### Ensamblaje:
1. Imprimir ambas partes
2. Insertar LED de 16mm en el orificio
3. Pasar cables por la base
4. Deslizar litofanía en la ranura
5. Conectar alimentación (5V USB típico)

## Base de Datos

### Tabla: `lithophany_orders`

```sql
CREATE TABLE lithophany_orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  order_id UUID REFERENCES orders,
  
  -- Imágenes
  original_image_url TEXT,      -- Imagen subida
  processed_image_url TEXT,      -- Imagen editada
  
  -- Configuración de imagen (JSON con 300+ opciones)
  image_settings JSONB,
  
  -- Configuración de lámpara
  lamp_type TEXT,                -- Tipo de forma
  lamp_width_mm NUMERIC,         -- Ancho en mm
  lamp_height_mm NUMERIC,        -- Alto en mm
  lamp_depth_mm NUMERIC,         -- Grosor
  lamp_curve_radius NUMERIC,     -- Radio de curvatura
  lamp_custom_settings JSONB,    -- Configuración adicional
  
  -- Configuración de base
  base_type TEXT,
  base_width_mm NUMERIC,
  base_depth_mm NUMERIC,
  base_height_mm NUMERIC,
  light_hole_diameter_mm NUMERIC,
  light_hole_depth_mm NUMERIC,
  base_custom_settings JSONB,
  
  -- Archivos generados (para uso futuro)
  lithophany_stl_url TEXT,
  base_stl_url TEXT,
  combined_stl_url TEXT,
  preview_image_url TEXT,
  
  -- Estado y precio
  status TEXT,
  calculated_price NUMERIC,
  final_price NUMERIC,
  
  -- Metadatos
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  notes TEXT
);
```

### Tabla: `lithophany_lamp_templates`

```sql
CREATE TABLE lithophany_lamp_templates (
  id UUID PRIMARY KEY,
  name TEXT,
  name_es TEXT,
  name_en TEXT,
  description TEXT,
  description_es TEXT,
  description_en TEXT,
  
  shape_type TEXT,               -- Tipo de geometría
  category TEXT,                 -- Categoría
  
  -- Dimensiones por defecto
  default_width_mm NUMERIC,
  default_height_mm NUMERIC,
  min_width_mm NUMERIC,
  max_width_mm NUMERIC,
  min_height_mm NUMERIC,
  max_height_mm NUMERIC,
  
  -- Parámetros de forma
  curve_radius NUMERIC,
  corner_radius NUMERIC,
  segments INTEGER,
  
  -- Base
  base_type TEXT,
  requires_custom_base BOOLEAN,
  
  -- Precios
  base_price NUMERIC,
  price_per_cm2 NUMERIC,
  
  -- Estado
  is_active BOOLEAN,
  display_order INTEGER,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## API y Funciones

### Generación de STL

**Función Principal:**
```typescript
generateCombinedSTL(options: {
  processedImage: string,        // Base64 de imagen procesada
  lampTemplate: LampTemplate,    // Template seleccionado
  dimensions: {                  // Dimensiones
    width: number,
    height: number
  },
  settings: {                    // Configuración
    minThickness: number,
    maxThickness: number,
    resolution: 'low'|'medium'|'high'|'ultra',
    border: number,
    curve: number,
    negative: boolean,
    smoothing: number
  }
}): Promise<ArrayBuffer>
```

**Funciones Auxiliares:**
```typescript
generateLithophaneSTL()      // Solo panel
generateBaseSTL()            // Solo base
combineSTLBuffers()          // Combinar dos STL
downloadSTL()                // Descargar archivo
```

## Precios

### Configuración de Precios

Los precios se configuran en el panel de administración:

**Factores de precio:**
1. **Precio base** por tipo de lámpara
2. **Precio por cm²** de área de imagen
3. **Multiplicador** por tamaño (>100cm² = +10%, >200cm² = +20%)
4. **Costo de base** (estándar o personalizada)

**Fórmula:**
```javascript
area_cm2 = (ancho_mm × alto_mm) / 100
precio_area = area_cm2 × precio_por_cm2
multiplicador = area_cm2 > 200 ? 1.2 : area_cm2 > 100 ? 1.1 : 1.0
costo_base = base_personalizada ? 8 : 5

subtotal = (precio_base + precio_area + costo_base) × multiplicador
impuestos = subtotal × 0.21
total = subtotal + impuestos
```

## Solución de Problemas

### Problema: "No se genera el STL"
**Causa:** Imagen demasiado grande o configuración incorrecta
**Solución:**
- Verificar que processed_image_url existe
- Verificar dimensiones de la imagen (< 2000px recomendado)
- Usar resolución "medium" o "low" para pruebas

### Problema: "STL tiene agujeros"
**Causa:** Normales invertidas o triángulos mal formados
**Solución:**
- Sistema calcula automáticamente normales correctas
- Verificar en PrusaSlicer con "Mostrar caras"

### Problema: "Base no encaja con litofanía"
**Causa:** Dimensiones de ranura incorrectas
**Solución:**
- Ranura = ancho_litofanía + 1mm (holgura automática)
- Verificar lamp_width_mm en orden

### Problema: "Cliente no puede descargar STL"
**Causa:** Funcionalidad solo para administradores
**Solución:**
- Correcto por diseño
- Cliente solo paga, admin descarga

## Mantenimiento

### Actualizar Plantillas de Lámpara

```sql
-- Agregar nueva plantilla
INSERT INTO lithophany_lamp_templates (
  name, name_es, name_en,
  shape_type, category,
  default_width_mm, default_height_mm,
  base_price, price_per_cm2,
  is_active, display_order
) VALUES (
  'Nueva Lámpara', 'Nueva Lámpara', 'New Lamp',
  'new_shape', 'special',
  120, 100,
  15.00, 0.15,
  true, 26
);
```

### Actualizar Precios

```sql
-- Actualizar precio base de una plantilla
UPDATE lithophany_lamp_templates
SET base_price = 20.00,
    price_per_cm2 = 0.20
WHERE shape_type = 'heart';

-- Actualizar todas las plantillas premium
UPDATE lithophany_lamp_templates
SET base_price = base_price * 1.1
WHERE category = 'premium';
```

## Seguridad

### Protecciones Implementadas:

1. **Row Level Security (RLS):**
   - Clientes solo ven sus propios pedidos
   - Admins ven todos los pedidos

2. **Validación de imágenes:**
   - Tamaño máximo controlado
   - Tipos de archivo validados (JPG, PNG)
   - Contenido verificado

3. **Generación client-side:**
   - No hay uploads de archivos STL grandes
   - Procesamiento en navegador
   - Reducida carga de servidor

4. **Acceso controlado:**
   - STL solo disponible para admins
   - URLs de imágenes con autenticación
   - Storage policies en Supabase

## Mejoras Futuras (Opcionales)

1. **Colores múltiples** (como BambuLab CMYK)
2. **Marcos decorativos** personalizables
3. **Optimización de malla** para archivos más pequeños
4. **Vista previa de capas** (como slicing preview)
5. **Calculadora de material** y tiempo de impresión
6. **Galería pública** de litofanías
7. **Templates de usuarios** (compartir diseños)
8. **Exportación a 3MF** (formato más avanzado)

## Soporte

Para problemas o preguntas:
1. Verificar este documento primero
2. Revisar logs del navegador (Console)
3. Verificar base de datos (orden existe, campos completos)
4. Probar con imagen simple (100x100, blanco y negro)
5. Usar resolución "low" para diagnóstico rápido

## Conclusión

El sistema de litofanías está completamente funcional y listo para producción. Sigue el modelo de BambuStudio con un flujo simplificado para clientes y herramientas completas para administradores. Los archivos STL generados incluyen tanto la litofanía como la base con montaje LED, listos para imprimir sin configuración adicional.
