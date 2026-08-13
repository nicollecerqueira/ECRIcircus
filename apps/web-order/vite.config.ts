import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// web-order stays a plain, fast public page — NO PWA/service worker.
export default defineConfig({
  plugins: [
    react({
      babel: { plugins: [['babel-plugin-react-compiler', { target: '19' }]] },
    }),
    tailwindcss(),
  ],
  server: {
    port: 1020,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/realtime': { target: 'http://localhost:3000', ws: true },
    },
  },
});
