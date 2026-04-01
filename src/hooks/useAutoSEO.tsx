import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
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
 * Batch upsert keywords - replaces N+1 individual queries with a single batch
 */
async function batchUpsertKeywords(
  sourceType: 'product' | 'blog',
  sourceId: string,
  multilingualKeywords: Record<SupportedSEOLanguage, KeywordAnalysis[]>
) {
  const allKeywords: Array<{
    keyword: string;
    source_type: string;
    source_id: string;
    auto_generated: boolean;
    is_active: boolean;
    relevance_score: number;
    keyword_type: string;
    search_volume_estimate: string;
    language: string;
  }> = [];

  const languages: SupportedSEOLanguage[] = ['nl', 'en', 'es'];
  for (const lang of languages) {
    const langKeywords = multilingualKeywords[lang] || [];
    for (const k of langKeywords.slice(0, 10)) {
      allKeywords.push({
        keyword: k.keyword.toLowerCase().trim(),
        source_type: sourceType,
        source_id: sourceId,
        auto_generated: true,
        is_active: true,
        relevance_score: k.relevanceScore,
        keyword_type: k.keywordType,
        search_volume_estimate: k.searchVolume,
        language: lang
      });
    }
  }

  if (allKeywords.length === 0) return;

  // Delete existing auto-generated keywords for this source, then batch insert
  await supabase
    .from('seo_keywords')
    .delete()
    .eq('source_type', sourceType)
    .eq('source_id', sourceId)
    .eq('auto_generated', true);

  // Insert all in one call
  const { error } = await supabase.from('seo_keywords').insert(allKeywords);
  if (error) {
    logger.warn(`Batch keyword insert failed for ${sourceType}:${sourceId}`, { error });
  }
}

/**
 * Upsert a meta tag for a page path
 */
async function upsertMetaTag(pagePath: string, data: Record<string, any>) {
  const { data: existing } = await supabase
    .from('seo_meta_tags')
    .select('id')
    .eq('page_path', pagePath)
    .maybeSingle();

  const metaTagData = { ...data, page_path: pagePath, updated_at: new Date().toISOString() };

  if (existing) {
    await supabase.from('seo_meta_tags').update(metaTagData).eq('id', existing.id);
  } else {
    await supabase.from('seo_meta_tags').insert(metaTagData);
  }
}

