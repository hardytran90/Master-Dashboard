import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The app lives under /coding/ so the hub can mount it at dashboard-domain/coding
// (Vercel rewrite → this project). Output goes to dist/coding so the asset URLs
// (/coding/assets/...) match the files on disk.
export default defineConfig({
  base: '/coding/',
  plugins: [react(), tailwindcss()],
  resolve: { dedupe: ['react', 'react-dom', 'react-router-dom'] },
  server: { port: 5174, strictPort: true }, // the hub's proxy expects exactly :5174
  build: { outDir: 'dist/coding', emptyOutDir: true },
});
