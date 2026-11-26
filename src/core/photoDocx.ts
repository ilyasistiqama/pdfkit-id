import {
  AlignmentType, BorderStyle, Document, ImageRun, LineRuleType, Packer, PageOrientation,
  HorizontalPositionAlign, HorizontalPositionRelativeFrom, TextWrappingType,
  VerticalPositionAlign, VerticalPositionRelativeFrom,
  Paragraph, Tab, TabStopType, TextRun,
} from 'docx'
import { preparePhotoCanvas } from './photoCanvas'
import { obscuresPhotoText, readPhotoGraphic, type PhotoGraphic } from './photoGraphics'
import { editedPhotoLines, type PhotoLayout } from './photoLayout'

const A4_WIDTH = 11906
const A4_HEIGHT = 16838
const MARGIN = 400

export type PhotoFont = 'Times New Roman' | 'Arial'

function paperFor(width: number, height: number) {
  const landscape = width > height
  return {
    width: landscape ? A4_HEIGHT : A4_WIDTH,
    height: landscape ? A4_WIDTH : A4_HEIGHT,
    size: {
      width: A4_WIDTH,
      height: A4_HEIGHT,
      orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
    },
  }
}

interface PhotoSource {
  url: string
  rotation: number
  graphics: PhotoGraphic[]
}

async function imageRunsFor(source: PhotoSource | undefined, scale: number, x: number, y: number) {
  if (!source?.graphics.length) return []
  const canvas = await preparePhotoCanvas(source.url, source.rotation, 2560)
  try {
    return await Promise.all(source.graphics.map(async (graphic) => {
      const { x0, y0, x1, y1 } = graphic.bounds
      return new ImageRun({
        type: 'png',
        data: await readPhotoGraphic(canvas, graphic),
        transformation: {
          width: Math.max(1, Math.round((x1 - x0) * scale / 15)),
          height: Math.max(1, Math.round((y1 - y0) * scale / 15)),
        },
        altText: { title: graphic.label, name: graphic.label, description: graphic.label },
        floating: {
          horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: Math.round((x + x0 * scale) * 635) },
          verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: Math.round((y + y0 * scale) * 635) },
          allowOverlap: true,
          behindDocument: !!graphic.ink,
          wrap: { type: TextWrappingType.NONE },
        },
      })
    }))
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}

export type PhotoWordPage = { layout: PhotoLayout; draft: string; source: PhotoSource } | { source: Omit<PhotoSource, 'graphics'> }

