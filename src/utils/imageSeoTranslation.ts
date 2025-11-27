/**
 * Image SEO Translation Utility for Belgium Market
 * 
 * This utility generates multilingual SEO-optimized image titles and alt texts
 * with high-commercial intent keywords commonly used in Belgium.
 */

// High-commercial intent SEO keywords for Belgium market
const SEO_KEYWORDS = {
  es: {
    prefixes: ['Comprar', 'Mejor', 'Premium', 'Profesional', 'Alta Calidad'],
    suffixes: ['- Envío Rápido', '- Precio Garantizado', 'en Bélgica', '- Mejor Oferta', '| Entrega Express'],
    modifiers: ['exclusivo', 'auténtico', 'garantizado', 'original', 'certificado']
  },
  en: {
    prefixes: ['Buy', 'Best', 'Premium', 'Professional', 'High Quality'],
    suffixes: ['- Fast Shipping', '- Best Price', 'in Belgium', '- Best Deal', '| Express Delivery'],
    modifiers: ['exclusive', 'authentic', 'guaranteed', 'original', 'certified']
  },
  nl: {
    prefixes: ['Koop', 'Beste', 'Premium', 'Professioneel', 'Hoogwaardige'],
    suffixes: ['- Snelle Verzending', '- Beste Prijs', 'in België', '- Beste Aanbieding', '| Express Levering'],
    modifiers: ['exclusief', 'authentiek', 'gegarandeerd', 'origineel', 'gecertificeerd']
  }
};

// Product type keywords for enhanced SEO
const PRODUCT_KEYWORDS = {
  es: {
    '3d': 'impresión 3D',
    'print': 'impresión 3D',
    'modelo': 'modelo 3D',
    'figura': 'figura decorativa',
    'prototipo': 'prototipo profesional',
    'personalizado': 'producto personalizado'
  },
  en: {
    '3d': '3D printing',
    'print': '3D printing',
    'model': '3D model',
    'figure': 'decorative figure',
    'prototype': 'professional prototype',
    'custom': 'custom product'
  },
  nl: {
    '3d': '3D-printen',
    'print': '3D-printen',
    'model': '3D-model',
    'figuur': 'decoratieve figuur',
    'prototype': 'professioneel prototype',
    'aangepast': 'aangepast product'
  }
};

type SupportedLanguage = 'es' | 'en' | 'nl';

interface SeoImageMetadata {
  title: string;
  altText: string;
  enhancedTitle: string;
}

interface TranslatedImageMetadata {
  es: SeoImageMetadata;
  en: SeoImageMetadata;
  nl: SeoImageMetadata;
}

/**
 * Generate a random element from an array
 */
const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * Detect product type keywords from the product name
 */
const detectProductType = (productName: string): string | null => {
  const nameLower = productName.toLowerCase();
  const types = ['3d', 'print', 'modelo', 'model', 'figura', 'figure', 'figuur', 'prototipo', 'prototype', 'personalizado', 'custom', 'aangepast'];
  return types.find(type => nameLower.includes(type)) || null;
};

/**
 * Clean and normalize text for SEO
 */
const cleanText = (text: string): string => {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[<>]/g, '');
};

/**
 * Generate SEO-optimized title for a single language
 */
const generateSeoTitle = (
  productName: string,
  language: SupportedLanguage,
  useEnhanced: boolean = false
): string => {
  const keywords = SEO_KEYWORDS[language];
  const productKeywords = PRODUCT_KEYWORDS[language];
  
  let title = productName;
  
  // Detect and enhance with product type keywords
  const productType = detectProductType(productName);
  if (productType && productKeywords[productType as keyof typeof productKeywords]) {
    const enhancement = productKeywords[productType as keyof typeof productKeywords];
    if (!title.toLowerCase().includes(enhancement.toLowerCase())) {
      title = `${title} - ${enhancement}`;
    }
  }
  
  if (useEnhanced) {
    // Add high-commercial intent prefix
    const prefix = getRandomElement(keywords.prefixes);
    // Add commercial suffix
    const suffix = getRandomElement(keywords.suffixes);
    title = `${prefix} ${title} ${suffix}`;
  }
  
  return cleanText(title);
};

/**
 * Generate SEO-optimized alt text for a single language
 */
