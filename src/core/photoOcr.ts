import { createWorker, OEM, PSM, type Bbox, type Page, type Worker } from 'tesseract.js'
import workerUrl from 'tesseract.js/dist/worker.min.js?url'

import { preparePhotoCanvas } from './photoCanvas'
import { coversPhotoLine, findColorLogos, findPhotoGraphics } from './photoGraphics'
import { findColorOverlay, identifyRules, identifyUnderlines, layoutRows, readOcrRow, reconcileRows, restoreFieldColons, type PhotoLayout } from './photoLayout'

export type OcrLanguage = 'ind' | 'eng' | 'ind+eng'

function readRows(data: Page, width: number, x = 0, y = 0) {
  return data.blocks?.flatMap((block) =>
    block.paragraphs.flatMap((paragraph) => paragraph.lines.map((line) => readOcrRow(line, width, x, y))),
  ) ?? []
}

async function readOverlay(worker: Worker, source: HTMLCanvasElement, color: Bbox) {
  const x = Math.max(0, Math.floor(color.x0 - source.width * 0.08))
  const y = Math.max(0, Math.floor(color.y0 - source.height * 0.055))
  const crop = document.createElement('canvas')
  crop.width = Math.min(source.width, Math.ceil(color.x1 + source.width * 0.18)) - x
  crop.height = Math.min(source.height, Math.ceil(color.y1 + source.height * 0.04)) - y
  const context = crop.getContext('2d')
  if (!context) return []
  context.drawImage(source, x, y, crop.width, crop.height, 0, 0, crop.width, crop.height)
  const image = context.getImageData(0, 0, crop.width, crop.height)
  // Kanal paling terang mengurangi warna tinta cap dan mempertahankan cetakan hitam.
  for (let i = 0; i < image.data.length; i += 4) {
    const value = Math.max(image.data[i], image.data[i + 1], image.data[i + 2]) < 106 ? 0 : 255
    image.data[i] = image.data[i + 1] = image.data[i + 2] = value
  }
  context.putImageData(image, 0, 0)
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
    const { data } = await worker.recognize(crop, {}, { blocks: true })
    return readRows(data, source.width, x, y)
  } finally {
    crop.width = 0
    crop.height = 0
  }
}

export async function withOcrWorker<T>(
  language: OcrLanguage,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
  run: (worker: Worker) => Promise<T>,
): Promise<T> {
  let worker: Worker | undefined
  let onAbort = () => {}
  try {
    signal.throwIfAborted()
    return await new Promise<T>((resolve, reject) => {
      onAbort = () => reject(signal.reason)
      signal.addEventListener('abort', onAbort, { once: true })
      // Sebagian galat inisialisasi dilaporkan melalui errorHandler.
      void createWorker(language, OEM.LSTM_ONLY, {
        workerPath: workerUrl,
        corePath: `${import.meta.env.BASE_URL}ocr/core`,
        langPath: `${import.meta.env.BASE_URL}ocr`,
        workerBlobURL: false,
        cacheMethod: 'none',
        errorHandler: reject,
        logger: ({ status, progress }) => {
          if (!signal.aborted && status === 'recognizing text') onProgress(progress)
        },
      }).then(async (initialized) => {
        if (signal.aborted) {
          await initialized.terminate()
          return
        }
        worker = initialized
        resolve(await run(worker))
      }).catch(reject)
    })
  } finally {
    signal.removeEventListener('abort', onAbort)
    await worker?.terminate()
  }
}

async function readPage(worker: Worker, canvas: HTMLCanvasElement, rotateAuto: boolean) {
  await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
  let { data } = await worker.recognize(canvas, { rotateAuto }, { blocks: true })
  if (!data.text.trim()) {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT })
    const result = await worker.recognize(canvas, { rotateAuto }, { blocks: true })
    data = result.data
  }
  return data
}

export async function readScanLines(worker: Worker, canvas: HTMLCanvasElement, skipWord?: (box: Bbox) => boolean) {
  const data = await readPage(worker, canvas, false)
  return readRows(data, canvas.width).flatMap((row) => {
    const groups: (typeof row.words)[] = [[]]
    for (const word of row.words) {
      const current = groups[groups.length - 1]
      if (skipWord?.(word.bbox)) {
        if (current.length) groups.push([])
      } else current.push(word)
    }
    return groups.filter((words) => words.length).map((words) => ({
      text: words.map(({ text }) => text).join(' '),
      x0: Math.min(...words.map(({ bbox }) => bbox.x0)),
      x1: Math.max(...words.map(({ bbox }) => bbox.x1)),
      baseline: Math.max(...words.map(({ bbox }) => bbox.y1)),
      height: Math.max(...words.map(({ bbox }) => bbox.y1 - bbox.y0)),
    }))
  })
}

export async function recognizePhotoInWorker(worker: Worker, url: string, rotation: number): Promise<PhotoLayout> {
  const canvas = await preparePhotoCanvas(url, rotation, 2560)
  const { width, height } = canvas
  try {
    const data = await readPage(worker, canvas, true)
    const pixels = canvas.getContext('2d')?.getImageData(0, 0, width, height)
    const recognized = readRows(data, width)
    const color = pixels && findColorOverlay(pixels, recognized)
    const overlay = color ? await readOverlay(worker, canvas, color) : []
    const logos = pixels ? findColorLogos(pixels) : []
    const rows = recognized.map((row) => ({
      ...row,
      words: row.words.filter((word) => !logos.some((logo) => coversPhotoLine(logo, { bounds: word.bbox }))),
    }))
    const lines = layoutRows(reconcileRows(rows, overlay, color ?? null), width)
    if (!lines.length) {
      for (const text of data.text.trim().split(/\r?\n/)) {
        if (text.trim()) lines.push({ text: text.trim() })
      }
    }
    if (!lines.length) throw new Error('Teks belum terbaca. Coba foto yang lebih tajam, terang, dan tegak.')
    if (pixels) {
      restoreFieldColons(pixels, lines)
      identifyUnderlines(pixels, lines)
    }
    const rules = pixels ? identifyRules(pixels, lines) : []
    const graphics = pixels ? findPhotoGraphics(pixels, lines, rules, color ?? null, logos) : []
    return { width, height, lines, rules, graphics }
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}
