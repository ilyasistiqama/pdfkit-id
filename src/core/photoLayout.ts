import type { Bbox, Line, Word } from 'tesseract.js'
import type { PhotoGraphic } from './photoGraphics'

export interface PhotoLine {
  text: string
  bounds?: Bbox
  baseline?: number
  tabStarts?: number[]
  underline?: boolean
}

export interface PhotoLayout {
  width: number
  height: number
  lines: PhotoLine[]
  rules?: Bbox[]
  graphics?: PhotoGraphic[]
}

export interface RecognizedRow {
  words: Word[]
  confidence: number
}

function median(values: number[]) {
  return values.sort((left, right) => left - right)[Math.floor(values.length / 2)]
}

function rowBaseline(row: RecognizedRow) {
  return median(row.words.map(({ bbox }) => bbox.y1))
}

function rowHeight(row: RecognizedRow) {
  return median(row.words.map(({ bbox }) => bbox.y1 - bbox.y0))
}

export function readOcrRow(line: Line, width: number, x = 0, y = 0): RecognizedRow {
  const words = line.words.filter((word) => word.text.trim()).map((word) => {
    const { x0, x1, y0, y1 } = word.bbox
    return { ...word, bbox: { x0: x0 + x, x1: x1 + x, y0: y0 + y, y1: y1 + y } }
  })
  const first = words[0]
  const next = words[1]
  // Lubang kertas terkadang dibaca sebagai satu huruf di tepi foto.
  if (first && first.bbox.x1 < width * 0.075 && first.text.length === 1 && (
    next ? next.bbox.x0 - first.bbox.x1 > width * 0.075 : first.bbox.x0 < width * 0.045
  )) words.shift()

  return { words, confidence: line.confidence }
}

export function reconcileRows(rows: RecognizedRow[], overlay: RecognizedRow[], color: Bbox | null) {
  const result = rows.filter((row) => {
    if (!row.words.length) return false
    if (!color || !overlay.length) return true
    const first = row.words[0].bbox
    const last = row.words.at(-1)!.bbox
    const inStamp = rowBaseline(row) > color.y0 && rowBaseline(row) < color.y1 &&
      first.x0 < color.x1 && last.x1 > color.x0
    return !inStamp || /\p{L}{3}/u.test(row.words.map((word) => word.text).join(' '))
  })
  for (const candidate of overlay) {
    const text = candidate.words.map((word) => word.text).join(' ')
    if (candidate.confidence < 78 || !/\p{L}{3}/u.test(text)) continue
    const baseline = rowBaseline(candidate)
    const index = result.findIndex((row) =>
      Math.abs(rowBaseline(row) - baseline) < rowHeight(candidate) * 0.55 &&
      row.words[0].bbox.x0 < candidate.words.at(-1)!.bbox.x1 &&
      row.words.at(-1)!.bbox.x1 > candidate.words[0].bbox.x0,
    )
    if (index >= 0) {
      const previous = result[index]
      if (candidate.confidence > previous.confidence + 8 ||
        (candidate.confidence >= previous.confidence && candidate.words.length > previous.words.length)) {
        result[index] = candidate
      }
    } else if (color && baseline >= color.y0 + (color.y1 - color.y0) * 0.75) {
      const next = result.findIndex((row) => rowBaseline(row) > baseline)
      result.splice(next < 0 ? result.length : next, 0, candidate)
    }
  }
  return result
}