export function useAutoSEO() {
  const generateProductSEO = useCallback(async (product: ProductData): Promise<AutoSEOResult> => {
    try {
      const textToAnalyze = `${product.name} ${product.description || ''}`;
      
      const multilingualKeywords = extractMultilingualKeywords(textToAnalyze, {
        category: product.category,
        productType: 'product'
      });
      
      const keywords = multilingualKeywords.combined.slice(0, 10);
      
      const metaResult = generateMetaDescription(product.name, product.description || product.name, {
        maxLength: 160,
        keywords: keywords.slice(0, 3).map(k => k.keyword),
        includeCallToAction: true
      });
      
      const pageTitle = generatePageTitle(product.name, { suffix: ' - Thuis3D.be', maxLength: 60 });
      
      // Batch upsert all keywords (replaces N+1 queries)
      await batchUpsertKeywords('product', product.id, multilingualKeywords);
      
      // Upsert meta tag
      await upsertMetaTag(`/product/${product.id}`, {
        page_title: pageTitle,
        meta_description: metaResult.description,
        og_title: product.name,
        og_description: metaResult.description,
        twitter_title: product.name,
        twitter_description: metaResult.description,
        keywords: keywords.slice(0, 5).map(k => k.keyword)
      });
      
      await supabase.from('seo_audit_log').insert({
        audit_type: 'auto_generation',
        status: 'success',
        message: `SEO generado para producto: ${product.name}`,
        details: { product_id: product.id, keywords_count: keywords.length }
      });
      
      clearSeoCache();
      
      return { keywords, metaDescription: metaResult.description, pageTitle, success: true };
    } catch (error) {
      logger.error('Error generating product SEO', { error, productId: product.id });
      return { keywords: [], metaDescription: '', pageTitle: '', success: false, error: String(error) };
    }
  }, []);

  const generateBlogSEO = useCallback(async (blogPost: BlogPostData): Promise<AutoSEOResult> => {
    try {
      const textToAnalyze = `${blogPost.title} ${blogPost.excerpt || ''} ${blogPost.content || ''}`;
      
      const multilingualKeywords = extractMultilingualKeywords(textToAnalyze, { productType: 'blog' });
      const keywords = multilingualKeywords.combined.slice(0, 10);
      
      const metaResult = generateMetaDescription(blogPost.title, blogPost.excerpt || blogPost.content || blogPost.title, {
        maxLength: 160,
        keywords: keywords.slice(0, 3).map(k => k.keyword),
        includeCallToAction: false
      });
      
      const pageTitle = generatePageTitle(blogPost.title, { suffix: ' - Blog Thuis3D.be', maxLength: 60 });
      
      await batchUpsertKeywords('blog', blogPost.id, multilingualKeywords);
      
      await upsertMetaTag(`/blog/${blogPost.slug}`, {
        page_title: pageTitle,
        meta_description: metaResult.description,
        og_title: blogPost.title,
        og_description: metaResult.description,
        twitter_title: blogPost.title,
        twitter_description: metaResult.description,
        keywords: keywords.slice(0, 5).map(k => k.keyword)
      });
      
      await supabase.from('seo_audit_log').insert({
        audit_type: 'auto_generation',
        status: 'success',
        message: `SEO generado para blog: ${blogPost.title}`,
        details: { blog_id: blogPost.id, slug: blogPost.slug, keywords_count: keywords.length }
      });
      
      clearSeoCache();
      
      return { keywords, metaDescription: metaResult.description, pageTitle, success: true };
    } catch (error) {
      logger.error('Error generating blog SEO', { error, blogId: blogPost.id });
      return { keywords: [], metaDescription: '', pageTitle: '', success: false, error: String(error) };
    }
  }, []);

  const regenerateAllProductSEO = useCallback(async () => {
    try {
      toast.info('Iniciando generación masiva de SEO...');
      
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, description, category:categories(name)')
        .is('deleted_at', null);
      
      if (error) throw error;
      
      let processed = 0, errors = 0;
      
      for (const product of products || []) {
        const result = await generateProductSEO({
          id: product.id,
          name: product.name,
          description: product.description || undefined,
          category: (product.category as { name: string } | null)?.name
        });
        result.success ? processed++ : errors++;
      }
      
      toast.success(`SEO generado: ${processed} productos procesados`);
      return { success: true, processed, errors };
    } catch (error) {
      logger.error('Error in bulk SEO generation', { error });
      toast.error('Error al generar SEO masivo');
      return { success: false, processed: 0, errors: 1 };
    }
  }, [generateProductSEO]);

  const validateSEO = useCallback(async () => {
    try {
      const [settingsRes, keywordsRes, metaTagsRes] = await Promise.all([
        supabase.from('seo_settings').select('*').limit(1).maybeSingle(),
        supabase.from('seo_keywords').select('keyword, is_active, keyword_type').eq('is_active', true),
        supabase.from('seo_meta_tags').select('page_path')
      ]);

      const settings = settingsRes.data;
      const keywords = keywordsRes.data;
      const metaTags = metaTagsRes.data;
      const recommendations: string[] = [];
      let score = 0;

      if (settings?.site_title && settings.site_title.length >= 30) score += 15;
      else recommendations.push('Configura un título de sitio más descriptivo (30+ caracteres)');

      if (settings?.site_description && settings.site_description.length >= 120) score += 15;
      else recommendations.push('Mejora la descripción del sitio (120+ caracteres)');

      if (settings?.google_site_verification) score += 10;
      else recommendations.push('Configura Google Search Console');

      if (settings?.google_analytics_id) score += 10;
      else recommendations.push('Configura Google Analytics');

      const activeKeywords = keywords?.filter(k => k.is_active) || [];
      if (activeKeywords.length >= 15) score += 20;
      else {
        score += Math.min(15, activeKeywords.length);
        recommendations.push(`Tienes ${activeKeywords.length} keywords. Objetivo: 15+`);
      }

      const longTailKeywords = keywords?.filter(k => k.keyword_type === 'long-tail') || [];
      if (longTailKeywords.length >= 5) score += 10;
      else recommendations.push('Genera más keywords long-tail');

      const mainPages = ['/', '/productos', '/blog', '/cotizaciones'];
      const configured = mainPages.filter(p => metaTags?.some(t => t.page_path === p));
      score += Math.round((configured.length / mainPages.length) * 20);
      if (configured.length < mainPages.length) {
        const missing = mainPages.filter(p => !configured.includes(p));
        recommendations.push(`Configura meta tags para: ${missing.join(', ')}`);
      }

      return { score: Math.min(Math.round(score), 100), recommendations };
    } catch (error) {
      logger.error('Error validating SEO', { error });
      return { score: 0, recommendations: ['Error al validar la configuración SEO'] };
    }
  }, []);

  return { generateProductSEO, generateBlogSEO, regenerateAllProductSEO, validateSEO };
}