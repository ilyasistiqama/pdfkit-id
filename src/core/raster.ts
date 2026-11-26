import { PDFDocument } from 'pdf-lib'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { loadPdf } from './pdf'

export type PageImage = { page: number; blob: Blob; width: number; height: number; pageWidth: number; pageHeight: number }

export type RasterOptions = {
  /** skala relatif terhadap 72 dpi; 2 ≈ 144 dpi */
  scale: number
  format: 'jpeg' | 'png'
  quality: number
}

/** Render halaman PDF menjadi gambar di browser (dipakai PDF → JPG dan kompres). */
export async function rasterizePdf(
  bytes: Uint8Array,
  options: RasterOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<PageImage[]> {
  const session = await loadPdf(bytes)
  try {
    return await rasterizeDocument(session.doc, options, onProgress)
  } finally {
    await session.destroy()
  }
}

export async function rasterizeDocument(
  doc: PDFDocumentProxy, options: RasterOptions, onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<PageImage[]> {
  const images: PageImage[] = []
  for (let index = 1; index <= doc.numPages; index++) {
    signal?.throwIfAborted()
    const page = await doc.getPage(index)
    signal?.throwIfAborted()
    const original = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: options.scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(viewport.width))
    canvas.height = Math.max(1, Math.round(viewport.height))
    const task = page.render({ canvas, viewport, background: options.format === 'jpeg' ? '#fff' : undefined })
    const cancel = () => task.cancel()
    signal?.addEventListener('abort', cancel, { once: true })
    try {
      await task.promise
      signal?.throwIfAborted()
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, `image/${options.format}`, options.quality),
      )
      if (!blob) throw new Error('Halaman PDF tidak bisa disimpan sebagai gambar.')
      images.push({ page: index, blob, width: canvas.width, height: canvas.height,
        pageWidth: original.width, pageHeight: original.height })
      onProgress?.(index, doc.numPages)
    } finally {
      signal?.removeEventListener('abort', cancel)
      canvas.width = 0
      canvas.height = 0
      page.cleanup()
    }
  }
  signal?.throwIfAborted()
  return images
}

/** Susun ulang gambar hasil render menjadi PDF baru (menurunkan ukuran file scan). */
export async function imagesToPdfBlob(
  images: PageImage[],
  title?: string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (const item of images) {
    const data = new Uint8Array(await item.blob.arrayBuffer())
    const embedded =
      item.blob.type === 'image/png' ? await doc.embedPng(data) : await doc.embedJpg(data)
    const { pageWidth: width, pageHeight: height } = item
    const page = doc.addPage([width, height])
    page.drawImage(embedded, { x: 0, y: 0, width, height })
  }
  if (title) doc.setTitle(title)
  doc.setProducer('Tanda Tangan PDF')
  doc.setCreator('Tanda Tangan PDF')
  doc.setModificationDate(new Date())
  return doc.save()
}
