import { describe, expect, it } from 'vitest'
import { fillFormPdf, mergePdfs, organizePdf, parseRanges, readFormFields, splitPdf, uniqueName } from './pdfOps'
import { matchRoute, siteRoutes } from '../site/routes'
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFPageLeaf } from 'pdf-lib'
import { detectPhotoType, normalizePhotoFile } from './photoInput'

describe('parseRanges', () => {
  it('membaca rentang tunggal dan gabungan', () => {
    expect(parseRanges('1-3', 10)).toEqual([{ from: 1, to: 3 }])
    expect(parseRanges('1-3, 5, 8-10', 10)).toEqual([
      { from: 1, to: 3 },
      { from: 5, to: 5 },
      { from: 8, to: 10 },
    ])
  })

  it('mengabaikan spasi dan koma berlebih', () => {
    expect(parseRanges(' 2 , 4-4 ,', 5)).toEqual([
      { from: 2, to: 2 },
      { from: 4, to: 4 },
    ])
  })

  it('menolak halaman di luar jangkauan', () => {
    expect(() => parseRanges('1-20', 10)).toThrow(/di luar jumlah halaman/)
    expect(() => parseRanges('0', 10)).toThrow()
  })

  it('menolak rentang terbalik dan kosong', () => {
    expect(() => parseRanges('5-2', 10)).toThrow(/terbalik/)
    expect(() => parseRanges('  ', 10)).toThrow(/minimal satu rentang/)
    expect(() => parseRanges('abc', 10)).toThrow(/tidak dikenali/)
  })
})

describe('fillFormPdf', () => {
  async function fixture() {
    const doc = await PDFDocument.create()
    const page = doc.addPage()
    const form = doc.getForm()
    const list = form.createOptionList('Kategori')
    list.addOptions(['A', 'B', 'C'])
    list.enableMultiselect()
    list.select(['A', 'C'])
    list.addToPage(page)
    const dropdown = form.createDropdown('Wilayah')
    dropdown.addOptions(['Barat', 'Timur'])
    dropdown.select('Timur')
    dropdown.addToPage(page)
    const locked = form.createTextField('Nomor')
    locked.setText('123')
    locked.enableReadOnly()
    locked.addToPage(page)
    const limited = form.createTextField('Kode')
    limited.setMaxLength(2)
    limited.addToPage(page)
    return doc.save()
  }

  it('mempertahankan seluruh pilihan, bisa mengosongkan pilihan, dan menjaga kolom hanya-baca', async () => {
    const source = await fixture()
    const fields = await readFormFields(source)
    expect(fields.find(({ name }) => name === 'Kategori')).toMatchObject({ kind: 'multiselect', value: ['A', 'C'] })
    expect(fields.some(({ name }) => name === 'Nomor')).toBe(false)
    const bytes = await fillFormPdf(source, { Kategori: ['B', 'C'], Wilayah: '', Nomor: '000' })
    const form = (await PDFDocument.load(bytes)).getForm()
    expect(form.getOptionList('Kategori').getSelected()).toEqual(['B', 'C'])
    expect(form.getDropdown('Wilayah').getSelected()).toEqual([])
    expect(form.getTextField('Nomor').getText()).toBe('123')
  })

  it('melaporkan kolom yang tidak bisa disimpan', async () => {
    const source = await fixture()
    await expect(fillFormPdf(source, { Kode: '321' })).rejects.toThrow(/“Kode”/)
  })
})

it('menangani benturan nama hasil tanpa ekstensi', () => {
  const used = new Set(['hasil', 'hasil-2', 'hasil.pdf'])
  expect(uniqueName('hasil', used)).toBe('hasil-3')
  expect(uniqueName('hasil.pdf', used)).toBe('hasil-2.pdf')
})

describe('pengenalan format foto', () => {
  it('memakai tipe isi gambar walaupun nama dan MIME file berbeda', async () => {
    const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])
    const file = new File([bytes], 'gambar.png', { type: 'image/png' })
    expect((await normalizePhotoFile(file)).type).toBe('image/jpeg')
    await expect(normalizePhotoFile(new File(['teks biasa'], 'gambar.png', { type: 'image/png' })))
      .rejects.toThrow(/Format gambar tidak dikenali/)
  })

  it('membedakan AVIF dan HEIC di dalam container HEIF', () => {
    const brands = (tag: string) => Uint8Array.from([0, 0, 0, 20, ...Buffer.from(`ftypmif1\0\0\0\0${tag}`)])
    expect(detectPhotoType(brands('avif'))).toBe('image/avif')
    expect(detectPhotoType(brands('heic'))).toBe('image/heic')
  })
})

