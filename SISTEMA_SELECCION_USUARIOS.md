# Sistema de Selección de Usuarios Mejorado

## Descripción General

Se ha implementado un componente reutilizable `UserSearchSelector` que reemplaza el sistema de selección de usuarios en todo el panel de administración. Este nuevo sistema permite búsqueda eficiente por nombre o email sin cargar todos los usuarios de golpe.

## Componente: UserSearchSelector

### Ubicación
```
src/components/admin/UserSearchSelector.tsx
```

### Características

1. **Búsqueda en Tiempo Real**
   - Filtra usuarios por nombre o email mientras se escribe
   - No es necesario cargar todos los usuarios en memoria
   - Límite de 100 usuarios por consulta para mantener rendimiento

2. **Interfaz Intuitiva**
   - Usa el componente Command de shadcn/ui para mejor UX
   - Muestra información clara: nombre completo y email
   - Opción de mostrar puntos de lealtad cuando sea relevante

3. **Modo con Puntos**
   - Parámetro `includePoints` para mostrar saldo de puntos
   - Útil para ajustes manuales en el sistema de lealtad
   - Ordena usuarios por balance de puntos cuando está activo

### Props del Componente

```typescript
interface UserSearchSelectorProps {
  value: string;              // ID del usuario seleccionado
  onValueChange: (userId: string) => void;  // Callback al cambiar
  label?: string;             // Etiqueta del campo (default: "Usuario")
  placeholder?: string;        // Placeholder del buscador
  includePoints?: boolean;    // Mostrar info de puntos de lealtad
  className?: string;         // Clases CSS adicionales
}
```

### Ejemplo de Uso

```tsx
// Uso básico
<UserSearchSelector
  value={selectedUserId}
  onValueChange={setSelectedUserId}
  placeholder="Buscar usuario por nombre o email..."
/>

// Con puntos de lealtad
<UserSearchSelector
  value={userId}
  onValueChange={setUserId}
  label="Usuario"
  includePoints={true}
  placeholder="Seleccionar usuario..."
/>
```

## Páginas Actualizadas

### 1. Sistema de Lealtad (`/admin/loyalty`)
- **Ajuste Manual de Puntos**: Usa el selector con puntos visibles
- Permite buscar usuarios y ver su balance actual

### 2. Mensajes (`/admin/messages`)
- **Nuevo Mensaje**: Selección de destinatario con búsqueda
- Facilita encontrar usuarios específicos para enviar mensajes

### 3. Crear Pedido (`/admin/orders/create`)
- **Selección de Cliente**: Busca clientes por nombre o email
- Carga automáticamente datos del cliente al seleccionar

### 4. Facturas (`/admin/invoices`)
- **Nueva Factura**: Sistema de búsqueda para asignar cliente
- Reemplaza el input de búsqueda + select por un solo componente

## Beneficios

### Rendimiento
- ✅ No carga todos los usuarios al abrir el selector
- ✅ Límite de 100 resultados máximo por consulta
- ✅ Búsqueda eficiente en el cliente sin re-consultas constantes

### Experiencia de Usuario
- ✅ Búsqueda intuitiva mientras se escribe
- ✅ Interfaz consistente en todo el panel admin
- ✅ Visualización clara de información relevante
- ✅ Indicador de usuario seleccionado actual

### Mantenibilidad
- ✅ Componente reutilizable en toda la aplicación
- ✅ Fácil de actualizar en un solo lugar
- ✅ Props flexibles para diferentes casos de uso
- ✅ TypeScript para seguridad de tipos

## Consultas a la Base de Datos

### Sin Puntos
```sql
SELECT id, full_name, email 
FROM profiles 
ORDER BY full_name 
LIMIT 100
```

### Con Puntos
```sql
-- Primera consulta
SELECT user_id, points_balance, lifetime_points 
FROM loyalty_points 
ORDER BY points_balance DESC 
LIMIT 100

-- Segunda consulta (con IDs de la primera)
SELECT id, full_name, email 
FROM profiles 
WHERE id IN (...)
```

## Futuras Mejoras Sugeridas

1. **Paginación Infinita**
   - Cargar más usuarios al hacer scroll
   - Implementar con react-query para mejor caching

2. **Búsqueda del Lado del Servidor**
   - Para aplicaciones con muchos usuarios (>1000)
   - Implementar con full-text search en PostgreSQL

3. **Filtros Adicionales**
   - Por rol de usuario
   - Por estado (activo/inactivo)
   - Por rango de puntos

4. **Historial de Selecciones**
   - Recordar usuarios seleccionados recientemente
   - Acceso rápido a usuarios frecuentes

## Notas Técnicas

- El componente maneja automáticamente usuarios sin nombre (muestra "Sin nombre")
- Los usuarios sin email se muestran con string vacío
- La búsqueda es case-insensitive
- El componente es completamente controlado (controlled component)
- Usa Popover de Radix UI para mejor accesibilidad
