import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Build terpisah untuk prerender: tanpa plugin PWA, hasilnya diimpor oleh
// scripts/prerender.mjs untuk merender tiap rute menjadi HTML statis.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  build: {
    ssr: 'src/prerender.tsx',
    outDir: '.prerender',
    emptyOutDir: true,
    minify: false,
    target: 'node20',
  },
  ssr: {
    noExternal: ['lucide-react'],
  },
})