const generateSeoAltText = (
  productName: string,
  language: SupportedLanguage,
  imageIndex: number = 0
): string => {
  const keywords = SEO_KEYWORDS[language];
  
  // Different alt text templates based on image position
  const altTextTemplates = {
    es: [
      `Imagen de ${productName} - Vista principal`,
      `${productName} - Vista detallada`,
      `${productName} - Otra perspectiva`,
      `Producto ${productName} en detalle`,
      `Vista de ${productName} - ${getRandomElement(keywords.modifiers)}`
    ],
    en: [
      `Image of ${productName} - Main view`,
      `${productName} - Detailed view`,
      `${productName} - Another perspective`,
      `Product ${productName} in detail`,
      `View of ${productName} - ${getRandomElement(keywords.modifiers)}`
    ],
    nl: [
      `Afbeelding van ${productName} - Hoofdaanzicht`,
      `${productName} - Gedetailleerde weergave`,
      `${productName} - Ander perspectief`,
      `Product ${productName} in detail`,
      `Aanzicht van ${productName} - ${getRandomElement(keywords.modifiers)}`
    ]
  };
  
  const templates = altTextTemplates[language];
  const templateIndex = Math.min(imageIndex, templates.length - 1);
  
  return cleanText(templates[templateIndex]);
};

/**
 * Generate complete multilingual SEO metadata for a product image
 */
export const generateImageSeoMetadata = (
  productName: string,
  imageIndex: number = 0
): TranslatedImageMetadata => {
  const languages: SupportedLanguage[] = ['es', 'en', 'nl'];
  
  const result: TranslatedImageMetadata = {
    es: { title: '', altText: '', enhancedTitle: '' },
    en: { title: '', altText: '', enhancedTitle: '' },
    nl: { title: '', altText: '', enhancedTitle: '' }
  };
  
  languages.forEach(lang => {
    result[lang] = {
      title: generateSeoTitle(productName, lang, false),
      altText: generateSeoAltText(productName, lang, imageIndex),
      enhancedTitle: generateSeoTitle(productName, lang, true)
    };
  });
  
  return result;
};

/**
 * Generate SEO-optimized image filename
 */
export const generateSeoFilename = (
  productName: string,
  imageIndex: number = 0,
  extension: string = 'jpg'
): string => {
  const slug = productName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .trim();
  
  const timestamp = Date.now();
  return `${slug}-${imageIndex + 1}-${timestamp}.${extension}`;
};

/**
 * Persuasive keyword replacements for general texts (Belgium market)
 * Replaces generic words with high-commercial intent alternatives
 */
export const PERSUASIVE_REPLACEMENTS: Record<SupportedLanguage, Record<string, string>> = {
  es: {
    'producto': 'producto premium',
    'servicio': 'servicio profesional',
    'comprar': 'obtener ahora',
    'precio': 'oferta especial',
    'calidad': 'calidad garantizada',
    'entrega': 'entrega express',
    'hacer': 'descubrir',
    'ver': 'explorar',
    'obtener': 'conseguir hoy',
    'disponible': 'disponible ahora',
    'nuevo': 'exclusivo'
  },
  en: {
    'product': 'premium product',
    'service': 'professional service',
    'buy': 'get now',
    'price': 'special offer',
    'quality': 'guaranteed quality',
    'delivery': 'express delivery',
    'make': 'discover',
    'see': 'explore',
    'get': 'get today',
    'available': 'available now',
    'new': 'exclusive'
  },
  nl: {
    'product': 'premiumproduct',
    'dienst': 'professionele dienst',
    'kopen': 'nu verkrijgen',
    'prijs': 'speciale aanbieding',
    'kwaliteit': 'gegarandeerde kwaliteit',
    'levering': 'expreslevering',
    'maken': 'ontdekken',
    'zien': 'verkennen',
    'krijgen': 'vandaag krijgen',
    'beschikbaar': 'nu beschikbaar',
    'nieuw': 'exclusief'
  }
};

/**
 * Apply persuasive keyword replacements to text
 */
export const applyPersuasiveKeywords = (
  text: string,
  language: SupportedLanguage
): string => {
  const replacements = PERSUASIVE_REPLACEMENTS[language];
  let result = text;
  
  Object.entries(replacements).forEach(([original, replacement]) => {
    // Only replace standalone words (with word boundaries)
    const regex = new RegExp(`\\b${original}\\b`, 'gi');
    result = result.replace(regex, replacement);
  });
  
  return result;
};

/**
 * Get all supported languages
 */
export const getSupportedLanguages = (): SupportedLanguage[] => ['es', 'en', 'nl'];

export type { SupportedLanguage, SeoImageMetadata, TranslatedImageMetadata };
