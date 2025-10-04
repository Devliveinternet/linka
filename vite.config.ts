import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/traccar': 'http://localhost:3000' } },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