describe('tautan antarhalaman PDF', () => {
  async function fixture() {
    const doc = await PDFDocument.create()
    const first = doc.addPage([220, 300])
    const second = doc.addPage([440, 600])
    second.drawText('Halaman tujuan', { x: 40, y: 520 })
    first.node.set(PDFName.of('Annots'), doc.context.obj([{
      Type: 'Annot', Subtype: 'Link', Rect: [20, 20, 180, 50], Dest: [second.ref, 'Fit'],
    }]))
    return doc.save()
  }

  it('menjaga tujuan tautan antarhalaman saat digabung', async () => {
    const source = new File([new Uint8Array(await fixture())], 'asal.pdf', { type: 'application/pdf' })
    const doc = await PDFDocument.load(await mergePdfs([source, source]))
    for (const index of [0, 2]) {
      const annotation = doc.getPage(index).node.Annots()?.lookup(0, PDFDict)
      expect(annotation?.lookup(PDFName.of('Dest'), PDFArray)?.get(0)).toBe(doc.getPage(index + 1).ref)
    }
  })

  it('memutus tujuan tautan ke halaman yang dikeluarkan saat dipisah atau disusun', async () => {
    const source = await fixture()
    const [split] = await splitPdf(source, [{ from: 1, to: 1 }], false, 'asal')
    for (const bytes of [split.bytes, await organizePdf(source, [{ index: 0, rotation: 0 }])]) {
      const doc = await PDFDocument.load(bytes)
      expect(doc.getPageCount()).toBe(1)
      expect(doc.getPage(0).node.Annots()?.lookup(0, PDFDict).has(PDFName.of('Dest'))).toBe(false)
      expect(doc.context.enumerateIndirectObjects().filter(([, object]) => object instanceof PDFPageLeaf)).toHaveLength(1)
    }
  })
})

describe('matchRoute', () => {
  it('mengenali beranda, alat, artikel, dan halaman statis', () => {
    expect(matchRoute('/').kind).toBe('home')
    expect(matchRoute('/alat').kind).toBe('tools')
    expect(matchRoute('/artikel').kind).toBe('articles')
    expect(matchRoute('/privasi').kind).toBe('page')
    expect(matchRoute('/faq')).toEqual({ kind: 'page', key: 'faq' })
  })

  it('mengembalikan notFound untuk slug tak dikenal', () => {
    expect(matchRoute('/alat/entah').kind).toBe('notFound')
    expect(matchRoute('/artikel/entah').kind).toBe('notFound')
    expect(matchRoute('/halaman-acak').kind).toBe('notFound')
  })
})

describe('siteRoutes', () => {
  it('mencakup beranda, semua alat, semua artikel, dan halaman statis', () => {
    const paths = siteRoutes().map((route) => route.path)
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths).toContain('/')
    expect(paths).toContain('/alat/gabung-pdf')
    expect(paths).toContain('/artikel/cara-tanda-tangan-pdf-di-hp')
    expect(paths).toContain('/privasi')
    expect(paths.every((path) => matchRoute(path).kind !== 'notFound')).toBe(true)
  })
})

describe('rotatePdf', () => {
  const makePdf = async (count: number) => {
    const { PDFDocument } = await import('pdf-lib')
    const doc = await PDFDocument.create()
    for (let i = 0; i < count; i++) doc.addPage([200, 300])
    return doc.save()
  }
  const angles = async (bytes: Uint8Array) => {
    const { PDFDocument } = await import('pdf-lib')
    const doc = await PDFDocument.load(bytes)
    return doc.getPages().map((page) => page.getRotation().angle)
  }

  it('daftar halaman kosong ditolak, bukan memutar semua halaman', async () => {
    const { rotatePdf } = await import('./pdfOps')
    await expect(rotatePdf(await makePdf(1), 90, { pages: [] })).rejects.toThrow(/Tidak ada halaman/)
  })

  it('hanya memutar halaman yang diminta; tanpa daftar = semua', async () => {
    const { rotatePdf } = await import('./pdfOps')
    const source = await makePdf(3)
    expect(await angles(await rotatePdf(source, 90, { pages: [1] }))).toEqual([0, 90, 0])
    expect(await angles(await rotatePdf(source, 270))).toEqual([270, 270, 270])
  })
})

describe('watermarkLayout', () => {
  /** Pusat teks setelah diputar dari titik kiri-bawahnya. */
  const centerOf = (l: { x: number; y: number; size: number; angle: number }, uw: number, uh: number) => {
    const a = (l.angle * Math.PI) / 180
    const hw = (uw * l.size) / 2
    const hh = (uh * l.size) / 2
    return { x: l.x + hw * Math.cos(a) - hh * Math.sin(a), y: l.y + hw * Math.sin(a) + hh * Math.cos(a) }
  }

  it('pusat teks tepat di tengah area, untuk semua rotasi dan CropBox bergeser', async () => {
    const { watermarkLayout } = await import('./pdfOps')
    const area = { x: 30, y: 50, width: 595.28, height: 841.89 }
    for (const rotation of [0, 90, 180, 270]) {
      for (const tilt of [0, 35]) {
        const layout = watermarkLayout({ area, rotation, tilt, size: 64, unitWidth: 4.5, unitHeight: 0.72 })
        const c = centerOf(layout, 4.5, 0.72)
        expect(c.x).toBeCloseTo(area.x + area.width / 2, 6)
        expect(c.y).toBeCloseTo(area.y + area.height / 2, 6)
        expect(layout.angle).toBe(rotation + tilt)
      }
    }
  })

  it('mengecilkan teks yang terlalu lebar agar muat di halaman', async () => {
    const { watermarkLayout } = await import('./pdfOps')
    const area = { x: 0, y: 0, width: 200, height: 300 }
    const layout = watermarkLayout({ area, rotation: 0, tilt: 0, size: 140, unitWidth: 10, unitHeight: 0.72 })
    expect(layout.size * 10).toBeLessThanOrEqual(200 * 0.9 + 1e-9)
  })
})