export function layoutRows(rows: RecognizedRow[], width: number): PhotoLine[] {
  const positions = rows.map((row) => ({
    row,
    x: row.words[0].bbox.x0,
    right: row.words.at(-1)!.bbox.x1,
    y: rowBaseline(row),
    height: rowHeight(row),
  }))
  const pairs = positions.flatMap((left) => positions.flatMap((right) => {
    const gap = right.x - left.right
    const sameLine = Math.abs(left.y - right.y) <= Math.min(left.height, right.height) * 0.42
    return sameLine && gap > width * 0.035 && gap < width * 0.28 ? [{ left, right }] : []
  }))
  const matches = pairs.filter(({ left, right }) => {
    if (left.row.words.length <= 4) return true
    // Kolom dengan kalimat panjang harus punya sela yang berulang di beberapa baris.
    return pairs.filter((pair) =>
      Math.abs(pair.left.x - left.x) <= width * 0.035 && Math.abs(pair.right.x - right.x) <= width * 0.035 &&
      Math.abs(pair.left.y - left.y) > left.height,
    ).length >= 2
  })
  const remaining = new Set(positions)
  const lines: PhotoLine[] = []
  for (const position of positions) {
    if (!remaining.delete(position)) continue
    const { row } = position

    const words = [...row.words]
    const match = matches.find(({ left, right }) =>
      (left === position && remaining.has(right)) || (right === position && remaining.has(left)),
    )
    if (match) {
      const other = match.left === position ? match.right : match.left
      words.push(...other.row.words)
      remaining.delete(other)
    }
    words.sort((first, second) => first.bbox.x0 - second.bbox.x0)

    const baseline = rowBaseline({ ...row, words })
    const height = rowHeight({ ...row, words })
    const bounds = {
      x0: words[0].bbox.x0,
      x1: words.at(-1)!.bbox.x1,
      y0: baseline - height,
      y1: baseline,
    }
    const tabStarts: number[] = []
    let text = ''
    for (const [index, word] of words.entries()) {
      if (index > 0) {
        const gap = word.bbox.x0 - words[index - 1].bbox.x1
        const tab = gap > Math.max(height * 1.2, width * 0.012)
        if (tab) tabStarts.push(word.bbox.x0)
        if (tab || !/^[:;,.!?]$/.test(word.text) || word.text === ':') text += tab ? '\t' : ' '
      }
      text += word.text
    }
    lines.push({ text, bounds, baseline, tabStarts })
  }
  return lines
}

/** Cari garis cetak panjang di sela kop dan judul. */
export function identifyRules(pixels: ImageData, lines: PhotoLine[]): Bbox[] {
  const { data, width, height } = pixels
  const headingLines = lines.filter((line) => line.bounds && line.bounds.y0 < height * 0.28)
  const rules: Bbox[] = []
  for (const [index, heading] of headingLines.entries()) {
    const bounds = heading.bounds!
    const next = headingLines[index + 1]?.bounds
    if (!next || next.y0 - bounds.y1 < height * 0.006) continue
    let best: Bbox | undefined
    for (let y = bounds.y1 + 2; y < next.y0 - 2; y += 1) {
      if (y < 0 || y >= height) continue
      let start = 0
      let lastDark = -width
      for (let x = Math.round(width * 0.035); x < width * 0.965; x += 1) {
        const pixel = (y * width + x) * 4
        if (Math.max(data[pixel], data[pixel + 1], data[pixel + 2]) > 110) continue
        if (x - lastDark > width * 0.012) start = x
        lastDark = x
        if (x - start > Math.max(width * 0.52, best ? best.x1 - best.x0 : 0)) {
          best = { x0: start, y0: y, x1: x, y1: y + 1 }
        }
      }
    }
    if (best) rules.push(best)
  }
  return rules
}

export function identifyUnderlines({ data, width, height }: ImageData, lines: PhotoLine[]) {
  for (const line of lines) {
    const bounds = line.bounds
    if (!bounds || bounds.y0 > height * 0.3 || line.tabStarts?.length ||
      !/\p{Lu}{2}/u.test(line.text) || line.text !== line.text.toUpperCase()) continue
    const span = bounds.x1 - bounds.x0
    const glyphHeight = bounds.y1 - bounds.y0
    const from = Math.floor(bounds.y0 + glyphHeight * 0.62)
    const to = Math.min(height, bounds.y1 + Math.ceil(glyphHeight * 0.2))
    for (let y = from; y < to; y += 1) {
      let dark = 0
      for (let x = bounds.x0; x < bounds.x1; x += 1) {
        const pixel = (y * width + x) * 4
        if (Math.max(data[pixel], data[pixel + 1], data[pixel + 2]) < 115) dark++
      }
      if (dark < span * 0.86) continue
      line.underline = true
      // Batas bawah OCR kadang ikut memasukkan garis bawah sebagai bagian huruf.
      line.baseline = Math.min(line.baseline ?? bounds.y1, y - 1)
      break
    }
  }
}

