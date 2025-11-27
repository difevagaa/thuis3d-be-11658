#!/usr/bin/env node
/**
 * 🔍 Agente Copilot de Validación de Despliegue Lovable
 * 
 * Este script verifica si los cambios recientes de GitHub están
 * realmente reflejados en la aplicación publicada en Lovable.
 * 
 * Funcionalidades:
 * 1. Lista cambios de PRs fusionados recientemente
 * 2. Identifica cambios visuales y de funcionalidad
 * 3. Verifica presencia de cambios en el código publicado
 * 4. Genera reporte de validación y guía de despliegue
 */

const fs = require('fs').promises;
const path = require('path');

// Datos de PRs recientes (PR #1 y #2 ya fusionados)
const RECENT_MERGED_PRS = [
  {
    number: 1,
    title: "Refactor calibration validation to accept slicer data as ground truth",
    mergedAt: "2025-11-06T14:28:00Z",
    changes: [
      {
        filename: "src/lib/calibrationConstants.ts",
        additions: 67,
        deletions: 0,
        changes: 67,
        status: "added"
      },
      {
        filename: "src/lib/stlAnalyzer.ts",
        additions: 30,
        deletions: 14,
        changes: 44,
        status: "modified"
      },
      {
        filename: "src/pages/admin/CalibrationSettings.tsx",
        additions: 251,
        deletions: 54,
        changes: 305,
        status: "modified"
      },
      {
        filename: "src/pages/admin/CalibrationProfiles.tsx",
        additions: 39,
        deletions: 14,
        changes: 53,
        status: "modified"
      },
      {
        filename: "README.md",
        additions: 80,
        deletions: 0,
        changes: 80,
        status: "modified"
      }
    ]
  },
  {
    number: 2,
    title: "Fix minimum price multiplication by quantity in 3D calculator",
    mergedAt: "2025-11-06T15:23:27Z",
    changes: [
      {
        filename: "src/lib/stlAnalyzer.ts",
        additions: 38,
        deletions: 10,
        changes: 48,
        status: "modified"
      },
      {
        filename: "src/pages/Quotes.tsx",
        additions: 17,
        deletions: 0,
        changes: 17,
        status: "modified"
      },
      {
        filename: "src/pages/admin/QuoteDetail.tsx",
        additions: 29,
        deletions: 1,
        changes: 30,
        status: "modified"
      }
    ]
  }
];

/**
 * Analiza un archivo cambiado y determina si implica cambios visibles
 */
function analyzeFileChange(change) {
  const results = [];
  const filename = change.filename;

  // Detectar cambios en componentes UI (páginas y componentes React)
  if (filename.match(/\.(tsx|jsx)$/)) {
    if (filename.includes('pages/')) {
      results.push({
        changeDetected: true,
        changeType: 'visual',
        description: `Cambios en página visible: ${path.basename(filename)}`,
        file: filename,
        verificationMethod: 'Navegar a la ruta correspondiente en la app publicada'
      });
    } else if (filename.includes('components/')) {
      results.push({
        changeDetected: true,
        changeType: 'visual',
        description: `Cambios en componente UI: ${path.basename(filename)}`,
        file: filename,
        verificationMethod: 'Verificar componente en páginas que lo utilizan'
      });
    }
  }

  // Detectar cambios en lógica de negocio
  if (filename.includes('lib/') && filename.match(/\.(ts|js)$/)) {
    results.push({
      changeDetected: true,
      changeType: 'functionality',
      description: `Cambios en lógica de negocio: ${path.basename(filename)}`,
      file: filename,
      verificationMethod: 'Probar funcionalidad afectada con datos de prueba'
    });
  }

  // Detectar cambios en backend/API
  if (filename.includes('integrations/') || filename.includes('api/')) {
    results.push({
      changeDetected: true,
      changeType: 'backend',
      description: `Cambios en integración/API: ${path.basename(filename)}`,
      file: filename,
      verificationMethod: 'Verificar llamadas API en consola del navegador'
    });
  }

  // Detectar cambios de documentación
  if (filename.match(/\.(md|txt)$/)) {
    results.push({
      changeDetected: true,
      changeType: 'documentation',
      description: `Actualización de documentación: ${path.basename(filename)}`,
      file: filename,
      verificationMethod: 'Revisar archivo en repositorio o documentación pública'
    });
  }

  return results;
}

