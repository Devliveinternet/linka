import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
const backendTarget = process.env.VITE_DEV_API_TARGET || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/users': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/config': {
        target: backendTarget,
        changeOrigin: true,
      },
      '/traccar': {
        target: backendTarget,
        changeOrigin: true,
        ws: true,
      },
    },
    host: true,
    port: 8080,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
