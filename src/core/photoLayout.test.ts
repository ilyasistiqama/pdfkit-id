import { describe, expect, it } from 'vitest'
import { editedPhotoLines, findColorOverlay, layoutRows, type PhotoLine, type RecognizedRow } from './photoLayout'

function photographedLine(text: string, y: number): PhotoLine {
  return { text, bounds: { x0: 40, x1: 130, y0: y, y1: y + 18 }, tabStarts: [90] }
}

describe('koreksi teks dari foto', () => {
  it('menjaga posisi hasil OCR saat pengguna menambah baris dan mengoreksi judul serta penutup', () => {
    const original = [
      photographedLine('Judul lama', 20),
      photographedLine('Label\tNilai', 60),
      photographedLine('Isi tengah', 100),
      photographedLine('Penutup lama', 140),
    ]
    const lines = editedPhotoLines(original, 'Judul baru\nLabel\tNilai\n\nIsi tengah\nPenutup baru')

    expect(lines.map(({ text }) => text)).toEqual(['Judul baru', 'Label\tNilai', '', 'Isi tengah', 'Penutup baru'])
    expect(lines.map(({ bounds }) => bounds?.y0)).toEqual([20, 60, undefined, 100, 140])
    expect(lines[1].tabStarts).toEqual([90])
  })

  it('mempertahankan baris yang sama saat jumlah total baris tidak berubah', () => {
    const original = ['Baris satu', 'Baris dua', 'Baris tiga'].map((text, index) => photographedLine(text, index * 40))
    const lines = editedPhotoLines(original, '\nBaris satu\nBaris dua')
    expect(lines.map(({ bounds }) => bounds?.y0)).toEqual([undefined, 0, 40])
  })
})

describe('deteksi tinta berwarna di bagian bawah foto', () => {
  it('mengabaikan huruf berwarna dan mengambil batas tinta yang berada di luar kata', () => {
    const width = 300
    const height = 400
    const data = new Uint8ClampedArray(width * height * 4).fill(255)
    const pixels = { data, width, height } as ImageData
    const draw = ({ x0, x1, y0, y1 }: NonNullable<PhotoLine['bounds']>) => {
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) data.set([16, 74, 160, 255], (y * width + x) * 4)
      }
    }
    const word = { x0: 60, x1: 205, y0: 222, y1: 244 }
    const stamp = { x0: 130, x1: 178, y0: 292, y1: 337 }
    const rows: RecognizedRow[] = [{ confidence: 95, words: [
      { bbox: word, text: 'Keterangan', confidence: 95, symbols: [], choices: [], font_name: '' },
    ] }]

    draw(word)
    expect(findColorOverlay(pixels, rows)).toBeNull()
    draw(stamp)
    const found = findColorOverlay(pixels, rows)
    expect(found?.y0).toBeGreaterThanOrEqual(stamp.y0)
    expect(found?.y1).toBeGreaterThan(stamp.y0 + 30)
  })
})

describe('susunan kolom pada foto', () => {
  it('menjaga kalimat panjang pada dua kolom yang sejajar', () => {
    const makeRow = (text: string, start: number, y: number): RecognizedRow => ({
      confidence: 95,
      words: text.split(' ').map((word, index) => ({
        text: word, bbox: { x0: start + index * 35, x1: start + index * 35 + 25, y0: y, y1: y + 20 },
        confidence: 95, symbols: [], choices: [], font_name: '',
      })),
    })
    const left = [100, 140, 180].map((y) => makeRow('Teks panjang untuk kolom kiri', 40, y))
    const right = [100, 140, 180].map((y) => makeRow('Teks panjang untuk kolom kanan', 315, y))

    const lines = layoutRows([...left, ...right], 600)
    expect(lines).toHaveLength(3)
    expect(lines.every((line) => line.text === 'Teks panjang untuk kolom kiri\tTeks panjang untuk kolom kanan')).toBe(true)
    expect(lines.map((line) => line.tabStarts)).toEqual([[315], [315], [315]])
  })
})
