// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';
import { VitePWA } from 'vite-plugin-pwa';

// NOTE: defineConfig에 async 콜백을 넘겨서 동적 import 사용
export default defineConfig(async () => {
  const isProd = process.env.NODE_ENV === 'production';
  const isReplit = process.env.REPL_ID !== undefined;

  // manifest.json을 public에서 그대로 끌어다 씀
  // (tsconfig.json에 "resolveJsonModule": true 가 있으면 타입 경고 없이 쓸 수 있어)
  const manifest = (await import('./client/public/manifest.json')).default;

  const plugins = [
    react(),

    // Replit 개발용 오버레이는 프로덕션에서 꺼짐
    !isProd ? runtimeErrorOverlay() : undefined,

    // Replit cartographer 도구도 개발시에만 로드
    !isProd && isReplit
      ? (await import('@replit/vite-plugin-cartographer')).cartographer()
      : undefined,

    // ✅ PWA 자동 주입 (서비스워커 + 설치)
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      // 기존 manifest.json 그대로 사용
      manifest,
      workbox: {
        runtimeCaching: [
          // 폰트/정적자산은 SWR 전략
          { urlPattern: /^https:\/\/fonts\./, handler: 'StaleWhileRevalidate' },
          {
            urlPattern: /\.(?:png|jpg|jpeg|webp|avif|svg)$/,
            handler: 'StaleWhileRevalidate',
          },
        ],
      },
    }),
  ].filter(Boolean);

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'client', 'src'),
        '@shared': path.resolve(import.meta.dirname, 'shared'),
        '@assets': path.resolve(import.meta.dirname, 'attached_assets'),
      },
    },
    // Vite의 root는 client로 유지
    root: path.resolve(import.meta.dirname, 'client'),
    build: {
      outDir: path.resolve(import.meta.dirname, 'dist/public'),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ['**/.*'],
      },
    },
  };
});
