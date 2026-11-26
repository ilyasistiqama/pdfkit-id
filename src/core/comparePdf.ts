import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import { renderPdfCanvas } from './pdfCanvas'

export type PageComparison = 'same' | 'changed' | 'removed' | 'added'

async function pageText(page: PDFPageProxy) {
  const { items } = await page.getTextContent()
  return items.map((item) => 'str' in item ? item.str : '').join(' ').normalize('NFC').replace(/\s+/g, ' ').trim()
}

async function interactions(doc: PDFDocumentProxy, page: PDFPageProxy) {
  const annotations = await page.getAnnotations()
  const entries = await Promise.all(annotations.map(async ({ subtype, rect, url, unsafeUrl, dest, action, fieldName, fieldType, fieldValue, exportValue }) => {
    if (subtype === 'Widget') return JSON.stringify([subtype, rect, fieldName, fieldType, fieldValue, exportValue])
    if (subtype !== 'Link') return ''
    let target = dest
    try {
      if (typeof target === 'string') target = await doc.getDestination(target) ?? target
      if (Array.isArray(target) && typeof target[0]?.num === 'number') {
        target = [await doc.getPageIndex(target[0]), ...target.slice(1)]
      }
    } catch {
      // Jika referensi tidak dapat diurai, bandingkan data tujuan yang tersedia.
    }
    return JSON.stringify([subtype, rect, url ?? unsafeUrl, target, action])
  }))
  return entries.filter(Boolean).sort().join('\n')
}

async function pixels(page: PDFPageProxy, signal: AbortSignal) {
  const { canvas } = await renderPdfCanvas(page, 480, signal)
  try {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas tidak bisa dibaca.')
    return ctx.getImageData(0, 0, canvas.width, canvas.height)
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}

export async function comparePdfPage(before: PDFDocumentProxy, after: PDFDocumentProxy, number: number, signal: AbortSignal): Promise<PageComparison> {
  signal.throwIfAborted()
  if (number > before.numPages) return 'added'
  if (number > after.numPages) return 'removed'

  const [left, right] = await Promise.all([before.getPage(number), after.getPage(number)])
  signal.throwIfAborted()
  const a = left.getViewport({ scale: 1 })
  const b = right.getViewport({ scale: 1 })
  if (a.width !== b.width || a.height !== b.height) return 'changed'

  const [leftText, rightText, leftLinks, rightLinks] = await Promise.all([
    pageText(left), pageText(right), interactions(before, left), interactions(after, right),
  ])
  signal.throwIfAborted()
  if (leftText !== rightText || leftLinks !== rightLinks) return 'changed'

  const [leftImage, rightImage] = await Promise.all([pixels(left, signal), pixels(right, signal)])
  if (leftImage.width !== rightImage.width || leftImage.height !== rightImage.height) return 'changed'
  return leftImage.data.some((value, index) => value !== rightImage.data[index]) ? 'changed' : 'same'
}