async function editableSection(layout: PhotoLayout, draft: string, font: PhotoFont, source: PhotoSource) {
  const paper = paperFor(layout.width, layout.height)
  const usableWidth = paper.width - 2 * MARGIN
  const scale = Math.min(paper.width / layout.width, paper.height / layout.height)
  const offsetX = (paper.width - layout.width * scale) / 2 - MARGIN
  const offsetY = (paper.height - layout.height * scale) / 2 - MARGIN
  const toX = (pixel: number) => Math.round(offsetX + pixel * scale)
  const toY = (pixel: number) => Math.round(offsetY + pixel * scale)
  const fontSizes = layout.lines.flatMap(({ bounds }) =>
    bounds ? [bounds.y1 - bounds.y0] : [],
  ).sort((a, b) => a - b)
  const typicalHeight = fontSizes[Math.floor(fontSizes.length / 2)] || 180 / scale
  const measure = document.createElement('canvas').getContext('2d')
  const paragraphs: Paragraph[] = []
  const images = await imageRunsFor(source, scale, offsetX + MARGIN, offsetY + MARGIN)
  let position = 0
  let ruleIndex = 0
  const rules = layout.rules ?? []

  function spacing(top: number, line: number) {
    const before = Math.max(0, top - position)
    position += before + line
    return { before, after: 0, line, lineRule: LineRuleType.EXACT }
  }

  const lines = editedPhotoLines(layout.lines, draft).filter((line) => !source?.graphics.some((graphic) => obscuresPhotoText(graphic, line)))
  for (const [index, { bounds, baseline, text, tabStarts, tabEnds, underline }] of lines.entries()) {
    while (bounds && rules[ruleIndex]?.y1 < bounds.y0) {
      const rule = rules[ruleIndex++]
      paragraphs.push(new Paragraph({
        indent: { left: Math.max(0, toX(rule.x0)), right: Math.max(0, usableWidth - toX(rule.x1)) },
        spacing: spacing(toY(rule.y0) - 20, 20),
        border: { bottom: { style: BorderStyle.SINGLE, size: 11, color: '000000', space: 0 } },
        children: [],
      }))
    }

    const height = bounds ? bounds.y1 - bounds.y0 : typicalHeight
    const centered = Boolean(bounds && !tabStarts?.length &&
      bounds.x0 >= layout.width * 0.18 &&
      Math.abs((bounds.x0 + bounds.x1) / 2 - layout.width / 2) <= layout.width * 0.045)
    const heading = Boolean(bounds && centered && /\p{Lu}{2}/u.test(text) && text === text.toUpperCase())
    const signatureIntro = /^yang\s+bertanda\s*tangan\s+di\s*bawah\s+ini\b/i.test(text.trim())
    const bold = heading || signatureIntro || height >= typicalHeight * 1.5
    const left = bounds ? Math.max(0, Math.min(usableWidth - 200, toX(bounds.x0))) : 0
    const chunks = text.split('	')
    const tabPositions = tabStarts?.slice(0, chunks.length - 1).map(toX) ?? []
    const tabs = tabPositions.filter((point) => point > left && point < usableWidth)
      .map((point) => ({ type: TabStopType.LEFT, position: point }))
    let size = Math.max(14, Math.min(56, Math.round(height * scale / 7)))

    if (measure && bounds && text.trim()) {
      // Sesuaikan ukuran huruf agar satu baris muat pada lebar teks di foto.
      measure.font = `${bold ? 'bold ' : ''}20px "${font}"`
      const widths = chunks.map((chunk) => measure.measureText(chunk.trim()).width)
      const segments = [left, ...tabPositions]
      const sizeByWidth = widths.map((width, index) => {
        const start = segments[index]
        const photographedEnd = toX(tabEnds?.[index] ?? bounds.x1) + 40
        const end = Math.min(segments[index + 1] ?? usableWidth, photographedEnd)
        return width > 1 && start !== undefined ? 2 * (end - start) / width : Infinity
      })
      const estimate = Math.min(...sizeByWidth)
      size = Math.max(12, Math.min(56, Math.round(size * 1.14), Math.round(estimate)))
    }

    const sourceBaseline = baseline ?? bounds?.y1
    if (sourceBaseline !== undefined) {
      const after = lines[index + 1]
      const before = lines[index - 1]
      const nextBaseline = after?.baseline ?? after?.bounds?.y1
      const previousBaseline = before?.baseline ?? before?.bounds?.y1
      const sourcePitch = nextBaseline !== undefined ? nextBaseline - sourceBaseline : sourceBaseline - (previousBaseline ?? sourceBaseline)
      const pitch = Math.round(sourcePitch * scale)
      if (pitch >= Math.max(156, height * scale) && pitch < size * 13) {
        size = Math.floor(pitch / 13)
      }
    }
    const line = size * 13
    const target = sourceBaseline !== undefined ? toY(sourceBaseline) - Math.round(line * 0.83) : position
    paragraphs.push(new Paragraph({
      alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
      indent: centered ? undefined : { left },
      spacing: spacing(target, line),
      tabStops: tabs,
      children: [...images.splice(0), new TextRun({
        children: chunks.flatMap((chunk, index) => index ? [new Tab(), chunk] : [chunk]),
        size,
        bold,
        underline: underline ? {} : undefined,
      })],
    }))
  }
  if (images.length) paragraphs.push(new Paragraph({ children: images }))

  return {
    properties: {
      page: {
        size: paper.size,
        margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      },
    },
    children: paragraphs,
  }
}

export async function buildPhotoWord(pages: PhotoWordPage[], font: PhotoFont, signal?: AbortSignal) {
  const sections = []
  for (const page of pages) {
    signal?.throwIfAborted()
    sections.push('layout' in page
      ? await editableSection(page.layout, page.draft, font, page.source)
      : await photoSection(page.source.url, page.source.rotation))
  }
  signal?.throwIfAborted()
  return Packer.toBlob(new Document({
    styles: { default: { document: { run: { font, size: 22 } } } },
    sections,
  }))
}

async function photoSection(url: string, rotation: number) {
  const canvas = await preparePhotoCanvas(url, rotation)
  const paper = paperFor(canvas.width, canvas.height)
  const scale = Math.min(paper.width / canvas.width, paper.height / canvas.height) / 15
  const transformation = {
    width: Math.max(1, Math.floor(canvas.width * scale)),
    height: Math.max(1, Math.floor(canvas.height * scale)),
  }
  try {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Foto belum bisa disimpan.')
    return {
        properties: { page: { size: paper.size } },
        children: [new Paragraph({
          children: [new ImageRun({
            type: 'png',
            data: new Uint8Array(await blob.arrayBuffer()),
            transformation,
            altText: { title: 'Foto dokumen', description: 'Salinan foto dokumen', name: 'Foto dokumen' },
            floating: {
              horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, align: HorizontalPositionAlign.CENTER },
              verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, align: VerticalPositionAlign.CENTER },
              wrap: { type: TextWrappingType.NONE },
            },
          })],
        })],
    }
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}
