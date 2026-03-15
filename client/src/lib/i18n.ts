// i18n 설정 — i18next를 초기화하고, DB-driven translations 테이블 기반 다국어(6개 언어) 백엔드를 연결한다.
 import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// 지원 언어 목록
const SUPPORTED_LANGUAGES = ['en', 'ko', 'ja', 'zh', 'fr', 'es'];

// 위치 기반 언어 감지 함수 (브라우저 환경에서만 실행)
async function detectLanguageByGeo(): Promise<string | null> {
  // SSR/빌드 환경 체크
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    // localStorage에 이미 저장된 언어가 있으면 사용 (사용자가 수동으로 변경한 경우)
    const savedLang = localStorage.getItem('i18nextLng');
    if (savedLang && SUPPORTED_LANGUAGES.includes(savedLang)) {
      console.log('[i18n] 저장된 언어 사용:', savedLang);
      return savedLang;
    }
    
    // 서버에서 IP 기반 언어 감지
    const response = await fetch('/api/geo/detect-language');
    if (response.ok) {
      const data = await response.json();
      if (data.language && SUPPORTED_LANGUAGES.includes(data.language)) {
        console.log('[i18n] 위치 기반 언어 감지:', data.language, '(국가:', data.countryCode, ')');
        return data.language;
      }
    }
  } catch (error) {
    console.warn('[i18n] 위치 기반 언어 감지 실패:', error);
  }
  return null;
}

// Initialize i18next
i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Default language
    fallbackLng: 'en',
    lng: 'en', // 초기값, initializeLanguage에서 변경됨
    
    // Debug mode (disable in production)
    debug: import.meta.env.DEV,
    
    // Language detection options
    detection: {
      // localStorage 우선, 그 다음 querystring
      order: ['localStorage', 'querystring', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    
    // Backend options for loading translations from DB API
    backend: {
      loadPath: '/api/translations/{{ns}}?locale={{lng}}',
      // Allow cross origin requests
      crossDomain: false,
      // Credentials
      withCredentials: false,
    },
    
    // Namespaces
    ns: ['common', 'ui', 'validation', 'toast', 'billing'],
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
    supportedLngs: SUPPORTED_LANGUAGES,
    
    // Return empty string for missing keys to use fallback
    returnEmptyString: false,
    returnNull: false,
    
    // Load all namespaces by default
    preload: SUPPORTED_LANGUAGES,
  });

// 앱 시작 시 위치 기반 언어 초기화 (브라우저 환경에서만 실행)
export async function initializeLanguage(): Promise<void> {
  // SSR/빌드 환경 체크
  if (typeof window === 'undefined') {
    return;
  }
  
  const detectedLang = await detectLanguageByGeo();
  if (detectedLang && detectedLang !== i18n.language) {
    await i18n.changeLanguage(detectedLang);
    // 감지된 언어를 localStorage에 저장
    localStorage.setItem('i18nextLng', detectedLang);
  }
}

// 언어 변경 시 <html lang=""> 속성 동기화 (검색엔진 다국어 인식)
if (typeof window !== 'undefined') {
  const syncHtmlLang = (lng: string) => {
    const primary = lng.split('-')[0] ?? 'en'; // 'ko-KR' → 'ko'
    document.documentElement.lang = primary;
  };

  // 초기값 적용
  syncHtmlLang(i18n.language || 'en');

  // 언어 변경될 때마다 자동 반영
  i18n.on('languageChanged', syncHtmlLang);

  initializeLanguage().catch(console.error);
}

export default i18n;