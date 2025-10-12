// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

export default defineConfig(async () => {
  const isProd = process.env.NODE_ENV === 'production';
  const isReplit = process.env.REPL_ID !== undefined;

  const plugins = [
    react(),
    !isProd ? runtimeErrorOverlay() : undefined,
    !isProd && isReplit
      ? (await import('@replit/vite-plugin-cartographer')).cartographer()
      : undefined,
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
