# Guía de Pruebas del Sistema de Personalización Avanzado

## Resumen

Este documento describe las pruebas necesarias para validar el sistema avanzado de personalización de colores del panel de administración.

## 1. Pruebas de Funcionalidad

### 1.1 Paletas Profesionales

**Objetivo:** Verificar que las 21 paletas profesionales se aplican correctamente.

**Pasos:**
1. Acceder al panel de administración
2. Navegar a **Personalizador del Sitio** > **Paletas**
3. Para cada paleta:
   - [ ] Hacer clic en la tarjeta de la paleta
   - [ ] Verificar vista previa instantánea
   - [ ] Verificar que los colores se aplican al hacer clic
   - [ ] Hacer clic en "Guardar Paleta Seleccionada"
   - [ ] Recargar la página
   - [ ] Confirmar que la paleta persiste

**Paletas a probar:**
- [ ] Océano Azul
- [ ] Esmeralda Verde
- [ ] Púrpura Real
- [ ] Carmesí Rojo
- [ ] Pizarra Gris
- [ ] Menta Fresca
- [ ] Azul Marino y Oro
- [ ] Rosa Rosado
- [ ] Negro Carbón
- [ ] Azul Zafiro
- [ ] Ámbar Dorado
- [ ] Lavanda Púrpura *(nueva)*
- [ ] Océano Turquesa *(nueva)*
- [ ] Naranja Atardecer *(nueva)*
- [ ] Verde Bosque *(nueva)*
- [ ] Coral Rosado *(nueva)*
- [ ] Índigo Nocturno *(nueva)*
- [ ] Borgoña Vino *(nueva)*
- [ ] Azul Cielo *(nueva)*
- [ ] Verde Oliva *(nueva)*
- [ ] Magenta Fucsia *(nueva)*
- [ ] Bronce Cobre *(nueva)*

**Criterios de éxito:**
- ✅ Todas las paletas se aplican correctamente
- ✅ Los cambios persisten después de recargar
- ✅ El modo claro y oscuro funcionan correctamente
- ✅ No hay flickering o parpadeos visuales

---

### 1.2 Colores Avanzados por Sección

**Objetivo:** Verificar la personalización de colores por sección.

**Pasos:**
1. Navegar a **Personalizador del Sitio** > **Colores Avanzados**

#### Header
- [ ] Cambiar color de fondo del header
- [ ] Cambiar color de texto del header
- [ ] Verificar vista previa en tiempo real
- [ ] Verificar indicador de contraste (debe mostrar ratio y nivel WCAG)
- [ ] Guardar cambios
- [ ] Recargar y verificar persistencia

#### Sidebar
- [ ] Cambiar color de fondo del sidebar
- [ ] Cambiar color de texto del sidebar
- [ ] Cambiar color de elemento activo
- [ ] Verificar vista previa de menú
- [ ] Verificar contraste en todas las combinaciones
- [ ] Guardar y verificar persistencia

#### Menús de Inicio
- [ ] Cambiar color de fondo de menús
- [ ] Cambiar color de texto
- [ ] Cambiar color hover
- [ ] Verificar interacción hover en vista previa
- [ ] Verificar contraste
- [ ] Guardar y verificar persistencia

**Criterios de éxito:**
- ✅ Todos los colores se aplican inmediatamente
- ✅ Las vistas previas reflejan los cambios
- ✅ El verificador de contraste muestra información correcta
- ✅ Alertas de bajo contraste funcionan
- ✅ Los cambios persisten

---

### 1.3 Verificador de Contraste

**Objetivo:** Validar el verificador interactivo de contraste WCAG.

**Pasos:**
1. Navegar a **Personalizador del Sitio** > **Contraste**
2. Probar combinaciones conocidas:

**Combinación 1: Negro sobre Blanco**
- [ ] Foreground: `#000000`
- [ ] Background: `#FFFFFF`
- [ ] Ratio esperado: ~21:1
- [ ] Nivel esperado: AAA

**Combinación 2: Gris oscuro sobre Blanco**
- [ ] Foreground: `#767676`
- [ ] Background: `#FFFFFF`
- [ ] Ratio esperado: ~4.5:1
- [ ] Nivel esperado: AA (mínimo)

