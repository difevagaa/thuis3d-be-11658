/**
 * Advanced SEO Utilities Module
 * Provides semantic analysis, keyword optimization, and meta-description generation
 * Supports multilingual keywords for Belgium market (Spanish, Dutch, English)
 */

export type SupportedSEOLanguage = 'es' | 'en' | 'nl';

// Spanish stop words for keyword filtering
const STOP_WORDS_ES = new Set([
  'de', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
  'y', 'o', 'en', 'con', 'por', 'para', 'este', 'esta', 'estos',
  'estas', 'del', 'al', 'que', 'su', 'sus', 'se', 'es', 'son',
  'muy', 'más', 'pero', 'como', 'sin', 'sobre', 'desde', 'hasta',
  'puede', 'pueden', 'tiene', 'tienen', 'hacer', 'hace', 'hacen',
  'siempre', 'también', 'solo', 'sólo', 'cada', 'todo', 'toda',
  'todos', 'todas', 'uno', 'dos', 'tres', 'ser', 'estar', 'hay',
  'sido', 'siendo', 'era', 'fue', 'fueron', 'han', 'has', 'he'
]);

// English stop words
const STOP_WORDS_EN = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
  'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'this', 'that', 'these', 'those', 'it', 'its'
]);

// Dutch stop words for keyword filtering (Belgium/Netherlands)
const STOP_WORDS_NL = new Set([
  'de', 'het', 'een', 'en', 'van', 'in', 'is', 'op', 'te', 'aan',
  'dat', 'die', 'met', 'voor', 'zijn', 'er', 'maar', 'om', 'ook',
  'als', 'kan', 'naar', 'bij', 'of', 'uit', 'tot', 'wat', 'dan',
  'nog', 'wel', 'door', 'over', 'zou', 'zo', 'hebben', 'worden',
  'niet', 'deze', 'dit', 'hun', 'zij', 'wij', 'jij', 'ik', 'je',
  'mijn', 'we', 'hij', 'haar', 'hem', 'ons', 'onze', 'jullie'
]);

// Industry-specific SEO terms for 3D printing (multilingual)
const INDUSTRY_TERMS: Record<SupportedSEOLanguage, string[]> = {
  es: [
    'impresión 3d', 'filamento', 'pla', 'abs', 'petg', 'nylon', 'resina',
    'fdm', 'sla', 'prototipo', 'modelo 3d', 'personalizado', 'calidad',
    'profesional', 'rápido', 'envío', 'bélgica', 'europa', 'servicio 3d',
    'fabricación aditiva', 'diseño 3d', 'impresora 3d'
  ],
  en: [
    '3d printing', 'filament', 'pla', 'abs', 'petg', 'nylon', 'resin',
    'fdm', 'sla', 'prototype', '3d model', 'custom', 'quality',
    'professional', 'fast', 'shipping', 'belgium', 'europe', '3d service',
    'additive manufacturing', '3d design', '3d printer'
  ],
  nl: [
    '3d-printen', 'filament', 'pla', 'abs', 'petg', 'nylon', 'hars',
    'fdm', 'sla', 'prototype', '3d-model', 'op maat', 'kwaliteit',
    'professioneel', 'snel', 'verzending', 'belgie', 'europa', '3d-dienst',
    'additieve fabricage', '3d-ontwerp', '3d-printer'
  ]
};

// Trending SEO modifiers that boost search visibility (multilingual)
const TRENDING_MODIFIERS: Record<SupportedSEOLanguage, string[]> = {
  es: [
    'mejor', 'premium', 'económico', 'rápido', 'profesional',
    'alta calidad', 'personalizado', 'online', 'servicio', 'barato',
    'exclusivo', 'garantizado', 'certificado'
  ],
  en: [
    'best', 'premium', 'affordable', 'fast', 'professional',
    'high quality', 'custom', 'online', 'service', 'cheap',
    'exclusive', 'guaranteed', 'certified'
  ],
  nl: [
    'beste', 'premium', 'betaalbaar', 'snel', 'professioneel',
    'hoge kwaliteit', 'op maat', 'online', 'dienst', 'goedkoop',
    'exclusief', 'gegarandeerd', 'gecertificeerd'
  ]
};

