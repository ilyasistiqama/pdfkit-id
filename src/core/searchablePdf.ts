import {
  beginText, endText, PDFDocument, popGraphicsState, pushGraphicsState, setFontAndSize,
  setTextMatrix, setTextRenderingMode, showText, StandardFonts, TextRenderingMode, type PDFPage,
} from 'pdf-lib'
import type { PDFPageProxy } from 'pdfjs-dist'
import { loadPdf } from './pdf'
import { renderPdfCanvas } from './pdfCanvas'
import { readScanLines, withOcrWorker, type OcrLanguage } from './photoOcr'

export async function makeSearchablePdf(
  bytes: Uint8Array, language: OcrLanguage, signal: AbortSignal,
  onProgress: (page: number, total: number, progress?: number) => void,
) {
  const source = await loadPdf(bytes)
  let added = 0
  let existing = 0
  try {
    const output = await PDFDocument.load(bytes, { updateMetadata: false })
    const pages = output.getPages()
    const scan: { page: PDFPage; original: PDFPageProxy; index: number }[] = []
    for (const [index, page] of pages.entries()) {
      signal.throwIfAborted()
      onProgress(index + 1, pages.length)
      const original = await source.doc.getPage(index + 1)
      const text = await original.getTextContent()
      if (text.items.some((item) => 'str' in item && /[\p{L}\p{N}]/u.test(item.str))) existing++
      else scan.push({ page, original, index })
    }
    if (!scan.length) return { bytes, added, existing, unreadable: 0 }
    const font = await output.embedFont(StandardFonts.Helvetica)
    const chars = new Set(font.getCharacterSet())
    let active = 0
    await withOcrWorker(language, signal, (progress) => onProgress(active, pages.length, progress), async (worker) => {
      for (const { index, original, page } of scan) {
        signal.throwIfAborted()
        active = index + 1
        onProgress(active, pages.length)
        const { canvas, viewport } = await renderPdfCanvas(original, 2400, signal)
        try {
          const lines = await readScanLines(worker, canvas)
          signal.throwIfAborted()
          let fontKey: ReturnType<typeof page.node.newFontDictionary> | undefined
          for (const line of lines) {
            const text = Array.from(line.text.normalize('NFC'), (character) =>
              chars.has(character.codePointAt(0) ?? 0) ? character : ' ').join('').trim()
            if (!text || line.x1 <= line.x0) continue
            const [x, y] = viewport.convertToPdfPoint(line.x0, line.baseline)
            const [right, bottom] = viewport.convertToPdfPoint(line.x1, line.baseline)
            const [topX, topY] = viewport.convertToPdfPoint(line.x0, line.baseline - Math.max(1, line.height))
            const size = Math.hypot(topX - x, topY - y)
            const textWidth = font.widthOfTextAtSize(text, size)
            if (size <= 0 || textWidth <= 0) continue
            fontKey ??= page.node.newFontDictionary(font.name, font.ref)
            page.pushOperators(pushGraphicsState(), beginText(), setFontAndSize(fontKey, size),
              setTextRenderingMode(TextRenderingMode.Invisible),
              setTextMatrix((right - x) / textWidth, (bottom - y) / textWidth,
                (topX - x) / size, (topY - y) / size, x, y),
              showText(font.encodeText(text)), endText(), popGraphicsState())
          }
          if (fontKey) added++
        } finally {
          canvas.width = 0
          canvas.height = 0
        }
      }
    })
    signal.throwIfAborted()
    return { bytes: added ? await output.save() : bytes, added, existing, unreadable: scan.length - added }
  } finally {
    await source.destroy()
  }
}