**Combinación 3: Gris claro sobre Blanco (fallo)**
- [ ] Foreground: `#C0C0C0`
- [ ] Background: `#FFFFFF`
- [ ] Ratio esperado: ~2.5:1
- [ ] Nivel esperado: FAIL o solo texto grande

**Criterios de éxito:**
- ✅ Los cálculos de ratio son correctos
- ✅ Los badges de nivel WCAG son correctos
- ✅ La vista previa muestra el contraste real
- ✅ Las recomendaciones son apropiadas

---

## 2. Pruebas de Compatibilidad

### 2.1 Navegadores

Probar en los siguientes navegadores:

**Escritorio:**
- [ ] Chrome (última versión)
- [ ] Firefox (última versión)
- [ ] Safari (última versión)
- [ ] Edge (última versión)

**Móvil:**
- [ ] Chrome Android
- [ ] Safari iOS
- [ ] Firefox Android

**Funcionalidad a verificar:**
- [ ] Selectores de color funcionan
- [ ] Vistas previas se renderizan correctamente
- [ ] Guardado funciona
- [ ] Persistencia funciona

---

### 2.2 Modos de Visualización

**Modo Claro:**
- [ ] Paletas se aplican correctamente
- [ ] Contraste es legible
- [ ] Colores personalizados funcionan

**Modo Oscuro:**
- [ ] Paletas cambian automáticamente
- [ ] Contraste es legible
- [ ] Colores personalizados funcionan
- [ ] Transición entre modos es suave

**Criterios de éxito:**
- ✅ Ambos modos funcionan sin errores
- ✅ El cambio entre modos es instantáneo
- ✅ No hay flickering

---

### 2.3 Responsividad

**Resoluciones a probar:**

**Móvil:**
- [ ] 375x667 (iPhone SE)
- [ ] 414x896 (iPhone 11 Pro Max)
- [ ] 360x740 (Android promedio)

**Tablet:**
- [ ] 768x1024 (iPad)
- [ ] 1024x768 (iPad horizontal)

**Escritorio:**
- [ ] 1366x768 (laptop estándar)
- [ ] 1920x1080 (Full HD)
- [ ] 2560x1440 (QHD)

**Elementos a verificar:**
- [ ] Selectores de color son accesibles
- [ ] Vistas previas se adaptan al tamaño
- [ ] Tabs no se rompen
- [ ] Botones son accesibles
- [ ] Texto es legible

---

## 3. Pruebas de Rendimiento

### 3.1 Carga Inicial

**Objetivo:** Verificar que la carga de paletas no afecta el rendimiento.

**Métricas:**
- [ ] Tiempo de carga de página < 3 segundos
- [ ] Aplicación de paleta desde localStorage < 100ms
- [ ] Sin bloqueos de UI

### 3.2 Cambio de Paleta

**Objetivo:** Verificar que cambiar paletas es instantáneo.

**Métricas:**
- [ ] Aplicación de nueva paleta < 200ms
- [ ] Actualización de vista previa < 100ms
- [ ] Sin parpadeos visuales

---

## 4. Pruebas de Accesibilidad

### 4.1 Contraste WCAG

**Verificar usando el script de validación:**

```bash
node scripts/validate-palettes.js
```

**Criterios:**
- [ ] Todas las paletas pasan validación AA
- [ ] Al menos 50% pasan validación AAA
- [ ] No hay combinaciones con contraste < 3:1

### 4.2 Navegación por Teclado

**Objetivo:** Verificar accesibilidad por teclado.

**Pasos:**
- [ ] Navegar con Tab a través de todos los controles
- [ ] Seleccionar paletas con Enter
- [ ] Cambiar colores con selectores usando teclado
- [ ] Guardar con Enter

**Criterios de éxito:**
- ✅ Todos los controles son accesibles por teclado
- ✅ El orden de tabulación es lógico
- ✅ Los elementos tienen foco visible

### 4.3 Lectores de Pantalla

**Objetivo:** Verificar que la información es accesible.

**Probar con:**
- [ ] NVDA (Windows)
- [ ] JAWS (Windows)
- [ ] VoiceOver (macOS/iOS)

