import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// base './' : l'application fonctionne depuis n'importe quel sous-dossier
// (https://MONCOMPTE.github.io/MONREPOSITORY/) sans rien configurer.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // enregistrement manuel dans src/lib/pwa.ts
      manifest: false, // manifest écrit à la main : public/manifest.webmanifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        // modules optionnels de jsPDF jamais utilisés ici (rendu HTML/SVG) : inutile de les mettre en cache
        globIgnores: ['**/html2canvas-*.js', '**/purify.es-*.js', '**/index.es-*.js'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // la nouvelle version prend la main immédiatement : hors-ligne dès la première visite
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
