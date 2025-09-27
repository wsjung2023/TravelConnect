import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Initialize i18next
i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Default language
    fallbackLng: 'en',
    lng: 'en', // Default to English initially
    
    // Debug mode (disable in production)
    debug: process.env.NODE_ENV === 'development',
    
    // Language detection options
    detection: {
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    
    // Backend options for loading language files
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      // Allow cross origin requests
      crossDomain: false,
      // Credentials
      withCredentials: false,
    },
    
    // Namespaces
    ns: ['common', 'ui', 'validation', 'toast'],
    defaultNS: 'common',
    
    // Interpolation
    interpolation: {
      escapeValue: false, // React already escapes
    },
    
    // React options
    react: {
      useSuspense: false,
    },
    
    // Supported languages
    supportedLngs: ['en', 'ko', 'ja', 'zh', 'fr', 'es'],
    
    // Return empty string for missing keys to use fallback
    returnEmptyString: false,
    returnNull: false,
    
    // Load all namespaces by default
    preload: ['en', 'ko', 'fr', 'es', 'ja', 'zh'],
  });

export default i18n;