**Elementos a verificar:**
- [ ] Nombres de paletas son leídos
- [ ] Descripciones son leídas
- [ ] Estados de contraste son anunciados
- [ ] Botones tienen labels apropiados

---

## 5. Pruebas de Integración

### 5.1 Base de Datos

**Objetivo:** Verificar que los cambios se guardan correctamente en Supabase.

**Pasos:**
1. Aplicar una paleta
2. Guardar
3. Verificar en Supabase que el campo `theme_preset` se actualizó
4. Cambiar colores avanzados
5. Guardar
6. Verificar campos: `header_bg_color`, `sidebar_bg_color`, etc.

**Criterios de éxito:**
- ✅ Todos los campos se guardan correctamente
- ✅ El timestamp `updated_at` se actualiza
- ✅ No hay duplicados

### 5.2 Real-time Updates

**Objetivo:** Verificar sincronización en tiempo real.

**Pasos:**
1. Abrir el panel en dos pestañas
2. Cambiar paleta en pestaña 1
3. Verificar actualización en pestaña 2

**Criterios de éxito:**
- ✅ Los cambios se reflejan en ambas pestañas
- ✅ No hay conflictos
- ✅ La sincronización es rápida (< 2 segundos)

---

## 6. Pruebas de Regresión

### 6.1 Funcionalidad Existente

**Verificar que no se rompió:**
- [ ] Personalización de tipografía funciona
- [ ] Subida de logos funciona
- [ ] Configuración de empresa funciona
- [ ] Redes sociales funcionan
- [ ] Otras secciones del panel admin funcionan

### 6.2 Compatibilidad con Paletas Legacy

**Objetivo:** Verificar que las personalizaciones antiguas siguen funcionando.

**Pasos:**
1. Si existe personalización con colores individuales legacy
2. Verificar que se cargan correctamente
3. Aplicar nueva paleta
4. Verificar que sobrescribe los colores legacy
5. Volver a colores individuales (si es posible)

---

## 7. Checklist de Validación Final

Antes de considerar el sistema completo, verificar:

**Funcionalidad Core:**
- [ ] 21 paletas profesionales funcionan
- [ ] Colores avanzados por sección funcionan
- [ ] Verificador de contraste funciona
- [ ] Persistencia funciona

**Calidad:**
- [ ] Build exitoso sin errores
- [ ] Linting sin errores nuevos
- [ ] Validación de palettes pasa
- [ ] Documentación completa

**Accesibilidad:**
- [ ] Contraste WCAG AA cumplido
- [ ] Navegación por teclado funciona
- [ ] Lectores de pantalla compatibles

**Rendimiento:**
- [ ] Carga inicial rápida
- [ ] Cambios instantáneos
- [ ] Sin memory leaks

**Compatibilidad:**
- [ ] Funciona en todos los navegadores objetivo
- [ ] Responsivo en todos los dispositivos
- [ ] Modo claro y oscuro funcionan

**Documentación:**
- [ ] DOCUMENTACION_SISTEMA_COLORES_AVANZADO.md completa
- [ ] Comentarios en código adecuados
- [ ] Script de validación documentado

---

## 8. Reporte de Issues

Si se encuentran problemas durante las pruebas, documentar:

**Formato de Issue:**
```
Título: [Componente] Descripción breve

Descripción:
- ¿Qué se esperaba?
- ¿Qué ocurrió?
- ¿Cómo reproducir?

Entorno:
- Navegador: [nombre y versión]
- OS: [sistema operativo]
- Resolución: [ancho x alto]
- Modo: [claro/oscuro]

Severidad: [Alta/Media/Baja]
```

---

## 9. Criterios de Aceptación

El sistema se considera completo cuando:

1. ✅ Todas las paletas profesionales funcionan correctamente
2. ✅ La personalización avanzada por sección funciona
3. ✅ El verificador de contraste es preciso
4. ✅ Todas las pruebas de compatibilidad pasan
5. ✅ El rendimiento es aceptable
6. ✅ La accesibilidad cumple WCAG AA
7. ✅ No hay regresiones en funcionalidad existente
8. ✅ La documentación está completa

---

**Última actualización:** 2025-11-23  
**Versión:** 1.0  
**Responsable de Pruebas:** Equipo QA Thuis3D
