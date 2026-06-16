import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './ui'),
    },
  },
  server: {
    port: 3333,
    host: true,
  },
  build: {
    outDir: 'dist/ui',
    emptyOutDir: true,
    sourcemap: true,
    // esbuild 0.28+ no longer downlevels destructuring to es2020 targets.
    target: 'es2022',
    rollupOptions: {
      output: {
        // Split third-party code into stable, separately cacheable chunks.
        // recharts/d3 and @xyflow/react are only pulled in by lazy views, so
        // they stay async; this just keeps the shared entry vendor chunk lean.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@xyflow')) return 'reactflow';
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('/victory-')) {
            return 'charts';
          }
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/') ||
            id.includes('react/jsx-runtime')
          ) {
            return 'react-vendor';
          }
          return 'vendor';
        },
      },
    },
  },
});