// Belgium-specific location keywords
const BELGIUM_LOCATIONS: Record<SupportedSEOLanguage, string[]> = {
  es: ['bélgica', 'bruselas', 'amberes', 'gante', 'brujas', 'lovaina'],
  en: ['belgium', 'brussels', 'antwerp', 'ghent', 'bruges', 'leuven'],
  nl: ['belgie', 'brussel', 'antwerpen', 'gent', 'brugge', 'leuven']
};

// Expanded keyword translations for cross-language SEO
const KEYWORD_TRANSLATIONS: Record<string, Record<SupportedSEOLanguage, string>> = {
  // Core industry terms
  'impresión 3d': { es: 'impresión 3d', en: '3d printing', nl: '3d-printen' },
  '3d printing': { es: 'impresión 3d', en: '3d printing', nl: '3d-printen' },
  '3d-printen': { es: 'impresión 3d', en: '3d printing', nl: '3d-printen' },
  'prototipo': { es: 'prototipo', en: 'prototype', nl: 'prototype' },
  'prototype': { es: 'prototipo', en: 'prototype', nl: 'prototype' },
  'personalizado': { es: 'personalizado', en: 'custom', nl: 'op maat' },
  'custom': { es: 'personalizado', en: 'custom', nl: 'op maat' },
  'op maat': { es: 'personalizado', en: 'custom', nl: 'op maat' },
  'calidad': { es: 'calidad', en: 'quality', nl: 'kwaliteit' },
  'quality': { es: 'calidad', en: 'quality', nl: 'kwaliteit' },
  'kwaliteit': { es: 'calidad', en: 'quality', nl: 'kwaliteit' },
  'envío': { es: 'envío', en: 'shipping', nl: 'verzending' },
  'shipping': { es: 'envío', en: 'shipping', nl: 'verzending' },
  'verzending': { es: 'envío', en: 'shipping', nl: 'verzending' },
  'servicio': { es: 'servicio', en: 'service', nl: 'dienst' },
  'service': { es: 'servicio', en: 'service', nl: 'dienst' },
  'dienst': { es: 'servicio', en: 'service', nl: 'dienst' },
  'profesional': { es: 'profesional', en: 'professional', nl: 'professioneel' },
  'professional': { es: 'profesional', en: 'professional', nl: 'professioneel' },
  'professioneel': { es: 'profesional', en: 'professional', nl: 'professioneel' },
  // Materials
  'filamento': { es: 'filamento', en: 'filament', nl: 'filament' },
  'filament': { es: 'filamento', en: 'filament', nl: 'filament' },
  'resina': { es: 'resina', en: 'resin', nl: 'hars' },
  'resin': { es: 'resina', en: 'resin', nl: 'hars' },
  'hars': { es: 'resina', en: 'resin', nl: 'hars' },
  'material': { es: 'material', en: 'material', nl: 'materiaal' },
  'materiaal': { es: 'material', en: 'material', nl: 'materiaal' },
  // Product types
  'modelo': { es: 'modelo', en: 'model', nl: 'model' },
  'model': { es: 'modelo', en: 'model', nl: 'model' },
  'pieza': { es: 'pieza', en: 'part', nl: 'onderdeel' },
  'part': { es: 'pieza', en: 'part', nl: 'onderdeel' },
  'onderdeel': { es: 'pieza', en: 'part', nl: 'onderdeel' },
  'producto': { es: 'producto', en: 'product', nl: 'product' },
  'product': { es: 'producto', en: 'product', nl: 'product' },
  // Actions
  'comprar': { es: 'comprar', en: 'buy', nl: 'kopen' },
  'buy': { es: 'comprar', en: 'buy', nl: 'kopen' },
  'kopen': { es: 'comprar', en: 'buy', nl: 'kopen' },
  'cotización': { es: 'cotización', en: 'quote', nl: 'offerte' },
  'quote': { es: 'cotización', en: 'quote', nl: 'offerte' },
  'offerte': { es: 'cotización', en: 'quote', nl: 'offerte' },
  'precio': { es: 'precio', en: 'price', nl: 'prijs' },
  'price': { es: 'precio', en: 'price', nl: 'prijs' },
  'prijs': { es: 'precio', en: 'price', nl: 'prijs' },
  // Descriptors
  'rápido': { es: 'rápido', en: 'fast', nl: 'snel' },
  'fast': { es: 'rápido', en: 'fast', nl: 'snel' },
  'snel': { es: 'rápido', en: 'fast', nl: 'snel' },
  'barato': { es: 'barato', en: 'cheap', nl: 'goedkoop' },
  'cheap': { es: 'barato', en: 'cheap', nl: 'goedkoop' },
  'goedkoop': { es: 'barato', en: 'cheap', nl: 'goedkoop' },
  'mejor': { es: 'mejor', en: 'best', nl: 'beste' },
  'best': { es: 'mejor', en: 'best', nl: 'beste' },
  'beste': { es: 'mejor', en: 'best', nl: 'beste' },
  // Locations
  'bélgica': { es: 'bélgica', en: 'belgium', nl: 'belgie' },
  'belgium': { es: 'bélgica', en: 'belgium', nl: 'belgie' },
  'belgie': { es: 'bélgica', en: 'belgium', nl: 'belgie' },
  'bruselas': { es: 'bruselas', en: 'brussels', nl: 'brussel' },
  'brussels': { es: 'bruselas', en: 'brussels', nl: 'brussel' },
  'brussel': { es: 'bruselas', en: 'brussels', nl: 'brussel' },
  'europa': { es: 'europa', en: 'europe', nl: 'europa' },
  'europe': { es: 'europa', en: 'europe', nl: 'europa' }
};

