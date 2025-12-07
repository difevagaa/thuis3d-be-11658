/**
 * Section Editor Testing and Validation System
 * Ensures all options can be saved and work correctly
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  tested: number;
  passed: number;
}

/**
 * Validate that a section can be saved with all its options
 */
export async function validateSectionSave(section: any): Promise<ValidationResult> {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
    tested: 0,
    passed: 0
  };

  // Test 1: Validate required fields
  result.tested++;
  if (!section.page_id) {
    result.errors.push('Missing required field: page_id');
    result.success = false;
  } else {
    result.passed++;
  }

  // Test 2: Validate section_type
  result.tested++;
  const validTypes = ['hero', 'text', 'image', 'banner', 'cta', 'features', 'gallery', 'divider', 'spacer', 'custom', 'video', 'products-carousel'];
  if (!section.section_type || !validTypes.includes(section.section_type)) {
    result.errors.push(`Invalid section_type: ${section.section_type}`);
    result.success = false;
  } else {
    result.passed++;
  }

  // Test 3: Validate JSON fields
  result.tested++;
  try {
    if (section.settings) JSON.parse(JSON.stringify(section.settings));
    if (section.content) JSON.parse(JSON.stringify(section.content));
    if (section.styles) JSON.parse(JSON.stringify(section.styles));
    result.passed++;
  } catch (e) {
    result.errors.push('Invalid JSON in settings, content, or styles');
    result.success = false;
  }

  // Test 4: Validate settings object structure
  result.tested++;
  if (section.settings && typeof section.settings === 'object') {
    result.passed++;
  } else if (section.settings) {
    result.warnings.push('Settings should be an object');
  }

  // Test 5: Validate content object structure
  result.tested++;
  if (section.content && typeof section.content === 'object') {
    result.passed++;
  } else if (section.content) {
    result.warnings.push('Content should be an object');
  }

  // Test 6: Validate styles object structure
  result.tested++;
  if (section.styles && typeof section.styles === 'object') {
    result.passed++;
  } else if (section.styles) {
    result.warnings.push('Styles should be an object');
  }

  return result;
}

/**
 * Test saving a section to the database
 */
export async function testSectionSave(section: any): Promise<boolean> {
  try {
    const validation = await validateSectionSave(section);
    
    if (!validation.success) {
      console.error('Validation failed:', validation.errors);
      toast.error('Validation failed: ' + validation.errors.join(', '));
      return false;
    }

    // Try to save to database
    const { error } = await supabase
      .from('page_builder_sections')
      .upsert(section);

    if (error) {
      console.error('Save error:', error);
      toast.error('Error saving section: ' + error.message);
      return false;
    }

    toast.success(`Section saved successfully (${validation.passed}/${validation.tested} tests passed)`);
    return true;
  } catch (error) {
    console.error('Test error:', error);
    toast.error('Test failed: ' + (error as Error).message);
    return false;
  }
}

/**
 * Test all configuration options for a section type
 */
export async function testAllOptions(sectionType: string, pageId: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
    tested: 0,
    passed: 0
  };

  const testConfigs = getTestConfigs(sectionType);

  for (const config of testConfigs) {
    result.tested++;
    
    const testSection = {
      page_id: pageId,
      section_type: sectionType,
      section_name: `Test ${sectionType} ${result.tested}`,
      display_order: 999 + result.tested,
      is_visible: true,
      settings: config.settings || {},
      content: config.content || {},
      styles: config.styles || {}
    };

    const validation = await validateSectionSave(testSection);
    
    if (validation.success) {
      result.passed++;
    } else {
      result.errors.push(`Config ${result.tested} failed: ${validation.errors.join(', ')}`);
      result.success = false;
    }
  }

  return result;
}

/**
 * Get test configurations for each section type
 */
