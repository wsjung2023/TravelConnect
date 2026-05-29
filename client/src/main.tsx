// 클라이언트 진입점 — React 앱을 DOM에 마운트하고 i18n, QueryClient 등 전역 설정을 초기화한다.
import '@/lib/disableConsoleInProd';   // 가장 위에 추가
import { installFetchInterceptor } from '@/lib/fetchInterceptor';
installFetchInterceptor(); // H-5: 모든 동일 출처 fetch에 자동으로 X-CSRF-Token + credentials:'include' 부착
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './index.css';
import './lib/i18n'; // 다국어 세팅 유지!

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);

// PWA 서비스 워커 — 운영에서만 등록. 개발에서는 기존 워커/캐시를 정리해
// "새로고침해도 안 풀리는 흰 화면"(stale SW 캐시) 문제를 방지한다.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    });
  } else {
    // 개발 환경: 이전에 등록된 서비스 워커와 캐시를 제거
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
    if ('caches' in window) {
      caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
    }
  }
}
