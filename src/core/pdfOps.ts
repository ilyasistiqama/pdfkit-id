import {
  degrees,
  PDFCheckBox,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  StandardFonts,
  rgb,
  type PDFPage,
} from 'pdf-lib'
import { normalizeRotation } from './geometry'

export type NamedBytes = { name: string; bytes: Uint8Array }

const PRODUCER = 'Tanda Tangan PDF'
const readBytes = async (file: File) => new Uint8Array(await file.arrayBuffer())

const finish = (doc: PDFDocument, title?: string) => {
  if (title) doc.setTitle(title)
  doc.setProducer(PRODUCER)
  doc.setCreator(PRODUCER)
  doc.setModificationDate(new Date())
  return doc.save()
}

/** Urutan masukan = urutan halaman pada hasil. */
export async function mergePdfs(files: File[], title?: string): Promise<Uint8Array> {
  const output = await PDFDocument.create()
  for (const file of files) {
    const source = await PDFDocument.load(await readBytes(file), { updateMetadata: false })
    const pages = await output.copyPages(source, source.getPageIndices())
    for (const page of pages) output.addPage(page)
  }
  return finish(output, title)
}

export type PageRange = { from: number; to: number }

/** Ubah "1-3, 5, 8-10" menjadi rentang 1-based. */
export function parseRanges(input: string, pageCount: number): PageRange[] {
  const ranges: PageRange[] = []
  for (const part of input.split(',')) {
    const chunk = part.trim()
    if (!chunk) continue
    const match = /^(\d+)\s*(?:-\s*(\d+))?$/.exec(chunk)
    if (!match) throw new Error(`Rentang "${chunk}" tidak dikenali.`)
    const from = Number(match[1])
    const to = match[2] ? Number(match[2]) : from
    if (from < 1 || to < 1 || from > pageCount || to > pageCount) {
      throw new Error(`Halaman ${Math.max(from, to)} di luar jumlah halaman (${pageCount}).`)
    }
    if (from > to) throw new Error(`Rentang "${chunk}" terbalik.`)
    ranges.push({ from, to })
  }
  if (!ranges.length) throw new Error('Isi minimal satu rentang halaman.')
  return ranges
}

/** Satu file keluaran per rentang, kecuali `separate` yang memecah tiap halaman. */
export async function splitPdf(
  bytes: Uint8Array,
  ranges: PageRange[],
  separate: boolean,
  baseName: string,
): Promise<NamedBytes[]> {
  const source = await PDFDocument.load(bytes, { updateMetadata: false })
  const total = source.getPageCount()
  const outputs: NamedBytes[] = []

  const build = async (indices: number[], label: string) => {
    const doc = await PDFDocument.create()
    const pages = await doc.copyPages(source, indices)
    for (const page of pages) doc.addPage(page)
    const data = await finish(doc, label)
    outputs.push({ name: `${baseName}-${label}.pdf`, bytes: data })
  }

  if (separate) {
    for (let index = 0; index < total; index++) {
      await build([index], `hal-${index + 1}`)
    }
    return outputs
  }

  for (const range of ranges) {
    const indices: number[] = []
    for (let page = range.from; page <= range.to; page++) indices.push(page - 1)
    const label = range.from === range.to ? `hal-${range.from}` : `hal-${range.from}-${range.to}`
    await build(indices, label)
  }
  return outputs
}

/** Derajat putar searah jarum jam: 90, 180, 270 (atau -90). */
export async function rotatePdf(
  bytes: Uint8Array,
  delta: number,
  options: { pages?: number[]; title?: string } = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })
  const pages = doc.getPages()
  const target = options.pages?.length ? new Set(options.pages) : null
  pages.forEach((page: PDFPage, index) => {
    if (target && !target.has(index)) return
    const current = page.getRotation().angle
    page.setRotation(degrees(normalizeRotation(current + delta)))
  })
  return finish(doc, options.title)
}

export type WatermarkOptions = {
  text: string
  opacity: number
  fontSize: number
  color: 'abu' | 'merah' | 'biru'
  diagonal: boolean
}

const COLORS = {
  abu: rgb(0.55, 0.55, 0.55),
  merah: rgb(0.72, 0.2, 0.16),
  biru: rgb(0.18, 0.3, 0.6),
}