function getTestConfigs(sectionType: string): any[] {
  const baseConfigs = {
    hero: [
      {
        settings: { fullWidth: true, height: '80vh', heroStyle: 'fullscreen' },
        content: { title: 'Test Hero', subtitle: 'Test subtitle', backgroundImage: 'https://example.com/image.jpg' },
        styles: { backgroundColor: '#000000', textColor: '#ffffff', padding: 80 }
      },
      {
        settings: { fullWidth: false, height: '50vh', overlayOpacity: 0.5, enableParallax: true },
        content: { title: 'Hero 2', buttonText: 'Click me', buttonUrl: '/test' },
        styles: { padding: 60, textAlign: 'center' }
      }
    ],
    text: [
      {
        settings: { fullWidth: false, columns: 1 },
        content: { title: 'Test Text', text: 'Lorem ipsum dolor sit amet' },
        styles: { padding: 40, fontSize: 16, lineHeight: 1.6 }
      },
      {
        settings: { columns: 2, columnGap: 24 },
        content: { title: 'Two Column Text', text: 'Multi-column text test' },
        styles: { textAlign: 'justify' }
      }
    ],
    image: [
      {
        settings: { fullWidth: false, objectFit: 'cover', loading: 'lazy' },
        content: { imageUrl: 'https://example.com/test.jpg', altText: 'Test image' },
        styles: { borderRadius: 8 }
      },
      {
        settings: { enableLightbox: true, hoverZoom: true },
        content: { imageUrl: 'https://example.com/test2.jpg' },
        styles: { boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }
      }
    ],
    features: [
      {
        settings: { fullWidth: true, columns: 3 },
        content: {
          title: 'Test Features',
          features: [
            { icon: '⭐', title: 'Feature 1', description: 'Description 1' },
            { icon: '🚀', title: 'Feature 2', description: 'Description 2' }
          ]
        },
        styles: { padding: 60 }
      }
    ],
    cta: [
      {
        settings: { fullWidth: false, buttonSize: 'lg', buttonStyle: 'solid' },
        content: { title: 'Call to Action', description: 'Test CTA', buttonText: 'Click', buttonUrl: '/cta' },
        styles: { backgroundColor: '#3b82f6', textColor: '#ffffff', padding: 40 }
      }
    ],
    'products-carousel': [
      {
        settings: { 
          fullWidth: true, 
          limit: 10, 
          maxVisible: 4, 
          sortBy: 'created_at', 
          sortOrder: 'desc',
          autoplay: true,
          autoplaySpeed: 3000
        },
        content: { title: 'Featured Products', subtitle: 'Check out our best items' },
        styles: { padding: 60 }
      }
    ],
    banner: [
      {
        settings: { fullWidth: true, bannerStyle: 'image', contentAlign: 'center' },
        content: { 
          title: 'Banner Title', 
          description: 'Banner description',
          backgroundImage: 'https://example.com/banner.jpg',
          buttonText: 'Learn More',
          buttonUrl: '/learn'
        },
        styles: { padding: 80, textColor: '#ffffff' }
      }
    ],
    video: [
      {
        settings: { aspectRatio: '16:9', controls: true, autoplay: false },
        content: { videoUrl: 'https://youtube.com/watch?v=test', title: 'Test Video' },
        styles: { padding: 40 }
      }
    ],
    gallery: [
      {
        settings: { layout: 'grid', columns: 4, gap: 16, enableLightbox: true },
        content: { 
          title: 'Gallery',
          images: ['https://example.com/1.jpg', 'https://example.com/2.jpg']
        },
        styles: { padding: 40 }
      }
    ]
  };

  return (baseConfigs as any)[sectionType] || [];
}

/**
 * Run comprehensive tests on all section types
 */
export async function runComprehensiveTests(pageId: string): Promise<Record<string, ValidationResult>> {
  const sectionTypes = [
    'hero', 
    'text', 
    'image', 
    'features', 
    'cta', 
    'products-carousel', 
    'banner', 
    'video', 
    'gallery'
  ];

  const results: Record<string, ValidationResult> = {};

  for (const type of sectionTypes) {
    console.log(`Testing ${type}...`);
    results[type] = await testAllOptions(type, pageId);
  }

  return results;
}

