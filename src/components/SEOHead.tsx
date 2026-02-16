import { useEffect, useState, useMemo } from "react";
import { logger } from "@/lib/logger";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Cache SEO data globally to avoid repeated requests
const seoCache = new Map<string, { data: any; timestamp: number }>();
// Increased from 5 to 15 minutes for better performance
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Supported languages for Belgium market
const SUPPORTED_LANGUAGES = ['es', 'en', 'nl'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

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
  faq?: Array<{ question: string; answer: string }>;
  rating?: { value: number; count: number };
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
  breadcrumbs,
  faq,
  rating
}: SEOHeadProps) {
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
        logger.error("Error loading SEO data:", error);
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
  const baseUrl = globalSettings?.canonical_domain || 'https://thuis3d.be';

  // LocalBusiness structured data for better local SEO
  const localBusinessData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${baseUrl}#business`,
    "name": "Thuis 3D",
    "description": finalDescription,
    "url": baseUrl,
    "logo": {
      "@type": "ImageObject",
      "url": finalImage,
      "width": 512,
      "height": 512
    },
    "image": finalImage,
    "telephone": "", // Phone number not configured
    "email": "info@thuis3d.be",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Sint-Niklaas",
      "addressLocality": "Sint-Niklaas",
      "addressRegion": "Vlaanderen",
      "postalCode": "9100",
      "addressCountry": "BE"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "51.1667",
      "longitude": "4.1333"
    },
    "areaServed": {
      "@type": "Country",
      "name": "Belgium"
    },
    "priceRange": "€€",
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "09:00",
        "closes": "18:00"
      }
    ],
    "sameAs": [
      globalSettings?.twitter_handle ? `https://twitter.com/${globalSettings.twitter_handle.replace('@', '')}` : ""
    ].filter(Boolean)
  };

  // Organization structured data
  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Thuis 3D",
    "url": baseUrl,
    "logo": {
      "@type": "ImageObject",
      "url": finalImage
    },
    "description": finalDescription,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Sint-Niklaas",
      "addressRegion": "Vlaanderen",
      "addressCountry": "BE"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
      "availableLanguage": ["Dutch", "English", "Spanish"],
      "areaServed": "BE"
    }
  };

  // Breadcrumb structured data
  const breadcrumbData = breadcrumbs && breadcrumbs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": `${baseUrl}${crumb.url}`
    }))
  } : null;

  // Product structured data (if price is provided)
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
      "seller": {
        "@type": "Organization",
        "name": "Thuis 3D"
      }
    },
    // Add aggregateRating if available
    ...(rating && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": rating.value.toString(),
        "reviewCount": rating.count.toString(),
        "bestRating": "5",
        "worstRating": "1"
      }
    })
  } : null;

  // FAQ structured data for better visibility in search results
  const faqData = faq && faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faq.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  } : null;

  // WebSite structured data with search action
  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Thuis 3D",
    "url": baseUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${baseUrl}/products?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
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

      {/* Language and Region */}
      <meta httpEquiv="content-language" content="nl-BE" />
      <meta name="language" content="Dutch" />

      {/* Hreflang tags for multilingual SEO - Belgium market */}
      <link rel="alternate" hrefLang="nl-BE" href={`${baseUrl}${location.pathname}`} />
      <link rel="alternate" hrefLang="en" href={`${baseUrl}${location.pathname}`} />
      <link rel="alternate" hrefLang="es" href={`${baseUrl}${location.pathname}`} />
      <link rel="alternate" hrefLang="x-default" href={`${baseUrl}${location.pathname}`} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="Thuis 3D" />
      <meta property="og:title" content={seoData?.og_title || finalTitle} />
      <meta property="og:description" content={seoData?.og_description || finalDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:image:secure_url" content={finalImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={finalTitle} />
      <meta property="og:locale" content="nl_BE" />
      <meta property="og:locale:alternate" content="en_US" />
      <meta property="og:locale:alternate" content="es_ES" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={seoData?.twitter_title || finalTitle} />
      <meta name="twitter:description" content={seoData?.twitter_description || finalDescription} />
      <meta name="twitter:image" content={finalImage} />
      <meta name="twitter:image:alt" content={finalTitle} />
      {globalSettings?.twitter_handle && (
        <>
          <meta name="twitter:site" content={globalSettings.twitter_handle} />
          <meta name="twitter:creator" content={globalSettings.twitter_handle} />
        </>
      )}

      {/* Price and Product Info (if available) */}
      {price && (
        <>
          <meta property="product:price:amount" content={price.toString()} />
          <meta property="product:price:currency" content={currency} />
          <meta property="og:type" content="product" />
        </>
      )}

      {/* Google Site Verification */}
      {globalSettings?.google_site_verification && (
        <meta name="google-site-verification" content={globalSettings.google_site_verification} />
      )}

      {/* Bing Site Verification */}
      {globalSettings?.bing_site_verification && (
        <meta name="msvalidate.01" content={globalSettings.bing_site_verification} />
      )}

      {/* Robots */}
      {seoData?.noindex || seoData?.nofollow ? (
        <meta 
          name="robots" 
          content={`${seoData.noindex ? 'noindex' : 'index'},${seoData.nofollow ? 'nofollow' : 'follow'}`} 
        />
      ) : (
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
      )}
      <meta name="googlebot" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />

      {/* Structured Data - Multiple schemas */}
      <script type="application/ld+json">
        {JSON.stringify(localBusinessData)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(organizationData)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteData)}
      </script>
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
      {faqData && (
        <script type="application/ld+json">
          {JSON.stringify(faqData)}
        </script>
      )}

      {/* Additional SEO Meta Tags */}
      <meta name="author" content="Thuis 3D" />
      <meta name="copyright" content="Thuis 3D" />
      <meta name="revisit-after" content="7 days" />
      <meta name="distribution" content="global" />
      <meta name="rating" content="general" />
      
      {/* Geographic Tags */}
      <meta name="geo.region" content="BE" />
      <meta name="geo.placename" content="Sint-Niklaas, Belgium" />
      <meta name="geo.position" content="51.1667;4.1333" />
      <meta name="ICBM" content="51.1667, 4.1333" />
    </Helmet>
  );
}