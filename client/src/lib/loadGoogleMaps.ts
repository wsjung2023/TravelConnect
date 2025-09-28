import i18n from './i18n';

let promise: Promise<any> | null = null;
let currentLanguage: string | null = null;

export function loadGoogleMaps() {
  const lang = i18n.language || 'en';
  
  // 언어가 변경된 경우 새로 로드
  if (currentLanguage && currentLanguage !== lang) {
    resetGoogleMapsPromise();
  }
  
  if (window.google?.maps && currentLanguage === lang) {
    return Promise.resolve(window.google);
  }
  if (promise) return promise;
  
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY environment variable is not set'));
  }
  
  // 언어별 지역 코드 매핑 (지명 번역 개선용)
  const regionMap: { [key: string]: string } = {
    'ko': 'KR',
    'ja': 'JP', 
    'zh': 'CN',
    'fr': 'FR',
    'es': 'ES',
    'en': 'US'
  };
  
  const region = regionMap[lang] || 'US';
  
  currentLanguage = lang;
  const s = document.createElement('script');
  s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&language=${lang}&region=${region}`;
  s.async = true;
  document.head.appendChild(s);
  
  promise = new Promise((resolve, reject) => {
    s.onload = () => resolve(window.google);
    s.onerror = reject;
  });
  
  return promise;
}

// 언어 변경 시 Google Maps를 다시 로드하기 위해 promise 재설정
export function resetGoogleMapsPromise() {
  promise = null;
  currentLanguage = null;
}

// Google Maps API가 로드되었는지 확인하는 헬퍼 함수
export function isGoogleMapsLoaded(): boolean {
  return !!(window.google?.maps);
}

// 타입 선언
declare global {
  interface Window {
    google: any;
  }
}