import {
  degrees,
  concatTransformationMatrix,
  pushGraphicsState,
  popGraphicsState,
  PDFCheckBox,
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFDropdown,
  PDFOptionList,
  PDFName,
  PDFNull,
  PDFObjectCopier,
  PDFPageLeaf,
  PDFRef,
  PDFRadioGroup,
  PDFTextField,
  StandardFonts,
  rgb,
  PDFPage,
} from 'pdf-lib'
import { normalizeRotation, visibleBox, visualSize, type Box } from './geometry'
import { imageOrientationMatrix, jpegOrientation } from './jpegOrientation'
import { detectPhotoType, unknownPhotoError, withPhotoImage } from './photoInput'
import { canvasPng } from './pdfCanvas'

export type NamedBytes = { name: string; bytes: Uint8Array }

const PRODUCER = 'Tanda Tangan PDF'
const readBytes = async (file: File) => new Uint8Array(await file.arrayBuffer())
const annotationKeys = {
  annots: PDFName.of('Annots'), destination: PDFName.of('Dest'), action: PDFName.of('A'),
  kind: PDFName.of('S'), target: PDFName.of('D'), goto: PDFName.of('GoTo'),
}

const finish = (doc: PDFDocument, title?: string) => {
  if (title) doc.setTitle(title)
  doc.setProducer(PRODUCER)
  doc.setCreator(PRODUCER)
  doc.setModificationDate(new Date())
  return doc.save()
}

/** Use the same copied reference for a kept page and for links that target it. */
function copySelectedPages(source: PDFDocument, output: PDFDocument, indices: number[]) {
  const pages = source.getPages()
  const selected = new Set(indices)
  const omitted = pages.filter((_, index) => !selected.has(index))
  const copier = PDFObjectCopier.for(source.context, output.context)

  // Destination and annotation refs must not pull omitted page objects into the result.
  for (const page of omitted) source.context.assign(page.ref, PDFNull)
  try {
    return indices.map((index) => {
      const ref = copier.copy(pages[index].ref)
      const leaf = output.context.lookup(ref)
      if (!(leaf instanceof PDFPageLeaf)) throw new Error('Halaman PDF tidak bisa disalin.')
      const { annots, destination, action, kind, target, goto } = annotationKeys
      const annotations = leaf.lookup(annots)
      for (const entry of annotations instanceof PDFArray ? annotations.asArray() : []) {
        const annotation = output.context.lookup(entry)
        if (!(annotation instanceof PDFDict)) continue
        const linkAction = annotation.lookup(action)
        const explicit = annotation.lookup(destination)
        const actionDestination = linkAction instanceof PDFDict && linkAction.get(kind) === goto
          ? linkAction.lookup(target) : undefined
        for (const [key, value] of [[destination, explicit], [action, actionDestination]] as const) {
          const pageRef = value instanceof PDFArray && value.get(0)
          if (pageRef === PDFNull || (pageRef instanceof PDFRef && output.context.lookup(pageRef) === PDFNull)) {
            annotation.delete(key)
          }
        }
      }
      return PDFPage.of(leaf, ref, output)
    })
  } finally {
    for (const page of omitted) source.context.assign(page.ref, page.node)
  }
}