// Common product concepts that should generate keywords in all languages
const PRODUCT_CONCEPTS: Record<string, Record<SupportedSEOLanguage, string[]>> = {
  'printing_service': {
    es: ['servicio de impresión 3d', 'impresión 3d profesional', 'imprimir en 3d'],
    en: ['3d printing service', 'professional 3d printing', 'custom 3d prints'],
    nl: ['3d-printservice', 'professionele 3d-printing', 'op maat 3d-printen']
  },
  'prototype': {
    es: ['prototipo rápido', 'crear prototipo', 'prototipado 3d'],
    en: ['rapid prototype', 'create prototype', '3d prototyping'],
    nl: ['snel prototype', 'prototype maken', '3d-prototyping']
  },
  'custom_parts': {
    es: ['piezas personalizadas', 'fabricación a medida', 'componentes 3d'],
    en: ['custom parts', 'custom manufacturing', '3d components'],
    nl: ['op maat onderdelen', 'maatwerk fabricage', '3d-componenten']
  },
  'fast_delivery': {
    es: ['envío rápido', 'entrega rápida bélgica', 'envío a domicilio'],
    en: ['fast shipping', 'quick delivery belgium', 'home delivery'],
    nl: ['snelle verzending', 'snelle levering belgie', 'thuislevering']
  },
  'quality': {
    es: ['alta calidad 3d', 'calidad profesional', 'acabado perfecto'],
    en: ['high quality 3d', 'professional quality', 'perfect finish'],
    nl: ['hoge kwaliteit 3d', 'professionele kwaliteit', 'perfecte afwerking']
  },
  'pricing': {
    es: ['precio competitivo', 'cotización gratis', 'presupuesto impresión 3d'],
    en: ['competitive pricing', 'free quote', '3d printing quote'],
    nl: ['concurrerende prijs', 'gratis offerte', '3d-print offerte']
  }
};

export interface KeywordAnalysis {
  keyword: string;
  relevanceScore: number;
  searchVolume: 'high' | 'medium' | 'low';
  keywordType: 'primary' | 'long-tail' | 'secondary';
  semanticCategory: string;
  language?: SupportedSEOLanguage;
}

export interface MultilingualKeywordResult {
  es: KeywordAnalysis[];
  en: KeywordAnalysis[];
  nl: KeywordAnalysis[];
  combined: KeywordAnalysis[];
}

export interface MetaDescriptionResult {
  description: string;
  characterCount: number;
  keywordDensity: number;
  readabilityScore: number;
}

/**
 * Analyzes text and extracts optimized keywords using semantic analysis
 */
