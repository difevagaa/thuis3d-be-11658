/**
 * Script to check and seed Page Builder data
 * 
 * This script checks if pages and sections exist in the database,
 * and optionally seeds them with sample data if they're missing.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPageBuilderData() {
  console.log('🔍 Checking Page Builder data...\n');

  // Check if pages exist
  const { data: pages, error: pagesError } = await supabase
    .from('page_builder_pages')
    .select('*')
    .order('created_at');

  if (pagesError) {
    console.error('❌ Error fetching pages:', pagesError.message);
    return;
  }

  console.log(`📄 Found ${pages?.length || 0} pages in database:`);
  if (pages && pages.length > 0) {
    pages.forEach(page => {
      console.log(`  - ${page.page_key} (${page.page_name}) - ${page.is_enabled ? 'Enabled' : 'Disabled'}`);
    });
  } else {
    console.log('  No pages found!');
  }

  console.log('');

  // Check sections for each page
  for (const page of pages || []) {
    const { data: sections, error: sectionsError } = await supabase
      .from('page_builder_sections')
      .select('*')
      .eq('page_id', page.id)
      .order('display_order');

    if (sectionsError) {
      console.error(`❌ Error fetching sections for page ${page.page_key}:`, sectionsError.message);
      continue;
    }

    console.log(`📑 Page "${page.page_key}" has ${sections?.length || 0} sections:`);
    if (sections && sections.length > 0) {
      sections.forEach(section => {
        console.log(`  ${section.display_order}. ${section.section_name} (${section.section_type}) - ${section.is_visible ? 'Visible' : 'Hidden'}`);
      });
    } else {
      console.log('  ⚠️  No sections found for this page!');
    }
    console.log('');
  }

  // Check for gallery items
  const { data: galleryItems, error: galleryError } = await supabase
    .from('gallery_items')
    .select('*')
    .eq('is_published', true);

  console.log(`🖼️  Found ${galleryItems?.length || 0} published gallery items`);

  // Check for blog posts
  const { data: blogPosts, error: blogError } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('is_published', true);

  console.log(`📝 Found ${blogPosts?.length || 0} published blog posts`);

  console.log('\n✅ Database check complete!');
  
  // Summary
  const hasPages = pages && pages.length > 0;
  const hasSections = pages?.some(p => {
    return sections && sections.length > 0;
  });

  if (!hasPages) {
    console.log('\n⚠️  WARNING: No pages found in database!');
    console.log('   You need to run the database migrations to create pages.');
    console.log('   Run: npx supabase migration up (if using Supabase CLI)');
  } else if (!hasSections) {
    console.log('\n⚠️  WARNING: Pages exist but have no sections!');
    console.log('   You need to run the data seeding migrations:');
    console.log('   - 20251207150000_populate_page_builder_content.sql');
    console.log('   - 20251207160000_add_sample_data_and_fix_pages.sql');
  } else {
    console.log('\n✅ Database appears to be properly configured with pages and sections!');
  }
}

// Run the check
checkPageBuilderData().catch(console.error);
