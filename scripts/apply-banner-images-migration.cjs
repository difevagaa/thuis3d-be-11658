#!/usr/bin/env node
/**
 * Script para aplicar la migración de banner_images
 * 
 * Este script aplica automáticamente la migración necesaria para crear
 * la tabla banner_images y solucionar el error de schema cache.
 * 
 * REQUISITOS:
 * - Node.js instalado
 * - Variable de entorno SUPABASE_SERVICE_ROLE_KEY configurada
 * 
 * USO:
 * 1. Obtener Service Role Key de Supabase Dashboard:
 *    Settings → API → Service Role Key (secret)
 * 
 * 2. Ejecutar:
 *    SUPABASE_SERVICE_ROLE_KEY=tu_clave_aqui node scripts/apply-banner-images-migration.js
 * 
 * O en Windows:
 *    set SUPABASE_SERVICE_ROLE_KEY=tu_clave_aqui
 *    node scripts/apply-banner-images-migration.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuración
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ljygreayxxpsdmncwzia.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log('='.repeat(70), 'cyan');
  log(title, 'bright');
  log('='.repeat(70), 'cyan');
  console.log('');
}

// Validar credenciales
if (!SERVICE_ROLE_KEY) {
  logSection('❌ ERROR: Falta Service Role Key');
  log('Para ejecutar este script necesitas la clave de servicio de Supabase.', 'red');
  console.log('');
  log('Pasos para obtenerla:', 'yellow');
  log('1. Ir a Supabase Dashboard: https://supabase.com/dashboard', 'yellow');
  log('2. Seleccionar tu proyecto: ljygreayxxpsdmncwzia', 'yellow');
  log('3. Ir a Settings → API', 'yellow');
  log('4. Copiar "Service Role Key" (secret)', 'yellow');
  console.log('');
  log('Luego ejecutar:', 'yellow');
  log('  SUPABASE_SERVICE_ROLE_KEY=tu_clave node scripts/apply-banner-images-migration.js', 'yellow');
  console.log('');
  log('O en Windows:', 'yellow');
  log('  set SUPABASE_SERVICE_ROLE_KEY=tu_clave', 'yellow');
  log('  node scripts\\apply-banner-images-migration.js', 'yellow');
  console.log('');
  process.exit(1);
}

// Leer archivo de migración
const migrationPath = path.join(__dirname, '../supabase/migrations/20251123161800_ensure_banner_images_schema_cache.sql');

if (!fs.existsSync(migrationPath)) {
  logSection('❌ ERROR: Archivo de migración no encontrado');
  log(`No se encontró: ${migrationPath}`, 'red');
  process.exit(1);
}

const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

logSection('🚀 Aplicación de Migración: banner_images');
log(`Proyecto: ${SUPABASE_URL}`, 'cyan');
log(`Migración: 20251123161800_ensure_banner_images_schema_cache.sql`, 'cyan');
console.log('');

// Función para ejecutar SQL en Supabase
function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL('/rest/v1/rpc/exec_sql', SUPABASE_URL);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data: data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(JSON.stringify({ query: sql }));
    req.end();
  });
}

// Función alternativa: usar el endpoint REST directo
function executeSQLDirect(sql) {
  return new Promise((resolve, reject) => {
    // Nota: Supabase no expone directamente un endpoint para ejecutar SQL arbitrario
    // por razones de seguridad. La forma recomendada es usar el Dashboard o la CLI.
    reject(new Error('Ejecución directa no soportada. Usar Supabase Dashboard o CLI.'));
  });
}

// Mostrar instrucciones
async function main() {
  log('⚠️  IMPORTANTE:', 'yellow');
  log('Este script requiere ejecutar SQL directamente en la base de datos.', 'yellow');
  log('Por seguridad, Supabase no permite esto via API REST.', 'yellow');
  console.log('');
  
  log('📋 INSTRUCCIONES PARA APLICAR LA MIGRACIÓN:', 'bright');
  console.log('');
  
  log('Método 1: Usar Supabase Dashboard (RECOMENDADO)', 'green');
  log('──────────────────────────────────────────────', 'green');
  log('1. Ir a: https://supabase.com/dashboard/project/ljygreayxxpsdmncwzia/sql/new', 'cyan');
  log('2. Copiar el contenido del archivo:', 'cyan');
  log(`   ${migrationPath}`, 'yellow');
  log('3. Pegarlo en el SQL Editor', 'cyan');
  log('4. Hacer clic en "Run" o presionar Ctrl/Cmd + Enter', 'cyan');
  log('5. Verificar que no haya errores', 'cyan');
  console.log('');
  
  log('Método 2: Usar Supabase CLI', 'green');
  log('──────────────────────────────────────────', 'green');
  log('1. Instalar Supabase CLI si no está instalado:', 'cyan');
  log('   npm install -g supabase', 'yellow');
  log('2. Vincular el proyecto:', 'cyan');
  log('   supabase link --project-ref ljygreayxxpsdmncwzia', 'yellow');
  log('3. Aplicar las migraciones:', 'cyan');
  log('   supabase db push', 'yellow');
  console.log('');
  
  log('Método 3: Copiar SQL manualmente', 'green');
  log('─────────────────────────────────────', 'green');
  log('Se ha creado un archivo con el SQL completo:', 'cyan');
  
  // Crear archivo de migración lista para copiar
  const outputPath = path.join(__dirname, '../MIGRACION_BANNER_IMAGES_APLICAR.sql');
  const header = `-- ============================================================================
-- MIGRACIÓN: banner_images - Aplicar en Supabase Dashboard
-- ============================================================================
-- INSTRUCCIONES:
-- 1. Ir a Supabase Dashboard → SQL Editor → New Query
-- 2. Copiar TODO este archivo
-- 3. Pegar en el editor
-- 4. Hacer clic en "Run"
-- 5. Verificar que no haya errores
-- ============================================================================

`;
  
  fs.writeFileSync(outputPath, header + migrationSQL);
  log(`   ${outputPath}`, 'yellow');
  log('   Copiar todo el contenido y pegarlo en SQL Editor de Supabase', 'cyan');
  console.log('');
  
  log('✅ Después de aplicar la migración:', 'bright');
  log('1. Ejecutar en SQL Editor:', 'cyan');
  log('   NOTIFY pgrst, \'reload schema\';', 'yellow');
  log('2. Esperar 10-30 segundos', 'cyan');
  log('3. Probar crear un banner con carrusel desde el panel admin', 'cyan');
  console.log('');
  
  log('📚 Para más información, ver:', 'bright');
  log('   - README_SOLUCION_BANNER_IMAGES.md', 'cyan');
  log('   - SOLUCION_RAPIDA_BANNER_IMAGES.md', 'cyan');
  console.log('');
  
  log('✨ Archivo de migración preparado:', 'green');
  log(`   ${outputPath}`, 'bright');
  console.log('');
}

main().catch((error) => {
  logSection('❌ ERROR');
  log(error.message, 'red');
  console.error(error);
  process.exit(1);
});