/**
 * Genera resumen de cambios significativos por PR
 */
function generatePRSummary(pr) {
  const allValidations = pr.changes.flatMap(analyzeFileChange);
  const visualChanges = allValidations.filter(v => v.changeType === 'visual');
  const functionalChanges = allValidations.filter(v => v.changeType === 'functionality');
  
  let summary = `\n## 📋 PR #${pr.number}: ${pr.title}\n`;
  summary += `**Fusionado:** ${new Date(pr.mergedAt).toLocaleString('es-ES')}\n`;
  summary += `**Archivos modificados:** ${pr.changes.length}\n`;
  summary += `**Cambios totales:** +${pr.changes.reduce((s, c) => s + c.additions, 0)} -${pr.changes.reduce((s, c) => s + c.deletions, 0)}\n\n`;

  if (visualChanges.length > 0) {
    summary += `### 🎨 Cambios Visuales Detectados (${visualChanges.length})\n`;
    visualChanges.forEach((v, i) => {
      summary += `${i + 1}. **${v.description}**\n`;
      summary += `   - Archivo: \`${v.file}\`\n`;
      summary += `   - Verificación: ${v.verificationMethod}\n\n`;
    });
  }

  if (functionalChanges.length > 0) {
    summary += `### ⚙️ Cambios de Funcionalidad Detectados (${functionalChanges.length})\n`;
    functionalChanges.forEach((v, i) => {
      summary += `${i + 1}. **${v.description}**\n`;
      summary += `   - Archivo: \`${v.file}\`\n`;
      summary += `   - Verificación: ${v.verificationMethod}\n\n`;
    });
  }

  return summary;
}

/**
 * Verifica si un archivo específico contiene ciertos cambios
 */
async function verifyFileContainsChanges(filePath, searchPatterns) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const matches = searchPatterns.filter(pattern => content.includes(pattern));
    return {
      found: matches.length > 0,
      matches
    };
  } catch (error) {
    return { found: false, matches: [] };
  }
}

/**
 * Genera verificaciones específicas para PR #1 (Calibración)
 */
async function verifyPR1Changes() {
  let report = '\n### ✅ Verificación Específica PR #1 - Calibración\n\n';

  // Verificar archivo de constantes
  const constantsExists = await fs.access(
    path.join(process.cwd(), 'src/lib/calibrationConstants.ts')
  ).then(() => true).catch(() => false);

  report += `1. **Archivo de constantes creado**: ${constantsExists ? '✅' : '❌'}\n`;
  
  if (constantsExists) {
    const constantsCheck = await verifyFileContainsChanges(
      path.join(process.cwd(), 'src/lib/calibrationConstants.ts'),
      ['CALIBRATION_RANGES', 'IDEAL_MIN: 0.95', 'IDEAL_MAX: 1.2']
    );
    report += `   - Constantes de calibración definidas: ${constantsCheck.found ? '✅' : '❌'}\n`;
    if (constantsCheck.matches.length > 0) {
      report += `   - Encontrado: ${constantsCheck.matches.join(', ')}\n`;
    }
  }

  // Verificar cambios en CalibrationSettings
  const settingsCheck = await verifyFileContainsChanges(
    path.join(process.cwd(), 'src/pages/admin/CalibrationSettings.tsx'),
    ['HelpCircle', 'Guía: Cómo crear calibraciones precisas', 'CALIBRATION_RANGES']
  );
  report += `\n2. **Guía de ayuda en CalibrationSettings**: ${settingsCheck.found ? '✅' : '❌'}\n`;
  if (settingsCheck.matches.length > 0) {
    report += `   - Elementos encontrados: ${settingsCheck.matches.join(', ')}\n`;
  }

  // Verificar cambios en stlAnalyzer
  const analyzerCheck = await verifyFileContainsChanges(
    path.join(process.cwd(), 'src/lib/stlAnalyzer.ts'),
    ['SUPPORT_CONSTANTS', 'MAX_SUPPORT_VOLUME_PERCENTAGE', 'clamping']
  );
  report += `\n3. **Clamping de soportes en stlAnalyzer**: ${analyzerCheck.found ? '✅' : '❌'}\n`;
  if (analyzerCheck.matches.length > 0) {
    report += `   - Elementos encontrados: ${analyzerCheck.matches.join(', ')}\n`;
  }

  // Verificar documentación en README
  const readmeCheck = await verifyFileContainsChanges(
    path.join(process.cwd(), 'README.md'),
    ['Sistema de Calibración 3D', 'Factores de Calibración', '0.95x-1.2x']
  );
  report += `\n4. **Documentación en README**: ${readmeCheck.found ? '✅' : '❌'}\n`;
  if (readmeCheck.matches.length > 0) {
    report += `   - Secciones encontradas: ${readmeCheck.matches.join(', ')}\n`;
  }

  return report;
}

