import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Detection order: 
// 1. localStorage (cached preference)
// 2. navigator (browser/device language)
// 3. htmlTag
const detectionOptions = {
  order: ['localStorage', 'navigator', 'htmlTag'],
  lookupLocalStorage: 'i18nextLng',
  caches: ['localStorage'],
  excludeCacheFor: ['cimode'],
  // Map browser languages to our supported languages
  convertDetectedLanguage: (lng: string) => {
    // Handle language codes like 'en-US', 'es-ES', 'nl-NL', 'nl-BE'
    const baseLang = lng.split('-')[0].toLowerCase();
    
    // Map to supported languages
    if (baseLang === 'nl') return 'nl';
    if (baseLang === 'es') return 'es';
    if (baseLang === 'en') return 'en';
    
    // Default to Dutch for unsupported languages (since it's a Belgian site)
    return 'nl';
  }
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // DO NOT set 'lng' here - let LanguageDetector handle it
    fallbackLng: 'nl',
    supportedLngs: ['es', 'en', 'nl'],
    debug: false,
    detection: detectionOptions,
    
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    ns: ['common', 'navigation', 'forms', 'products', 'admin', 'errors', 'home', 'blog', 'footer', 'blogPost', 'giftCards', 'reviews', 'cart', 'shipping', 'payment', 'invoice', 'quotes', 'gallery', 'auth', 'account', 'messages', 'stlUploader'],
    defaultNS: 'common',

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: true,
    },
  });

// Log detected language for debugging
console.log('[i18n] Detected language:', i18n.language);
console.log('[i18n] Browser languages:', navigator.languages);

export default i18n;
