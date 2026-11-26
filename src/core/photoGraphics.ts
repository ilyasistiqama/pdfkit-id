import type { Bbox } from 'tesseract.js'
import type { PhotoLine } from './photoLayout'

export interface PhotoGraphic {
  bounds: Bbox
  label: string
  ink?: { kind: 'stamp' | 'signature'; paper: number[]; dye: StampDye; textAreas: Bbox[] }
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

export function obscuresPhotoText(graphic: PhotoGraphic, line: PhotoLine) {
  return !graphic.ink && coversPhotoLine(graphic, line)
}

function paperColor(data: Uint8ClampedArray, width: number, area: Bbox) {
  const counts = Array.from({ length: 3 }, () => new Uint32Array(256))
  let samples = 0
  for (let y = area.y0; y < area.y1; y += 3) {
    for (let x = area.x0; x < area.x1; x += 3) {
      const index = (y * width + x) * 4
      for (let channel = 0; channel < counts.length; channel++) counts[channel][data[index + channel]]++
      samples++
    }
  }
  return counts.map((channel) => {
    let total = 0
    return Math.max(120, channel.findIndex((count) => (total += count) >= samples * 0.77))
  })
}

type Ink = NonNullable<PhotoGraphic['ink']>

type StampDye = {
  density: number[]
  darkest: number
  lightest: number
  middle: number
}

function channelLoss(value: number, paper: number) {
  return Math.max(0, 255 - value * 255 / paper)
}

function learnStampDye(data: Uint8ClampedArray, width: number, area: Bbox, paper: number[]): StampDye | null {
  const sums = [0, 0, 0]
  let weight = 0
  for (let y = area.y0; y < area.y1; y += 2) {
    for (let x = area.x0; x < area.x1; x += 2) {
      const pixel = (y * width + x) * 4
      const loss = [channelLoss(data[pixel], paper[0]), channelLoss(data[pixel + 1], paper[1]),
        channelLoss(data[pixel + 2], paper[2])]
      const max = Math.max(...loss)
      const min = Math.min(...loss)
      const chroma = max - min
      if (chroma < 25 || min > 128) continue
      for (let channel = 0; channel < 3; channel++) sums[channel] += loss[channel] / max * chroma
      weight += chroma
    }
  }
  if (!weight) return null
  const density = sums.map((value) => value / Math.max(...sums))
  const [lightest, middle, darkest] = [0, 1, 2].sort((left, right) => density[left] - density[right])
  if (density[darkest] - density[lightest] < 0.18) return null
  return { density, darkest, middle, lightest }
}

function unit(value: number) {
  return Math.max(0, Math.min(1, value))
}

function inkAlpha(kind: Ink['kind'], loss: number[], dye: StampDye, inText: boolean) {
  const { density, darkest, middle, lightest } = dye
  // Belajar warna cap dari foto, lalu pisahkan penggelapan netral dari perubahan warna tinta.
  const chroma = loss[darkest] - loss[lightest]
  const amount = chroma / (density[darkest] - density[lightest])
  const residual = Math.abs(loss[middle] - loss[lightest] - amount * (density[middle] - density[lightest]))
  const hueMatch = unit(1 - Math.max(0, residual - 7) / 26)
  const stamp = Math.min(255, Math.max(0, amount) * unit((chroma - 11) / 16) * hueMatch)
  const coloredLoss = stamp * density[lightest]
  const neutral = (loss[lightest] - coloredLoss) / Math.max(0.12, 1 - coloredLoss / 255)
  if (kind === 'stamp') {
    const visible = Math.min(255, Math.max(0, (chroma - 14) * 14)) * hueMatch * unit((145 - loss[lightest]) / 23)
    return inText ? visible * unit((116 - neutral) / 36) : visible
  }
  if (inText) return 0
  const background = 17 + 39 * unit((chroma - 10) / 28)
  return Math.max(0, Math.min(255, (neutral - background) * 255 / (255 - background)))
}

function insideArea(areas: Bbox[], x: number, y: number) {
  return areas.some((area) => x >= area.x0 && x < area.x1 && y >= area.y0 && y < area.y1)
}

function inkMask(data: Uint8ClampedArray, stride: number, area: Bbox, ink: Ink, originX = 0, originY = 0) {
  const width = area.x1 - area.x0
  const height = area.y1 - area.y0
  const alpha = new Uint8ClampedArray(width * height)
  const loss = [0, 0, 0]
  for (let y = area.y0; y < area.y1; y++) {
    for (let x = area.x0; x < area.x1; x++) {
      const source = ((y - originY) * stride + x - originX) * 4
      for (let channel = 0; channel < 3; channel++) loss[channel] = channelLoss(data[source + channel], ink.paper[channel])
      alpha[(y - area.y0) * width + x - area.x0] = inkAlpha(ink.kind, loss, ink.dye, insideArea(ink.textAreas, x, y))
    }
  }
  if (ink.kind === 'stamp') return alpha

  // Pertahankan tepi tipis yang bersambung dengan tinta gelap, tanpa membawa bayangan cap yang tersebar.
  const supported = new Uint8Array(alpha.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alpha[y * width + x] < 85) continue
      let neighbors = 0
      for (let cy = Math.max(0, y - 1); cy <= Math.min(height - 1, y + 1); cy++) {
        for (let cx = Math.max(0, x - 1); cx <= Math.min(width - 1, x + 1); cx++) {
          if (alpha[cy * width + cx] >= 85) neighbors++
        }
      }
      if (neighbors < 4) continue
      for (let nearY = Math.max(0, y - 4); nearY <= Math.min(height - 1, y + 4); nearY++) {
        supported.fill(1, nearY * width + Math.max(0, x - 4), nearY * width + Math.min(width, x + 5))
      }
    }
  }
  for (let index = 0; index < alpha.length; index++) {
    if (!supported[index]) alpha[index] = 0
  }
  return alpha
}

