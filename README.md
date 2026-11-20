# Tanda Tangan PDF

A browser-only tool for signing PDF documents. Draw a signature with the mouse or a finger, or import
an existing signature image (PNG/JPG), place it directly on any page of the document, then download a
signed copy. Nothing is uploaded to a server.

**Live app:** _add your deployment URL here_

## Features

- **Sign by drawing or by uploading.** A pointer pad (mouse, trackpad, touch) with a few ink colors,
  or an image file. Transparent PNGs keep their transparency; scans and photos on white paper get
  their background stripped automatically, and everything is trimmed to its ink.
- **Placement on the real page.** Drag a signature anywhere on any page, resize it from the corner
  handle, or rotate it up to ±40° to match a signature line. Multiple signatures per document and
  guide lines that snap to the page center and margins.
- **Caption block.** Optionally merge a name, role, and date under the signature so the result looks
  like a signature on a formal document.
- **Export to the original PDF.** The document is not re-rendered or flattened. The signature is
  embedded as a PNG on top of the existing page, so text, links, and form fields stay intact, and the
  file metadata is updated.
- **Rotated pages handled correctly.** Pages with `/Rotate` 90, 180, or 270 degrees receive the
  signature in the visually correct orientation and position.
- **Undo, redo, and keyboard control.** Arrow keys nudge the selected signature, `Shift`+arrow moves
  faster, `Del` removes it, `Esc` deselects, `Ctrl`/`Cmd`+`Z` undoes.
- **Comfortable on long documents.** A thumbnail rail for jumping between pages, lazy rendering, and
  canvases released once pages leave the viewport so memory stays bounded.
- **Works offline.** Installable PWA with precached assets; the pdf.js worker is cached too.
- **Runs entirely client-side.** No upload endpoint, no account, no analytics.

## Tech stack

- [React 19](https://react.dev/) with TypeScript
- [Vite](https://vite.dev/) and [Tailwind CSS v4](https://tailwindcss.com/)
- [pdf.js](https://mozilla.github.io/pdf.js/) (`pdfjs-dist`) for rendering pages on screen
- [pdf-lib](https://pdf-lib.js.org/) for embedding the signature into the original PDF
- [Lucide](https://lucide.dev/) icons, plus Inter and Fraunces typefaces
- `vite-plugin-pwa` for offline support

pdf.js and pdf-lib are loaded on demand, so the landing page ships only the shell (~90 KB gzipped).

## Getting started

Requirements: Node.js 20 or later.

```bash
npm install
npm run dev
```

Then open the printed local URL.

```bash
npm run build     # production build in dist/
npm run preview   # preview the production build
```

## Tests

```bash
npm test                       # unit tests (coordinate mapping, snapping)
npm run build && npm run test:e2e   # end-to-end in headless Chrome
```

The e2e script starts `vite preview` itself, drives Chrome over the DevTools Protocol, and checks the
whole flow: open a PDF, draw, place, drag, rotate, export, then verify the exported file with
`pdfinfo`/`pdftoppm` when they are installed. Set `E2E_KEEP=1` to keep the temporary artifacts.

## How placement works

A signature is stored as a fraction of the visible page width and height (`x`, `y`, `w` in `0..1`),
a tilt in degrees, and the image aspect ratio. Fractions keep the position stable across zoom levels
and let the same data drive both the on-screen overlay and the PDF export.

On export, the fraction is converted to PDF points using the page's visible size (swapped for 90/270
degree rotation). The resulting box is converted back into the page's unrotated coordinate space —
including the image rotation that keeps it upright, and the extra rotation for a tilted signature —
before `page.drawImage` is called. See `src/core/geometry.ts`; the unit tests verify the mapping by
mapping the four image corners forward and back for every rotation and tilt.

## Privacy

Everything happens in the browser. Signatures are kept in `localStorage` on the device so they survive
a reload; the toggle next to the saved signatures turns that off and clears the stored data. PDFs are
never sent anywhere.

## Limitations

- This produces an **electronic signature image**, not a certified digital signature. It has no
  cryptographic binding to the document and no certificate or audit trail. For legally certified
  signatures in Indonesia, use a registered PSrE provider.
- Password-protected PDFs are supported through a password prompt; the export cannot re-encrypt a
  file, so the downloaded copy is unencrypted.
- Export adds an image layer; it does not remove or alter existing content.

## Project layout

```
src/
  core/
    geometry.ts     coordinate mapping (fractions → PDF points, page rotation, tilt, snapping)
    image.ts        canvas trimming, background removal, caption composition, PNG output
    exportPdf.ts    stamps signatures into the PDF with pdf-lib
    pdf.ts          pdf.js loading with password support
    id.ts           UUID helper with fallback for insecure contexts
    types.ts        shared types
  web/
    components/     Landing, Workspace, PdfViewer, signature pad/upload, dialogs
    signatureStore.ts  localStorage persistence for saved signatures
    useHistory.ts   undo/redo state
    ui.ts           shared Tailwind class strings
scripts/
  e2e.mjs           headless Chrome end-to-end suite
```