export function findColorOverlay({ data, width, height }: ImageData, rows: RecognizedRow[]): Bbox | null {
  const bounds = { x0: width, y0: height, x1: 0, y1: 0 }
  const words = rows.filter(({ confidence }) => confidence >= 65)
    .flatMap(({ words }) => words.filter(({ text }) => /[\p{L}\p{N}]{2}/u.test(text)).map(({ bbox }) => bbox))
  let colorPixels = 0
  let pixelsOutsideText = 0
  for (let y = Math.floor(height * 0.52); y < height; y += 4) {
    for (let x = Math.floor(width * 0.12); x < width * 0.88; x += 4) {
      const pixel = (y * width + x) * 4
      const max = Math.max(data[pixel], data[pixel + 1], data[pixel + 2])
      const min = Math.min(data[pixel], data[pixel + 1], data[pixel + 2])
      if (max - min < 26 || min > 180) continue
      colorPixels++
      const partOfWord = words.some(({ x0, y0, x1, y1 }) =>
        x >= x0 - 2 && x <= x1 + 2 && y >= y0 - 2 && y <= y1 + 2,
      )
      if (partOfWord) continue
      pixelsOutsideText++
      bounds.x0 = Math.min(bounds.x0, x)
      bounds.x1 = Math.max(bounds.x1, x)
      bounds.y0 = Math.min(bounds.y0, y)
      bounds.y1 = Math.max(bounds.y1, y)
    }
  }
  if (colorPixels * 16 < width * height * 0.001 || pixelsOutsideText * 16 < width * height * 0.00055 ||
    bounds.x1 - bounds.x0 < width * 0.025 || bounds.y1 - bounds.y0 > height * 0.27) return null
  return bounds
}

export function editedPhotoLines(original: PhotoLine[], draft: string): PhotoLine[] {
  const texts = draft.replace(/\r/g, '').split('\n')
  let start = 0
  while (start < texts.length && texts[start] === original[start]?.text) start++
  let end = 0
  while (
    end < Math.min(texts.length, original.length) - start &&
    texts[texts.length - 1 - end] === original[original.length - 1 - end]?.text
  ) end++

  const previous = original.slice(start, original.length - end)
  const next = texts.slice(start, texts.length - end)
  return [
    ...original.slice(0, start),
    ...matchEditedLines(previous, next),
    ...original.slice(original.length - end),
  ]
}

function matchEditedLines(previous: PhotoLine[], next: string[]): PhotoLine[] {
  if (!previous.length) return next.map((text) => ({ text }))
  if (!next.length) return []
  const columns = next.length + 1
  const cells = (previous.length + 1) * columns
  if (cells > 1_000_000) {
    return next.map((text, index) => ({ ...(next.length === previous.length && previous[index]), text }))
  }

  // Baris yang sama menjadi acuan di tengah suntingan. Baris kosong baru tidak mengambil posisi teks.
  const costs = new Uint32Array(cells)
  const previousHasText = previous.map(({ text }) => Boolean(text.trim()))
  const nextHasText = next.map((text) => Boolean(text.trim()))
  const replaceCost = (row: number, col: number) => {
    if (previous[row].text === next[col]) return 0
    return previousHasText[row] === nextHasText[col] ? 2 : 3
  }
  for (let row = previous.length; row >= 0; row--) costs[row * columns + next.length] = previous.length - row
  for (let col = next.length; col >= 0; col--) costs[previous.length * columns + col] = next.length - col
  for (let row = previous.length - 1; row >= 0; row--) {
    for (let col = next.length - 1; col >= 0; col--) {
      const cell = row * columns + col
      costs[cell] = Math.min(costs[cell + columns] + 1, costs[cell + 1] + 1,
        costs[cell + columns + 1] + replaceCost(row, col))
    }
  }

  const lines: PhotoLine[] = []
  let row = 0
  let col = 0
  while (col < next.length) {
    const cell = row * columns + col
    if (row < previous.length && costs[cell] === costs[cell + columns + 1] + replaceCost(row, col)) {
      lines.push({ ...previous[row++], text: next[col++] })
    } else if (row === previous.length || costs[cell] === costs[cell + 1] + 1) {
      lines.push({ text: next[col++] })
    } else {
      row++
    }
  }
  return lines
}
