# 🔍 Agente de Validación de Despliegue Lovable

## Descripción

Este agente Copilot verifica si los cambios recientes de GitHub se reflejan correctamente en la aplicación publicada en Lovable.

## Características

- ✅ Lista cambios de PRs fusionados recientemente
- ✅ Identifica cambios visuales y de funcionalidad
- ✅ Verifica presencia de cambios en código fuente local
- ✅ Genera reporte completo de validación
- ✅ Proporciona guía paso a paso de despliegue
- ✅ Sugiere soluciones a problemas comunes

## Uso

### Ejecutar el Agente

```bash
# Desde la raíz del proyecto
npm run validate:deployment
```

O directamente:

```bash
node scripts/validate-lovable-deployment.cjs
```

### Salida

El script genera un archivo `VALIDATION_LOVABLE_DEPLOYMENT.md` en la raíz del proyecto con:

1. **Resumen de Cambios**: Lista detallada de PRs fusionados
2. **Análisis de Impacto**: Identificación de cambios visuales y funcionales
3. **Verificaciones Locales**: Confirmación de cambios en código fuente
4. **Guía de Despliegue**: Pasos detallados para validar en Lovable
5. **Solución de Problemas**: Troubleshooting común

## Ejemplo de Uso

```bash
$ npm run validate:deployment

🚀 Iniciando validación de despliegue Lovable...

✅ Reporte generado exitosamente!
📄 Ubicación: /ruta/al/proyecto/VALIDATION_LOVABLE_DEPLOYMENT.md

📋 Resumen:
   - PRs analizados: 2
   - Cambios detectados: Visuales y funcionales
   - Guía de despliegue: Incluida

🔍 Próximos pasos:
   1. Revisar el reporte generado
   2. Seguir la guía de despliegue paso a paso
   3. Validar cambios en la aplicación publicada
   4. Reportar cualquier discrepancia
```

## Casos de Uso

### 1. Después de Merge de PR

Ejecuta el agente después de fusionar un PR para:
- Verificar que los cambios estén en el código
- Obtener lista de elementos a validar en la app publicada
- Seguir checklist de validación

### 2. Troubleshooting de Despliegue

Si los cambios no se ven en Lovable:
1. Ejecutar el agente
2. Revisar la sección "Verificaciones en Código Fuente Local"
3. Seguir la guía de "Solución de Problemas"

### 3. Onboarding de Equipo

Usar el reporte como documentación para:
- Entender el flujo de despliegue
- Conocer los PRs recientes
- Aprender a validar cambios

## Estructura del Reporte

```markdown
# REPORTE DE VALIDACIÓN

## Resumen de Cambios Recientes
- PRs fusionados
- Archivos modificados
- Líneas cambiadas

## Análisis por PR
- Cambios visuales detectados
- Cambios de funcionalidad
- Métodos de verificación

## Verificaciones en Código Fuente
- ✅ Confirmación de archivos
- ✅ Presencia de elementos clave
- ✅ Constantes y configuraciones

## Guía de Despliegue
1. Verificar rama correcta
2. Build local
3. Lovable Dashboard
4. Validación en app publicada
5. Verificar código fuente vs publicado
6. Solución de problemas
7. Checklist final
```

## Personalización

Para añadir verificaciones de nuevos PRs, edita el archivo:

```javascript
// scripts/validate-lovable-deployment.cjs

const RECENT_MERGED_PRS = [
  {
    number: 3,
    title: "Tu nuevo PR",
    mergedAt: "2025-11-06T...",
    changes: [
      {
        filename: "ruta/al/archivo.ts",
        additions: 10,
        deletions: 5,
        changes: 15,
        status: "modified"
      }
    ]
  }
];
```

Y añade verificaciones específicas:

```javascript
async function verifyPR3Changes() {
  let report = '\n### ✅ Verificación PR #3\n\n';
  
  const check = await verifyFileContainsChanges(
    path.join(process.cwd(), 'ruta/al/archivo.ts'),
    ['StringABuscar', 'OtroString']
  );
  
  report += `1. **Tu verificación**: ${check.found ? '✅' : '❌'}\n`;
  return report;
}
```

## Requisitos

- Node.js v14+
- Acceso al repositorio GitHub
- Configuración de Lovable conectada al repo

## Problemas Comunes

### Script no ejecuta

**Problema**: Error de permisos

**Solución**:
```bash
chmod +x scripts/validate-lovable-deployment.cjs
```

### Archivo no encontrado

**Problema**: Cannot find module

**Solución**: Verifica que estás en la raíz del proyecto
```bash
cd /ruta/al/proyecto
npm run validate:deployment
```

### Verificaciones fallan

**Problema**: Archivos no encontrados en verificaciones

**Solución**: Los archivos pueden haber sido movidos o renombrados. Actualiza las rutas en el script.

## Contribuir

Para mejorar el agente:

1. Añade nuevas verificaciones específicas
2. Mejora los métodos de detección de cambios
3. Expande la guía de troubleshooting
4. Añade soporte para más tipos de archivos

## Soporte

Si encuentras problemas:

1. Revisa el archivo generado `VALIDATION_LOVABLE_DEPLOYMENT.md`
2. Consulta la sección "Solución de Problemas"
3. Abre un issue en el repositorio
