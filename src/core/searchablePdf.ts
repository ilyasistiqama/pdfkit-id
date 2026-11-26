import {
  beginText, endText, PDFDocument, popGraphicsState, pushGraphicsState, setFontAndSize,
  setTextMatrix, setTextRenderingMode, showText, StandardFonts, TextRenderingMode, type PDFPage,
} from 'pdf-lib'
import { OPS, Util, type PDFPageProxy } from 'pdfjs-dist'
import { loadPdf } from './pdf'
import { renderPdfCanvas } from './pdfCanvas'
import { readScanLines, withOcrWorker, type OcrLanguage } from './photoOcr'

type TextItem = Extract<Awaited<ReturnType<PDFPageProxy['getTextContent']>>['items'][number], { str: string }>

async function hasScanImage(page: PDFPageProxy) {
  const { fnArray, argsArray } = await page.getOperatorList()
  return fnArray.some((op, index) => {
    if (op === OPS.paintImageXObject) {
      const [, width, height] = argsArray[index] ?? []
      return Math.min(width, height) >= 300
    }
    if (op === OPS.paintInlineImageXObject) {
      const [image] = argsArray[index] ?? []
      return image && Math.min(image.width, image.height) >= 300
    }
    return false
  })
}

function nativeTextBounds(items: TextItem[], viewport: number[]) {
  return items.map((item) => {
    const [a, b, c, d, x, y] = Util.transform(viewport, item.transform)
    const scale = Math.hypot(viewport[0], viewport[1])
    const horizontal = Math.hypot(a, b) || 1
    const vertical = Math.hypot(c, d) || 1
    const wx = item.width * scale * a / horizontal
    const wy = item.width * scale * b / horizontal
    const hx = item.height * scale * c / vertical
    const hy = item.height * scale * d / vertical
    const corners = [-0.25, 1].flatMap((side) => [[x + hx * side, y + hy * side], [x + wx + hx * side, y + wy + hy * side]])
    return {
      left: Math.min(...corners.map(([value]) => value)), right: Math.max(...corners.map(([value]) => value)),
      top: Math.min(...corners.map(([, value]) => value)), bottom: Math.max(...corners.map(([, value]) => value)),
    }
  })
}

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
    const scan: { page: PDFPage; original: PDFPageProxy; index: number; native: TextItem[] }[] = []
    for (const [index, page] of pages.entries()) {
      signal.throwIfAborted()
      onProgress(index + 1, pages.length)
      const original = await source.doc.getPage(index + 1)
      const text = await original.getTextContent()
      const native = text.items.filter((item): item is TextItem => 'str' in item && /[\p{L}\p{N}]/u.test(item.str))
      const characters = native.reduce((count, item) => count + item.str.replace(/\s/g, '').length, 0)
      // Nomor halaman atau stempel teks singkat dapat menempel pada scan tanpa membuat isi gambar dapat dicari.
      if (native.length && (characters > 120 || !await hasScanImage(original))) existing++
      else scan.push({ page, original, index, native })
    }
    if (!scan.length) return { bytes, added, existing, unreadable: 0 }
    const font = await output.embedFont(StandardFonts.Helvetica)
    const chars = new Set(font.getCharacterSet())
    let active = 0
    await withOcrWorker(language, signal, (progress) => onProgress(active, pages.length, progress), async (worker) => {
      for (const { index, original, page, native } of scan) {
        signal.throwIfAborted()
        active = index + 1
        onProgress(active, pages.length)
        const { canvas, viewport } = await renderPdfCanvas(original, 2400, signal)
        try {
          const bounds = nativeTextBounds(native, viewport.transform)
          const lines = await readScanLines(worker, canvas, ({ x0, y0, x1, y1 }) => bounds.some((box) => {
            const width = Math.max(0, Math.min(box.right, x1) - Math.max(box.left, x0))
            const height = Math.max(0, Math.min(box.bottom, y1) - Math.max(box.top, y0))
            return width * height > (x1 - x0) * (y1 - y0) * 0.55
          }))
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