/** Watermark teks di tengah setiap halaman (opsional miring 35°). */
export async function watermarkPdf(
  bytes: Uint8Array,
  options: WatermarkOptions,
  pagesWanted?: number[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  const target = pagesWanted?.length ? new Set(pagesWanted) : null

  doc.getPages().forEach((page, index) => {
    if (target && !target.has(index)) return
    const { width, height } = page.getSize()
    const text = options.text.trim() || 'RAHASIA'
    const size = Math.max(8, options.fontSize)
    const textWidth = font.widthOfTextAtSize(text, size)
    const angle = options.diagonal ? 35 : 0
    const rad = (angle * Math.PI) / 180
    const boxW = Math.abs(textWidth * Math.cos(rad)) + Math.abs(size * Math.sin(rad))
    const boxH = Math.abs(textWidth * Math.sin(rad)) + Math.abs(size * Math.cos(rad))

    page.drawText(text, {
      x: (width - boxW) / 2 + (boxW - textWidth) / 2,
      y: (height - boxH) / 2 + (boxH - size) / 2,
      size,
      font,
      color: COLORS[options.color],
      opacity: Math.min(1, Math.max(0.05, options.opacity)),
      rotate: degrees(angle),
    })
  })

  return finish(doc)
}

const isPng = (file: File) => /png$/i.test(file.type) || /\.png$/i.test(file.name)
const isJpeg = (file: File) =>
  /jpe?g$/i.test(file.type) || /\.jpe?g$/i.test(file.name)

export type ImagesToPdfOptions = {
  /** 'a4' menyamakan halaman, 'auto' mengikuti rasio tiap gambar, 'a4-fit' memuat gambar utuh di A4 */
  layout: 'a4' | 'auto'
  margin: number
}

const A4 = { w: 595.28, h: 841.89 }

/** JPG/PNG → PDF, satu gambar per halaman. */
export async function imagesToPdf(
  files: File[],
  options: ImagesToPdfOptions,
  title?: string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()

  for (const file of files) {
    const bytes = await readBytes(file)
    let image
    if (isPng(file)) image = await doc.embedPng(bytes)
    else if (isJpeg(file)) image = await doc.embedJpg(bytes)
    else throw new Error(`Format ${file.name} tidak didukung. Gunakan JPG atau PNG.`)

    const pageSize =
      options.layout === 'a4' ? A4 : { w: image.width + options.margin * 2, h: image.height + options.margin * 2 }
    const page = doc.addPage([pageSize.w, pageSize.h])
    const maxW = pageSize.w - options.margin * 2
    const maxH = pageSize.h - options.margin * 2
    const scale = Math.min(maxW / image.width, maxH / image.height)
    const drawW = image.width * scale
    const drawH = image.height * scale

    page.drawImage(image, {
      x: (pageSize.w - drawW) / 2,
      y: (pageSize.h - drawH) / 2,
      width: drawW,
      height: drawH,
    })
  }

  return finish(doc, title)
}

export type FormField =
  | { kind: 'text'; name: string; value: string; multiline: boolean }
  | { kind: 'checkbox'; name: string; checked: boolean }
  | { kind: 'radio'; name: string; value: string | null; options: string[] }
  | { kind: 'dropdown'; name: string; value: string | null; options: string[] }

/** Kolom formulir yang bisa diisi (teks, centang, pilihan). */
export async function readFormFields(bytes: Uint8Array): Promise<FormField[]> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })
  const form = doc.getForm()
  const fields: FormField[] = []

  for (const field of form.getFields()) {
    const name = field.getName()
    try {
      if (field instanceof PDFTextField) {
        fields.push({ kind: 'text', name, value: field.getText() ?? '', multiline: field.isMultiline() })
      } else if (field instanceof PDFCheckBox) {
        fields.push({ kind: 'checkbox', name, checked: field.isChecked() })
      } else if (field instanceof PDFRadioGroup) {
        fields.push({
          kind: 'radio',
          name,
          value: field.getSelected() ?? null,
          options: field.getOptions(),
        })
      } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
        fields.push({
          kind: 'dropdown',
          name,
          value: field.getSelected()[0] ?? null,
          options: field.getOptions(),
        })
      }
    } catch {
      /* kolom yang tidak didukung dilewati */
    }
  }

  return fields
}

/** Isi kolom formulir sesuai nilai baru, lalu ratakan agar tampil di penampil mana pun. */
export async function fillFormPdf(
  bytes: Uint8Array,
  values: Record<string, string | boolean>,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })
  const form = doc.getForm()

  for (const field of form.getFields()) {
    const name = field.getName()
    if (!(name in values)) continue
    const value = values[name]
    try {
      if (field instanceof PDFTextField && typeof value === 'string') {
        field.setText(value)
      } else if (field instanceof PDFCheckBox && typeof value === 'boolean') {
        value ? field.check() : field.uncheck()
      } else if ((field instanceof PDFRadioGroup || field instanceof PDFDropdown || field instanceof PDFOptionList) && typeof value === 'string') {
        field.select(value)
      }
    } catch {
      /* nilai tidak cocok untuk kolom ini, biarkan apa adanya */
    }
  }

  form.updateFieldAppearances()
  return finish(doc)
}

/** Nama berkas tanpa ekstensi .pdf. */
export const baseName = (name: string) => name.replace(/\.pdf$/i, '')

/** Pastikan nama unik: tambah -2, -3, dst. */
export function uniqueName(name: string, used: Set<string>) {
  let candidate = name
  let counter = 2
  while (used.has(candidate)) {
    candidate = name.replace(/(\.[a-z0-9]+)$/i, `-${counter}$1`)
    counter++
  }
  used.add(candidate)
  return candidate
}