/** Urutan masukan = urutan halaman pada hasil. */
export async function mergePdfs(files: File[], title?: string): Promise<Uint8Array> {
  const output = await PDFDocument.create()
  for (const file of files) {
    const source = await PDFDocument.load(await readBytes(file), { updateMetadata: false })
    const pages = copySelectedPages(source, output, source.getPageIndices())
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
    const pages = copySelectedPages(source, doc, indices)
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

/**
 * Derajat putar searah jarum jam: 90, 180, 270 (atau -90).
 * `pages` (indeks 0-based) tidak diisi = semua halaman; array kosong = tidak ada.
 */
export async function rotatePdf(
  bytes: Uint8Array,
  delta: number,
  options: { pages?: number[]; title?: string } = {},
): Promise<Uint8Array> {
  if (options.pages && !options.pages.length) {
    throw new Error('Tidak ada halaman yang cocok untuk diputar.')
  }
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })
  const pages = doc.getPages()
  const target = options.pages ? new Set(options.pages) : null
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

/**
 * Posisi teks watermark agar pusatnya tepat di tengah area halaman yang tampil.
 * pdf-lib memutar teks dari titik kiri-bawahnya (baseline), jadi titik awal
 * dihitung mundur dari pusat. `tilt` adalah kemiringan yang terlihat (berlawanan
 * jarum jam); `/Rotate` halaman ikut dihitung agar teks tampil tegak/miring
 * dengan benar di penampil. Teks dikecilkan bila tidak muat (maks. 90% halaman).
 */
export function watermarkLayout(input: {
  area: Box
  rotation: number
  tilt: number
  size: number
  /** lebar teks pada ukuran 1 pt */
  unitWidth: number
  /** tinggi huruf (tanpa descender) pada ukuran 1 pt */
  unitHeight: number
}) {
  const { area, tilt, unitWidth, unitHeight } = input
  const rotation = normalizeRotation(input.rotation)
  const vis = visualSize(area.width, area.height, rotation)
  const t = (tilt * Math.PI) / 180
  const boxW = unitWidth * Math.abs(Math.cos(t)) + unitHeight * Math.abs(Math.sin(t))
  const boxH = unitWidth * Math.abs(Math.sin(t)) + unitHeight * Math.abs(Math.cos(t))
  const size = Math.min(input.size, (vis.w * 0.9) / boxW, (vis.h * 0.9) / boxH)

  const angle = rotation + tilt
  const a = (angle * Math.PI) / 180
  const halfW = (unitWidth * size) / 2
  const halfH = (unitHeight * size) / 2
  const cx = area.x + area.width / 2
  const cy = area.y + area.height / 2
  return {
    x: cx - halfW * Math.cos(a) + halfH * Math.sin(a),
    y: cy - halfW * Math.sin(a) - halfH * Math.cos(a),
    size,
    angle,
  }
}

/** Watermark teks di tengah setiap halaman (opsional miring 35°). */
export async function watermarkPdf(
  bytes: Uint8Array,
  options: WatermarkOptions,
  pagesWanted?: number[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  const target = pagesWanted ? new Set(pagesWanted) : null
  const text = options.text.trim() || 'RAHASIA'
  const unitWidth = font.widthOfTextAtSize(text, 1)
  const unitHeight = font.heightAtSize(1, { descender: false })

  doc.getPages().forEach((page, index) => {
    if (target && !target.has(index)) return
    const layout = watermarkLayout({
      area: visibleBox(page.getCropBox(), page.getMediaBox()),
      rotation: page.getRotation().angle,
      tilt: options.diagonal ? 35 : 0,
      size: Math.max(8, options.fontSize),
      unitWidth,
      unitHeight,
    })

    page.drawText(text, {
      x: layout.x,
      y: layout.y,
      size: layout.size,
      font,
      color: COLORS[options.color],
      opacity: Math.min(1, Math.max(0.05, options.opacity)),
      rotate: degrees(layout.angle),
    })
  })

  return finish(doc)
}

export type ImagesToPdfOptions = {
  /** 'a4' memuat gambar utuh di halaman A4, 'auto' mengikuti ukuran tiap gambar */
  layout: 'a4' | 'auto'
  margin: number
}

const A4 = { w: 595.28, h: 841.89 }

/** Foto raster → PDF, satu gambar per halaman. */
export async function imagesToPdf(
  files: File[],
  options: ImagesToPdfOptions,
  title?: string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()

  for (const file of files) {
    let asset
    try {
      const bytes = await readBytes(file)
      const type = detectPhotoType(bytes)
      if (!type) throw unknownPhotoError()
      if (type === 'image/jpeg') asset = { image: await doc.embedJpg(bytes), orientation: jpegOrientation(bytes) }
      else if (type === 'image/png') asset = { image: await doc.embedPng(bytes), orientation: 1 }
      else {
        const data = await withPhotoImage(file.slice(0, file.size, type), async (photo) => {
          const canvas = document.createElement('canvas')
          canvas.width = photo.naturalWidth
          canvas.height = photo.naturalHeight
          try {
            const context = canvas.getContext('2d')
            if (!context) throw new Error('Browser tidak bisa memproses gambar ini.')
            context.drawImage(photo, 0, 0)
            return await canvasPng(canvas)
          } finally {
            canvas.width = 0
            canvas.height = 0
          }
        })
        asset = { image: await doc.embedPng(data), orientation: 1 }
      }
    } catch (error) {
      throw new Error(`Foto “${file.name}” gagal diproses. ${error instanceof Error ? error.message : ''}`.trim(), { cause: error })
    }
    const { image, orientation } = asset
    const swapped = orientation >= 5
    const imageW = swapped ? image.height : image.width
    const imageH = swapped ? image.width : image.height

    const pageSize =
      options.layout === 'a4' ? A4 : { w: imageW + options.margin * 2, h: imageH + options.margin * 2 }
    const page = doc.addPage([pageSize.w, pageSize.h])
    const maxW = pageSize.w - options.margin * 2
    const maxH = pageSize.h - options.margin * 2
    const scale = Math.min(maxW / imageW, maxH / imageH)
    const drawW = imageW * scale
    const drawH = imageH * scale
    const [a, b, c, d, x, y] = imageOrientationMatrix(orientation, drawW, drawH)
    page.pushOperators(pushGraphicsState(), concatTransformationMatrix(a, b, c, d,
      x + (pageSize.w - drawW) / 2, y + (pageSize.h - drawH) / 2))
    page.drawImage(image, {
      x: 0, y: 0,
      width: image.width * scale,
      height: image.height * scale,
    })
    page.pushOperators(popGraphicsState())
  }

  return finish(doc, title)
}

export type FormField =
  | { kind: 'text'; name: string; value: string; multiline: boolean }
  | { kind: 'checkbox'; name: string; checked: boolean }
  | { kind: 'radio'; name: string; value: string | null; options: string[] }
  | { kind: 'dropdown'; name: string; value: string | null; options: string[] }
  | { kind: 'multiselect'; name: string; value: string[]; options: string[] }

export type FormValue = string | boolean | string[]

/** Kolom formulir yang bisa diisi (teks, centang, pilihan). */
export async function readFormFields(bytes: Uint8Array): Promise<FormField[]> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })
  const form = doc.getForm()
  const fields: FormField[] = []

  for (const field of form.getFields()) {
    if (field.isReadOnly()) continue
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
        const options = field.getOptions()
        const selected = field.getSelected()
        fields.push(field.isMultiselect()
          ? { kind: 'multiselect', name, value: selected, options }
          : { kind: 'dropdown', name, value: selected[0] ?? null, options })
      }
    } catch {
      /* kolom yang tidak didukung dilewati */
    }
  }

  return fields
}

