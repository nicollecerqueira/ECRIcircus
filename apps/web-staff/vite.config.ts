import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// React 19 + React Compiler (no manual useMemo/useCallback/React.memo — Avenir convention).
export default defineConfig({
  plugins: [
    react({
      babel: { plugins: [['babel-plugin-react-compiler', { target: '19' }]] },
    }),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ECRI Circus · Staff',
        short_name: 'ECRI Staff',
        theme_color: '#b3122a',
        display: 'standalone',
        start_url: '/',
      },
    }),
  ],
  server: {
    port: 1021,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/realtime': { target: 'http://localhost:3000', ws: true },
    },
  },
});