export function extractKeywords(
  text: string,
  context?: {
    category?: string;
    productType?: string;
    language?: SupportedSEOLanguage;
  }
): KeywordAnalysis[] {
  // Default to Dutch for Belgian market focus
  const language: SupportedSEOLanguage = context?.language || 'nl';
  const stopWords = getStopWordsForLanguage(language);
  
  // Clean and normalize text
  const cleanText = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents for comparison
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const words = cleanText.split(' ').filter(w => w.length >= 3);
  const keywords: KeywordAnalysis[] = [];
  
  // Extract single significant words
  const wordFrequency = new Map<string, number>();
  words.forEach(word => {
    if (!stopWords.has(word) && word.length >= 4) {
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
    }
  });
  
  // Generate bigrams (2-word phrases)
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    if (!stopWords.has(w1) && !stopWords.has(w2) && w1.length >= 3 && w2.length >= 3) {
      const bigram = `${w1} ${w2}`;
      if (bigram.length >= 8) {
        keywords.push({
          keyword: bigram,
          relevanceScore: calculateRelevance(bigram, context, language),
          searchVolume: estimateSearchVolume(bigram, language),
          keywordType: 'long-tail',
          semanticCategory: categorizeKeyword(bigram),
          language
        });
      }
    }
  }
  
  // Generate trigrams (3-word phrases)
  for (let i = 0; i < words.length - 2; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    const w3 = words[i + 2];
    if (!stopWords.has(w1) && w1.length >= 3) {
      const trigram = `${w1} ${w2} ${w3}`;
      if (trigram.length >= 12 && trigram.length <= 50) {
        keywords.push({
          keyword: trigram,
          relevanceScore: calculateRelevance(trigram, context, language) + 5,
          searchVolume: estimateSearchVolume(trigram, language),
          keywordType: 'long-tail',
          semanticCategory: categorizeKeyword(trigram),
          language
        });
      }
    }
  }
  
  // Add category-enhanced keywords
  if (context?.category) {
    const categoryLower = context.category.toLowerCase();
    const topWords = Array.from(wordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    topWords.forEach(([word]) => {
      const enhanced = `${categoryLower} ${word}`;
      keywords.push({
        keyword: enhanced,
        relevanceScore: calculateRelevance(enhanced, context, language) + 10,
        searchVolume: 'medium',
        keywordType: 'secondary',
        semanticCategory: 'category-enhanced',
        language
      });
    });
  }
  
  // Add trending modifier combinations
  const primaryWord = Array.from(wordFrequency.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  
  if (primaryWord && primaryWord.length >= 4) {
    const modifiers = TRENDING_MODIFIERS[language];
    modifiers.slice(0, 3).forEach(modifier => {
      if (modifier.split(' ')[0] !== primaryWord) {
        const trendingKeyword = `${modifier} ${primaryWord}`;
        keywords.push({
          keyword: trendingKeyword,
          relevanceScore: calculateRelevance(trendingKeyword, context, language) + 15,
          searchVolume: 'high',
          keywordType: 'secondary',
          semanticCategory: 'trending',
          language
        });
      }
    });
  }
  
  // Remove duplicates and sort by relevance
  const uniqueKeywords = Array.from(
    new Map(keywords.map(k => [k.keyword, k])).values()
  ).sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  return uniqueKeywords.slice(0, 10);
}

/**
 * Get stop words for the specified language
 */
function getStopWordsForLanguage(language: SupportedSEOLanguage): Set<string> {
  switch (language) {
    case 'en':
      return STOP_WORDS_EN;
    case 'es':
      return STOP_WORDS_ES;
    case 'nl':
    default:
      // Default to Dutch for Belgian market focus
      return STOP_WORDS_NL;
  }
}

/**
 * Generates keywords in all supported languages (ES, EN, NL) for Belgium market
 * This is the core function for multilingual SEO targeting Belgian customers.
 * 
 * Note: Belgium has three official languages (Dutch, French, German).
 * Currently, this implementation supports Dutch (NL) and English (EN) for
 * international reach. Spanish (ES) is included as the source content language.
 * French support could be added in the future by extending the language arrays.
 */
export function extractMultilingualKeywords(
  text: string,
  context?: {
    category?: string;
    productType?: string;
  }
): MultilingualKeywordResult {
  // Prioritize Dutch (nl) for Belgian market, then English, then Spanish
  const languages: SupportedSEOLanguage[] = ['nl', 'en', 'es'];
  const result: MultilingualKeywordResult = {
    es: [],
    en: [],
    nl: [],
    combined: []
  };

  // Extract Dutch keywords first for Belgian market focus
  const dutchKeywords = extractKeywords(text, { ...context, language: 'nl' });
  result.nl = dutchKeywords;
  result.combined.push(...dutchKeywords);

  // Extract English keywords for international reach
  const englishKeywords = extractKeywords(text, { ...context, language: 'en' });
  result.en = englishKeywords;
  result.combined.push(...englishKeywords);

  // Extract Spanish keywords from the original text (product descriptions may be in Spanish)
  const spanishKeywords = extractKeywords(text, { ...context, language: 'es' });
  result.es = spanishKeywords;
  result.combined.push(...spanishKeywords);

  // Generate native keywords for each target language based on industry terms
  // Belgian customers predominantly search in Dutch and English
  for (const lang of languages) {
    const locationTerms = BELGIUM_LOCATIONS[lang];
    const industryTerms = INDUSTRY_TERMS[lang];
    const modifiers = TRENDING_MODIFIERS[lang];
    
    // Create location + industry combinations (e.g., "3d printing belgium", "3d-printen belgie")
    for (const location of locationTerms.slice(0, 3)) {
      for (const industry of industryTerms.slice(0, 5)) {
        const keyword = `${industry} ${location}`;
        const keywordData: KeywordAnalysis = {
          keyword,
          relevanceScore: 90,
          searchVolume: 'high',
          keywordType: 'long-tail',
          semanticCategory: 'location',
          language: lang
        };
        result[lang].push(keywordData);
        result.combined.push(keywordData);
      }
    }

    // Add modifier + industry combinations (e.g., "best 3d printing", "professioneel 3d-printen")
    for (const modifier of modifiers.slice(0, 4)) {
      for (const industry of industryTerms.slice(0, 4)) {
        const keyword = `${modifier} ${industry}`;
        const keywordData: KeywordAnalysis = {
          keyword,
          relevanceScore: 85,
          searchVolume: 'high',
          keywordType: 'long-tail',
          semanticCategory: 'trending',
          language: lang
        };
        result[lang].push(keywordData);
        result.combined.push(keywordData);
      }
    }

    // Add pure industry terms as primary keywords
    for (const industry of industryTerms.slice(0, 6)) {
      const keywordData: KeywordAnalysis = {
        keyword: industry,
        relevanceScore: 80,
        searchVolume: 'high',
        keywordType: 'primary',
        semanticCategory: 'service',
        language: lang
      };
      result[lang].push(keywordData);
      result.combined.push(keywordData);
    }
  }

  // Add product concept keywords for each language
  // These are pre-defined phrases that Belgian customers actually search for
  for (const conceptKey of Object.keys(PRODUCT_CONCEPTS)) {
    const concept = PRODUCT_CONCEPTS[conceptKey];
    for (const lang of languages) {
      for (const phrase of concept[lang]) {
        const keywordData: KeywordAnalysis = {
          keyword: phrase,
          relevanceScore: 88,
          searchVolume: 'high',
          keywordType: 'long-tail',
          semanticCategory: conceptKey,
          language: lang
        };
        result[lang].push(keywordData);
        result.combined.push(keywordData);
      }
    }
  }

  // Add translated equivalents of top Spanish keywords
  // This ensures any product-specific terms are also available in EN and NL
  const topSpanishKeywords = spanishKeywords.slice(0, 5);
  for (const kw of topSpanishKeywords) {
    // Try to find translation for this keyword
    const translated = translateKeyword(kw.keyword, 'es');
    if (translated) {
      for (const lang of ['en', 'nl'] as SupportedSEOLanguage[]) {
        if (translated[lang] && translated[lang] !== kw.keyword) {
          const translatedKeyword: KeywordAnalysis = {
            keyword: translated[lang],
            relevanceScore: kw.relevanceScore,
            searchVolume: kw.searchVolume,
            keywordType: kw.keywordType,
            semanticCategory: kw.semanticCategory,
            language: lang
          };
          result[lang].push(translatedKeyword);
          result.combined.push(translatedKeyword);
        }
      }
    }

    // Also translate individual words within the keyword
    const words = kw.keyword.toLowerCase().split(' ');
    for (const word of words) {
      const wordTranslation = translateKeyword(word, 'es');
      if (wordTranslation) {
        for (const lang of ['en', 'nl'] as SupportedSEOLanguage[]) {
          if (wordTranslation[lang] && wordTranslation[lang] !== word) {
            // Create a translated version of the full keyword phrase
            const translatedKeyword: KeywordAnalysis = {
              keyword: wordTranslation[lang],
              relevanceScore: kw.relevanceScore - 5,
              searchVolume: kw.searchVolume,
              keywordType: 'secondary',
              semanticCategory: kw.semanticCategory,
              language: lang
            };
            result[lang].push(translatedKeyword);
            result.combined.push(translatedKeyword);
          }
        }
      }
    }
  }

  // Remove duplicates and sort by relevance
  result.combined = Array.from(
    new Map(result.combined.map(k => [`${k.keyword}-${k.language}`, k])).values()
  ).sort((a, b) => b.relevanceScore - a.relevanceScore);

  for (const lang of languages) {
    result[lang] = Array.from(
      new Map(result[lang].map(k => [k.keyword, k])).values()
    ).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 15);
  }

  return result;
}

