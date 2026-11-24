import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The browser calls /api/... on the Vite server, which forwards to the backend.
    // Same origin for the browser, so no CORS setup is needed in development.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
