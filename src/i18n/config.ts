import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Map browser language codes to our supported languages
const mapToSupportedLanguage = (lng: string | undefined | null): string => {
  if (!lng) return 'nl'; // Default to Dutch for Belgian site
  
  const baseLang = lng.split('-')[0].toLowerCase();
  
  if (baseLang === 'nl') return 'nl';
  if (baseLang === 'es') return 'es';
  if (baseLang === 'en') return 'en';
  
  // Default to Dutch for unsupported languages
  return 'nl';
};

// Detection order: localStorage → navigator → htmlTag
const detectionOptions = {
  order: ['localStorage', 'navigator', 'htmlTag'],
  lookupLocalStorage: 'i18nextLng',
  caches: ['localStorage'],
  excludeCacheFor: ['cimode'],
  convertDetectedLanguage: mapToSupportedLanguage
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

// Ensure we have a valid language after init
const ensureValidLanguage = () => {
  const currentLang = i18n.language;
  if (!currentLang || currentLang === 'undefined' || !['es', 'en', 'nl'].includes(currentLang)) {
    const browserLang = navigator.language || navigator.languages?.[0];
    const mappedLang = mapToSupportedLanguage(browserLang);
    i18n.changeLanguage(mappedLang);
    localStorage.setItem('i18nextLng', mappedLang);
    console.log('[i18n] Fixed invalid language, set to:', mappedLang);
  }
};

// Run after a short delay to ensure i18n is fully initialized
setTimeout(ensureValidLanguage, 100);

// Log detected language for debugging
console.log('[i18n] Detected language:', i18n.language);
console.log('[i18n] Browser languages:', navigator.languages);

export default i18n;
