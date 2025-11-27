import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  extractKeywords, 
  extractMultilingualKeywords,
  generateMetaDescription, 
  generatePageTitle,
  KeywordAnalysis,
  SupportedSEOLanguage
} from '@/lib/seoUtils';
import { clearSeoCache } from '@/lib/seoCache';
import { logger } from '@/lib/logger';

interface AutoSEOResult {
  keywords: KeywordAnalysis[];
  metaDescription: string;
  pageTitle: string;
  success: boolean;
  error?: string;
  multilingualKeywords?: {
    es: KeywordAnalysis[];
    en: KeywordAnalysis[];
    nl: KeywordAnalysis[];
  };
}

interface ProductData {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

interface BlogPostData {
  id: string;
  slug: string;
  title: string;
  content?: string;
  excerpt?: string;
}

/**
 * Hook for automatic SEO generation when products or content are created/updated
 * Supports multilingual keywords for Belgium market (Spanish, Dutch, English)
 */
export function useAutoSEO() {
  /**
   * Generates and saves SEO data for a product with multilingual keywords
   */
  const generateProductSEO = useCallback(async (
    product: ProductData
  ): Promise<AutoSEOResult> => {
    try {
      const textToAnalyze = `${product.name} ${product.description || ''}`;
      
      // Extract multilingual keywords for Belgium market (ES, EN, NL)
      const multilingualKeywords = extractMultilingualKeywords(textToAnalyze, {
        category: product.category,
        productType: 'product'
      });
      
      // Use combined keywords for backward compatibility
      const keywords = multilingualKeywords.combined.slice(0, 10);
      
      // Generate meta description
      const metaResult = generateMetaDescription(
        product.name,
        product.description || product.name,
        {
          maxLength: 160,
          keywords: keywords.slice(0, 3).map(k => k.keyword),
          includeCallToAction: true
        }
      );
      
      // Generate page title
      const pageTitle = generatePageTitle(product.name, {
        suffix: ' - Thuis 3D',
        maxLength: 60
      });
      
      // Save all multilingual keywords to database
      // Save more keywords per language to ensure Belgian customers can find products
      const allLanguages: SupportedSEOLanguage[] = ['es', 'en', 'nl'];
      for (const lang of allLanguages) {
        const langKeywords = multilingualKeywords[lang];
        // Save up to 10 keywords per language for better coverage
        const keywordsToSave = langKeywords.slice(0, 10).map(k => ({
          keyword: k.keyword.toLowerCase().trim(),
          source_type: 'product' as const,
          source_id: product.id,
          auto_generated: true,
          is_active: true,
          relevance_score: k.relevanceScore,
          keyword_type: k.keywordType,
          search_volume_estimate: k.searchVolume,
          language: lang
        }));
        
        // Upsert keywords - first try to find existing, then insert or update
        for (const keyword of keywordsToSave) {
          // Check if keyword with same language and source already exists
          const { data: existing } = await supabase
            .from('seo_keywords')
            .select('id')
            .eq('keyword', keyword.keyword)
            .eq('language', keyword.language)
            .eq('source_type', keyword.source_type)
            .eq('source_id', keyword.source_id)
            .maybeSingle();
          
          if (existing) {
            // Update existing keyword
            const { error: updateError } = await supabase
              .from('seo_keywords')
              .update({
                relevance_score: keyword.relevance_score,
                keyword_type: keyword.keyword_type,
                search_volume_estimate: keyword.search_volume_estimate,
                is_active: keyword.is_active
              })
              .eq('id', existing.id);
            
            if (updateError) {
              logger.warn(`Failed to update keyword: ${keyword.keyword}`, { error: updateError });
            }
          } else {
            // Insert new keyword
            const { error: insertError } = await supabase
              .from('seo_keywords')
              .insert(keyword);
            
            if (insertError) {
              logger.warn(`Failed to insert keyword: ${keyword.keyword}`, { error: insertError });
            }
          }
        }
      }
      
      // Check if meta tag exists for this product
      const pagePath = `/product/${product.id}`;
      const { data: existingTag } = await supabase
        .from('seo_meta_tags')
        .select('id')
        .eq('page_path', pagePath)
        .maybeSingle();
      
      // Upsert meta tag
      const metaTagData = {
        page_path: pagePath,
        page_title: pageTitle,
        meta_description: metaResult.description,
        og_title: product.name,
        og_description: metaResult.description,
        twitter_title: product.name,
        twitter_description: metaResult.description,
        keywords: keywords.slice(0, 5).map(k => k.keyword),
        updated_at: new Date().toISOString()
      };
      
      if (existingTag) {
        await supabase
          .from('seo_meta_tags')
          .update(metaTagData)
          .eq('id', existingTag.id);
      } else {
        await supabase
          .from('seo_meta_tags')
          .insert(metaTagData);
      }
      
      // Log the SEO generation with multilingual info
      await supabase.from('seo_audit_log').insert({
        audit_type: 'auto_generation',
        status: 'success',
        message: `SEO multilingüe generado para producto: ${product.name}`,
        details: {
          product_id: product.id,
          keywords_count: keywords.length,
          keywords_es: multilingualKeywords.es.length,
          keywords_en: multilingualKeywords.en.length,
          keywords_nl: multilingualKeywords.nl.length,
          meta_description_length: metaResult.characterCount,
          languages: ['es', 'en', 'nl']
        }
      });
      
      // Clear cache to reflect new data
      clearSeoCache();
      
      return {
        keywords,
        metaDescription: metaResult.description,
        pageTitle,
        success: true,
        multilingualKeywords: {
          es: multilingualKeywords.es,
          en: multilingualKeywords.en,
          nl: multilingualKeywords.nl
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error generating product SEO', { error, productId: product.id });
      
      return {
        keywords: [],
        metaDescription: '',
        pageTitle: '',
        success: false,
        error: errorMessage
      };
    }
  }, []);

  /**
   * Generates and saves SEO data for a blog post with multilingual keywords
   */
  const generateBlogSEO = useCallback(async (
    blogPost: BlogPostData
  ): Promise<AutoSEOResult> => {
    try {
      const textToAnalyze = `${blogPost.title} ${blogPost.excerpt || ''} ${blogPost.content || ''}`;
      
      // Extract multilingual keywords for Belgium market (ES, EN, NL)
      const multilingualKeywords = extractMultilingualKeywords(textToAnalyze, {
        productType: 'blog'
      });
      
      // Use combined keywords for backward compatibility
      const keywords = multilingualKeywords.combined.slice(0, 10);
      
      // Generate meta description
      const metaResult = generateMetaDescription(
        blogPost.title,
        blogPost.excerpt || blogPost.content || blogPost.title,
        {
          maxLength: 160,
          keywords: keywords.slice(0, 3).map(k => k.keyword),
          includeCallToAction: false
        }
      );
      
      // Generate page title
      const pageTitle = generatePageTitle(blogPost.title, {
        suffix: ' - Blog Thuis 3D',
        maxLength: 60
      });
      
      // Save all multilingual keywords to database
      // Save more keywords per language for better coverage
      const allLanguages: SupportedSEOLanguage[] = ['es', 'en', 'nl'];
      for (const lang of allLanguages) {
        const langKeywords = multilingualKeywords[lang];
        // Save up to 10 keywords per language for better coverage
        const keywordsToSave = langKeywords.slice(0, 10).map(k => ({
          keyword: k.keyword.toLowerCase().trim(),
          source_type: 'blog' as const,
          source_id: blogPost.id,
          auto_generated: true,
          is_active: true,
          relevance_score: k.relevanceScore,
          keyword_type: k.keywordType,
          search_volume_estimate: k.searchVolume,
          language: lang
        }));
        
        // Upsert keywords - first try to find existing, then insert or update
        for (const keyword of keywordsToSave) {
          // Check if keyword with same language and source already exists
          const { data: existing } = await supabase
            .from('seo_keywords')
            .select('id')
            .eq('keyword', keyword.keyword)
            .eq('language', keyword.language)
            .eq('source_type', keyword.source_type)
            .eq('source_id', keyword.source_id)
            .maybeSingle();
          
          if (existing) {
            // Update existing keyword
            const { error: updateError } = await supabase
              .from('seo_keywords')
              .update({
                relevance_score: keyword.relevance_score,
                keyword_type: keyword.keyword_type,
                search_volume_estimate: keyword.search_volume_estimate,
                is_active: keyword.is_active
              })
              .eq('id', existing.id);
            
            if (updateError) {
              logger.warn(`Failed to update blog keyword: ${keyword.keyword}`, { error: updateError });
            }
          } else {
            // Insert new keyword
            const { error: insertError } = await supabase
              .from('seo_keywords')
              .insert(keyword);
            
            if (insertError) {
              logger.warn(`Failed to insert blog keyword: ${keyword.keyword}`, { error: insertError });
            }
          }
        }
      }
      
      // Upsert meta tag
      const pagePath = `/blog/${blogPost.slug}`;
      const { data: existingTag } = await supabase
        .from('seo_meta_tags')
        .select('id')
        .eq('page_path', pagePath)
        .maybeSingle();
      
      const metaTagData = {
        page_path: pagePath,
        page_title: pageTitle,
        meta_description: metaResult.description,
        og_title: blogPost.title,
        og_description: metaResult.description,
        twitter_title: blogPost.title,
        twitter_description: metaResult.description,
        keywords: keywords.slice(0, 5).map(k => k.keyword),
        updated_at: new Date().toISOString()
      };
      
      if (existingTag) {
        await supabase
          .from('seo_meta_tags')
          .update(metaTagData)
          .eq('id', existingTag.id);
      } else {
        await supabase
          .from('seo_meta_tags')
          .insert(metaTagData);
      }
      
      // Log the SEO generation with multilingual info
      await supabase.from('seo_audit_log').insert({
        audit_type: 'auto_generation',
        status: 'success',
        message: `SEO multilingüe generado para blog: ${blogPost.title}`,
        details: {
          blog_id: blogPost.id,
          slug: blogPost.slug,
          keywords_count: keywords.length,
          keywords_es: multilingualKeywords.es.length,
          keywords_en: multilingualKeywords.en.length,
          keywords_nl: multilingualKeywords.nl.length,
          languages: ['es', 'en', 'nl']
        }
      });
      
      clearSeoCache();
      
      return {
        keywords,
        metaDescription: metaResult.description,
        pageTitle,
        success: true,
        multilingualKeywords: {
          es: multilingualKeywords.es,
          en: multilingualKeywords.en,
          nl: multilingualKeywords.nl
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error generating blog SEO', { error, blogId: blogPost.id });
      
      return {
        keywords: [],
        metaDescription: '',
        pageTitle: '',
        success: false,
        error: errorMessage
      };
    }
  }, []);

  /**
   * Bulk generates SEO for all products
   */
  const regenerateAllProductSEO = useCallback(async (): Promise<{
    success: boolean;
    processed: number;
    errors: number;
  }> => {
    try {
      toast.info('Iniciando generación masiva de SEO...');
      
      // Fetch all products
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, description, category:categories(name)')
        .is('deleted_at', null);
      
      if (error) throw error;
      
      let processed = 0;
      let errors = 0;
      
      for (const product of products || []) {
        const result = await generateProductSEO({
          id: product.id,
          name: product.name,
          description: product.description || undefined,
          category: (product.category as { name: string } | null)?.name
        });
        
        if (result.success) {
          processed++;
        } else {
          errors++;
        }
      }
      
      // Log bulk operation
      await supabase.from('seo_audit_log').insert({
        audit_type: 'bulk_generation',
        status: errors === 0 ? 'success' : 'warning',
        message: `Generación masiva completada: ${processed} procesados, ${errors} errores`,
        details: { processed, errors, total: products?.length || 0 }
      });
      
      toast.success(`SEO generado: ${processed} productos procesados`);
      
      return { success: true, processed, errors };
    } catch (error) {
      logger.error('Error in bulk SEO generation', { error });
      toast.error('Error al generar SEO masivo');
      return { success: false, processed: 0, errors: 1 };
    }
  }, [generateProductSEO]);

  /**
   * Validates current SEO configuration
   */
  const validateSEO = useCallback(async (): Promise<{
    score: number;
    recommendations: string[];
  }> => {
    try {
      // Fetch current settings
      const { data: settings } = await supabase
        .from('seo_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      const { data: keywords } = await supabase
        .from('seo_keywords')
        .select('keyword, is_active, keyword_type')
        .eq('is_active', true);
      
      const { data: metaTags } = await supabase
        .from('seo_meta_tags')
        .select('page_path');
      
      const recommendations: string[] = [];
      let score = 0;
      
      // Check settings
      if (settings?.site_title && settings.site_title.length >= 30) {
        score += 15;
      } else {
        recommendations.push('Configura un título de sitio más descriptivo (30+ caracteres)');
      }
      
      if (settings?.site_description && settings.site_description.length >= 120) {
        score += 15;
      } else {
        recommendations.push('Mejora la descripción del sitio (120+ caracteres)');
      }
      
      if (settings?.google_site_verification) {
        score += 10;
      } else {
        recommendations.push('Configura Google Search Console');
      }
      
      if (settings?.google_analytics_id) {
        score += 10;
      } else {
        recommendations.push('Configura Google Analytics');
      }
      
      // Check keywords
      const activeKeywords = keywords?.filter(k => k.is_active) || [];
      const longTailKeywords = keywords?.filter(k => k.keyword_type === 'long-tail') || [];
      
      if (activeKeywords.length >= 15) {
        score += 20;
      } else if (activeKeywords.length >= 10) {
        score += 15;
        recommendations.push(`Tienes ${activeKeywords.length} keywords. Objetivo: 15+`);
      } else {
        score += 5;
        recommendations.push(`Solo tienes ${activeKeywords.length} keywords activas. Genera más.`);
      }
      
      if (longTailKeywords.length >= 5) {
        score += 10;
      } else {
        recommendations.push('Genera más keywords long-tail (2-4 palabras)');
      }
      
      // Check meta tags
      const mainPages = ['/', '/products', '/blog', '/quotes'];
      const configuredMainPages = mainPages.filter(p => 
        metaTags?.some(t => t.page_path === p)
      );
      
      if (configuredMainPages.length === mainPages.length) {
        score += 20;
      } else {
        const missing = mainPages.filter(p => !configuredMainPages.includes(p));
        recommendations.push(`Configura meta tags para: ${missing.join(', ')}`);
        score += (configuredMainPages.length / mainPages.length) * 20;
      }
      
      return {
        score: Math.min(Math.round(score), 100),
        recommendations
      };
    } catch (error) {
      logger.error('Error validating SEO', { error });
      return {
        score: 0,
        recommendations: ['Error al validar la configuración SEO']
      };
    }
  }, []);

  return {
    generateProductSEO,
    generateBlogSEO,
    regenerateAllProductSEO,
    validateSEO
  };
}