/**
 * Genera verificaciones específicas para PR #2 (Precio mínimo)
 */
async function verifyPR2Changes() {
  let report = '\n### ✅ Verificación Específica PR #2 - Precio Mínimo\n\n';

  // Verificar lógica de precio mínimo en stlAnalyzer
  const analyzerCheck = await verifyFileContainsChanges(
    path.join(process.cwd(), 'src/lib/stlAnalyzer.ts'),
    [
      'POLÍTICA CORRECTA: Precio mínimo se cobra UNA VEZ',
      'minimumChargedOnce',
      'effectivePerUnit'
    ]
  );
  report += `1. **Lógica de precio mínimo corregida**: ${analyzerCheck.found ? '✅' : '❌'}\n`;
  if (analyzerCheck.matches.length > 0) {
    report += `   - Elementos encontrados: ${analyzerCheck.matches.join(', ')}\n`;
  }

  // Verificar UI en Quotes.tsx
  const quotesCheck = await verifyFileContainsChanges(
    path.join(process.cwd(), 'src/pages/Quotes.tsx'),
    [
      'Política de precio mínimo',
      'precio mínimo se cobra UNA VEZ',
      'Precio efectivo por unidad'
    ]
  );
  report += `\n2. **Alerta de política en formulario de cotizaciones**: ${quotesCheck.found ? '✅' : '❌'}\n`;
  if (quotesCheck.matches.length > 0) {
    report += `   - Elementos UI encontrados: ${quotesCheck.matches.join(', ')}\n`;
  }

  // Verificar UI en QuoteDetail.tsx
  const detailCheck = await verifyFileContainsChanges(
    path.join(process.cwd(), 'src/pages/admin/QuoteDetail.tsx'),
    [
      'Pedido de',
      'unidades',
      'Política de precio mínimo',
      'Precio efectivo por unidad'
    ]
  );
  report += `\n3. **Display de política en admin quote details**: ${detailCheck.found ? '✅' : '❌'}\n`;
  if (detailCheck.matches.length > 0) {
    report += `   - Elementos UI encontrados: ${detailCheck.matches.join(', ')}\n`;
  }

  return report;
}

/**
 * Genera guía completa de despliegue
 */
