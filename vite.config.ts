import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// BASE_PATH bisa diisi saat build untuk sub-path (mis. GitHub Pages).
const base = process.env.BASE_PATH ?? '/'

/** Worker Tesseract memilih model dan varian WebAssembly saat alat digunakan. */
function ocrAssets(): Plugin {
  const require = createRequire(import.meta.url)
  const assets = new Map(['ind', 'eng'].map((code) => {
    const name = `${code}.traineddata.gz`
    return [`ocr/${name}`, require.resolve(`@tesseract.js-data/${code}/4.0.0_best_int/${name}`)]
  }))
  for (const variant of ['', '-simd', '-relaxedsimd']) {
    const name = `tesseract-core${variant}-lstm.wasm.js`
    assets.set(`ocr/core/${name}`, require.resolve(`tesseract.js-core/${name}`))
  }

  return {
    name: 'ttd-ocr-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        const file = url.startsWith(base) ? assets.get(url.slice(base.length)) : undefined
        if (!file) return next()
        res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'application/gzip')
        fs.createReadStream(file).pipe(res)
      })
    },
    generateBundle() {
      for (const [fileName, file] of assets) {
        this.emitFile({ type: 'asset', fileName, source: fs.readFileSync(file) })
      }
    },
  }
}

/**
 * Sajikan `<rute>/index.html` untuk permintaan di server preview, sama
 * seperti hosting statis (GitHub Pages). Tanpa ini preview selalu memakai
 * index.html beranda sehingga hidrasi React tidak cocok.
 * Dev memakai fallback bawaan Vite; modul internal seperti /@vite/client
 * dan /@react-refresh harus tetap ditangani Vite tanpa penulisan ulang URL.
 */
function routeFallback(): Plugin {
  const resolveFile = (clean: string) => {
    if (!clean || clean === '/') return `${base}index.html`
    const candidate = path.join(process.cwd(), 'dist', clean.replace(/^\/+/, ''), 'index.html')
    if (fs.existsSync(candidate)) return `${base}${clean.replace(/^\/+/, '')}/index.html`
    // Rute tak dikenal: GitHub Pages menyajikan 404.html, tiru itu di preview.
    return fs.existsSync(path.join(process.cwd(), 'dist', '404.html'))
      ? `${base}404.html`
      : `${base}index.html`
  }

  return {
    name: 'ttd-route-fallback',
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url?.split('?')[0] ?? '/'
        const clean = url.startsWith(base) ? url.slice(base.length) : url
        if (clean && !clean.includes('.')) req.url = resolveFile(`/${clean.replace(/^\/+|\/+$/g, '')}`)
        next()
      })
    },
  }
}

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    ocrAssets(),
    routeFallback(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon.png', 'apple-touch-icon.png', 'og.png'],
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
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,mjs,webmanifest}'],
        globIgnores: [
          '**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2',
          '**/ocr/core/**',
          '**/worker.min-*.js',
        ],
        // Tiap rute punya HTML hasil prerender sendiri, jadi tidak ada fallback
        // ke beranda: fallback justru menukar HTML rute lain dan memicu
        // hydration mismatch di React.
        navigateFallback: null,
        maximumFileSizeToCacheInBytes: 4_000_000,
        cleanupOutdatedCaches: true,
        // Skrip iklan/analitik tidak boleh masuk cache: selalu ambil dari jaringan.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/(pagead2\.googlesyndication\.com|googleads\.g\.doubleclick\.net|www\.googletagmanager\.com|www\.google-analytics\.com|plausible\.io)\//,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
