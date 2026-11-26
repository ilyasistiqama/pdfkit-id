import type { Bbox } from 'tesseract.js'
import type { PhotoLine } from './photoLayout'

export interface PhotoGraphic {
  bounds: Bbox
  label: string
}

function clip(bounds: Bbox, width: number, height: number): Bbox {
  return {
    x0: Math.max(0, Math.floor(bounds.x0)),
    y0: Math.max(0, Math.floor(bounds.y0)),
    x1: Math.min(width, Math.ceil(bounds.x1)),
    y1: Math.min(height, Math.ceil(bounds.y1)),
  }
}

function inkBounds({ data, width, height }: ImageData, area: Bbox, threshold: number) {
  const { x0, y0, x1, y1 } = clip(area, width, height)
  const bounds = { x0: x1, y0: y1, x1: x0, y1: y0 }
  let ink = 0
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const index = (y * width + x) * 4
      if (Math.min(data[index], data[index + 1], data[index + 2]) >= threshold) continue
      ink++
      bounds.x0 = Math.min(bounds.x0, x)
      bounds.y0 = Math.min(bounds.y0, y)
      bounds.x1 = Math.max(bounds.x1, x + 2)
      bounds.y1 = Math.max(bounds.y1, y + 2)
    }
  }
  return ink > 0 ? { bounds, ink } : null
}

function pad(bounds: Bbox, padding: number, width: number, height: number) {
  const { x0, y0, x1, y1 } = bounds
  return clip({ x0: x0 - padding, y0: y0 - padding, x1: x1 + padding, y1: y1 + padding }, width, height)
}

export function coversPhotoLine(graphic: PhotoGraphic, line: Pick<PhotoLine, 'bounds'>) {
  if (!line.bounds) return false
  const { x0, y0, x1, y1 } = line.bounds
  const area = graphic.bounds
  const overlap = Math.min(area.x1, x1) - Math.max(area.x0, x0)
  return (y0 + y1) / 2 >= area.y0 && (y0 + y1) / 2 <= area.y1 && overlap >= (x1 - x0) * 0.88
}

export function findColorLogos(pixels: ImageData): PhotoGraphic[] {
  const { data, width, height } = pixels
  const logos: PhotoGraphic[] = []
  for (const [left, right] of [[0.055, 0.27], [0.73, 0.945]]) {
    const area = clip({ x0: width * left, x1: width * right, y0: height * 0.035, y1: height * 0.2 }, width, height)
    const bounds = { x0: area.x1, y0: area.y1, x1: area.x0, y1: area.y0 }
    let count = 0
    for (let y = area.y0; y < area.y1; y += 2) {
      for (let x = area.x0; x < area.x1; x += 2) {
        const index = (y * width + x) * 4
        const min = Math.min(data[index], data[index + 1], data[index + 2])
        const max = Math.max(data[index], data[index + 1], data[index + 2])
        if (max - min < 48 || min > 166) continue
        count++
        bounds.x0 = Math.min(bounds.x0, x)
        bounds.x1 = Math.max(bounds.x1, x + 2)
        bounds.y0 = Math.min(bounds.y0, y)
        bounds.y1 = Math.max(bounds.y1, y + 2)
      }
    }
    const span = bounds.x1 - bounds.x0
    const tall = bounds.y1 - bounds.y0
    if (span < width * 0.027 || span > width * 0.18 || tall < height * 0.019 || tall > height * 0.095 ||
      count * 4 < span * tall * 0.27) continue
    const window = pad(bounds, width * 0.009, width, height)
    const ink = inkBounds(pixels, window, 137)
    logos.push({ bounds: pad(ink?.bounds ?? bounds, 3, width, height), label: 'Logo kop surat' })
  }
  return logos
}