/**
 * Translate a keyword to other supported languages
 * Checks for exact matches first, then partial matches
 */
function translateKeyword(
  keyword: string, 
  fromLang: SupportedSEOLanguage
): Record<SupportedSEOLanguage, string> | null {
  const keywordLower = keyword.toLowerCase().trim();
  
  // Check for exact match first
  if (KEYWORD_TRANSLATIONS[keywordLower]) {
    return KEYWORD_TRANSLATIONS[keywordLower];
  }
  
  // Check for partial matches
  for (const [key, translations] of Object.entries(KEYWORD_TRANSLATIONS)) {
    if (keywordLower === key || keywordLower.includes(key) || key.includes(keywordLower)) {
      return translations;
    }
  }
  
  return null;
}

/**
 * Calculates relevance score based on semantic analysis
 */
function calculateRelevance(
  keyword: string,
  context?: { category?: string; productType?: string },
  language: SupportedSEOLanguage = 'nl'
): number {
  let score = 50;
  
  // Boost for industry-specific terms
  const industryTerms = INDUSTRY_TERMS[language];
  industryTerms.forEach(term => {
    if (keyword.includes(term)) {
      score += 15;
    }
  });
  
  // Boost for category match
  if (context?.category && keyword.includes(context.category.toLowerCase())) {
    score += 20;
  }
  
  // Boost for optimal length (2-4 words)
  const wordCount = keyword.split(' ').length;
  if (wordCount >= 2 && wordCount <= 4) {
    score += 10;
  }
  
  // Boost for trending modifiers
  const modifiers = TRENDING_MODIFIERS[language];
  modifiers.forEach(mod => {
    if (keyword.includes(mod)) {
      score += 8;
    }
  });

  // Boost for Belgium location keywords
  const locations = BELGIUM_LOCATIONS[language];
  if (locations.some(loc => keyword.includes(loc))) {
    score += 12;
  }
  
  return Math.min(score, 100);
}

