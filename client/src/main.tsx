// 클라이언트 진입점 — React 앱을 DOM에 마운트하고 i18n, QueryClient 등 전역 설정을 초기화한다.
import '@/lib/disableConsoleInProd';   // 가장 위에 추가
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

// PWA 서비스 워커 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}
