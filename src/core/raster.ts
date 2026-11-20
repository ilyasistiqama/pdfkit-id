import { PDFDocument } from 'pdf-lib'
import { loadPdf } from './pdf'

export type PageImage = { page: number; blob: Blob; width: number; height: number }

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
  const total = session.doc.numPages
  const images: PageImage[] = []

  try {
    for (let index = 1; index <= total; index++) {
      const page = await session.doc.getPage(index)
      const viewport = page.getViewport({ scale: options.scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(viewport.width))
      canvas.height = Math.max(1, Math.round(viewport.height))
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas tidak didukung browser ini.')
      if (options.format === 'jpeg') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      await page.render({ canvas, viewport }).promise

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, `image/${options.format}`, options.quality),
      )
      if (blob) {
        images.push({ page: index, blob, width: canvas.width, height: canvas.height })
      }
      canvas.width = 0
      canvas.height = 0
      onProgress?.(index, total)
    }
  } finally {
    await session.destroy()
  }

  return images
}

/** Susun ulang gambar hasil render menjadi PDF baru (menurunkan ukuran file scan). */
export async function imagesToPdfBlob(
  images: PageImage[],
  title?: string,
  scale = 1,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  // Piksel hasil render dibagi skala supaya halaman kembali ke ukuran fisik aslinya (72 dpi).
  const points = (pixels: number) => Math.max(1, pixels / Math.max(0.1, scale))
  for (const item of images) {
    const data = new Uint8Array(await item.blob.arrayBuffer())
    const embedded =
      item.blob.type === 'image/png' ? await doc.embedPng(data) : await doc.embedJpg(data)
    const width = points(item.width)
    const height = points(item.height)
    const page = doc.addPage([width, height])
    page.drawImage(embedded, { x: 0, y: 0, width, height })
  }
  if (title) doc.setTitle(title)
  doc.setProducer('Tanda Tangan PDF')
  doc.setCreator('Tanda Tangan PDF')
  doc.setModificationDate(new Date())
  return doc.save()
}
