import type { Caption } from './types'

const MAX_WIDTH = 900
const ALPHA_CUTOFF = 12

export type SignatureImage = { dataUrl: string; aspect: number }

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

function context(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak didukung browser ini.')
  return ctx
}

/**
 * PNG hasil scan/foto biasanya berlatar putih. Piksel diubah jadi transparan
 * berdasarkan tingkat kecerahan, warna tinta tetap dipertahankan.
 */
export function removeWhiteBackground(source: HTMLCanvasElement) {
  const ctx = context(source)
  const image = ctx.getImageData(0, 0, source.width, source.height)
  const { data } = image
  for (let i = 0; i < data.length; i += 4) {
    // piksel yang memang sudah transparan jangan dianggap tinta hitam
    if (data[i + 3] === 0) continue
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const alpha = ((255 - luma) * data[i + 3]) / 255
    if (alpha <= ALPHA_CUTOFF) {
      data[i + 3] = 0
      continue
    }
    // kembalikan warna asli setelah alpha dikomposit di atas putih
    const k = 255 / alpha
    const fade = 255 * (1 - alpha / 255)
    data[i] = Math.max(0, Math.min(255, (data[i] - fade) * k))
    data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - fade) * k))
    data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - fade) * k))
    data[i + 3] = alpha
  }
  ctx.putImageData(image, 0, 0)
}

/** Gambar yang sudah punya transparansi tidak perlu dihapus latarnya. */
function hasTransparency(source: HTMLCanvasElement, stride = 17) {
  const { data } = context(source).getImageData(0, 0, source.width, source.height)
  let samples = 0
  let transparent = 0
  for (let i = 3; i < data.length; i += 4 * stride) {
    samples++
    if (data[i] < 250) transparent++
  }
  return samples > 0 && transparent / samples > 0.01
}

/** Buang area transparan di sekeliling gambar, sisakan sedikit margin. */
export function trimCanvas(source: HTMLCanvasElement, pad = 6) {
  const ctx = context(source)
  const { data } = ctx.getImageData(0, 0, source.width, source.height)
  let left = source.width
  let top = source.height
  let right = -1
  let bottom = -1

  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      if (data[(y * source.width + x) * 4 + 3] > ALPHA_CUTOFF) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }

  if (right < left || bottom < top) return null

  left = Math.max(0, left - pad)
  top = Math.max(0, top - pad)
  right = Math.min(source.width - 1, right + pad)
  bottom = Math.min(source.height - 1, bottom + pad)

  const width = right - left + 1
  const height = bottom - top + 1
  const canvas = createCanvas(width, height)
  context(canvas).drawImage(source, left, top, width, height, 0, 0, width, height)
  return canvas
}

/** Kanvas (mis. pad tanda tangan) -> PNG transparan yang sudah dipangkas. */
export function canvasToSignature(source: HTMLCanvasElement): SignatureImage | null {
  const trimmed = trimCanvas(source)
  if (!trimmed) return null

  const scale = Math.min(1, MAX_WIDTH / trimmed.width)
  const width = Math.round(trimmed.width * scale)
  const height = Math.round(trimmed.height * scale)
  const canvas = createCanvas(width, height)
  const ctx = context(canvas)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(trimmed, 0, 0, width, height)

  return { dataUrl: canvas.toDataURL('image/png'), aspect: width / height }
}

/** File gambar (PNG/JPG) -> PNG transparan yang sudah dipangkas. */
export async function fileToSignature(file: File, dropBackground: boolean) {
  const bitmap = await createImageBitmap(file)
  const canvas = createCanvas(bitmap.width, bitmap.height)
  const ctx = context(canvas)
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  if (dropBackground && !hasTransparency(canvas)) removeWhiteBackground(canvas)
  return canvasToSignature(canvas)
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Gambar tidak bisa dibuka.'))
    image.src = src
  })
}

/**
 * Gabungkan tanda tangan dengan blok keterangan (nama, jabatan, tanggal)
 * supaya hasilnya terlihat seperti tanda tangan pada dokumen resmi.
 */
export async function withCaption(
  signature: SignatureImage,
  caption: Caption,
): Promise<SignatureImage> {
  const image = await loadImage(signature.dataUrl)
  const width = image.width
  const padX = Math.round(width * 0.02)
  const nameSize = Math.round(Math.min(44, Math.max(20, width * 0.045)))
  const smallSize = Math.round(nameSize * 0.76)
  const gap = Math.round(width * 0.022)

  const lines: Array<{ text: string; size: number; weight: string; color: string }> = []
  if (caption.name.trim())
    lines.push({ text: caption.name.trim(), size: nameSize, weight: '600', color: '#1b1915' })
  if (caption.role.trim())
    lines.push({ text: caption.role.trim(), size: smallSize, weight: '400', color: '#6f685c' })
  if (caption.date.trim())
    lines.push({ text: caption.date.trim(), size: smallSize, weight: '400', color: '#8b8478' })
  if (!lines.length) return signature

  const lineHeight = (size: number) => Math.round(size * 1.36)
  const textHeight = lines.reduce((total, line) => total + lineHeight(line.size), 0)

  const canvas = createCanvas(width + padX * 2, image.height + gap + Math.round(gap * 0.7) + textHeight)
  const ctx = context(canvas)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, padX, 0)

  const ruleY = image.height + Math.round(gap * 0.4)
  ctx.fillStyle = '#ddd6c9'
  ctx.fillRect(padX, ruleY, width, Math.max(1, Math.round(width * 0.004)))

  let y = ruleY + Math.round(gap * 0.9)
  ctx.textBaseline = 'top'
  for (const line of lines) {
    ctx.fillStyle = line.color
    ctx.font = `${line.weight} ${line.size}px system-ui, -apple-system, "Segoe UI", sans-serif`
    ctx.fillText(line.text, padX, y, width)
    y += lineHeight(line.size)
  }

  return { dataUrl: canvas.toDataURL('image/png'), aspect: canvas.width / canvas.height }
}
