import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { seoCache, CACHE_DURATION } from "@/lib/seoCache";

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  type?: string;
  price?: number;
  currency?: string;
  availability?: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
}

export function SEOHead({ 
  title, 
  description, 
  keywords, 
  image, 
  type = "website",
  price,
  currency = "EUR",
  availability = "InStock",
  breadcrumbs
}: SEOHeadProps) {
  const location = useLocation();
  const [seoData, setSeoData] = useState<any>(null);
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [topKeywords, setTopKeywords] = useState<string[]>([]);

  useEffect(() => {
    const loadSeoData = async () => {
      try {
        const cacheKey = `seo_${location.pathname}`;
        const cached = seoCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          setGlobalSettings(cached.data.settings);
          setSeoData(cached.data.pageData);
          setTopKeywords(cached.data.keywords);
          return;
        }

        // Load all data in parallel - single batch of queries
        const [settingsRes, pageDataRes, keywordsRes] = await Promise.all([
          supabase.from("seo_settings").select("*").limit(1).maybeSingle(),
          supabase.from("seo_meta_tags").select("*").eq("page_path", location.pathname).limit(1).maybeSingle(),
          supabase.from("seo_keywords").select("keyword").eq("is_active", true).order("relevance_score", { ascending: false }).limit(10)
        ]);

        const settings = settingsRes.data;
        const pageData = pageDataRes.data;
        const keywordsData = keywordsRes.data?.map(k => k.keyword) || [];

        seoCache.set(cacheKey, {
          data: { settings, pageData, keywords: keywordsData },
          timestamp: Date.now()
        });

        setGlobalSettings(settings);
        setSeoData(pageData);
        setTopKeywords(keywordsData);
      } catch (error) {
        console.error("Error loading SEO data:", error);
      }
    };

    loadSeoData();
  }, [location.pathname]);

  const BASE_URL = 'https://thuis3d.be';
  const finalTitle = title || seoData?.page_title || globalSettings?.site_title || "Thuis3D.be - Professionele 3D Printservice";
  const finalDescription = description || seoData?.meta_description || globalSettings?.site_description || "Professionele 3D printservice in Sint-Niklaas en heel België. Op maat gemaakte prototypes en onderdelen.";
  
  const allKeywords = useMemo(() => {
    const combined = new Set<string>();
    if (keywords) keywords.forEach(k => combined.add(k));
    if (seoData?.keywords) seoData.keywords.forEach((k: string) => combined.add(k));
    topKeywords.forEach(k => combined.add(k));
    if (globalSettings?.site_keywords) globalSettings.site_keywords.forEach((k: string) => combined.add(k));
    return Array.from(combined);
  }, [keywords, seoData?.keywords, topKeywords, globalSettings?.site_keywords]);
  
  const finalImage = image || seoData?.og_image || globalSettings?.og_image || `${BASE_URL}/og-image.png`;
  const canonicalUrl = seoData?.canonical_url || `${globalSettings?.canonical_domain || BASE_URL}${location.pathname}`;

  // Only render page-specific structured data (LocalBusiness + WebSite are in index.html)
  const breadcrumbData = breadcrumbs && breadcrumbs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": `${BASE_URL}${crumb.url}`
    }))
  } : null;

  const productData = price ? {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": finalTitle,
    "description": finalDescription,
    "image": finalImage,
    "offers": {
      "@type": "Offer",
      "url": canonicalUrl,
      "priceCurrency": currency,
      "price": price,
      "availability": `https://schema.org/${availability}`,
      "seller": { "@type": "Organization", "name": "Thuis3D.be" }
    }
  } : null;

  // Don't render meta tags that are already in index.html for the homepage
  const isHomepage = location.pathname === '/';

  return (
    <Helmet>
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      {allKeywords.length > 0 && (
        <meta name="keywords" content={allKeywords.join(", ")} />
      )}
      <link rel="canonical" href={canonicalUrl} />

      {/* Hreflang for all pages */}
      <link rel="alternate" hrefLang="nl-BE" href={`${BASE_URL}${location.pathname}`} />
      <link rel="alternate" hrefLang="en" href={`${BASE_URL}${location.pathname}`} />
      <link rel="alternate" hrefLang="es" href={`${BASE_URL}${location.pathname}`} />
      <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}${location.pathname}`} />

      {/* OG tags - override index.html defaults for non-homepage pages */}
      {!isHomepage && (
        <>
          <meta property="og:type" content={type} />
          <meta property="og:url" content={canonicalUrl} />
          <meta property="og:title" content={seoData?.og_title || finalTitle} />
          <meta property="og:description" content={seoData?.og_description || finalDescription} />
          <meta property="og:image" content={finalImage} />
        </>
      )}

      {/* Twitter tags for non-homepage */}
      {!isHomepage && (
        <>
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={seoData?.twitter_title || finalTitle} />
          <meta name="twitter:description" content={seoData?.twitter_description || finalDescription} />
          <meta name="twitter:image" content={finalImage} />
        </>
      )}

      {/* Product price meta */}
      {price && (
        <>
          <meta property="product:price:amount" content={price.toString()} />
          <meta property="product:price:currency" content={currency} />
          <meta property="og:type" content="product" />
        </>
      )}

      {/* Google Site Verification - always render from DB settings */}
      {globalSettings?.google_site_verification && (
        <meta name="google-site-verification" content={globalSettings.google_site_verification} />
      )}

      {/* Robots */}
      {seoData?.noindex || seoData?.nofollow ? (
        <meta name="robots" content={`${seoData.noindex ? 'noindex' : 'index'},${seoData.nofollow ? 'nofollow' : 'follow'}`} />
      ) : null}

      {/* Structured Data - only page-specific */}
      {breadcrumbData && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbData)}
        </script>
      )}
      {productData && (
        <script type="application/ld+json">
          {JSON.stringify(productData)}
        </script>
      )}
    </Helmet>
  );
}