import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Сборка веб-витрины PCHelper.
 *
 * В режиме разработки запросы к /api проксируются на локальный backend,
 * чтобы фронтенд и API жили на одном источнике и не упирались в CORS.
 * В production nginx раздаёт статику и проксирует /api на контейнер api.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
