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
  build: {
    rolldownOptions: {
      output: {
        // Libraries go into their own "vendor" files. They rarely change, so browsers keep
        // them cached across deployments and only re-download the (small) app code.
        codeSplitting: {
          // Higher priority picks its modules first: shared MUI components must land in
          // vendor-mui, not inside the DataGrid chunk that also imports them.
          groups: [
            {
              name: 'vendor-react',
              // [\\/]: path separator on both Linux (/) and Windows (\).
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 3,
            },
            {
              name: 'vendor-mui',
              test: /node_modules[\\/](@mui[\\/](material|system|utils|styled-engine|private-theming|core-downloads-tracker)|@emotion|@babel[\\/]runtime)[\\/]/,
              priority: 2,
            },
            { name: 'vendor-datagrid', test: /node_modules[\\/]@mui[\\/]x-/, priority: 1 },
          ],
        },
      },
    },
  },
});
