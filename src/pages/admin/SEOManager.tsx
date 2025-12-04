import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { i18nToast, toast } from "@/lib/i18nToast";
import { Search, TrendingUp, FileText, BarChart3, Link2, AlertCircle, CheckCircle, RefreshCw, CheckCircle2, HelpCircle, Sparkles, Zap, Target, Eye, Globe2, Settings2, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAutoSEO } from "@/hooks/useAutoSEO";
import { extractKeywords } from "@/lib/seoUtils";
import { logger } from "@/lib/logger";

// Interface for individual SEO check result
interface SEOCheck {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  score: number;
  maxScore: number;
  message: string;
  action?: string;
}

// Interface for SEO analysis result
interface SEOAnalysis {
  totalScore: number;
  checks: SEOCheck[];
  passedCount: number;
  failedCount: number;
}

export default function SEOManager() {
  const [settings, setSettings] = useState<any>(null);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [metaTags, setMetaTags] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [redirects, setRedirects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("general");
  const [newKeyword, setNewKeyword] = useState("");
  const [newKeywordLanguage, setNewKeywordLanguage] = useState<'es' | 'en' | 'nl'>('nl');
  const [seoScore, setSeoScore] = useState(0);
  const [seoAnalysis, setSeoAnalysis] = useState<SEOAnalysis | null>(null);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { regenerateAllProductSEO, regenerateAllCategorySEO, regenerateAllBlogSEO, validateSEO } = useAutoSEO();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load SEO settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("seo_settings")
        .select("*")
        .limit(1)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      setSettings(settingsData);

      // Load keywords
      const { data: keywordsData, error: keywordsError } = await supabase
        .from("seo_keywords")
        .select("*")
        .order("created_at", { ascending: false });

      if (keywordsError) throw keywordsError;
      setKeywords(keywordsData || []);

      // Load meta tags
      const { data: metaData, error: metaError } = await supabase
        .from("seo_meta_tags")
        .select("*")
        .order("created_at", { ascending: false });

      if (metaError) throw metaError;
      setMetaTags(metaData || []);

      // Load audit logs
      const { data: auditData, error: auditError } = await supabase
        .from("seo_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (auditError) throw auditError;
      setAuditLogs(auditData || []);

      // Load redirects
      const { data: redirectsData, error: redirectsError } = await supabase
        .from("seo_redirects")
        .select("*")
        .order("created_at", { ascending: false });

      if (redirectsError) throw redirectsError;
      setRedirects(redirectsData || []);

      // Calculate SEO score with detailed analysis
      await calculateSeoScore(settingsData, keywordsData, metaData);
    } catch (error: unknown) {
      logger.error("Error loading SEO data:", { error });
      i18nToast.error("error.seoLoadFailed");
    } finally {
      setLoading(false);
    }
  };

  const calculateSeoScore = async (settingsData: any, keywordsData: any[], metaTagsData: any[]) => {
    const checks: SEOCheck[] = [];
    
    // ===============================================
    // TITLE ANALYSIS (15 points max)
    // ===============================================
    const titleLength = settingsData?.site_title?.length || 0;
    const titleOptimal = titleLength >= 30 && titleLength <= 60;
    const titleExists = titleLength > 0;
    
    checks.push({
      id: 'title_exists',
      category: 'Título',
      name: 'Título del sitio configurado',
      passed: titleExists,
      score: titleExists ? 5 : 0,
      maxScore: 5,
      message: titleExists 
        ? `Título configurado: "${settingsData?.site_title?.substring(0, 40)}${titleLength > 40 ? '...' : ''}"` 
        : 'No se ha configurado un título para el sitio',
      action: titleExists ? undefined : 'Configura un título descriptivo en la pestaña "General"'
    });
    
    checks.push({
      id: 'title_length',
      category: 'Título',
      name: 'Longitud óptima del título (30-60 caracteres)',
      passed: titleOptimal,
      score: titleOptimal ? 10 : (titleExists ? 3 : 0),
      maxScore: 10,
      message: titleExists 
        ? `El título tiene ${titleLength} caracteres${titleOptimal ? ' (óptimo)' : titleLength < 30 ? ' (muy corto)' : ' (muy largo)'}` 
        : 'Sin título configurado',
      action: !titleOptimal && titleExists 
        ? `Ajusta el título a 30-60 caracteres para mejor SEO` 
        : (!titleExists ? 'Configura un título de 30-60 caracteres' : undefined)
    });

    // ===============================================
    // META DESCRIPTION ANALYSIS (15 points max)
    // ===============================================
    const descLength = settingsData?.site_description?.length || 0;
    const descOptimal = descLength >= 120 && descLength <= 160;
    const descExists = descLength > 0;
    
    checks.push({
      id: 'desc_exists',
      category: 'Meta Descripción',
      name: 'Meta descripción configurada',
      passed: descExists,
      score: descExists ? 5 : 0,
      maxScore: 5,
      message: descExists 
        ? `Meta descripción configurada (${descLength} caracteres)` 
        : 'No se ha configurado una meta descripción',
      action: descExists ? undefined : 'Añade una descripción atractiva que aparecerá en los resultados de búsqueda'
    });
    
    checks.push({
      id: 'desc_length',
      category: 'Meta Descripción',
      name: 'Longitud óptima de descripción (120-160 caracteres)',
      passed: descOptimal,
      score: descOptimal ? 10 : (descExists ? 3 : 0),
      maxScore: 10,
      message: descExists 
        ? `La descripción tiene ${descLength} caracteres${descOptimal ? ' (óptimo)' : descLength < 120 ? ' (muy corta)' : ' (muy larga)'}` 
        : 'Sin descripción configurada',
      action: !descOptimal && descExists 
        ? `Ajusta la descripción a 120-160 caracteres para mejor CTR` 
        : (!descExists ? 'Configura una descripción de 120-160 caracteres' : undefined)
    });

    // ===============================================
    // KEYWORDS ANALYSIS (25 points max)
    // ===============================================
    const activeKeywords = keywordsData?.filter(k => k.is_active) || [];
    const longTailKeywords = keywordsData?.filter(k => k.keyword_type === 'long-tail' && k.is_active) || [];
    const primaryKeywords = keywordsData?.filter(k => k.keyword_type === 'primary' && k.is_active) || [];
    
    // Multilingual coverage check (critical for Belgium market)
    const spanishKeywords = keywordsData?.filter(k => k.language === 'es' && k.is_active) || [];
    const englishKeywords = keywordsData?.filter(k => k.language === 'en' && k.is_active) || [];
    const dutchKeywords = keywordsData?.filter(k => k.language === 'nl' && k.is_active) || [];
    
    const hasSpanish = spanishKeywords.length >= 5;
    const hasEnglish = englishKeywords.length >= 5;
    const hasDutch = dutchKeywords.length >= 5;
    const hasMultilingualCoverage = hasSpanish && hasEnglish && hasDutch;
    
    const hasEnoughKeywords = activeKeywords.length >= 10;
    const hasEnoughLongTail = longTailKeywords.length >= 5;
    const hasEnoughPrimary = primaryKeywords.length >= 3;
    
    checks.push({
      id: 'keywords_multilingual',
      category: 'Keywords',
      name: 'Cobertura multilingüe (ES, EN, NL para Bélgica)',
      passed: hasMultilingualCoverage,
      score: hasMultilingualCoverage ? 5 : (hasSpanish ? 1 : 0) + (hasEnglish ? 2 : 0) + (hasDutch ? 2 : 0),
      maxScore: 5,
      message: hasMultilingualCoverage 
        ? `Cobertura completa: ES(${spanishKeywords.length}), EN(${englishKeywords.length}), NL(${dutchKeywords.length}) ✓`
        : `Faltan keywords: ES(${spanishKeywords.length}), EN(${englishKeywords.length}), NL(${dutchKeywords.length})`,
      action: hasMultilingualCoverage 
        ? undefined 
        : 'Usa "Generar con IA" para crear keywords en los 3 idiomas del mercado belga'
    });
    
    checks.push({
      id: 'keywords_count',
      category: 'Keywords',
      name: 'Cantidad de keywords activas (mínimo 10)',
      passed: hasEnoughKeywords,
      score: hasEnoughKeywords ? 5 : Math.min(activeKeywords.length * 0.5, 3),
      maxScore: 5,
      message: `Tienes ${activeKeywords.length} keywords activas${hasEnoughKeywords ? ' ✓' : ''}`,
      action: hasEnoughKeywords ? undefined : `Genera más keywords. Necesitas al menos 10, actualmente tienes ${activeKeywords.length}`
    });
    
    checks.push({
      id: 'keywords_longtail',
      category: 'Keywords',
      name: 'Keywords long-tail (2-4 palabras, mínimo 5)',
      passed: hasEnoughLongTail,
      score: hasEnoughLongTail ? 10 : Math.min(longTailKeywords.length * 2, 6),
      maxScore: 10,
      message: `Tienes ${longTailKeywords.length} keywords long-tail${hasEnoughLongTail ? ' ✓' : ''}`,
      action: hasEnoughLongTail ? undefined : 'Las keywords long-tail tienen mejor conversión. Usa frases descriptivas de 2-4 palabras'
    });
    
    checks.push({
      id: 'keywords_primary',
      category: 'Keywords',
      name: 'Keywords primarias (mínimo 3)',
      passed: hasEnoughPrimary,
      score: hasEnoughPrimary ? 5 : Math.min(primaryKeywords.length * 1.5, 3),
      maxScore: 5,
      message: `Tienes ${primaryKeywords.length} keywords primarias${hasEnoughPrimary ? ' ✓' : ''}`,
      action: hasEnoughPrimary ? undefined : 'Añade keywords primarias que definan tu negocio principal'
    });

    // ===============================================
    // META TAGS COVERAGE (15 points max)
    // ===============================================
    const metaTagCount = metaTagsData?.length || 0;
    const mainPages = ['/', '/products', '/blog', '/quotes'];
    const configuredMainPages = mainPages.filter(page => 
      metaTagsData?.some(tag => tag.page_path === page)
    );
    const hasAllMainPages = configuredMainPages.length === mainPages.length;
    const hasGoodCoverage = metaTagCount >= 10;
    
    checks.push({
      id: 'metatags_main',
      category: 'Meta Tags',
      name: 'Meta tags en páginas principales',
      passed: hasAllMainPages,
      score: hasAllMainPages ? 8 : Math.round((configuredMainPages.length / mainPages.length) * 5),
      maxScore: 8,
      message: hasAllMainPages 
        ? 'Todas las páginas principales tienen meta tags ✓' 
        : `Faltan meta tags en: ${mainPages.filter(p => !configuredMainPages.includes(p)).join(', ')}`,
      action: hasAllMainPages ? undefined : 'Genera meta tags para las páginas principales usando "Generar Avanzado"'
    });
    
    checks.push({
      id: 'metatags_count',
      category: 'Meta Tags',
      name: 'Cobertura total de meta tags (mínimo 10)',
      passed: hasGoodCoverage,
      score: hasGoodCoverage ? 7 : Math.min(metaTagCount * 0.7, 4),
      maxScore: 7,
      message: `Tienes ${metaTagCount} meta tags configurados${hasGoodCoverage ? ' ✓' : ''}`,
      action: hasGoodCoverage ? undefined : 'Genera más meta tags para productos y páginas de contenido'
    });

    // ===============================================
    // TECHNICAL SEO (20 points max)
    // ===============================================
    const hasGoogleVerification = Boolean(settingsData?.google_site_verification);
    const hasGoogleAnalytics = Boolean(settingsData?.google_analytics_id);
    const hasCanonicalDomain = Boolean(settingsData?.canonical_domain);
    const hasOgImage = Boolean(settingsData?.og_image);
    
    checks.push({
      id: 'google_verification',
      category: 'Técnico',
      name: 'Google Search Console verificado',
      passed: hasGoogleVerification,
      score: hasGoogleVerification ? 5 : 0,
      maxScore: 5,
      message: hasGoogleVerification 
        ? 'Google Search Console está configurado ✓' 
        : 'Google Search Console no está verificado',
      action: hasGoogleVerification ? undefined : 'Configura Google Search Console para monitorear tu presencia en búsquedas'
    });
    
    checks.push({
      id: 'google_analytics',
      category: 'Técnico',
      name: 'Google Analytics configurado',
      passed: hasGoogleAnalytics,
      score: hasGoogleAnalytics ? 5 : 0,
      maxScore: 5,
      message: hasGoogleAnalytics 
        ? 'Google Analytics está configurado ✓' 
        : 'Google Analytics no está configurado',
      action: hasGoogleAnalytics ? undefined : 'Añade Google Analytics para medir el tráfico de tu sitio'
    });
    
    checks.push({
      id: 'canonical_domain',
      category: 'Técnico',
      name: 'Dominio canónico configurado',
      passed: hasCanonicalDomain,
      score: hasCanonicalDomain ? 5 : 0,
      maxScore: 5,
      message: hasCanonicalDomain 
        ? `Dominio canónico: ${settingsData?.canonical_domain} ✓` 
        : 'No se ha configurado un dominio canónico',
      action: hasCanonicalDomain ? undefined : 'Define tu dominio canónico para evitar contenido duplicado'
    });
    
    checks.push({
      id: 'og_image',
      category: 'Técnico',
      name: 'Imagen Open Graph para redes sociales',
      passed: hasOgImage,
      score: hasOgImage ? 5 : 0,
      maxScore: 5,
      message: hasOgImage 
        ? 'Imagen Open Graph configurada ✓' 
        : 'No hay imagen para compartir en redes sociales',
      action: hasOgImage ? undefined : 'Añade una imagen de 1200x630px para mejor visualización al compartir'
    });

    // ===============================================
    // CONTENT ANALYSIS (10 points max) - Optional: Fetch products/blog for extra analysis
    // ===============================================
    try {
      const { data: products } = await supabase
        .from('products')
        .select('id, name, description')
        .is('deleted_at', null)
        .limit(50);
      
      const productsWithDesc = products?.filter(p => p.description && p.description.length > 50) || [];
      const hasGoodDescriptions = productsWithDesc.length >= (products?.length || 1) * 0.7;
      
      checks.push({
        id: 'product_descriptions',
        category: 'Contenido',
        name: 'Productos con descripciones completas (>50 caracteres)',
        passed: hasGoodDescriptions,
        score: hasGoodDescriptions ? 5 : Math.round((productsWithDesc.length / Math.max(products?.length || 1, 1)) * 4),
        maxScore: 5,
        message: `${productsWithDesc.length} de ${products?.length || 0} productos tienen descripciones completas${hasGoodDescriptions ? ' ✓' : ''}`,
        action: hasGoodDescriptions ? undefined : 'Añade descripciones detalladas a tus productos para mejorar SEO'
      });
      
      // Check meta descriptions length quality
      const metaWithOptimalLength = metaTagsData?.filter(m => {
        const len = m.meta_description?.length || 0;
        return len >= 120 && len <= 160;
      }) || [];
      const hasQualityMeta = metaWithOptimalLength.length >= metaTagCount * 0.6;
      
      checks.push({
        id: 'meta_quality',
        category: 'Contenido',
        name: 'Meta descripciones con longitud óptima',
        passed: hasQualityMeta,
        score: hasQualityMeta ? 5 : Math.round((metaWithOptimalLength.length / Math.max(metaTagCount, 1)) * 4),
        maxScore: 5,
        message: `${metaWithOptimalLength.length} de ${metaTagCount} meta descripciones tienen longitud óptima${hasQualityMeta ? ' ✓' : ''}`,
        action: hasQualityMeta ? undefined : 'Ajusta las meta descripciones a 120-160 caracteres'
      });
    } catch (error) {
      logger.warn('Error fetching product data for SEO analysis', { error });
    }

    // Calculate totals
    const totalScore = Math.min(Math.round(checks.reduce((sum, check) => sum + check.score, 0)), 100);
    const passedCount = checks.filter(c => c.passed).length;
    const failedCount = checks.filter(c => !c.passed).length;
    
    const analysis: SEOAnalysis = {
      totalScore,
      checks,
      passedCount,
      failedCount
    };
    
    setSeoScore(totalScore);
    setSeoAnalysis(analysis);
  };

  const saveSettings = async () => {
    try {
      const { error } = await supabase
        .from("seo_settings")
        .upsert({
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      i18nToast.success("success.seoConfigSaved");
      
      // Log audit
      await supabase.from("seo_audit_log").insert({
        audit_type: "settings",
        status: "success",
        message: "Configuración SEO actualizada",
        score: seoScore
      });
    } catch (error: unknown) {
      logger.error("Error saving settings:", { error });
      i18nToast.error("error.configSaveFailed");
    }
  };

  const generateKeywords = async () => {
    try {
      setIsGenerating(true);
      toast.info("Generando palabras clave multilingües (ES, EN, NL) con análisis semántico...");
      
      // Use advanced client-side SEO generation with multilingual support
      // This generates keywords in all three languages (ES, EN, NL) for the Belgian market
      // Now includes product translations, category translations, and blog translations
      
      // Generate keywords for products (with translations)
      const productResult = await regenerateAllProductSEO();
      
      // Generate keywords for categories (with translations)
      const categoryResult = await regenerateAllCategorySEO();
      
      // Generate keywords for blog posts (with translations)
      const blogResult = await regenerateAllBlogSEO();
      
      const totalProcessed = productResult.processed + categoryResult.processed + blogResult.processed;
      const totalErrors = productResult.errors + categoryResult.errors + blogResult.errors;
      
      if (totalErrors > 0 && totalProcessed === 0) {
        throw new Error('Error en generación masiva');
      }
      
      // Clean up low quality keywords
      const { data: cleanupCount } = await supabase.rpc("cleanup_low_quality_keywords");
      
      await loadData();
      toast.success(`SEO multilingüe generado (ES, EN, NL). ${productResult.processed} productos, ${categoryResult.processed} categorías, ${blogResult.processed} posts procesados. ${cleanupCount || 0} keywords obsoletas eliminadas`);
      
      // Log audit
      await supabase.from("seo_audit_log").insert({
        audit_type: "keywords",
        status: "success",
        message: "Palabras clave multilingües generadas (ES, EN, NL) para mercado Bélgica - Incluye traducciones de productos, categorías y blog",
        details: { 
          total_keywords: keywords.length,
          products_processed: productResult.processed,
          categories_processed: categoryResult.processed,
          blog_posts_processed: blogResult.processed,
          cleanup_count: cleanupCount || 0,
          algorithm: 'semantic_multilingual_v3',
          languages: ['es', 'en', 'nl'],
          sources: ['products', 'categories', 'blog']
        }
      });
    } catch (error: unknown) {
      logger.error("Error generating keywords:", { error });
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error("Error al generar palabras clave: " + errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAdvancedMetaTags = async () => {
    try {
      setIsGenerating(true);
      toast.info("Generando meta descripciones optimizadas multilingües...");
      
      // Fetch products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, description, category:categories(name)')
        .is('deleted_at', null);
      
      if (productsError) throw productsError;
      
      let generatedCount = 0;
      let updatedCount = 0;
      
      for (const product of products || []) {
        const pagePath = `/product/${product.id}`;
        
        // Check if meta tag exists
        const { data: existingTag } = await supabase
          .from('seo_meta_tags')
          .select('id, meta_description')
          .eq('page_path', pagePath)
          .maybeSingle();
        
        // Generate optimized meta description using advanced algorithm
        const textToAnalyze = `${product.name} ${product.description || ''}`;
        const extractedKeywords = extractKeywords(textToAnalyze, {
          category: (product.category as { name: string } | null)?.name,
          language: 'es'
        });
        
        // Create optimized meta description with better structure
        let metaDesc = '';
        const categoryName = (product.category as { name: string } | null)?.name || 'impresión 3D';
        
        if (product.description && product.description.length > 50) {
          // Use product description as base
          metaDesc = product.description.substring(0, 100).trim();
        } else {
          // Generate a default professional description
          metaDesc = `${product.name} - Servicio profesional de ${categoryName} en Bélgica`;
        }
        
        // Add keyword if space permits
        if (metaDesc.length < 110 && extractedKeywords.length > 0) {
          const topKeyword = extractedKeywords[0].keyword;
          if (!metaDesc.toLowerCase().includes(topKeyword.toLowerCase())) {
            metaDesc += `. ${topKeyword.charAt(0).toUpperCase() + topKeyword.slice(1)}`;
          }
        }
        
        // Add multilingual call to action for Belgian market
        // Includes Spanish (source content), English (international), and Dutch (local)
        const ctas = [
          // Spanish
          ' ¡Cotiza gratis!',
          ' Envío rápido a Bélgica.',
          ' Calidad profesional garantizada.',
          // English
          ' Free quote available!',
          ' Fast shipping to Belgium.',
          ' Professional quality guaranteed.',
          // Dutch
          ' Gratis offerte!',
          ' Snelle verzending naar België.',
          ' Professionele kwaliteit gegarandeerd.'
        ];
        
        if (metaDesc.length < 130) {
          const selectedCta = ctas[Math.floor(Math.random() * ctas.length)];
          if (metaDesc.length + selectedCta.length <= 160) {
            metaDesc += selectedCta;
          }
        }
        
        // Ensure proper length (120-160 characters)
        if (metaDesc.length > 160) {
          metaDesc = metaDesc.substring(0, 157) + '...';
        }
        
        const metaTagData = {
          page_path: pagePath,
          page_title: `${product.name} - Thuis 3D`,
          meta_description: metaDesc,
          og_title: product.name,
          og_description: metaDesc,
          twitter_title: product.name,
          twitter_description: metaDesc,
          keywords: extractedKeywords.slice(0, 5).map(k => k.keyword),
          updated_at: new Date().toISOString()
        };
        
        if (!existingTag) {
          // Insert new meta tag
          await supabase.from('seo_meta_tags').insert(metaTagData);
          generatedCount++;
        } else if (!existingTag.meta_description || existingTag.meta_description.length < 100) {
          // Update existing meta tag if description is too short
          await supabase.from('seo_meta_tags')
            .update({
              meta_description: metaDesc,
              og_description: metaDesc,
              twitter_description: metaDesc,
              keywords: extractedKeywords.slice(0, 5).map(k => k.keyword),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingTag.id);
          updatedCount++;
        }
      }
      
      // Generate meta tags for main pages if missing
      const mainPages = [
        { path: '/', title: 'Thuis 3D - Servicio de Impresión 3D Profesional en Bélgica', description: 'Servicio profesional de impresión 3D en Bélgica. Prototipado rápido, piezas personalizadas, múltiples materiales. Cotización instantánea y envío a toda Europa.' },
        { path: '/products', title: 'Productos de Impresión 3D - Thuis 3D', description: 'Catálogo completo de productos y servicios de impresión 3D. Filamentos, resinas, piezas personalizadas. Calidad profesional con envío rápido a Bélgica.' },
        { path: '/blog', title: 'Blog de Impresión 3D - Thuis 3D', description: 'Artículos, tutoriales y novedades sobre impresión 3D. Consejos profesionales para tus proyectos de prototipado y fabricación aditiva.' },
        { path: '/quotes', title: 'Cotización de Impresión 3D - Thuis 3D', description: 'Solicita tu cotización gratuita de impresión 3D. Sube tu archivo STL y recibe un presupuesto instantáneo. Servicio profesional en Bélgica.' }
      ];
      
      for (const page of mainPages) {
        const { data: existing } = await supabase
          .from('seo_meta_tags')
          .select('id')
          .eq('page_path', page.path)
          .maybeSingle();
        
        if (!existing) {
          await supabase.from('seo_meta_tags').insert({
            page_path: page.path,
            page_title: page.title,
            meta_description: page.description,
            og_title: page.title,
            og_description: page.description,
            twitter_title: page.title,
            twitter_description: page.description,
            keywords: ['impresión 3d', '3d printing', 'prototipo', 'bélgica', 'thuis 3d']
          });
          generatedCount++;
        }
      }
      
      await loadData();
      toast.success(`Meta descripciones: ${generatedCount} nuevas, ${updatedCount} actualizadas`);
      
      // Log audit
      await supabase.from("seo_audit_log").insert({
        audit_type: "meta_tags",
        status: "success",
        message: `Meta descripciones optimizadas: ${generatedCount} nuevas, ${updatedCount} actualizadas`,
        details: { 
          advanced_generated: generatedCount,
          updated: updatedCount,
          algorithm: 'semantic_optimization_v2'
        }
      });
    } catch (error: unknown) {
      logger.error("Error generating meta tags:", { error });
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error("Error al generar meta tags: " + errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMetaTags = async () => {
    try {
      i18nToast.info("info.generatingMetaTags");
      
      // Call database function to generate meta tags
      const { data: generatedCount, error } = await supabase.rpc("generate_meta_tags_automatically");
      
      if (error) throw error;
      
      await loadData();
      toast.success(`Meta tags generados: ${generatedCount || 0} nuevos`);
      
      // Log audit
      await supabase.from("seo_audit_log").insert({
        audit_type: "meta_tags",
        status: "success",
        message: `Meta tags generados automáticamente: ${generatedCount || 0}`,
        details: { generated_count: generatedCount || 0 }
      });
    } catch (error: unknown) {
      logger.error("Error generating meta tags:", { error });
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error("Error al generar meta tags: " + errorMessage);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    
    try {
      // Analyze the keyword for quality assessment
      const keywordAnalysis = extractKeywords(newKeyword, { language: newKeywordLanguage });
      const wordCount = newKeyword.trim().split(/\s+/).length;
      
      // Determine keyword type based on word count
      const keywordType = wordCount === 1 ? 'primary' : wordCount <= 3 ? 'long-tail' : 'secondary';
      
      const { error } = await supabase
        .from("seo_keywords")
        .insert({
          keyword: newKeyword.toLowerCase().trim(),
          source_type: "manual",
          auto_generated: false,
          is_active: true,
          keyword_type: keywordType,
          relevance_score: keywordAnalysis.length > 0 ? keywordAnalysis[0].relevanceScore : 70,
          search_volume_estimate: wordCount <= 2 ? 'high' : wordCount <= 3 ? 'medium' : 'low',
          language: newKeywordLanguage
        });

      if (error) throw error;
      setNewKeyword("");
      setShowSuggestions(false);
      await loadData();
      toast.success(`Palabra clave agregada (${newKeywordLanguage.toUpperCase()})`);
    } catch (error: unknown) {
      logger.error("Error adding keyword:", { error });
      i18nToast.error("error.keywordAddFailed");
    }
  };

  // Generate keyword suggestions based on input
  const handleKeywordInputChange = (value: string) => {
    setNewKeyword(value);
    
    if (value.length >= 3) {
      // Generate suggestions based on the input, using Dutch as default for Belgian market
      const suggestions = extractKeywords(value, { language: newKeywordLanguage });
      setKeywordSuggestions(suggestions.slice(0, 5).map(s => s.keyword));
      setShowSuggestions(suggestions.length > 0);
    } else {
      setKeywordSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const deleteKeyword = async (id: string) => {
    try {
      const { error } = await supabase
        .from("seo_keywords")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await loadData();
      i18nToast.success("success.keywordDeleted");
    } catch (error: unknown) {
      logger.error("Error deleting keyword:", { error });
      i18nToast.error("error.keywordDeleteFailed");
    }
  };

  const runSeoAudit = async () => {
    try {
      i18nToast.info("info.seoAuditRunning");
      
      const recommendations: string[] = [];
      let auditScore = 100;

      // Use the validateSEO hook for comprehensive validation
      const validationResult = await validateSEO();
      
      // Check site title
      if (!settings?.site_title || settings.site_title.length < 10) {
        recommendations.push("El título del sitio debería tener al menos 10 caracteres");
        auditScore -= 10;
      } else if (settings.site_title.length < 30 || settings.site_title.length > 60) {
        recommendations.push(`El título debería tener entre 30-60 caracteres (actual: ${settings.site_title.length})`);
        auditScore -= 5;
      }

      // Check meta description
      if (!settings?.site_description || settings.site_description.length < 50) {
        recommendations.push("La descripción del sitio debería tener al menos 50 caracteres");
        auditScore -= 10;
      } else if (settings.site_description.length < 120 || settings.site_description.length > 160) {
        recommendations.push(`La descripción debería tener entre 120-160 caracteres (actual: ${settings.site_description.length})`);
        auditScore -= 5;
      }

      // Check keywords quality
      const activeKeywords = keywords.filter(k => k.is_active);
      const longTailKeywords = keywords.filter(k => k.keyword_type === 'long-tail');
      const primaryKeywords = keywords.filter(k => k.keyword_type === 'primary');
      const avgKeywordLength = keywords.reduce((acc, k) => acc + k.keyword.length, 0) / Math.max(keywords.length, 1);
      
      if (activeKeywords.length < 10) {
        recommendations.push(`Genera más palabras clave activas. Actualmente: ${activeKeywords.length}, recomendado: 15+`);
        auditScore -= 10;
      }
      
      if (longTailKeywords.length < 5) {
        recommendations.push(`Genera más keywords long-tail (2-4 palabras). Actualmente: ${longTailKeywords.length}`);
        auditScore -= 10;
      }
      
      if (primaryKeywords.length < 3) {
        recommendations.push(`Necesitas más keywords primarias. Actualmente: ${primaryKeywords.length}, recomendado: 3+`);
        auditScore -= 5;
      }
      
      if (avgKeywordLength < 12) {
        recommendations.push(`Tus keywords son muy cortas. Usa frases descriptivas de 2-4 palabras.`);
        auditScore -= 5;
      }

      // Check Google verification
      if (!settings?.google_site_verification) {
        recommendations.push("Configura Google Search Console para mejor visibilidad");
        auditScore -= 10;
      }

      // Check Google Analytics
      if (!settings?.google_analytics_id) {
        recommendations.push("Configura Google Analytics para medir el tráfico");
        auditScore -= 5;
      }

      // Check meta tags for main pages
      const mainPages = ['/', '/products', '/blog', '/quotes'];
      const missingPages = mainPages.filter(page => 
        !metaTags.some(tag => tag.page_path === page)
      );
      
      if (missingPages.length > 0) {
        recommendations.push(`Configura meta tags para: ${missingPages.join(', ')}`);
        auditScore -= 15;
      }

      // Check canonical domain
      if (!settings?.canonical_domain) {
        recommendations.push("Configura el dominio canónico para evitar contenido duplicado");
        auditScore -= 5;
      }

      // Check Open Graph image
      if (!settings?.og_image) {
        recommendations.push("Agrega una imagen Open Graph para mejorar visualización en redes sociales");
        auditScore -= 5;
      }

      // Merge recommendations from hook validation
      validationResult.recommendations.forEach(rec => {
        if (!recommendations.includes(rec)) {
          recommendations.push(rec);
        }
      });

      const finalScore = Math.max(0, auditScore);
      const status = finalScore >= 80 ? "success" : finalScore >= 60 ? "warning" : "error";
      
      await supabase.from("seo_audit_log").insert({
        audit_type: "complete",
        status,
        message: `Auditoría SEO avanzada completada - Puntuación: ${finalScore}/100`,
        score: finalScore,
        recommendations
      });

      await loadData();
      toast.success(`Auditoría completada - Puntuación: ${finalScore}/100`);
    } catch (error: unknown) {
      logger.error("Error running audit:", { error });
      i18nToast.error("error.seoAuditFailed");
    }
  };

  const generateSitemap = async () => {
    try {
      i18nToast.info("info.generatingSitemap");
      
      // This would call an edge function to generate sitemap
      const { error } = await supabase.functions.invoke("generate-sitemap");
      
      if (error) throw error;
      
      i18nToast.success("success.sitemapGenerated");
      
      await supabase.from("seo_audit_log").insert({
        audit_type: "sitemap",
        status: "success",
        message: "Sitemap generado"
      });
    } catch (error: unknown) {
      logger.error("Error generating sitemap:", { error });
      i18nToast.error("error.seoSitemapFailed");
    }
  };

  const verifyConfiguration = async () => {
    try {
      i18nToast.info("info.verifySeoConfig");
      
      const issues: string[] = [];
      const successes: string[] = [];
      let verificationScore = 100;

      // Verify Google Analytics ID format
      if (settings?.google_analytics_id) {
        const gaIdPattern = /^(G-[A-Z0-9]+|UA-[0-9]+-[0-9]+|AW-[0-9]+)$/;
        if (gaIdPattern.test(settings.google_analytics_id)) {
          successes.push("✅ ID de Google Analytics tiene formato válido");
        } else {
          issues.push("❌ ID de Google Analytics tiene formato incorrecto. Debe ser G-XXXXXXXXXX, UA-XXXXX-X o AW-XXXXXXXX");
          verificationScore -= 15;
        }
      } else {
        issues.push("⚠️ Google Analytics ID no configurado");
        verificationScore -= 15;
      }

      // Verify Google Search Console
      if (settings?.google_site_verification) {
        successes.push("✅ Código de verificación de Google Search Console configurado");
      } else {
        issues.push("⚠️ Google Search Console no verificado - Necesario para datos de búsqueda");
        verificationScore -= 10;
      }

      // Verify canonical domain
      if (settings?.canonical_domain) {
        const urlPattern = /^https?:\/\/.+/;
        if (urlPattern.test(settings.canonical_domain)) {
          successes.push("✅ Dominio canónico configurado correctamente");
        } else {
          issues.push("❌ Dominio canónico debe incluir protocolo (https://)");
          verificationScore -= 10;
        }
      } else {
        issues.push("⚠️ Dominio canónico no configurado");
        verificationScore -= 10;
      }

      // Verify title and description
      if (settings?.site_title && settings.site_title.length >= 10 && settings.site_title.length <= 60) {
        successes.push("✅ Título del sitio tiene longitud óptima");
      } else if (settings?.site_title) {
        issues.push(`⚠️ Título del sitio debería tener entre 10-60 caracteres (actual: ${settings.site_title.length})`);
        verificationScore -= 5;
      } else {
        issues.push("❌ Título del sitio no configurado");
        verificationScore -= 10;
      }

      if (settings?.site_description && settings.site_description.length >= 50 && settings.site_description.length <= 160) {
        successes.push("✅ Descripción del sitio tiene longitud óptima");
      } else if (settings?.site_description) {
        issues.push(`⚠️ Descripción debería tener entre 50-160 caracteres (actual: ${settings.site_description.length})`);
        verificationScore -= 5;
      } else {
        issues.push("❌ Descripción del sitio no configurada");
        verificationScore -= 10;
      }

      // Verify Bing and other search engines
      if (settings?.bing_site_verification) {
        successes.push("✅ Bing Webmaster Tools verificado");
      } else {
        issues.push("ℹ️ Bing Webmaster Tools no configurado (opcional pero recomendado)");
        verificationScore -= 5;
      }

      // Verify social meta tags
      if (settings?.og_image) {
        successes.push("✅ Imagen Open Graph configurada para compartir en redes sociales");
      } else {
        issues.push("ℹ️ Imagen Open Graph no configurada - Mejora visualización en redes sociales");
        verificationScore -= 5;
      }

      // Check robots.txt accessibility
      try {
        const robotsResponse = await fetch('/robots.txt');
        if (robotsResponse.ok) {
          successes.push("✅ Archivo robots.txt accesible");
        } else {
          issues.push("⚠️ Archivo robots.txt no encontrado");
          verificationScore -= 5;
        }
      } catch {
        issues.push("⚠️ No se pudo verificar robots.txt");
        verificationScore -= 5;
      }

      // Check sitemap accessibility
      try {
        const sitemapResponse = await fetch('/sitemap.xml');
        if (sitemapResponse.ok) {
          successes.push("✅ Sitemap XML accesible en /sitemap.xml");
        } else {
          issues.push("⚠️ Sitemap XML no encontrado - Genera uno usando el botón 'Generar Sitemap'");
          verificationScore -= 10;
        }
      } catch {
        issues.push("⚠️ No se pudo verificar sitemap.xml");
        verificationScore -= 10;
      }

      // Keywords verification
      const activeKeywords = keywords.filter(k => k.is_active);
      if (activeKeywords.length >= 10) {
        successes.push(`✅ Tienes ${activeKeywords.length} palabras clave activas`);
      } else {
        issues.push(`⚠️ Solo tienes ${activeKeywords.length} palabras clave activas. Recomendado: 15+`);
        verificationScore -= 10;
      }

      // Meta tags verification
      const mainPages = ['/', '/products', '/blog', '/quotes'];
      const configuredPages = mainPages.filter(page => metaTags.some(tag => tag.page_path === page));
      if (configuredPages.length === mainPages.length) {
        successes.push("✅ Meta tags configurados para todas las páginas principales");
      } else {
        const missingPages = mainPages.filter(page => !metaTags.some(tag => tag.page_path === page));
        issues.push(`⚠️ Faltan meta tags para: ${missingPages.join(', ')}`);
        verificationScore -= 10;
      }

      const status = verificationScore >= 80 ? "success" : verificationScore >= 60 ? "warning" : "error";

      // Log verification results
      await supabase.from("seo_audit_log").insert({
        audit_type: "verification",
        status,
        message: `Verificación de configuración completada - Puntuación: ${verificationScore}/100`,
        score: verificationScore,
        recommendations: [...issues, ...successes]
      });

      await loadData();

      // Show detailed results
      if (issues.length === 0) {
        toast.success(`🎉 Verificación exitosa - Puntuación: ${verificationScore}/100. Todo configurado correctamente.`);
      } else {
        toast.warning(
          `Verificación completada - Puntuación: ${verificationScore}/100\n\nProblemas encontrados:\n${issues.slice(0, 3).join('\n')}\n\n✅ ${successes.length} verificaciones exitosas`,
          { duration: 8000 }
        );
      }
    } catch (error: unknown) {
      logger.error("Error verifying configuration:", { error });
      i18nToast.error("error.seoVerifyFailed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando configuración SEO...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe2 className="h-8 w-8 text-primary" />
            Gestión SEO Avanzada
          </h1>
          <p className="text-muted-foreground">
            Sistema de optimización para motores de búsqueda con análisis semántico
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runSeoAudit} variant="outline" disabled={isGenerating}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Ejecutar Auditoría
          </Button>
          <Button onClick={generateSitemap} variant="outline" disabled={isGenerating}>
            <FileText className="h-4 w-4 mr-2" />
            Generar Sitemap
          </Button>
        </div>
      </div>

      {/* SEO Score Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Puntuación Total de SEO
          </CardTitle>
          <CardDescription>
            Análisis completo de tu configuración SEO actual - Calculado en tiempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-5xl font-bold">{seoScore}</span>
                <span className="text-2xl text-muted-foreground">/100</span>
              </div>
              <div className="flex flex-col items-end gap-2">
                {seoScore >= 80 ? (
                  <Badge className="bg-green-500 text-lg px-4 py-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Excelente
                  </Badge>
                ) : seoScore >= 60 ? (
                  <Badge className="bg-yellow-500 text-lg px-4 py-1">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Bueno
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-lg px-4 py-1">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Necesita mejoras
                  </Badge>
                )}
              </div>
            </div>
            <Progress value={seoScore} className="h-4" />
            <div className="grid grid-cols-4 gap-4 pt-4">
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-sm text-muted-foreground">Keywords Activas</p>
                <p className="text-xl font-bold">{keywords.filter(k => k.is_active).length}</p>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <Eye className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-sm text-muted-foreground">Meta Tags</p>
                <p className="text-xl font-bold">{metaTags.length}</p>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <Zap className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-sm text-muted-foreground">Long-tail</p>
                <p className="text-xl font-bold">{keywords.filter(k => k.keyword_type === 'long-tail').length}</p>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <Sparkles className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-sm text-muted-foreground">Primarias</p>
                <p className="text-xl font-bold">{keywords.filter(k => k.keyword_type === 'primary').length}</p>
              </div>
            </div>

            {/* Ver Mejoras - Collapsible Breakdown */}
            <Collapsible open={showScoreBreakdown} onOpenChange={setShowScoreBreakdown}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full mt-4 flex items-center justify-between hover:bg-primary/10"
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Ver mejoras
                    {seoAnalysis && (
                      <span className="text-sm text-muted-foreground">
                        ({seoAnalysis.passedCount} pasadas, {seoAnalysis.failedCount} pendientes)
                      </span>
                    )}
                  </span>
                  {showScoreBreakdown ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                {seoAnalysis && (
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                        <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
                        <p className="text-2xl font-bold text-green-600">{seoAnalysis.passedCount}</p>
                        <p className="text-xs text-muted-foreground">Verificaciones pasadas</p>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                        <XCircle className="h-5 w-5 mx-auto mb-1 text-red-500" />
                        <p className="text-2xl font-bold text-red-600">{seoAnalysis.failedCount}</p>
                        <p className="text-xs text-muted-foreground">Mejoras necesarias</p>
                      </div>
                      <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
                        <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
                        <p className="text-2xl font-bold">{seoAnalysis.totalScore}%</p>
                        <p className="text-xs text-muted-foreground">Puntuación total</p>
                      </div>
                    </div>

                    {/* Detailed Checks by Category */}
                    {['Título', 'Meta Descripción', 'Keywords', 'Meta Tags', 'Técnico', 'Contenido'].map(category => {
                      const categoryChecks = seoAnalysis.checks.filter(c => c.category === category);
                      if (categoryChecks.length === 0) return null;
                      
                      const categoryScore = categoryChecks.reduce((sum, c) => sum + c.score, 0);
                      const categoryMaxScore = categoryChecks.reduce((sum, c) => sum + c.maxScore, 0);
                      const categoryPercentage = Math.round((categoryScore / categoryMaxScore) * 100);
                      
                      return (
                        <div key={category} className="border rounded-lg overflow-hidden">
                          <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
                            <h4 className="font-semibold text-sm">{category}</h4>
                            <Badge 
                              variant={categoryPercentage >= 80 ? "default" : categoryPercentage >= 50 ? "secondary" : "destructive"}
                              className="text-xs"
                            >
                              {categoryScore}/{categoryMaxScore} pts ({categoryPercentage}%)
                            </Badge>
                          </div>
                          <div className="divide-y">
                            {categoryChecks.map(check => (
                              <div 
                                key={check.id} 
                                className={`px-4 py-3 flex items-start gap-3 ${check.passed ? 'bg-green-500/5' : 'bg-red-500/5'}`}
                              >
                                {check.passed ? (
                                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium text-sm">{check.name}</p>
                                    <span className="text-xs text-muted-foreground flex-shrink-0">
                                      {check.score}/{check.maxScore} pts
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{check.message}</p>
                                  {check.action && (
                                    <p className="text-sm text-primary mt-1 flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      {check.action}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="keywords" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Palabras Clave
          </TabsTrigger>
          <TabsTrigger value="meta" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Meta Tags
          </TabsTrigger>
          <TabsTrigger value="redirects" className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Redirecciones
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Auditoría
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General SEO</CardTitle>
              <CardDescription>
                Configuración global de SEO para todo el sitio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Verification Button */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <HelpCircle className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">Verificación de Configuración SEO</h3>
                    <p className="text-xs text-muted-foreground">
                      Verifica que tu sitio esté correctamente configurado para Google Analytics, Google Search Console y otros motores de búsqueda. Esta herramienta validará todos los aspectos técnicos de tu configuración SEO.
                    </p>
                  </div>
                </div>
                <Button onClick={verifyConfiguration} className="w-full" variant="default">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Verificar Configuración Completa
                </Button>
              </div>

              {/* Help Section */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Guía de Configuración SEO
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>Google Analytics:</strong> Obtén tu ID desde Google Analytics → Admin → Propiedad → ID de medición</li>
                  <li><strong>Google Search Console:</strong> Verifica tu sitio y copia el código meta de verificación</li>
                  <li><strong>Dominio Canónico:</strong> URL principal de tu sitio (ej: https://tudominio.com)</li>
                  <li><strong>Meta Tags:</strong> Los motores de búsqueda usan estos datos para mostrar tu sitio en resultados</li>
                  <li><strong>Keywords:</strong> Frases que describen tu contenido y ayudan a posicionar en búsquedas</li>
                </ul>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Título del Sitio
                  <span className="text-xs text-muted-foreground font-normal">(Aparece en la pestaña del navegador y resultados de Google)</span>
                </Label>
                <Input
                  value={settings?.site_title || ""}
                  onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
                  placeholder="Ejemplo: Thuis 3D - Impresión 3D Profesional en Bélgica"
                />
                <p className="text-xs text-muted-foreground">
                  Recomendado: 50-60 caracteres. Actual: {settings?.site_title?.length || 0} • 
                  <span className={settings?.site_title?.length >= 50 && settings?.site_title?.length <= 60 ? "text-green-600" : "text-orange-600"}>
                    {settings?.site_title?.length >= 50 && settings?.site_title?.length <= 60 ? " ✓ Óptimo" : " ⚠ Ajustar longitud"}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Descripción del Sitio
                  <span className="text-xs text-muted-foreground font-normal">(Texto que aparece debajo del título en Google)</span>
                </Label>
                <Textarea
                  value={settings?.site_description || ""}
                  onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
                  placeholder="Ejemplo: Servicio profesional de impresión 3D en Bélgica. Cotización instantánea, múltiples materiales, envíos rápidos. Calidad garantizada y precios competitivos."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Recomendado: 150-160 caracteres. Actual: {settings?.site_description?.length || 0} • 
                  <span className={settings?.site_description?.length >= 150 && settings?.site_description?.length <= 160 ? "text-green-600" : "text-orange-600"}>
                    {settings?.site_description?.length >= 150 && settings?.site_description?.length <= 160 ? " ✓ Óptimo" : " ⚠ Ajustar longitud"}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Dominio Canónico
                  <span className="text-xs text-muted-foreground font-normal">(URL principal de tu sitio web)</span>
                </Label>
                <Input
                  value={settings?.canonical_domain || ""}
                  onChange={(e) => setSettings({ ...settings, canonical_domain: e.target.value })}
                  placeholder="https://tudominio.com"
                />
                <p className="text-xs text-muted-foreground">
                  Incluye https:// al inicio. Evita contenido duplicado en buscadores.
                </p>
              </div>

              {/* Google Services */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Configuración de Google
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Google Site Verification
                      <span className="text-xs text-muted-foreground font-normal">(Google Search Console)</span>
                    </Label>
                    <Input
                      value={settings?.google_site_verification || ""}
                      onChange={(e) => setSettings({ ...settings, google_site_verification: e.target.value })}
                      placeholder="abc123xyz..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Código de verificación de Search Console (solo el contenido, sin meta tag)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Google Analytics ID
                      <span className="text-xs text-muted-foreground font-normal">(Medición de tráfico)</span>
                    </Label>
                    <Input
                      value={settings?.google_analytics_id || ""}
                      onChange={(e) => setSettings({ ...settings, google_analytics_id: e.target.value })}
                      placeholder="G-XXXXXXXXXX"
                    />
                    <p className="text-xs text-muted-foreground">
                      ID de medición desde Google Analytics 4 (empieza con G-)
                    </p>
                  </div>
                </div>
              </div>

              {/* Other Search Engines */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Otros Motores de Búsqueda
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bing Webmaster Tools</Label>
                    <Input
                      value={settings?.bing_site_verification || ""}
                      onChange={(e) => setSettings({ ...settings, bing_site_verification: e.target.value })}
                      placeholder="Código de verificación Bing"
                    />
                    <p className="text-xs text-muted-foreground">
                      Opcional - Mejora visibilidad en Bing y Yahoo
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Yandex Verification</Label>
                    <Input
                      value={settings?.yandex_verification || ""}
                      onChange={(e) => setSettings({ ...settings, yandex_verification: e.target.value })}
                      placeholder="Código Yandex"
                    />
                    <p className="text-xs text-muted-foreground">
                      Opcional - Para audiencia en Europa del Este
                    </p>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Redes Sociales y Open Graph
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Twitter/X Handle</Label>
                    <Input
                      value={settings?.twitter_handle || ""}
                      onChange={(e) => setSettings({ ...settings, twitter_handle: e.target.value })}
                      placeholder="@tuhandle"
                    />
                    <p className="text-xs text-muted-foreground">
                      Incluye @ al inicio. Se muestra al compartir en Twitter/X
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Facebook App ID</Label>
                    <Input
                      value={settings?.facebook_app_id || ""}
                      onChange={(e) => setSettings({ ...settings, facebook_app_id: e.target.value })}
                      placeholder="123456789"
                    />
                    <p className="text-xs text-muted-foreground">
                      Opcional - Para Facebook Insights y compartir
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Imagen Open Graph (URL)</Label>
                  <Input
                    value={settings?.og_image || ""}
                    onChange={(e) => setSettings({ ...settings, og_image: e.target.value })}
                    placeholder="https://tudominio.com/imagen-compartir.jpg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Imagen que aparece al compartir en redes sociales. Tamaño recomendado: 1200x630px
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Generar palabras clave automáticamente</Label>
                  <p className="text-sm text-muted-foreground">
                    Extrae palabras clave de productos y blog
                  </p>
                </div>
                <Switch
                  checked={settings?.auto_generate_keywords || false}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, auto_generate_keywords: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Generar meta descripciones automáticamente</Label>
                  <p className="text-sm text-muted-foreground">
                    Crea descripciones SEO para páginas sin meta tags
                  </p>
                </div>
                <Switch
                  checked={settings?.auto_generate_meta_descriptions || false}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, auto_generate_meta_descriptions: checked })
                  }
                />
              </div>

              <Button onClick={saveSettings} className="w-full">
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Keywords Tab */}
        <TabsContent value="keywords">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <span className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Palabras Clave ({keywords.filter(k => k.is_active).length} activas / {keywords.length} total)
                  </span>
                  <p className="text-sm font-normal text-muted-foreground mt-1">
                    Sistema de análisis semántico: Genera keywords long-tail optimizadas (2-4 palabras)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={generateKeywords} size="sm" disabled={isGenerating}>
                    {isGenerating ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Generar con IA
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Keywords multilingües (ES, EN, NL) generadas con análisis semántico avanzado para el mercado belga
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Estadísticas por Tipo */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
                <div className="text-center">
                  <Sparkles className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                  <p className="text-sm text-muted-foreground">Primarias</p>
                  <p className="text-2xl font-bold">{keywords.filter(k => k.keyword_type === 'primary').length}</p>
                </div>
                <div className="text-center">
                  <Target className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-sm text-muted-foreground">Long-tail</p>
                  <p className="text-2xl font-bold">{keywords.filter(k => k.keyword_type === 'long-tail').length}</p>
                </div>
                <div className="text-center">
                  <Zap className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                  <p className="text-sm text-muted-foreground">Secundarias</p>
                  <p className="text-2xl font-bold">{keywords.filter(k => k.keyword_type === 'secondary').length}</p>
                </div>
                <div className="text-center">
                  <BarChart3 className="h-5 w-5 mx-auto mb-1 text-green-500" />
                  <p className="text-sm text-muted-foreground">Relevancia Prom.</p>
                  <p className="text-2xl font-bold">
                    {keywords.length > 0 ? Math.round(keywords.reduce((acc, k) => acc + (k.relevance_score || 50), 0) / keywords.length) : 0}
                  </p>
                </div>
              </div>

              {/* Estadísticas por Idioma */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-500/5 to-orange-500/5 rounded-lg border">
                <div className="text-center p-2 bg-red-500/10 rounded-lg">
                  <p className="text-lg font-bold">🇪🇸 Español</p>
                  <p className="text-2xl font-bold text-red-600">{keywords.filter(k => k.language === 'es').length}</p>
                  <p className="text-xs text-muted-foreground">keywords</p>
                </div>
                <div className="text-center p-2 bg-blue-500/10 rounded-lg">
                  <p className="text-lg font-bold">🌐 English</p>
                  <p className="text-2xl font-bold text-blue-600">{keywords.filter(k => k.language === 'en').length}</p>
                  <p className="text-xs text-muted-foreground">keywords</p>
                </div>
                <div className="text-center p-2 bg-orange-500/10 rounded-lg">
                  <p className="text-lg font-bold">🇧🇪 Nederlands</p>
                  <p className="text-2xl font-bold text-orange-600">{keywords.filter(k => k.language === 'nl').length}</p>
                  <p className="text-xs text-muted-foreground">keywords</p>
                </div>
              </div>

              <div className="relative">
                <div className="flex gap-2">
                  <Select value={newKeywordLanguage} onValueChange={(v: 'es' | 'en' | 'nl') => setNewKeywordLanguage(v)}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Idioma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">🇪🇸 ES</SelectItem>
                      <SelectItem value="en">🌐 EN</SelectItem>
                      <SelectItem value="nl">🇧🇪 NL</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex-1 relative">
                    <Input
                      value={newKeyword}
                      onChange={(e) => handleKeywordInputChange(e.target.value)}
                      placeholder={
                        newKeywordLanguage === 'es' ? "Nueva palabra clave (ej: impresión 3d profesional bélgica)" :
                        newKeywordLanguage === 'en' ? "New keyword (e.g., 3d printing belgium professional)" :
                        "Nieuw trefwoord (bijv: 3d-printen belgie professioneel)"
                      }
                      onKeyPress={(e) => e.key === "Enter" && addKeyword()}
                      className="pr-10"
                    />
                    {newKeyword && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
                        newKeyword.split(' ').length >= 2 ? 'text-green-500' : 'text-orange-500'
                      }`}>
                        {newKeyword.split(' ').length} palabras
                      </span>
                    )}
                  </div>
                  <Button onClick={addKeyword} disabled={!newKeyword.trim()}>
                    <Target className="h-4 w-4 mr-2" />
                    Agregar
                  </Button>
                </div>
                
                {/* Suggestions dropdown */}
                {showSuggestions && keywordSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg">
                    <p className="px-3 py-2 text-xs text-muted-foreground border-b">Sugerencias basadas en tu texto:</p>
                    {keywordSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="w-full px-3 py-2 text-left hover:bg-muted text-sm flex items-center gap-2"
                        onClick={() => {
                          setNewKeyword(suggestion);
                          setShowSuggestions(false);
                        }}
                      >
                        <Sparkles className="h-3 w-3 text-primary" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Palabra Clave</TableHead>
                      <TableHead>Idioma</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Relevancia</TableHead>
                      <TableHead>Volumen Est.</TableHead>
                      <TableHead>Fuente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keywords
                      .sort((a, b) => (b.relevance_score || 50) - (a.relevance_score || 50))
                      .map((keyword) => (
                      <TableRow key={keyword.id}>
                        <TableCell className="font-medium max-w-md">
                          {keyword.keyword}
                          <p className="text-xs text-muted-foreground mt-1">
                            {keyword.keyword.split(' ').length} palabra(s) • {keyword.keyword.length} caracteres
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={
                              keyword.language === 'es' ? 'border-red-500 text-red-600' :
                              keyword.language === 'en' ? 'border-blue-500 text-blue-600' :
                              keyword.language === 'nl' ? 'border-orange-500 text-orange-600' :
                              ''
                            }
                          >
                            {keyword.language === 'es' ? '🇪🇸 ES' :
                             keyword.language === 'en' ? '🌐 EN' :
                             keyword.language === 'nl' ? '🇧🇪 NL' :
                             '🌐 -'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              keyword.keyword_type === 'primary' ? 'default' :
                              keyword.keyword_type === 'long-tail' ? 'secondary' :
                              'outline'
                            }
                          >
                            {keyword.keyword_type === 'primary' ? '⭐ Primaria' :
                             keyword.keyword_type === 'long-tail' ? '🎯 Long-tail' :
                             'Secundaria'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  (keyword.relevance_score || 50) >= 80 ? 'bg-green-500' :
                                  (keyword.relevance_score || 50) >= 60 ? 'bg-yellow-500' :
                                  'bg-orange-500'
                                }`}
                                style={{ width: `${keyword.relevance_score || 50}%` }}
                              />
                            </div>
                            <span className="text-sm">{keyword.relevance_score || 50}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {keyword.search_volume_estimate === 'high' ? '📈 Alto' :
                             keyword.search_volume_estimate === 'medium' ? '📊 Medio' :
                             '📉 Bajo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {keyword.source_type === 'product' ? '🛍️ Producto' : 
                             keyword.source_type === 'blog' ? '📝 Blog' : 
                             '✍️ Manual'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {keyword.is_active ? (
                            <Badge className="bg-green-500">✓ Activa</Badge>
                          ) : (
                            <Badge variant="secondary">⊘ Inactiva</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteKeyword(keyword.id)}
                          >
                            Eliminar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Meta Tags Tab */}
        <TabsContent value="meta">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Meta Descripciones ({metaTags.length})
                  </span>
                  <p className="text-sm font-normal text-muted-foreground mt-1">
                    Meta descripciones optimizadas con análisis semántico y call-to-actions
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={generateMetaTags} size="sm" variant="outline" disabled={isGenerating}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                    Básico
                  </Button>
                  <Button onClick={generateAdvancedMetaTags} size="sm" disabled={isGenerating}>
                    {isGenerating ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Generar Avanzado
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Las meta descripciones optimizadas mejoran el CTR en resultados de búsqueda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
                <div className="text-center">
                  <Eye className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{metaTags.length}</p>
                </div>
                <div className="text-center">
                  <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
                  <p className="text-sm text-muted-foreground">Indexados</p>
                  <p className="text-2xl font-bold">{metaTags.filter(t => !t.noindex).length}</p>
                </div>
                <div className="text-center">
                  <AlertCircle className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                  <p className="text-sm text-muted-foreground">No Index</p>
                  <p className="text-2xl font-bold">{metaTags.filter(t => t.noindex).length}</p>
                </div>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ruta</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Longitud</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metaTags.map((tag) => (
                      <TableRow key={tag.id}>
                        <TableCell className="font-mono text-sm">{tag.page_path}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{tag.page_title}</TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate">{tag.meta_description}</div>
                          <span className={`text-xs ${
                            tag.meta_description?.length >= 120 && tag.meta_description?.length <= 160 
                              ? 'text-green-500' 
                              : 'text-orange-500'
                          }`}>
                            {tag.meta_description?.length || 0} caracteres
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            tag.meta_description?.length >= 120 && tag.meta_description?.length <= 160
                              ? 'default'
                              : 'outline'
                          }>
                            {tag.meta_description?.length >= 120 && tag.meta_description?.length <= 160
                              ? '✓ Óptimo'
                              : tag.meta_description?.length < 120
                                ? '⚠ Corto'
                                : '⚠ Largo'
                            }
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tag.noindex ? (
                            <Badge variant="destructive">No Index</Badge>
                          ) : (
                            <Badge className="bg-green-500">Indexado</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Redirects Tab */}
        <TabsContent value="redirects">
          <Card>
            <CardHeader>
              <CardTitle>Redirecciones SEO</CardTitle>
              <CardDescription>
                Gestiona redirecciones 301 para mantener el ranking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Desde</TableHead>
                      <TableHead>Hacia</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {redirects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No hay redirecciones configuradas
                        </TableCell>
                      </TableRow>
                    ) : (
                      redirects.map((redirect) => (
                        <TableRow key={redirect.id}>
                          <TableCell className="font-mono text-sm">
                            {redirect.from_path}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {redirect.to_path}
                          </TableCell>
                          <TableCell>
                            <Badge>{redirect.redirect_type}</Badge>
                          </TableCell>
                          <TableCell>
                            {redirect.is_active ? (
                              <Badge className="bg-green-500">Activa</Badge>
                            ) : (
                              <Badge variant="secondary">Inactiva</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Auditoría</CardTitle>
              <CardDescription>
                Registro de auditorías y recomendaciones SEO
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {log.status === "success" ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : log.status === "warning" ? (
                              <AlertCircle className="h-5 w-5 text-yellow-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            )}
                            <span className="font-medium">{log.message}</span>
                            {log.score && (
                              <Badge variant="outline">{log.score}/100</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {new Date(log.created_at).toLocaleString("es-ES")}
                          </p>
                          {log.recommendations && log.recommendations.length > 0 && (
                            <div className="mt-3 space-y-1">
                              <p className="text-sm font-medium">Recomendaciones:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {log.recommendations.map((rec: string, idx: number) => (
                                  <li key={idx} className="text-sm text-muted-foreground">
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <Badge variant="outline">{log.audit_type}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}