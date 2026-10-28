import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // VITE_BASE_PATH=/Kleiderschrank/ npm run build for GitHub project Pages.
  base: process.env.VITE_BASE_PATH || '/',
  // Worker-only inference dependency must be ready before editing a photo;
  // late discovery would reload Vite and discard an unsaved draft.
  optimizeDeps: { include: ['onnxruntime-web/wasm'] },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon-monochrome.png', 'icon.svg'],
      manifest: {
        name: 'MyStyle – Dein Kleiderschrank',
        short_name: 'MyStyle',
        lang: 'de',
        description: 'Dein persönlicher, privater Kleiderschrank.',
        theme_color: '#f5f4ed',
        background_color: '#f5f4ed',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [
          {
            src: 'icon-monochrome-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-monochrome-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-monochrome-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Models/WASM are fetched only after explicit opt-in by the user.
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
  worker: { format: 'es' },
})