/** Isi kolom yang dapat diedit dan perbarui tampilannya untuk penampil PDF. */
export async function fillFormPdf(
  bytes: Uint8Array,
  values: Record<string, FormValue>,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })
  const form = doc.getForm()

  for (const field of form.getFields()) {
    const name = field.getName()
    if (!Object.hasOwn(values, name) || field.isReadOnly()) continue
    const value = values[name]
    try {
      if (field instanceof PDFTextField && typeof value === 'string') {
        if ((field.getText() ?? '') !== value) field.setText(value)
      } else if (field instanceof PDFCheckBox && typeof value === 'boolean') {
        if (field.isChecked() !== value) value ? field.check() : field.uncheck()
      } else if (field instanceof PDFRadioGroup && typeof value === 'string') {
        if ((field.getSelected() ?? '') !== value) value ? field.select(value) : field.clear()
      } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
        const selected = Array.isArray(value) && field.isMultiselect() ? value
          : typeof value === 'string' ? (value ? [value] : []) : null
        if (!selected) throw new Error('Daftar pilihan tidak sesuai.')
        const previous = field.getSelected()
        if (selected.length !== previous.length || selected.some((item) => !previous.includes(item))) {
          selected.length ? field.select(selected) : field.clear()
        }
      } else {
        throw new Error('Jenis nilai tidak sesuai.')
      }
    } catch (error) {
      throw new Error(`Isian pada kolom “${name}” belum bisa disimpan. Periksa format, panjang, dan pilihan yang tersedia.`, { cause: error })
    }
  }

  form.updateFieldAppearances()
  return finish(doc)
}

/** Nama berkas tanpa ekstensi .pdf. */
export const baseName = (name: string) => name.replace(/\.pdf$/i, '')

/** Pastikan nama unik: tambah -2, -3, dst. */
export function uniqueName(name: string, used: Set<string>) {
  const extension = /\.[a-z0-9]+$/i.exec(name)
  const stem = extension ? name.slice(0, extension.index) : name
  let candidate = name
  let counter = 2
  while (used.has(candidate)) {
    candidate = `${stem}-${counter}${extension?.[0] ?? ''}`
    counter++
  }
  used.add(candidate)
  return candidate
}

export type PageArrangement = { index: number; rotation: number }

export async function organizePdf(bytes: Uint8Array, arrangement: PageArrangement[]) {
  const source = await PDFDocument.load(bytes, { updateMetadata: false })
  const original = source.getPages()
  if (!arrangement.length || new Set(arrangement.map(({ index }) => index)).size !== arrangement.length ||
    arrangement.some(({ index }) => !original[index])) throw new Error('Susunan halaman PDF tidak valid.')

  // Bila semua halaman dipertahankan, gunakan referensi halaman asli agar formulir dan tautan internal ikut.
  const keepAll = arrangement.length === original.length
  const output = keepAll ? source : await PDFDocument.create()
  const pages = keepAll
    ? arrangement.map(({ index }) => original[index])
    : copySelectedPages(source, output, arrangement.map(({ index }) => index))
  if (keepAll) {
    for (let index = original.length - 1; index >= 0; index--) output.removePage(index)
  }
  for (const [index, page] of pages.entries()) {
    page.setRotation(degrees(normalizeRotation(page.getRotation().angle + arrangement[index].rotation)))
    output.addPage(page)
  }
  return finish(output)
}
