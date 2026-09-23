
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  const base = process.env.VITE_BASE_PATH || (isBuild ? '/instan/' : '/');

  return {
    // Sous-chemin GitHub Pages en production (/instan/), racine (/) en dev/preview
    base,

    define: {
      __APP_VERSION__: JSON.stringify('4.3.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },

    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: isBuild ? 'auto' : null,
        includeAssets: [
          'icon.svg',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/instan/',
          name: 'Nantor Sourcing App',
          short_name: 'NantorApp',
          description: 'Gestion de sourcing Chine, devis proforma, commandes et suivi logistique.',
          theme_color: '#09090b',
          background_color: '#09090b',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: isBuild ? '/instan/' : '/',
          scope: isBuild ? '/instan/' : '/',
          icons: [
            {
              src: isBuild ? '/instan/pwa-192x192.png' : '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: isBuild ? '/instan/pwa-512x512.png' : '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: isBuild ? '/instan/pwa-maskable-512x512.png' : '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB pour garantir la mise en cache complète des bundles
          skipWaiting: true, // Force le Service Worker en attente à s'activer immédiatement
          clientsClaim: true, // Permet au Service Worker actif de prendre le contrôle direct de tous les clients
          cleanupOutdatedCaches: true, // Nettoie automatiquement les anciens caches des versions précédentes
          navigateFallback: isBuild ? '/instan/index.html' : '/index.html',
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/jspdf') || id.includes('node_modules/jszip')) {
              return 'vendor-pdf';
            }
            if (id.includes('node_modules/firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('node_modules/lucide-react') || id.includes('node_modules/motion')) {
              return 'vendor-icons';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

