import { describe, expect, it } from 'vitest'
import { PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from 'pdf-lib'
import { signPdf } from './exportPdf'

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
