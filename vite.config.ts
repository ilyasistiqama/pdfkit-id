import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// BASE_PATH bisa diisi saat build untuk sub-path (mis. GitHub Pages).
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Tanda Tangan PDF',
        short_name: 'Tanda Tangan',
        description:
          'Tanda tangani PDF langsung di halaman dokumennya. Gambar atau unggah tanda tangan, semuanya di browser.',
        lang: 'id',
        start_url: base,
        scope: base,
        id: base,
        display: 'standalone',
        background_color: '#f5f2ec',
        theme_color: '#f5f2ec',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // worker pdf.js (.mjs) ikut disimpan supaya bisa dipakai offline
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,mjs}'],
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        navigateFallback: `${base}index.html`,
        maximumFileSizeToCacheInBytes: 4_000_000,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
