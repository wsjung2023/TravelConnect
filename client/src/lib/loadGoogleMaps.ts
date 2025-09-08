let promise: Promise<any> | null = null;

export function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google);
  if (promise) return promise;
  
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY environment variable is not set'));
  }
  
  const s = document.createElement('script');
  s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
  s.async = true;
  document.head.appendChild(s);
  
  promise = new Promise((resolve, reject) => {
    s.onload = () => resolve(window.google);
    s.onerror = reject;
  });
  
  return promise;
}

// Google Maps API가 로드되었는지 확인하는 헬퍼 함수
export function isGoogleMapsLoaded(): boolean {
  return !!(window.google?.maps);
}

// 타입 선언
declare global {
  interface Window {
    google: typeof google;
  }
}