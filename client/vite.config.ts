import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'API_'],
  server: {
    port: 3000,
    proxy: {
      '/users': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/userrouter': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/doc-reader': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/docReaderRouter': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
