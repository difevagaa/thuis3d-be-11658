#!/usr/bin/env node

/**
 * Database Diagnostic Script
 * Tests Supabase connection and checks for required tables and data
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function diagnose() {
  console.log('🔍 Starting Database Diagnostics...\n');
  
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials');
    console.log('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✓ Set' : '✗ Missing');
    console.log('   VITE_SUPABASE_PUBLISHABLE_KEY:', SUPABASE_KEY ? '✓ Set' : '✗ Missing');
    return;
  }

  console.log('✓ Supabase credentials found');
  console.log(`  URL: ${SUPABASE_URL}\n`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Test 1: Check connection
  console.log('📡 Test 1: Testing connection...');
  try {
    const { data, error } = await supabase.from('page_builder_pages').select('count', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ Connection test failed: ${error.message}`);
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('   → Table "page_builder_pages" does not exist in database');
        console.log('   → Migrations need to be run\n');
      }
      return;
    }
    console.log('✓ Connection successful\n');
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    return;
  }

  // Test 2: Check pages table
  console.log('📄 Test 2: Checking page_builder_pages table...');
  const { data: pages, error: pagesError } = await supabase
    .from('page_builder_pages')
    .select('*')
    .order('created_at');

  if (pagesError) {
    console.log(`❌ Error: ${pagesError.message}\n`);
    return;
  }

  console.log(`✓ Found ${pages?.length || 0} pages`);
  if (pages && pages.length > 0) {
    pages.forEach(page => {
      console.log(`  - ${page.page_key} (${page.page_name}) - ${page.is_enabled ? '✓ Enabled' : '✗ Disabled'}`);
    });
  }
  console.log('');

  // Test 3: Check sections for each page
  console.log('📑 Test 3: Checking page_builder_sections table...');
  let totalSections = 0;
  
  if (!pages || pages.length === 0) {
    console.log('⚠️  No pages found, cannot check sections\n');
  } else {
    for (const page of pages) {
      const { data: sections, error: sectionsError } = await supabase
        .from('page_builder_sections')
        .select('*')
        .eq('page_id', page.id)
        .order('display_order');

      if (sectionsError) {
        console.log(`  ❌ Error loading sections for ${page.page_key}: ${sectionsError.message}`);
        continue;
      }

      totalSections += sections?.length || 0;
      const sectionCount = sections?.length || 0;
      if (sectionCount > 0) {
        console.log(`  ✓ ${page.page_key}: ${sectionCount} section(s)`);
      } else {
        console.log(`  ⚠️  ${page.page_key}: NO SECTIONS (page will be empty)`);
      }
    }
  }
  console.log(`\n✓ Total sections: ${totalSections}\n`);

  // Test 4: Summary and recommendations
  console.log('📊 Summary:');
  console.log('─'.repeat(60));
  
  if (!pages || pages.length === 0) {
    console.log('❌ CRITICAL: No pages found in database');
    console.log('\n📋 Required Actions:');
    console.log('   1. Run migrations to create pages:');
    console.log('      - 20251207140000_ensure_all_pages_exist.sql');
    console.log('   2. Run migrations to populate content:');
    console.log('      - 20251207150000_populate_page_builder_content.sql');
    console.log('      - 20251207160000_add_sample_data_and_fix_pages.sql');
  } else if (totalSections === 0) {
    console.log('⚠️  WARNING: Pages exist but have NO content sections');
    console.log('\n📋 Recommended Actions:');
    console.log('   1. Run content population migrations:');
    console.log('      - 20251207150000_populate_page_builder_content.sql');
    console.log('      - 20251207160000_add_sample_data_and_fix_pages.sql');
    console.log('   2. OR use the admin panel to create sections manually');
  } else {
    console.log('✅ Database is properly configured!');
    console.log(`   - ${pages.length} pages found`);
    console.log(`   - ${totalSections} sections found`);
    console.log('   - Pages should display correctly');
  }
  
  console.log('\n✨ Diagnostic complete!\n');
}

diagnose().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