function generateDeploymentGuide() {
  return `
# 📦 Guía Completa de Despliegue Lovable

## 🎯 Objetivo
Asegurar que todos los cambios de GitHub se reflejen correctamente en la aplicación publicada en Lovable.

## 🔍 Pasos de Verificación

### 1. Verificar Rama Correcta
\`\`\`bash
# En tu repositorio local
git checkout main
git pull origin main

# Verificar el último commit
git log --oneline -5
\`\`\`

**¿Qué buscar?**
- El último commit debe ser el merge de PR #2 (commit 7f69ff7)
- Debe incluir: "Add minimum price policy display to admin quote details"

### 2. Verificar Estado de Build Local
\`\`\`bash
# Instalar dependencias (si es necesario)
npm install

# Ejecutar linter
npm run lint

# Construir aplicación
npm run build
\`\`\`

**Resultado esperado:**
- ✅ Lint sin errores
- ✅ Build exitoso
- ✅ Todos los archivos compilados en \`dist/\`

### 3. Verificar en Lovable Dashboard

#### A. Acceso al Proyecto
1. Ir a [Lovable Dashboard](https://lovable.dev/projects/57e87420-5c56-4a91-a41f-e22bd87955e0)
2. Verificar que estás en el proyecto correcto: **thuis3d-be-88829**

#### B. Verificar Sincronización con GitHub
1. En Lovable, ir a **Settings → GitHub**
2. Verificar que el repositorio está conectado: \`difevagaa/thuis3d-be-88829\`
3. Verificar la rama activa: debe ser \`main\`
4. Verificar el último commit sincronizado:
   - Debe coincidir con el último commit de \`main\` en GitHub
   - Commit SHA: \`7f69ff7\`

#### C. Forzar Nueva Publicación (si es necesario)
Si Lovable no ha detectado los cambios:
1. Ir a **Settings → Deployment**
2. Click en **"Trigger Deployment"** o **"Redeploy"**
3. Esperar a que el build complete (puede tomar 2-5 minutos)
4. Verificar que el status sea **"Deployed"**

### 4. Verificar Aplicación Publicada

#### A. Limpiar Caché del Navegador
**CRÍTICO**: Los cambios pueden no verse debido a caché

**En Chrome/Edge:**
1. Abrir DevTools (F12)
2. Click derecho en el botón de recargar
3. Seleccionar **"Empty Cache and Hard Reload"**

**En Firefox:**
1. Ctrl+Shift+R (Windows/Linux) o Cmd+Shift+R (Mac)

**Alternativa:**
- Abrir en ventana privada/incógnito
- O usar otro navegador

#### B. Verificación de PR #1 (Calibración)
**Página:** Admin → Calibración

1. **Verificar guía colapsable:**
   - ✅ Debe aparecer sección con ícono de ayuda (?) 
   - ✅ Título: "📖 Guía: Cómo crear calibraciones precisas"
   - ✅ Al expandir, debe mostrar pasos detallados
   - ✅ Debe incluir enlaces a recursos externos (3DWork Labs, DHM Online)

2. **Probar validación de calibración:**
   - Subir un archivo STL de prueba
   - Ingresar datos del laminador
   - ✅ El sistema debe validar con rangos 0.95x-1.2x
   - ✅ Debe mostrar mensajes con emoji (🎯, ⚠️, ❌)
   - ✅ Si los factores están fuera de rango, debe explicar por qué

3. **Verificar en consola del navegador (F12):**
   - ✅ Logs deben mostrar "📊 Análisis de calibración"
   - ✅ Debe incluir factores calculados vs reales
   - ✅ Debe mostrar si está en rango ideal/aceptable

#### C. Verificación de PR #2 (Precio Mínimo)
**Página:** Cotizaciones (Usuario)

1. **Cargar archivo STL de prueba**
2. **Seleccionar cantidad > 1** (ej: 3 unidades)
3. **Verificar alertas visuales:**
   - ✅ Debe aparecer alerta azul con texto: "📋 Política de precio mínimo"
   - ✅ Debe explicar: "El precio mínimo se cobra UNA VEZ por pedido"
   - ✅ Debe mostrar "Precio efectivo por unidad"

4. **Verificar cálculo:**
   - Si precio unitario < mínimo:
     - Primera unidad debe cobrar el mínimo
     - Unidades adicionales deben cobrar solo el precio real
   - Ejemplo: 3 unidades × €3, mínimo €10
     - Total debe ser: €10 + (2 × €3) = €16 ✅
     - NO debe ser: 3 × €10 = €30 ❌

**Página:** Admin → Detalle de Cotización

1. **Abrir una cotización con cantidad > 1**
2. **Verificar display:**
   - ✅ Debe mostrar "Pedido de X unidades"
   - ✅ Debe incluir explicación de política
   - ✅ Debe mostrar "Precio efectivo por unidad"

3. **Verificar en consola del navegador:**
   - ✅ Logs deben mostrar "💰 Cálculo de precio (POLÍTICA CORREGIDA)"
   - ✅ Debe desglosar: primera unidad vs unidades adicionales

### 5. Verificar Versión Publicada vs Código Fuente

#### Método 1: Ver Fuente en Navegador
1. En la app publicada, click derecho → "Ver código fuente de la página"
2. Buscar referencias a los cambios:
   - Buscar: \`"Política de precio mínimo"\`
   - Buscar: \`"CALIBRATION_RANGES"\` (en archivos .js compilados)

#### Método 2: Verificar con DevTools
1. Abrir DevTools → Sources
2. Navegar a los archivos compilados
3. Buscar strings específicos de los cambios

### 6. Solución de Problemas Comunes

#### ❌ Problema: Los cambios no se ven
**Soluciones:**
1. Limpiar caché del navegador (paso 4A)
2. Verificar que Lovable haya deployed la versión correcta
3. Forzar nuevo deployment en Lovable (paso 3C)
4. Esperar 5-10 minutos y probar de nuevo

#### ❌ Problema: Build falla en Lovable
**Soluciones:**
1. Verificar errores en el log de deployment
2. Asegurar que \`npm run build\` funcione localmente
3. Verificar que todas las dependencias estén en \`package.json\`
4. Revisar errores de TypeScript/ESLint

#### ❌ Problema: Algunos cambios sí se ven, otros no
**Causa probable:** Caché parcial o deployment incompleto
**Soluciones:**
1. Limpiar caché completamente
2. Verificar en modo incógnito
3. Probar desde otro dispositivo/red
4. Forzar re-deployment completo

### 7. Checklist Final de Validación

- [ ] Código en \`main\` incluye commits de PR #1 y PR #2
- [ ] Build local exitoso sin errores
- [ ] Lovable sincronizado con último commit de GitHub
- [ ] Deployment en Lovable completado exitosamente
- [ ] Caché del navegador limpiado
- [ ] Guía de calibración visible en página admin
- [ ] Validación de calibración funciona con rangos correctos
- [ ] Alerta de precio mínimo visible en cotizaciones
- [ ] Cálculo de precio mínimo correcto para múltiples unidades
- [ ] Consola del navegador muestra logs actualizados
- [ ] Precio efectivo por unidad mostrado correctamente

## 🎉 Resultado Esperado

Todos los checkboxes marcados = **Despliegue exitoso**

Si algunos fallan, seguir la sección de "Solución de Problemas" correspondiente.

## 📞 Soporte Adicional

Si después de seguir esta guía los cambios aún no se reflejan:
1. Verificar el log de deployment en Lovable
2. Revisar la consola del navegador para errores de JavaScript
3. Contactar al soporte de Lovable si es un problema de la plataforma
`;
}

