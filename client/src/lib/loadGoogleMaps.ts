import i18n from './i18n';

let promise: Promise<any> | null = null;
let currentLanguage: string | null = null;

export function loadGoogleMaps() {
  const lang = i18n.language || 'en';
  
  // Reset if language changed
  if (currentLanguage && currentLanguage !== lang) {
    resetGoogleMapsPromise();
  }
  
  // Check if already loaded with same language
  if (window.google?.maps && currentLanguage === lang) {
    return Promise.resolve(window.google);
  }
  
  // If loading is in progress, return the existing promise
  if (promise) {
    return promise;
  }
  
  // Check if script tag already exists in the document
  const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
  if (existingScript && window.google?.maps) {
    currentLanguage = lang;
    return Promise.resolve(window.google);
  }
  
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY environment variable is not set'));
  }
  
  // Language-region mapping for better location translations
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

// Reset promise and remove existing script when language changes
export function resetGoogleMapsPromise() {
  promise = null;
  currentLanguage = null;
  
  // Remove existing Google Maps script from DOM
  const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
  if (existingScript) {
    existingScript.remove();
  }
  
  // Reset window.google to force reload
  if (window.google) {
    delete (window as any).google;
  }
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