/**
 * Estimates search volume based on keyword characteristics
 */
function estimateSearchVolume(
  keyword: string,
  language: SupportedSEOLanguage = 'nl'
): 'high' | 'medium' | 'low' {
  const wordCount = keyword.split(' ').length;
  
  // Check for high-volume industry terms
  const industryTerms = INDUSTRY_TERMS[language];
  const hasIndustryTerm = industryTerms.some(term => keyword.includes(term));
  
  // Check for location terms (high value for local SEO)
  const locations = BELGIUM_LOCATIONS[language];
  const hasLocation = locations.some(loc => keyword.includes(loc));
  
  if ((wordCount <= 2 && hasIndustryTerm) || hasLocation) {
    return 'high';
  }
  
  if (wordCount <= 3 || hasIndustryTerm) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Categorizes keyword by semantic meaning (multilingual)
 */
function categorizeKeyword(keyword: string): string {
  const categories = {
    'material': ['pla', 'abs', 'petg', 'nylon', 'resina', 'resin', 'hars', 'filamento', 'filament', 'material', 'materiaal'],
    'service': ['impresión', 'printing', 'printen', 'servicio', 'service', 'dienst', 'cotización', 'quote', 'offerte'],
    'quality': ['calidad', 'quality', 'kwaliteit', 'profesional', 'professional', 'professioneel', 'premium'],
    'product': ['producto', 'product', 'modelo', 'model', 'pieza', 'part', 'onderdeel'],
    'location': ['bélgica', 'belgium', 'belgie', 'europa', 'europe', 'envío', 'shipping', 'verzending', 'brussel', 'bruselas', 'brussels', 'antwerpen', 'amberes', 'antwerp']
  };
  
  for (const [category, terms] of Object.entries(categories)) {
    if (terms.some(term => keyword.includes(term))) {
      return category;
    }
  }
  
  return 'general';
}

/**
 * Generates optimized meta description for SEO
 */
export function generateMetaDescription(
  title: string,
  content: string,
  options?: {
    maxLength?: number;
    keywords?: string[];
    includeCallToAction?: boolean;
  }
): MetaDescriptionResult {
  const maxLength = options?.maxLength || 160;
  const keywords = options?.keywords || [];
  const includeCallToAction = options?.includeCallToAction ?? true;
  
  // Clean content
  const cleanContent = content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ')
    .trim();
  
  // Extract most relevant sentences
  const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  let description = '';
  
  // Try to include keywords naturally
  const relevantSentences = sentences.filter(s => 
    keywords.some(k => s.toLowerCase().includes(k.toLowerCase()))
  );
  
  if (relevantSentences.length > 0) {
    description = relevantSentences[0].trim();
  } else if (sentences.length > 0) {
    description = sentences[0].trim();
  } else {
    description = cleanContent;
  }
  
  // Add call to action if space permits
  const callToActions = [
    '¡Solicita tu cotización ahora!',
    'Descubre más aquí.',
    '¡Cotiza gratis hoy!',
    'Envío rápido a toda Bélgica.'
  ];
  
  if (includeCallToAction && description.length < maxLength - 30) {
    const cta = callToActions[Math.floor(Math.random() * callToActions.length)];
    if (description.length + cta.length + 2 <= maxLength) {
      description = `${description}. ${cta}`;
    }
  }
  
  // Truncate if necessary
  if (description.length > maxLength) {
    description = description.substring(0, maxLength - 3).trim();
    // Find last complete word
    const lastSpace = description.lastIndexOf(' ');
    if (lastSpace > maxLength - 30) {
      description = description.substring(0, lastSpace);
    }
    description += '...';
  }
  
  // Calculate metrics
  const keywordDensity = keywords.length > 0 
    ? keywords.filter(k => description.toLowerCase().includes(k.toLowerCase())).length / keywords.length
    : 0;
  
  const readabilityScore = calculateReadability(description);
  
  return {
    description,
    characterCount: description.length,
    keywordDensity,
    readabilityScore
  };
}

/**
 * Calculates readability score (simplified Flesch-like score)
 */
function calculateReadability(text: string): number {
  const words = text.split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length || 1;
  const avgWordsPerSentence = words / sentences;
  
  // Simple readability: prefer 15-20 words per sentence
  if (avgWordsPerSentence >= 15 && avgWordsPerSentence <= 20) {
    return 100;
  }
  
  const deviation = Math.abs(17.5 - avgWordsPerSentence);
  return Math.max(0, 100 - (deviation * 5));
}

/**
 * Generates optimized page title for SEO
 */
export function generatePageTitle(
  baseTitle: string,
  options?: {
    suffix?: string;
    maxLength?: number;
    includeKeyword?: string;
  }
): string {
  const maxLength = options?.maxLength || 60;
  const suffix = options?.suffix || ' - Thuis 3D';
  const keyword = options?.includeKeyword;
  
  let title = baseTitle.trim();
  
  // Add keyword if provided and space permits
  if (keyword && !title.toLowerCase().includes(keyword.toLowerCase())) {
    const keywordTitle = `${keyword} - ${title}`;
    if (keywordTitle.length + suffix.length <= maxLength) {
      title = keywordTitle;
    }
  }
  
  // Add suffix
  if (title.length + suffix.length <= maxLength) {
    title += suffix;
  } else {
    // Truncate title to fit suffix
    const maxTitleLength = maxLength - suffix.length - 3;
    if (maxTitleLength > 20) {
      title = title.substring(0, maxTitleLength).trim() + '...' + suffix;
    }
  }
  
  return title;
}

/**
 * Validates SEO configuration and returns recommendations
 */
export function validateSEOConfiguration(config: {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
}): {
  isValid: boolean;
  score: number;
  recommendations: string[];
} {
  const recommendations: string[] = [];
  let score = 0;
  
  // Title validation
  if (config.title) {
    if (config.title.length >= 30 && config.title.length <= 60) {
      score += 20;
    } else {
      recommendations.push(
        `El título debe tener entre 30-60 caracteres (actual: ${config.title.length})`
      );
      score += config.title.length >= 20 ? 10 : 0;
    }
  } else {
    recommendations.push('Falta el título de la página');
  }
  
  // Description validation
  if (config.description) {
    if (config.description.length >= 120 && config.description.length <= 160) {
      score += 25;
    } else {
      recommendations.push(
        `La descripción debe tener entre 120-160 caracteres (actual: ${config.description.length})`
      );
      score += config.description.length >= 50 ? 15 : 0;
    }
  } else {
    recommendations.push('Falta la meta descripción');
  }
  
  // Keywords validation
  if (config.keywords && config.keywords.length > 0) {
    if (config.keywords.length >= 5 && config.keywords.length <= 15) {
      score += 20;
    } else {
      recommendations.push(
        `Se recomiendan entre 5-15 palabras clave (actual: ${config.keywords.length})`
      );
      score += 10;
    }
    
    // Check keyword quality
    const longTailKeywords = config.keywords.filter(k => k.split(' ').length >= 2);
    if (longTailKeywords.length < config.keywords.length * 0.5) {
      recommendations.push('Incluye más palabras clave long-tail (2-4 palabras)');
    } else {
      score += 10;
    }
  } else {
    recommendations.push('Agrega palabras clave SEO');
  }
  
  // Canonical URL validation
  if (config.canonicalUrl) {
    if (config.canonicalUrl.startsWith('https://')) {
      score += 10;
    } else {
      recommendations.push('La URL canónica debe usar HTTPS');
      score += 5;
    }
  } else {
    recommendations.push('Configura una URL canónica');
  }
  
  // OG Image validation
  if (config.ogImage) {
    score += 15;
  } else {
    recommendations.push('Agrega una imagen Open Graph para redes sociales');
  }
  
  return {
    isValid: score >= 70,
    score: Math.min(score, 100),
    recommendations
  };
}

/**
 * Generates structured data (JSON-LD) for products
 */
export function generateProductStructuredData(product: {
  name: string;
  description: string;
  price?: number;
  currency?: string;
  image?: string;
  sku?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    ...(product.image && { image: product.image }),
    ...(product.sku && { sku: product.sku }),
    ...(product.price && {
      offers: {
        '@type': 'Offer',
        price: product.price,
        priceCurrency: product.currency || 'EUR',
        availability: `https://schema.org/${product.availability || 'InStock'}`
      }
    })
  };
}

/**
 * Generates structured data (JSON-LD) for blog articles
 */
export function generateArticleStructuredData(article: {
  title: string;
  description: string;
  author?: string;
  datePublished?: string;
  dateModified?: string;
  image?: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    ...(article.author && {
      author: {
        '@type': 'Person',
        name: article.author
      }
    }),
    ...(article.datePublished && { datePublished: article.datePublished }),
    ...(article.dateModified && { dateModified: article.dateModified }),
    ...(article.image && { image: article.image })
  };
}
