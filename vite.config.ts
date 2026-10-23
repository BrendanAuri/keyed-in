import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const THEME = '#111318';
// One above Dial In's ports. Service workers belong to an origin, so sharing localhost:4173
// with Dial In's preview would let one app's cached pages load in place of the other's.
const DEV_PORT = 5174;
const PREVIEW_PORT = 4174;

export default defineConfig(({ mode }) => {
  // Hosting under a sub-path (e.g. GitHub Pages project sites) sets KEYED_IN_BASE=/repo-name/.
  const base = loadEnv(mode, '.', '').KEYED_IN_BASE || '/';
  return {
    base,
    server: { port: DEV_PORT, strictPort: true },
    preview: { port: PREVIEW_PORT, strictPort: true },
    plugins: [
      react(),
      VitePWA({
        // Ask before switching to a new version, so an update never interrupts a round.
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Keyed In',
          short_name: 'Keyed In',
          description: 'Learn chords, scales and the theory behind them, from the very beginning: by eye, by hand and by ear.',
          theme_color: THEME,
          background_color: THEME,
          display: 'standalone',
          orientation: 'any',
          categories: ['music', 'education', 'games'],
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Everything the app needs is precached, so it works offline after the first visit.
          globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
