import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// base './' : l'application fonctionne depuis n'importe quel sous-dossier
// (https://MONCOMPTE.github.io/MONREPOSITORY/) sans rien configurer.
export default defineConfig(({ mode }) => {
  // Version en ligne (comptes Supabase) : la page est toujours demandée au serveur d'abord, pour que
  // chacun ait immédiatement la dernière version. Version locale : tout reste en cache (hors-ligne).
  const cloud = !!loadEnv(mode, process.cwd(), '').VITE_SUPABASE_URL;
  return {
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // enregistrement manuel dans src/lib/pwa.ts
      manifest: false, // manifest écrit à la main : public/manifest.webmanifest
      workbox: {
        globPatterns: cloud ? ['**/*.{js,css,png,svg,webmanifest}'] : ['**/*.{js,css,html,png,svg,webmanifest}'],
        // modules optionnels de jsPDF jamais utilisés ici (rendu HTML/SVG) : inutile de les mettre en cache
        globIgnores: ['**/html2canvas-*.js', '**/purify.es-*.js', '**/index.es-*.js'],
        navigateFallback: cloud ? undefined : 'index.html',
        runtimeCaching: cloud
          ? [{ urlPattern: ({ request }) => request.mode === 'navigate', handler: 'NetworkFirst', options: { cacheName: 'pages', networkTimeoutSeconds: 4 } }]
          : [],
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
    // Les tests tournent toujours en mode local, même si .env.local active le mode cloud.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', VITE_BETA_MODE: 'true', VITE_STRIPE_ENABLED: '' },
  },
};
});
