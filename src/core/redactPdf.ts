import { PDFDocument } from 'pdf-lib'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { canvasPng, renderPdfCanvas } from './pdfCanvas'

export type Redaction = { left: number; top: number; right: number; bottom: number }

/** Bangun PDF baru dari piksel yang sudah disensor. Dokumen sumber tidak disalin. */
export async function redactPdf(
  source: PDFDocumentProxy,
  areas: Record<number, Redaction[]>,
  signal: AbortSignal,
  onProgress: (page: number, total: number) => void,
) {
  if (!Object.values(areas).some((page) => page.length)) throw new Error('Tandai minimal satu area.')
  const output = await PDFDocument.create()
  for (let index = 1; index <= source.numPages; index++) {
    signal.throwIfAborted()
    onProgress(index, source.numPages)
    const { canvas, original } = await renderPdfCanvas(await source.getPage(index), 2100, signal)
    try {
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas tidak didukung browser ini.')
      context.fillStyle = '#000'
      for (const area of areas[index] ?? []) {
        // Beri dua piksel ekstra untuk pembulatan antara pratinjau dan resolusi unduh.
        const x = Math.floor(area.left * canvas.width) - 2
        const y = Math.floor(area.top * canvas.height) - 2
        const right = Math.ceil(area.right * canvas.width) + 2
        const bottom = Math.ceil(area.bottom * canvas.height) + 2
        context.fillRect(x, y, right - x, bottom - y)
      }
      const image = await output.embedPng(await canvasPng(canvas))
      const page = output.addPage([original.width, original.height])
      page.drawImage(image, { x: 0, y: 0, width: original.width, height: original.height })
    } finally {
      canvas.width = 0
      canvas.height = 0
    }
  }
  signal.throwIfAborted()
  return output.save()
}
