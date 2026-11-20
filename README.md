# Tanda Tangan PDF

A browser-only PDF toolkit. Sign a document by drawing with mouse or finger, or import an existing
signature image, place it on any page, then download a signed copy. There are also companion tools
(merge, split, rotate, watermark, compress, convert, fill forms, batch signing). Nothing about the
document is uploaded to a server.

**Live app:** https://ilyasistiqama.github.io/pdfkit-id/

## Features

### Signing

- **Sign by drawing or by uploading.** A pointer pad (mouse, trackpad, touch) with a few ink colors,
  or an image file. Transparent PNGs keep their transparency; scans and photos on white paper get
  their background stripped automatically, and everything is trimmed to its ink.
- **Placement on the real page.** Drag a signature anywhere on any page, resize it from the corner
  handle, or rotate it up to ±40° to match a signature line. Multiple signatures per document and
  guide lines that snap to the page center and margins.
- **Caption block.** Optionally merge a name, role, and date under the signature.
- **Export to the original PDF.** The signature is embedded as a PNG on top of the existing page, so
  text, links, and form fields stay intact, and the file metadata is updated.
- **Rotated pages handled correctly.** Pages with `/Rotate` 90, 180, or 270 degrees receive the
  signature in the visually correct orientation and position.
- **Undo, redo, and keyboard control.** Arrow keys nudge, `Shift`+arrow moves faster, `Del` removes,
  `Esc` deselects, `Ctrl`/`Cmd`+`Z` undoes.
- **Comfortable on long documents.** Thumbnail rail, lazy rendering, and canvases released once pages
  leave the viewport.
- **Works offline.** Installable PWA with precached assets; every route has its own prerendered HTML.

### Tools

| Tool | What it does |
| --- | --- |
| Gabung PDF | Merge several PDFs into one, order adjustable |
| Pisah PDF | Extract ranges or split into one file per page |
| PDF ke JPG | Render pages to JPG/PNG at selectable resolution |
| JPG ke PDF | Compose photos/scans into a PDF (A4 or image-sized) |
| Kompres PDF | Shrink by re-rasterising at lower resolution |
| Putar PDF | Rotate all/odd/even pages by 90/180/270 |
| Watermark PDF | Text watermark with color, size, opacity, diagonal |
| Isi Formulir PDF | Fill AcroForm text/checkbox/choice fields |
| Tanda Tangan Massal | Stamp one signature onto many PDFs at a fixed position |

Multi-file results are delivered as a single ZIP (browsers block multiple automatic downloads).

## SEO and content

The site is a static multi-page build, not a single-page app:

- Every route is prerendered to its own `index.html` at build time (`scripts/prerender.mjs`), so
  crawlers see real content without JavaScript. React hydrates the markup afterwards.
- Per-route `<title>`, description, canonical, Open Graph, Twitter card, and JSON-LD
  (`SoftwareApplication`, `Article`, `FAQPage`).
- `sitemap.xml`, `robots.txt`, `ads.txt`, and `404.html` are generated on build.
- Content pages: Tentang, Kontak (via email), Privasi, Syarat, FAQ, plus four long-form articles.
- Client-side navigation uses the History API with trailing-slash URLs, matching GitHub Pages.

## Monetisation

Ads are built in but disabled until configured:

- `AdSlot` reserves height, lazy-loads, is labelled "Iklan", and never sits inside the document area
  or next to the download button.
- No ad or analytics script loads before the visitor accepts the cookie notice.
- Set `VITE_ADSENSE_CLIENT` and the `VITE_ADSENSE_SLOT_*` variables at build time to enable them;
  `ads.txt` is then generated from the publisher id.

## Tech stack

