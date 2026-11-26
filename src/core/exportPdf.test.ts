import { describe, expect, it } from 'vitest'
import { PDFDict, PDFDocument, PDFHexString, PDFName, PDFRawStream, decodePDFRawStream, degrees } from 'pdf-lib'
import { batchSignPdf } from './batchSignPdf'
import { signPdf } from './exportPdf'
import { hasDigitalSignature } from './pdfSignatures'

const PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

describe('signPdf', () => {
  it('posisi dihitung dari CropBox (area yang tampil), bukan MediaBox', async () => {
    const source = await PDFDocument.create()
    const page = source.addPage([612, 792])
    page.setCropBox(100, 100, 200, 300)
    const bytes = await source.save()

    const output = await signPdf(
      bytes,
      [{ id: 'p', signatureId: 's', pageIndex: 0, rect: { x: 0, y: 0, w: 0.5, tilt: 0 } }],
      [{ id: 's', dataUrl: PNG_1X1, aspect: 2 }],
    )

    // Tanda tangan di pojok kiri-atas area tampil: lebar 100, tinggi 50 →
    // kiri-bawah gambar di (100, 100 + 300 - 50) = (100, 350).
    const doc = await PDFDocument.load(output)
    const contents = doc.getPages()[0].node.lookup(PDFName.of('Contents'))
    const streams = 'asArray' in (contents as object) ? (contents as never as { asArray(): unknown[] }).asArray() : [contents]
    const text = streams
      .map((ref) => doc.context.lookup(ref as never) as PDFRawStream)
      .map((stream) => new TextDecoder('latin1').decode(decodePDFRawStream(stream).decode()))
      .join('\n')
    expect(text).toMatch(/1 0 0 1 100 350 cm/)
  })
})

describe('batchSignPdf', () => {
  it('menempatkan paraf di semua halaman dan gambar utama hanya pada halaman terakhir', async () => {
    const source = await PDFDocument.create()
    source.addPage([612, 792])
    source.addPage([612, 792]).setRotation(degrees(90))
    const { bytes, primaryPage } = await batchSignPdf(await source.save(), 'Uji', {
      pageMode: 'last', position: 'kanan-bawah', width: 26,
      caption: { name: '', role: '', date: '' }, initials: true, initialsPosition: 'kiri-bawah', initialsWidth: 12,
    }, { id: 'main', dataUrl: PNG_1X1, aspect: 2 }, { id: 'initials', dataUrl: PNG_1X1, aspect: 2 })

    const doc = await PDFDocument.load(bytes)
    expect(primaryPage).toBe(2)
    expect(doc.getPages().map((page) => page.node.Resources()?.lookupMaybe(PDFName.of('XObject'), PDFDict)?.keys().length))
      .toEqual([1, 2])
    expect(doc.getPage(1).getRotation().angle).toBe(90)
  })
})

describe('hasDigitalSignature', () => {
  it('membedakan kolom tanda tangan kosong dari kolom yang memiliki data tanda tangan', async () => {
    const doc = await PDFDocument.create()
    doc.addPage()
    const field = doc.context.obj({ FT: 'Sig' })
    doc.getForm().acroForm.addField(doc.context.register(field))
    const save = () => doc.save({ updateFieldAppearances: false })
    expect(await hasDigitalSignature(await save())).toBe(false)

    field.set(PDFName.of('V'), doc.context.obj({ ByteRange: [0, 12, 24, 36], Contents: PDFHexString.of('CAFE') }))
    expect(await hasDigitalSignature(await save())).toBe(true)
  })
})