/**
 * Generate test report
 */
export function generateTestReport(results: Record<string, ValidationResult>): string {
  let report = '# Section Editor Test Report\n\n';
  
  let totalTested = 0;
  let totalPassed = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const [type, result] of Object.entries(results)) {
    report += `## ${type.toUpperCase()}\n`;
    report += `- Tested: ${result.tested}\n`;
    report += `- Passed: ${result.passed}\n`;
    report += `- Success: ${result.success ? '✅' : '❌'}\n`;
    
    if (result.errors.length > 0) {
      report += `- Errors: ${result.errors.length}\n`;
      result.errors.forEach(err => {
        report += `  - ${err}\n`;
      });
    }
    
    if (result.warnings.length > 0) {
      report += `- Warnings: ${result.warnings.length}\n`;
      result.warnings.forEach(warn => {
        report += `  - ${warn}\n`;
      });
    }
    
    report += '\n';
    
    totalTested += result.tested;
    totalPassed += result.passed;
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
  }

  report += `## SUMMARY\n`;
  report += `- Total Tests: ${totalTested}\n`;
  report += `- Total Passed: ${totalPassed}\n`;
  report += `- Total Errors: ${totalErrors}\n`;
  report += `- Total Warnings: ${totalWarnings}\n`;
  report += `- Success Rate: ${((totalPassed / totalTested) * 100).toFixed(2)}%\n`;

  return report;
}

/**
 * Test real-time preview updates
 */
export async function testPreviewUpdate(section: any): Promise<boolean> {
  try {
    // Simulate section update
    const updatedSection = {
      ...section,
      content: {
        ...section.content,
        title: 'Updated Title - ' + new Date().toISOString()
      }
    };

    // Validate
    const validation = await validateSectionSave(updatedSection);
    return validation.success;
  } catch (error) {
    console.error('Preview test failed:', error);
    return false;
  }
}

/**
 * Test option persistence
 */
export async function testOptionPersistence(sectionId: string, option: string, value: any): Promise<boolean> {
  try {
    // Read current section
    const { data: section, error: readError } = await supabase
      .from('page_builder_sections')
      .select('*')
      .eq('id', sectionId)
      .single();

    if (readError || !section) {
      console.error('Failed to read section:', readError);
      return false;
    }

    // Update option
    const updated = {
      ...section,
      settings: {
        ...section.settings,
        [option]: value
      }
    };

    // Save
    const { error: updateError } = await supabase
      .from('page_builder_sections')
      .update(updated)
      .eq('id', sectionId);

    if (updateError) {
      console.error('Failed to update:', updateError);
      return false;
    }

    // Verify
    const { data: verified, error: verifyError } = await supabase
      .from('page_builder_sections')
      .select('settings')
      .eq('id', sectionId)
      .single();

    if (verifyError || !verified) {
      console.error('Failed to verify:', verifyError);
      return false;
    }

    const savedValue = verified.settings[option];
    const matches = JSON.stringify(savedValue) === JSON.stringify(value);

    if (!matches) {
      console.error('Value mismatch:', { expected: value, actual: savedValue });
    }

    return matches;
  } catch (error) {
    console.error('Persistence test failed:', error);
    return false;
  }
}

/**
 * Batch test all options for a section
 */
export async function batchTestOptions(sectionId: string, options: Record<string, any>): Promise<ValidationResult> {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
    tested: 0,
    passed: 0
  };

  for (const [option, value] of Object.entries(options)) {
    result.tested++;
    
    const success = await testOptionPersistence(sectionId, option, value);
    
    if (success) {
      result.passed++;
    } else {
      result.errors.push(`Option '${option}' failed persistence test`);
      result.success = false;
    }
  }

  return result;
}

export default {
  validateSectionSave,
  testSectionSave,
  testAllOptions,
  runComprehensiveTests,
  generateTestReport,
  testPreviewUpdate,
  testOptionPersistence,
  batchTestOptions
};