- [React 19](https://react.dev/) with TypeScript, hand-rolled router (no runtime dependency)
- [Vite](https://vite.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- [pdf.js](https://mozilla.github.io/pdf.js/) (`pdfjs-dist`) for rendering
- [pdf-lib](https://pdf-lib.js.org/) for editing/exporting
- [Lucide](https://lucide.dev/), Inter and Fraunces
- `vite-plugin-pwa` for offline support

pdf.js and pdf-lib are loaded on demand, so content pages stay small.

## Getting started

Requirements: Node.js 20 or later.

```bash
npm install
npm run dev
```

```bash
npm run build     # typecheck + vite build + prerender all routes
npm run preview   # preview the production build (serves per-route HTML)
```

## Environment variables (build time)

All optional; the site works without them.

| Variable | Purpose |
| --- | --- |
| `BASE_PATH` | Sub-path for project pages, e.g. `/ttd-pdf/` |
| `VITE_SITE_URL` | Absolute site URL; enables canonical, OG URLs, and `sitemap.xml` |
| `VITE_ADSENSE_CLIENT` | `ca-pub-...`; enables ad slots and `ads.txt` |
| `VITE_ADSENSE_SLOT_CONTENT` / `_SIDEBAR` / `_ANCHOR` | Ad unit ids per placement |
| `VITE_ANALYTICS_SCRIPT` | GA4/Plausible/Umami script URL (loaded only after consent) |
| `VITE_ANALYTICS_DOMAIN` | Measurement id or domain for the analytics provider |

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds, runs unit tests, verifies the prerendered output, and
publishes `dist/`. For a project page it derives `BASE_PATH` from the repo name automatically; for a
custom domain set the repository variables `BASE_PATH=/` and `VITE_SITE_URL=https://your-domain`.
The workflow defaults `VITE_SITE_URL` to `https://ilyasistiqama.github.io/pdfkit-id`, so canonical
URLs and the sitemap are generated without configuring repository variables.
Also enable **Settings → Pages → Source: GitHub Actions**.

## Tests

```bash
npm test                            # unit tests
npm run test:dev                     # dev routes and Vite bootstrap modules
npm run build && npm run test:e2e        # signing flow in headless Chrome
npm run build && node scripts/e2e-tools.mjs   # every PDF tool in headless Chrome
```

The e2e scripts start `vite preview`, drive Chrome over the DevTools Protocol, and verify outputs
with `pdfinfo`/`pdftoppm`/`unzip` when installed.

## How placement works

A signature is stored as a fraction of the visible page width and height (`x`, `y`, `w` in `0..1`),
a tilt in degrees, and the image aspect ratio. Fractions keep the position stable across zoom levels
and let the same data drive both the on-screen overlay and the PDF export.

On export, the fraction is converted to PDF points using the page's visible size (swapped for 90/270
degree rotation), then back into the page's unrotated coordinate space. See `src/core/geometry.ts`.

## Privacy

Everything happens in the browser. Signatures are kept in `localStorage` on the device; the toggle
next to saved signatures turns that off and clears the data. PDFs are never sent anywhere. Ads and
analytics are the only third-party scripts, and they load only after cookie consent.

## Limitations

- This produces an **electronic signature image**, not a certified digital signature.
- Password-protected PDFs open through a password prompt; the export cannot re-encrypt, so the
  downloaded copy is unencrypted.
- Compression re-rasterises pages, so text stops being selectable.
- Export adds an image layer; it does not remove or alter existing content.

## Project layout

```
src/
  App.tsx           router + page shell (prerendered per route)
  router.tsx        History API router, Link, usePath
  prerender.tsx     SSR entry used by scripts/prerender.mjs
  site/
    routes.ts       single source of truth: routes, tools, articles, metadata
    site.ts       site identity, base path, canonical helpers
    head.ts, useSeo.ts   per-route meta tags and JSON-LD
    consent.ts, analytics.ts, ads.ts
  core/
    geometry.ts     coordinate mapping (fractions → PDF points, rotation, tilt, snapping)
    image.ts        canvas trimming, background removal, caption composition
    exportPdf.ts    stamps signatures into the PDF
    pdfOps.ts       merge, split, rotate, watermark, images→PDF, forms
    raster.ts       PDF page → image, re-assemble compressed PDF
    zip.ts          dependency-free ZIP writer for multi-file downloads
    download.ts     download helpers
  web/
    components/     signing workspace, viewer, signature pad/upload, dialogs
    site/           header, footer, ad slot, consent notice, content pages
    tools/          one component per PDF tool
    sign/           the signing workspace screen
scripts/
  prerender.mjs     writes per-route HTML, sitemap, robots, 404, ads.txt
  e2e.mjs           signing flow e2e
  e2e-tools.mjs     every tool e2e
docs/
  rencana-monetisasi-iklan.md   monetisation plan
  catatan-kerja-lanjutan.md     what is done vs. what waits for a VPS/domain
```
# pdfkit-id
