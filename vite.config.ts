import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  // assets/ — внешняя папка с контентом, в бандл не попадает
  publicDir: false,
  build: { outDir: 'dist-renderer', emptyOutDir: true, assetsInlineLimit: 0, chunkSizeWarningLimit: 2000 },
  server: { port: 5173, strictPort: true },
});
