import { defineConfig } from 'vite';

export default defineConfig({
  // relative base so the build works from any folder / sub-path (GitHub Pages, any static host)
  base: './',
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    // three.js is lazy-loaded only when the Collections gallery is reached
    chunkSizeWarningLimit: 700,
  },
});