function footerGraphics({ data, width, height }: ImageData, stamp: Bbox, lines: PhotoLine[]): PhotoGraphic[] {
  const search = clip({
    x0: stamp.x0 - width * 0.026, y0: stamp.y0 - height * 0.012,
    x1: stamp.x1 + width * 0.24, y1: stamp.y1 + height * 0.025,
  }, width, height)
  const paper = paperColor(data, width, search)
  const textAreas = lines.flatMap(({ bounds }) => {
    if (!bounds || bounds.x0 >= search.x1 || bounds.x1 <= search.x0 ||
      bounds.y0 >= search.y1 || bounds.y1 <= search.y0) return []
    const padding = Math.max(2, (bounds.y1 - bounds.y0) * 0.29)
    return [pad(bounds, padding, width, height)]
  })
  const stampWindow = pad(stamp, width * 0.024, width, height)
  const dye = learnStampDye(data, width, stampWindow, paper)
  if (!dye) return []
  const result: PhotoGraphic[] = []
  for (const kind of ['stamp', 'signature'] as const) {
    const area = kind === 'stamp' ? stampWindow : search
    const ink = { kind, paper, dye, textAreas }
    const mask = inkMask(data, width, area, ink)
    const stride = area.x1 - area.x0
    const bounds = { x0: area.x1, y0: area.y1, x1: area.x0, y1: area.y0 }
    let count = 0
    for (let y = area.y0; y < area.y1; y++) {
      for (let x = area.x0; x < area.x1; x++) {
        if (mask[(y - area.y0) * stride + x - area.x0] < 24) continue
        count++
        bounds.x0 = Math.min(bounds.x0, x)
        bounds.y0 = Math.min(bounds.y0, y)
        bounds.x1 = Math.max(bounds.x1, x + 1)
        bounds.y1 = Math.max(bounds.y1, y + 1)
      }
    }
    if (count < 32) continue
    result.push({
      bounds: pad(bounds, 2, width, height),
      label: kind === 'stamp' ? 'Stempel' : 'Tanda tangan',
      ink,
    })
  }
  return result
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

  if (stamp) result.push(...footerGraphics(pixels, stamp, lines))
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
    const ink = graphic.ink
    const paper = ink?.paper ?? paperColor(data, canvas.width, { x0: 0, y0: 0, x1: canvas.width, y1: canvas.height })
    const mask = ink && inkMask(data, canvas.width, graphic.bounds, ink, x0, y0)
    for (let index = 0; index < data.length; index += 4) {
      if (ink && mask) {
        data[index + 3] = mask[index / 4]
        for (let channel = 0; channel < 3; channel++) {
          data[index + channel] = ink.kind === 'stamp' ? data[index + channel] * 255 / paper[channel] : 0
        }
      } else {
        // Putihkan warna kertas agar potongan menyatu dengan halaman Word.
        for (let channel = 0; channel < 3; channel++) {
          data[index + channel] = Math.min(255, data[index + channel] * 270 / paper[channel])
        }
        if (Math.min(data[index], data[index + 1], data[index + 2]) >= 244) data[index + 3] = 0
      }
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
