import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

const detectionOptions = {
  order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
  lookupQuerystring: 'lang',
  lookupLocalStorage: 'i18nextLng',
  caches: ['localStorage'],
  excludeCacheFor: ['cimode'],
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'es',
    supportedLngs: ['es', 'en', 'nl'],
    debug: false,
    detection: detectionOptions,
    
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    ns: ['common', 'navigation', 'forms', 'products', 'admin', 'errors', 'home', 'blog', 'footer', 'blogPost', 'giftCards', 'reviews', 'cart', 'shipping', 'payment', 'invoice', 'quotes', 'gallery', 'auth', 'account', 'messages'],
    defaultNS: 'common',

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: true,
    },
  });

export default i18n;
