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
  },
});
