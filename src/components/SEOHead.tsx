import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Cache SEO data globally to avoid repeated requests
const seoCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Supported languages for Belgium market
const SUPPORTED_LANGUAGES = ['es', 'en', 'nl'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  type?: string;
}

export function SEOHead({ title, description, keywords, image, type = "website" }: SEOHeadProps) {
  const location = useLocation();
  const [seoData, setSeoData] = useState<any>(null);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [topKeywords, setTopKeywords] = useState<string[]>([]);
  const [siteCustomization, setSiteCustomization] = useState<any>(null);
  const [multilingualKeywords, setMultilingualKeywords] = useState<Record<SupportedLanguage, string[]>>({
    es: [],
    en: [],
    nl: []
  });

  useEffect(() => {
    const loadSeoData = async () => {
      try {
        const cacheKey = `seo_${location.pathname}`;
        const cached = seoCache.get(cacheKey);
        
        // Use cache if valid
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          setGlobalSettings(cached.data.settings);
          setSeoData(cached.data.pageData);
          setTopKeywords(cached.data.keywords);
          setMultilingualKeywords(cached.data.multilingualKeywords || { es: [], en: [], nl: [] });
          return;
        }

        // Load all data in parallel including multilingual keywords
        const settingsQuery = supabase.from("seo_settings").select("*").limit(1).maybeSingle();
        const pageDataQuery = supabase.from("seo_meta_tags").select("*").eq("page_path", location.pathname).limit(1).maybeSingle();
        const keywordsQuery = supabase.from("seo_keywords").select("keyword, relevance_score").eq("is_active", true).order("relevance_score", { ascending: false }).limit(5);
        const customizationQuery = supabase.from("site_customization").select("og_image").limit(1).maybeSingle();
        
        const [settingsRes, pageDataRes, keywordsRes, customizationRes] = await Promise.all([
          settingsQuery,
          pageDataQuery,
          keywordsQuery,
          customizationQuery
        ]);
        
        // Fetch keywords by language separately to avoid type issues
        const getKeywordsByLang = async (lang: string): Promise<string[]> => {
          const { data } = await (supabase.from("seo_keywords") as any).select("keyword").eq("is_active", true).eq("language", lang).order("relevance_score", { ascending: false }).limit(5);
          return data?.map((k: any) => k.keyword) || [];
        };
        const esKeywords = await getKeywordsByLang("es");
        const enKeywords = await getKeywordsByLang("en");
        const nlKeywords = await getKeywordsByLang("nl");

        const settings = settingsRes.data;
        const pageData = pageDataRes.data;
        const keywordsData = keywordsRes.data?.map(k => k.keyword) || [];
        const customization = customizationRes.data;
        
        // Organize keywords by language
        const langKeywords: Record<SupportedLanguage, string[]> = {
          es: esKeywords,
          en: enKeywords,
          nl: nlKeywords
        };

        // Cache the results
        seoCache.set(cacheKey, {
          data: { settings, pageData, keywords: keywordsData, customization, multilingualKeywords: langKeywords },
          timestamp: Date.now()
        });

        setGlobalSettings(settings);
        setSeoData(pageData);
        setTopKeywords(keywordsData);
        setSiteCustomization(customization);
        setMultilingualKeywords(langKeywords);
      } catch (error) {
        console.error("Error loading SEO data:", error);
      }
    };

    loadSeoData();
  }, [location.pathname]);

  // Determine final values with priority: props > page-specific > site customization > global seo > defaults
  const finalTitle = title || seoData?.page_title || globalSettings?.site_title || "Thuis 3D";
  const finalDescription = description || seoData?.meta_description || globalSettings?.site_description || "Servicio profesional de impresión 3D";
  
  // Combine all multilingual keywords for comprehensive SEO
  const allKeywords = useMemo(() => {
    const combined = new Set<string>();
    if (keywords) keywords.forEach(k => combined.add(k));
    if (seoData?.keywords) seoData.keywords.forEach((k: string) => combined.add(k));
    topKeywords.forEach(k => combined.add(k));
    // Add multilingual keywords
    Object.values(multilingualKeywords).forEach(langKws => 
      langKws.forEach(k => combined.add(k))
    );
    if (globalSettings?.site_keywords) globalSettings.site_keywords.forEach((k: string) => combined.add(k));
    return Array.from(combined);
  }, [keywords, seoData?.keywords, topKeywords, multilingualKeywords, globalSettings?.site_keywords]);
  
  const finalImage = image || seoData?.og_image || siteCustomization?.og_image || globalSettings?.og_image || "/placeholder.svg";
  const canonicalUrl = seoData?.canonical_url || `${globalSettings?.canonical_domain || ''}${location.pathname}`;
  const baseUrl = globalSettings?.canonical_domain || 'https://thuis3d.com';

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Thuis 3D",
    "url": baseUrl,
    "logo": finalImage,
    "description": finalDescription,
    "areaServed": {
      "@type": "Country",
      "name": "Belgium"
    },
    "availableLanguage": ["Spanish", "English", "Dutch"],
    "sameAs": [
      globalSettings?.twitter_handle ? `https://twitter.com/${globalSettings.twitter_handle.replace('@', '')}` : ""
    ].filter(Boolean)
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="title" content={finalTitle} />
      <meta name="description" content={finalDescription} />
      {allKeywords.length > 0 && (
        <meta name="keywords" content={allKeywords.join(", ")} />
      )}
      <link rel="canonical" href={canonicalUrl} />

      {/* Hreflang tags for multilingual SEO - Belgium market 
          Note: Same content with multilingual keywords serves all language audiences */}
      <link rel="alternate" hrefLang="es" href={`${baseUrl}${location.pathname}`} />
      <link rel="alternate" hrefLang="en" href={`${baseUrl}${location.pathname}`} />
      <link rel="alternate" hrefLang="nl-BE" href={`${baseUrl}${location.pathname}`} />
      <link rel="alternate" hrefLang="x-default" href={`${baseUrl}${location.pathname}`} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={seoData?.og_title || finalTitle} />
      <meta property="og:description" content={seoData?.og_description || finalDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:locale" content="es_ES" />
      <meta property="og:locale:alternate" content="en_US" />
      <meta property="og:locale:alternate" content="nl_NL" />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={canonicalUrl} />
      <meta property="twitter:title" content={seoData?.twitter_title || finalTitle} />
      <meta property="twitter:description" content={seoData?.twitter_description || finalDescription} />
      <meta property="twitter:image" content={finalImage} />
      {globalSettings?.twitter_handle && (
        <meta property="twitter:site" content={globalSettings.twitter_handle} />
      )}

      {/* Google Site Verification */}
      {globalSettings?.google_site_verification && (
        <meta name="google-site-verification" content={globalSettings.google_site_verification} />
      )}

      {/* Robots */}
      {seoData?.noindex || seoData?.nofollow ? (
        <meta 
          name="robots" 
          content={`${seoData.noindex ? 'noindex' : 'index'},${seoData.nofollow ? 'nofollow' : 'follow'}`} 
        />
      ) : (
        <meta name="robots" content="index,follow" />
      )}

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>

      {/* Additional SEO Meta Tags */}
      <meta name="author" content="Thuis 3D" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="geo.region" content="BE" />
      <meta name="geo.placename" content="Belgium" />
      <meta name="revisit-after" content="7 days" />
    </Helmet>
  );
}