export function findPhotoGraphics(pixels: ImageData, lines: PhotoLine[], rules: Bbox[], stamp: Bbox | null, logos: PhotoGraphic[]) {
  const { width, height } = pixels
  const result = [...logos]
  const heading = lines.flatMap(({ bounds }) => (
    bounds && bounds.y0 < height * 0.2 && bounds.y1 < (rules[0]?.y0 ?? height * 0.2) &&
    Math.abs((bounds.x0 + bounds.x1) / 2 - width / 2) < width * 0.07 ? [bounds] : []
  ))

  if (heading.length) {
    const y0 = Math.min(...heading.map((line) => line.y0)) - height * 0.014
    const y1 = Math.min((rules[0]?.y0 ?? height * 0.21) - height * 0.005,
      Math.max(...heading.map((line) => line.y1)) + height * 0.012)
    const areas = [
      { x0: width * 0.06, x1: Math.min(...heading.map((line) => line.x0)) - width * 0.028, y0, y1 },
      { x0: Math.max(...heading.map((line) => line.x1)) + width * 0.028, x1: width * 0.94, y0, y1 },
    ]
    for (const area of areas) {
      if (area.x1 - area.x0 < width * 0.045) continue
      const found = inkBounds(pixels, area, 125)
      if (!found) continue
      const { bounds, ink } = found
      if (bounds.y1 - bounds.y0 < height * 0.018 || bounds.x1 - bounds.x0 < width * 0.023 ||
        ink * 4 < width * height * 0.00055) continue
      const graphic = { bounds: pad(bounds, 4, width, height), label: 'Logo kop surat' }
      if (!logos.some((logo) => coversPhotoLine(graphic, logo)) &&
        !lines.some((line) => coversPhotoLine(graphic, line))) result.push(graphic)
    }
  }

  if (stamp) {
    const area = {
      x0: stamp.x0 - width * 0.025, x1: stamp.x1 + width * 0.24,
      y0: stamp.y0 - height * 0.003, y1: stamp.y1 + height * 0.025,
    }
    const found = inkBounds(pixels, area, 135)
    if (found) {
      const bounds = found.bounds
      bounds.x0 = Math.min(bounds.x0, stamp.x0)
      bounds.x1 = Math.max(bounds.x1, stamp.x1)
      bounds.y0 = Math.min(bounds.y0, stamp.y0)
      bounds.y1 = Math.max(bounds.y1, stamp.y1)
      // Sertakan seluruh baris yang menyentuh cap agar teks cetak tidak terpotong.
      for (const line of lines) {
        if (!line.bounds) continue
        const row = line.bounds
        const overlap = Math.min(bounds.x1, row.x1) - Math.max(bounds.x0, row.x0)
        if (row.y0 > stamp.y0 - height * 0.027 && row.y0 < bounds.y1 && row.y1 > bounds.y0 &&
          overlap >= (row.x1 - row.x0) * 0.88) {
          bounds.x0 = Math.min(bounds.x0, row.x0)
          bounds.x1 = Math.max(bounds.x1, row.x1)
          bounds.y0 = Math.min(bounds.y0, row.y0)
          bounds.y1 = Math.max(bounds.y1, row.y1)
        }
      }
      result.push({ bounds: pad(bounds, 6, width, height), label: 'Tanda tangan dan stempel' })
    }
  }
  return result
}

export async function readPhotoGraphic(source: HTMLCanvasElement, graphic: PhotoGraphic) {
  const { x0, y0, x1, y1 } = graphic.bounds
  const canvas = document.createElement('canvas')
  canvas.width = x1 - x0
  canvas.height = y1 - y0
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Bagian gambar belum bisa diproses.')
  try {
    context.drawImage(source, x0, y0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    const { data } = image
    const counts = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)]
    let sampleCount = 0
    for (let index = 0; index < data.length; index += 16) {
      for (let channel = 0; channel < 3; channel++) counts[channel][data[index + channel]]++
      sampleCount++
    }
    // Putihkan warna kertas agar potongan menyatu dengan halaman Word.
    const paper = counts.map((channel) => {
      let total = 0
      return Math.max(120, channel.findIndex((count) => (total += count) >= sampleCount * 0.77))
    })
    for (let index = 0; index < data.length; index += 4) {
      for (let channel = 0; channel < 3; channel++) {
        data[index + channel] = Math.min(255, data[index + channel] * 270 / paper[channel])
      }
      if (Math.min(data[index], data[index + 1], data[index + 2]) >= 244) data[index + 3] = 0
    }
    context.putImageData(image, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Bagian gambar belum bisa disimpan.')
    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}
