# Sistema de Personalización de Colores por Sección de Producto

## Objetivo
Permitir que los administradores definan secciones personalizables en productos (ej: "cabeza del gato", "cuerpo del gato") donde los clientes pueden seleccionar colores específicos para cada parte, con colores disponibles configurables por el administrador.

## Arquitectura de Base de Datos

### Tabla: `product_customization_sections`
Almacena las secciones personalizables de cada producto.

```sql
CREATE TABLE product_customization_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL, -- "Cabeza", "Cuerpo", etc.
  display_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT false, -- Si el cliente debe seleccionar obligatoriamente
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_customization_sections_product ON product_customization_sections(product_id);
```

### Tabla: `product_section_colors`
Define qué colores están disponibles para cada sección.

```sql
CREATE TABLE product_section_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES product_customization_sections(id) ON DELETE CASCADE,
  color_id UUID NOT NULL REFERENCES colors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(section_id, color_id)
);

CREATE INDEX idx_section_colors_section ON product_section_colors(section_id);
```

## Flujo de Trabajo

### En Panel de Administración (ProductsAdminEnhanced)

1. **Crear/Editar Producto**: Añadir pestaña "Personalización por Secciones"
2. **Gestionar Secciones**:
   - Botón "Añadir Sección de Color"
   - Para cada sección:
     - Nombre de la parte (ej: "Cabeza", "Cuerpo")
     - Checkbox de colores disponibles (filtrados por material del producto)
     - Checkbox "Obligatorio" (si el cliente debe seleccionar)
     - Orden de visualización
     - Botón eliminar sección
3. **Validación**: Las secciones son completamente opcionales - puede crear producto sin ellas

### En Página Pública de Producto (ProductDetail)

1. **Mostrar Secciones**: Si el producto tiene secciones configuradas:
   - Después de selector de material
   - Para cada sección mostrar:
     - Título: "Color para [nombre de sección]"
     - Dropdown con colores disponibles para esa sección
     - Indicador si es obligatorio
2. **Comportamiento**:
   - Si no hay secciones, mostrar selector de color único actual
   - Si hay secciones, ocultar selector de color único
   - Validar secciones obligatorias antes de añadir al carrito

### Almacenamiento en Carrito

Actualizar estructura de `cart_items` para incluir selecciones por sección:

```typescript
interface CartItem {
  // ... campos existentes
  selected_color?: string; // Para productos sin secciones (backward compatibility)
  color_selections?: {
    section_id: string;
    section_name: string;
    color_id: string;
    color_name: string;
  }[]; // Para productos con secciones
}
```

## Implementación por Fases

### Fase 1: Base de Datos ✓
- Crear tablas `product_customization_sections` y `product_section_colors`
- Policies RLS apropiadas
- Triggers de auditoría

### Fase 2: Panel Admin
- UI para gestionar secciones en ProductsAdminEnhanced
- CRUD completo de secciones
- Asignación de colores por sección

### Fase 3: Frontend Público
- Mostrar secciones en ProductDetail
- Selección múltiple de colores
- Validación de campos obligatorios
- Actualizar lógica de carrito

### Fase 4: Integración Completa
- Mostrar selecciones en carrito
- Incluir en cotizaciones
- Mostrar en pedidos/facturas
- Emails con detalles de personalización

### Fase 5: Verificación Rich Text
- Verificar que RichTextDisplay muestre imágenes correctamente
- Verificar enlaces y formato en descripción de productos

## Casos de Uso

### Caso 1: Producto con Múltiples Secciones
**Admin configura**:
- Producto: "Gato decorativo"
- Sección 1: "Cabeza" → Colores: Rojo, Azul, Verde (Obligatorio)
- Sección 2: "Cuerpo" → Colores: Blanco, Negro, Gris (Obligatorio)
- Sección 3: "Accesorios" → Colores: Todos (Opcional)

**Cliente ve**:
- Selector "Color para Cabeza" con 3 opciones
- Selector "Color para Cuerpo" con 3 opciones
- Selector "Color para Accesorios" con todos los colores (opcional)

### Caso 2: Producto Sin Secciones (Comportamiento Actual)
**Admin configura**:
- Producto: "Pieza estándar"
- Sin secciones definidas

**Cliente ve**:
- Selector de color único tradicional (como funciona actualmente)

### Caso 3: Producto Mixto
**Admin configura**:
- Producto con algunas piezas personalizables y otras no
- Sección opcional permite al cliente elegir o usar predeterminado

## Beneficios

1. **Flexibilidad Total**: Cada producto puede tener 0, 1 o múltiples secciones
2. **Control de Colores**: Admin decide exactamente qué colores están disponibles para cada parte
3. **Backward Compatible**: Productos sin secciones siguen funcionando igual
4. **Experiencia Clara**: Cliente entiende exactamente qué parte está personalizando
5. **Datos Estructurados**: Fácil de procesar en pedidos, facturas y producción

## Consideraciones Técnicas

### Performance
- Índices en tablas de secciones
- Carga lazy de colores por sección
- Cache de configuraciones de producto

### Validación
- Frontend: Validar secciones obligatorias
- Backend: Validar colores pertenecen a material seleccionado
- Validar que section_id corresponde al producto

### UI/UX
- Diseño claro diferenciando cada sección
- Indicadores visuales de campos obligatorios
- Preview de selecciones antes de añadir al carrito
- Feedback inmediato de validación

## Próximos Pasos

1. ✅ Crear migraciones de base de datos
2. Actualizar ProductsAdminEnhanced con UI de secciones
3. Actualizar ProductDetail para mostrar secciones
4. Actualizar lógica de carrito
5. Integrar en flujo completo de pedidos
6. Verificar rich text con imágenes
7. Testing exhaustivo en 3 idiomas
