import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': {}
  },
  build: {
    outDir: path.join(root, 'assets', 'modern'),
    emptyOutDir: true,
    lib: {
      entry: path.join(root, 'src', 'modern', 'main.tsx'),
      name: 'FinanCasaModernApp',
      formats: ['iife'],
      fileName: () => 'financasa-modern.js'
    },
    rollupOptions: {
      output: {
        assetFileNames: 'financasa-modern.[ext]'
      }
    }
  }
});