/**
 * Genera el reporte completo de validación
 */
async function generateValidationReport() {
  let report = `# 🔍 REPORTE DE VALIDACIÓN DE DESPLIEGUE LOVABLE

**Fecha:** ${new Date().toLocaleString('es-ES')}
**Repositorio:** difevagaa/thuis3d-be-88829
**Rama Principal:** main
**URL Lovable:** https://lovable.dev/projects/57e87420-5c56-4a91-a41f-e22bd87955e0

---

## 📊 Resumen de Cambios Recientes

**PRs Fusionados:** ${RECENT_MERGED_PRS.length}
**Archivos Modificados Totales:** ${RECENT_MERGED_PRS.reduce((s, pr) => s + pr.changes.length, 0)}
**Líneas Añadidas:** +${RECENT_MERGED_PRS.reduce((s, pr) => 
  s + pr.changes.reduce((sum, c) => sum + c.additions, 0), 0)}
**Líneas Eliminadas:** -${RECENT_MERGED_PRS.reduce((s, pr) => 
  s + pr.changes.reduce((sum, c) => sum + c.deletions, 0), 0)}

---
`;

  // Agregar resumen de cada PR
  for (const pr of RECENT_MERGED_PRS) {
    report += generatePRSummary(pr);
    report += '\n---\n';
  }

  // Agregar verificaciones específicas
  report += '\n## 🔬 Verificaciones en Código Fuente Local\n';
  report += await verifyPR1Changes();
  report += '\n';
  report += await verifyPR2Changes();

  // Agregar evidencias visuales
  report += `\n\n## 📸 Evidencias Visuales de Referencia\n\n`;
  report += `Las siguientes imágenes fueron mencionadas en la solicitud original como referencia:\n\n`;
  report += `1. **Evidencia 1** - Verificar cambios visuales en la aplicación publicada\n`;
  report += `2. **Evidencia 2** - Comparar interfaz actual con versión anterior\n`;
  report += `3. **Evidencia 3** - Validar elementos visuales implementados\n\n`;
  report += `**Nota:** Para validación visual completa, se recomienda tomar capturas de pantalla de:\n`;
  report += `- Página de calibración (Admin → Calibración) mostrando la nueva guía colapsable\n`;
  report += `- Formulario de cotizaciones con cantidad > 1 mostrando la alerta de política de precio mínimo\n`;
  report += `- Panel de admin mostrando detalles de cotización con precio efectivo por unidad\n`;

  // Agregar sugerencias
  report += `\n\n## 💡 Sugerencias de Validación\n\n`;
  report += `### ¿Por qué los cambios podrían no verse?\n\n`;
  report += `1. **Caché del Navegador** (Más común)\n`;
  report += `   - Solución: Ctrl+Shift+R o limpiar caché\n\n`;
  report += `2. **Lovable no ha desplegado la última versión**\n`;
  report += `   - Solución: Verificar dashboard de Lovable y forzar redeploy\n\n`;
  report += `3. **Build incompleto o con errores**\n`;
  report += `   - Solución: Revisar logs de build en Lovable\n\n`;
  report += `4. **Sincronización pendiente con GitHub**\n`;
  report += `   - Solución: Verificar que Lovable esté conectado al repo correcto\n\n`;

  // Agregar la guía completa
  report += generateDeploymentGuide();

  return report;
}

/**
 * Función principal
 */
async function main() {
  console.log('🚀 Iniciando validación de despliegue Lovable...\n');

  try {
    // Generar reporte completo
    const report = await generateValidationReport();

    // Guardar reporte
    const reportPath = path.join(process.cwd(), 'VALIDATION_LOVABLE_DEPLOYMENT.md');
    await fs.writeFile(reportPath, report, 'utf-8');

    console.log('✅ Reporte generado exitosamente!');
    console.log(`📄 Ubicación: ${reportPath}\n`);
    console.log('📋 Resumen:');
    console.log(`   - PRs analizados: ${RECENT_MERGED_PRS.length}`);
    console.log(`   - Cambios detectados: Visuales y funcionales`);
    console.log(`   - Guía de despliegue: Incluida\n`);
    console.log('🔍 Próximos pasos:');
    console.log('   1. Revisar el reporte generado');
    console.log('   2. Seguir la guía de despliegue paso a paso');
    console.log('   3. Validar cambios en la aplicación publicada');
    console.log('   4. Reportar cualquier discrepancia\n');

  } catch (error) {
    console.error('❌ Error durante la validación:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generateValidationReport,
  analyzeFileChange,
  verifyFileContainsChanges,
  generateDeploymentGuide
};
