import type { PDFPageProxy } from 'pdfjs-dist'

export async function renderPdfCanvas(page: PDFPageProxy, longEdge: number, signal?: AbortSignal, turn = 0) {
  signal?.throwIfAborted()
  const rotation = (page.rotate + turn + 360) % 360
  const original = page.getViewport({ scale: 1, rotation })
  const viewport = page.getViewport({ scale: longEdge / Math.max(original.width, original.height), rotation })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(viewport.width))
  canvas.height = Math.max(1, Math.ceil(viewport.height))
  const task = page.render({ canvas, viewport, background: '#fff' })
  const cancel = () => task.cancel()
  signal?.addEventListener('abort', cancel, { once: true })
  try {
    await task.promise
    signal?.throwIfAborted()
    return { canvas, viewport, original }
  } catch (error) {
    canvas.width = 0
    canvas.height = 0
    throw error
  } finally {
    signal?.removeEventListener('abort', cancel)
  }
}

export async function canvasPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Halaman PDF tidak bisa disimpan sebagai gambar.')
  return new Uint8Array(await blob.arrayBuffer())
}
