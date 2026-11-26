import { PDFDocument } from 'pdf-lib'
import { loadPdf } from './pdf'
import { imagesToPdfBlob, rasterizeDocument } from './raster'

type CompressionMode = 'original' | 'retain' | 'image'
export type CompressedPdf = { bytes: Uint8Array; mode: CompressionMode }
type RasterPreset = { scale: number; quality: number }

const targetPresets: RasterPreset[] = [
  { scale: 2, quality: 0.92 },
  { scale: 1.5, quality: 0.8 },
  { scale: 1.2, quality: 0.7 },
  { scale: 1, quality: 0.58 },
  { scale: 0.72, quality: 0.42 },
]

export async function compressPdf(bytes: Uint8Array, options: {
  title: string
  method: 'retain' | 'image'
  target?: number
  preset: RasterPreset
  signal: AbortSignal
  onProgress: (done: number, total: number) => void
}): Promise<CompressedPdf> {
  const { title, method, target, preset, signal, onProgress } = options
  let best: CompressedPdf = { bytes, mode: 'original' }
  if (target !== undefined && bytes.length <= target) {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false })
    if (!doc.getPageCount()) throw new Error('PDF tidak berisi halaman.')
    return best
  }

  if (method === 'retain' || target !== undefined) {
    try {
      const doc = await PDFDocument.load(bytes, { updateMetadata: false })
      if (!doc.getPageCount()) throw new Error('PDF tidak berisi halaman.')
      const optimized = await doc.save({ useObjectStreams: true, updateFieldAppearances: false })
      if (optimized.length < best.bytes.length) best = { bytes: optimized, mode: 'retain' }
    } catch (error) {
      if (method === 'retain') throw error
    }
    signal.throwIfAborted()
    if (method === 'retain' || (target !== undefined && best.bytes.length <= target)) return best
  }

  const presets = target === undefined ? [preset] : targetPresets
  const source = await loadPdf(bytes)
  try {
    for (const [pass, candidate] of presets.entries()) {
      signal.throwIfAborted()
      const images = await rasterizeDocument(source.doc, { ...candidate, format: 'jpeg' },
        (done, total) => onProgress(pass * total + done, presets.length * total), signal)
      const rasterized = await imagesToPdfBlob(images, title)
      signal.throwIfAborted()
      if (rasterized.length < best.bytes.length) best = { bytes: rasterized, mode: 'image' }
      if (target !== undefined && best.bytes.length <= target) break
    }
    return best
  } finally {
    await source.destroy()
  }
}
