#!/usr/bin/env node
/**
 * Prerender setiap rute menjadi HTML statis setelah `vite build`.
 * Hasilnya: dist/index.html, dist/alat/gabung-pdf/index.html, dst., plus
 * sitemap.xml, robots.txt, 404.html, dan ads.txt. Semua tetap statis
 * (cocok untuk GitHub Pages) tanpa server.
 *
 *   npm run build
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = process.cwd()
const DIST = path.join(ROOT, 'dist')
const TEMPLATE = path.join(DIST, 'index.html')
const BUNDLE = path.join(ROOT, '.prerender', 'prerender.js')

const siteUrl = (process.env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '')
const base = (process.env.BASE_PATH ?? '/').replace(/\/+$/, '')

if (!fs.existsSync(TEMPLATE)) {
  console.error('dist/index.html tidak ada. Jalankan "vite build" lebih dulu.')
  process.exit(1)
}
if (!fs.existsSync(BUNDLE)) {
  console.error('Bundel prerender tidak ada. Jalankan "vite build --config vite.prerender.config.ts".')
  process.exit(1)
}

const { renderRoute, siteRoutes } = await import(pathToFileURL(BUNDLE).href)

const template = fs.readFileSync(TEMPLATE, 'utf8')

/**
 * Ganti judul/deskripsi bawaan dengan tag rute, lalu sisipkan sebelum </head>.
 * Tag hasil build (script bundle, manifest, dsb.) tetap dipertahankan.
 */
function buildHtml(head, body) {
  const cleaned = template
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, '')
  const withHead = cleaned.replace('</head>', `  ${head}\n  </head>`)
  return withHead.replace('<div id="root"></div>', `<div id="root">${body}</div>`)
}

async function main() {
  const routes = siteRoutes()
  const written = []

  for (const route of routes) {
    const { html, head } = renderRoute(route.path)
    const output = buildHtml(head, html)
    const target =
      route.path === '/'
        ? path.join(DIST, 'index.html')
        : path.join(DIST, route.path.replace(/^\//, ''), 'index.html')
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, output)
    written.push(route.path)
  }

  // 404 untuk GitHub Pages: satu berkas, tidak diindeks.
  const { html: notFoundHtml, head: notFoundHead } = renderRoute('/404')
  fs.writeFileSync(
    path.join(DIST, '404.html'),
    buildHtml(notFoundHead, notFoundHtml),
  )

  // Sitemap hanya berguna dengan URL absolut.
  if (siteUrl) {
    const urls = routes
      .map((route) => {
        const clean = route.path.replace(/\/+$/, '')
        const loc = clean ? `${siteUrl}${clean}/` : `${siteUrl}/`
        return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>2026-11-20</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${route.priority.toFixed(1)}</priority>\n  </url>`
      })
      .join('\n')
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
    fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap)
    fs.writeFileSync(
      path.join(DIST, 'robots.txt'),
      `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
    )
    console.log(`sitemap.xml + robots.txt untuk ${siteUrl}`)
  } else {
    fs.writeFileSync(
      path.join(DIST, 'robots.txt'),
      'User-agent: *\nAllow: /\n',
    )
    console.log('VITE_SITE_URL kosong — sitemap dilewati, robots.txt tanpa Sitemap.')
  }

  // ads.txt hanya ditulis bila publisher AdSense sudah diisi.
  const client = (process.env.VITE_ADSENSE_CLIENT ?? '').trim()
  const publisher = /ca-pub-(\d+)/.exec(client)?.[1]
  if (publisher) {
    fs.writeFileSync(
      path.join(DIST, 'ads.txt'),
      `google.com, pub-${publisher}, DIRECT, f08c47fec0942fa0\n`,
    )
    console.log('ads.txt ditulis dari VITE_ADSENSE_CLIENT')
  }

  console.log(`Prerender selesai: ${written.length} rute (base "${base || '/'}")`)
}

await main()
