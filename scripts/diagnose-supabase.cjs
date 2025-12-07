#!/usr/bin/env node

/**
 * Supabase Database Diagnostic Script
 * 
 * This script helps diagnose why Supabase appears empty or has connection issues.
 * Run: node scripts/diagnose-supabase.cjs
 */

const https = require('https');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(title) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(60) + '\n');
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.blue);
}

// Load environment variables
function loadEnv() {
  const fs = require('fs');
  const path = require('path');
  
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    logError('.env file not found!');
    return null;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      env[key] = value;
    }
  });
  
  return env;
}

// Make HTTP request to Supabase with timeout
function makeRequest(url, headers, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    
    https.get(url, { headers }, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        clearTimeout(timeout);
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data
          });
        }
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function diagnose() {
  logHeader('🔍 SUPABASE DATABASE DIAGNOSTIC');
  
  // Load environment
  log('Loading environment variables...');
  const env = loadEnv();
  
  if (!env) {
    logError('Cannot proceed without .env file');
    return;
  }
  
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const projectId = env.VITE_SUPABASE_PROJECT_ID;
  
  // Validate configuration
  logHeader('1. CONFIGURATION CHECK');
  
  if (supabaseUrl) {
    logSuccess(`Supabase URL: ${supabaseUrl}`);
  } else {
    logError('VITE_SUPABASE_URL not found in .env');
    return;
  }
  
  if (projectId) {
    logSuccess(`Project ID: ${projectId}`);
  } else {
    logWarning('VITE_SUPABASE_PROJECT_ID not found in .env');
  }
  
  if (supabaseKey) {
    // Mask the key for security - only show first 10 and last 5 characters
    const maskedKey = supabaseKey.length > 20 
      ? `${supabaseKey.substring(0, 10)}...${supabaseKey.substring(supabaseKey.length - 5)}`
      : `${supabaseKey.substring(0, 5)}...`;
    logSuccess(`Publishable Key: ${maskedKey}`);
  } else {
    logError('VITE_SUPABASE_PUBLISHABLE_KEY not found in .env');
    return;
  }
  
  // Test connection
  logHeader('2. CONNECTION TEST');
  
  log('Testing connection to Supabase...');
  
  try {
    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    };
    
    // Test products table
    const productsUrl = `${supabaseUrl}/rest/v1/products?select=id&limit=1`;
    const productsResult = await makeRequest(productsUrl, headers);
    
    logInfo(`Products table status: ${productsResult.statusCode}`);
    
    if (productsResult.statusCode === 200) {
      logSuccess('✓ Successfully connected to products table');
      if (Array.isArray(productsResult.data) && productsResult.data.length > 0) {
        logSuccess(`  Found ${productsResult.data.length} product(s) in sample`);
      } else if (Array.isArray(productsResult.data)) {
        logWarning('  Products table is empty (no products found)');
      }
    } else if (productsResult.statusCode === 401) {
      logError('✗ Authentication failed - check your API key');
    } else if (productsResult.statusCode === 404) {
      logError('✗ Products table not found - may need to run migrations');
    } else if (productsResult.statusCode === 406 || productsResult.statusCode === 403) {
      logWarning('✗ Forbidden - Row Level Security (RLS) may be blocking access');
      logInfo('  This is the most likely cause of "Supabase appears empty"');
    } else {
      logWarning(`✗ Unexpected status code: ${productsResult.statusCode}`);
      logInfo(`  Response: ${JSON.stringify(productsResult.data)}`);
    }
  } catch (error) {
    logError(`Connection failed: ${error.message}`);
  }
  
  // Check other tables
  logHeader('3. TABLE EXISTENCE CHECK');
  
  const tables = [
    'products',
    'product_images',
    'product_roles',
    'categories',
    'user_roles',
    'orders',
    'page_builder_pages',
    'legal_pages'
  ];
  
  for (const table of tables) {
    try {
      const url = `${supabaseUrl}/rest/v1/${table}?select=id&limit=1`;
      const headers = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      };
      
      const result = await makeRequest(url, headers);
      
      if (result.statusCode === 200) {
        logSuccess(`✓ ${table} - accessible`);
      } else if (result.statusCode === 404) {
        logError(`✗ ${table} - NOT FOUND (may need migration)`);
      } else if (result.statusCode === 406 || result.statusCode === 403) {
        logWarning(`⚠ ${table} - EXISTS but RLS is blocking (${result.statusCode})`);
      } else {
        logWarning(`? ${table} - status ${result.statusCode}`);
      }
    } catch (error) {
      logError(`✗ ${table} - error: ${error.message}`);
    }
  }
  
  // Recommendations
  logHeader('4. DIAGNOSTIC SUMMARY & RECOMMENDATIONS');
  
  logInfo('Based on the results above, here are the most likely issues:\n');
  
  log('Issue #1: Row Level Security (RLS) is too restrictive', colors.bright);
  logInfo('  Symptoms: Tables exist but show 403/406 errors');
  logInfo('  Solution: In Supabase Dashboard:');
  logInfo('    1. Go to Authentication → Policies');
  logInfo('    2. For each table, create a policy:');
  logInfo('       - Enable SELECT for public (or authenticated users)');
  logInfo('       - Enable INSERT/UPDATE/DELETE for admins only');
  logInfo('    3. Example SQL for products table:');
  console.log(`
    CREATE POLICY "Public products are viewable by everyone"
    ON products FOR SELECT
    USING (
      NOT EXISTS (
        SELECT 1 FROM product_roles WHERE product_roles.product_id = products.id
      )
    );
  `);
  
  log('\nIssue #2: Migrations not applied', colors.bright);
  logInfo('  Symptoms: Tables show 404 errors');
  logInfo('  Solution:');
  logInfo('    1. In Supabase Dashboard, go to SQL Editor');
  logInfo('    2. Run migrations from supabase/migrations/ folder');
  logInfo('    3. Or use: npx supabase db push');
  
  log('\nIssue #3: Database is empty', colors.bright);
  logInfo('  Symptoms: Tables exist and accessible but return empty arrays');
  logInfo('  Solution:');
  logInfo('    1. Data may be in Lovable, not Supabase');
  logInfo('    2. Need to export from Lovable and import to Supabase');
  logInfo('    3. Or populate database manually through admin panel');
  
  log('\n📝 NEXT STEPS:', colors.bright + colors.green);
  logInfo('1. Check Supabase Dashboard: https://supabase.com/dashboard/project/' + projectId);
  logInfo('2. Go to Table Editor - do you see tables?');
  logInfo('3. Go to SQL Editor - run: SELECT * FROM products LIMIT 5;');
  logInfo('4. Go to Authentication → Policies - check RLS policies');
  logInfo('5. If still having issues, share the output of this script');
  
  console.log('\n' + '='.repeat(60) + '\n');
}

// Run diagnostic
diagnose().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
