import { describe, expect, it } from 'vitest'
import { editedPhotoLines, findColorOverlay, layoutRows, reconcileRows, restoreFieldColons, type PhotoLine, type RecognizedRow } from './photoLayout'

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
  it('memakai bacaan cap yang mengembalikan awal kata yang terpotong', () => {
    const word = (text: string, x0: number, x1: number) => ({
      bbox: { x0, x1, y0: 220, y1: 242 }, text, confidence: 94, symbols: [], choices: [], font_name: '',
    })
    const raw = { words: [word('GUNG', 140, 170), word('JAWAB', 180, 230)], confidence: 94 }
    const full = { words: [word('PENANGGUNG', 80, 170), word('JAWAB', 180, 230)], confidence: 95 }
    expect(reconcileRows([raw], [full], { x0: 50, y0: 200, x1: 155, y1: 300 })).toEqual([full])
  })

  it('menyaring fragmen pendek di tengah cap yang tidak terbaca pada gambar tanpa tinta warna', () => {
    const row = (text: string, y: number, confidence = 95): RecognizedRow => ({
      confidence,
      words: [{ bbox: { x0: 90, x1: 125, y0: y, y1: y + 16 }, text, confidence, symbols: [], choices: [], font_name: '' }],
    })
    const title = row('KEPALA DESA', 203)
    const falseReading = row('BMA,', 239)
    const falseWords = row('TG', 256)
    falseWords.words.push({ ...row('Men', 256).words[0], bbox: { x0: 127, x1: 150, y0: 256, y1: 272 } })
    const name = row('NAMA PEJABAT', 302)
    const stamp = { x0: 50, y0: 210, x1: 160, y1: 310 }
    expect(reconcileRows([title, falseReading, falseWords, name], [title, row('BMA', 239, 42), name], stamp)).toEqual([title, name])
  })

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
  it('memulihkan titik dua terpisah berdasarkan piksel dan kolom formulir', () => {
    const width = 840
    const height = 1100
    const data = new Uint8ClampedArray(width * height * 4).fill(255)
    const pixels = { width, height, data } as ImageData
    const lines: PhotoLine[] = [320, 355, 445, 480].map((y) => ({
      text: 'Isian\t: Nilai', tabStarts: [345], bounds: { x0: 120, x1: 520, y0: y, y1: y + 26 },
    }))
    const label = photographedLine('Keterangan', 393)
    label.tabStarts = []
    const noColon = photographedLine('Tanpa pemisah', 425)
    noColon.tabStarts = []
    for (const origin of [400, 408, 430]) {
      for (let y = origin; y < origin + 3; y++) {
        for (let x = 346; x < 350; x++) data.set([30, 30, 30, 255], (y * width + x) * 4)
      }
    }
    restoreFieldColons(pixels, [...lines, label, noColon])
    expect(label.text).toBe('Keterangan\t:')
    expect(label.tabStarts).toEqual([346])
    expect(label.tabEnds).toEqual([130])
    expect(noColon.text).toBe('Tanpa pemisah')
  })

  it('menyatukan nilai formulir walaupun OCR mengeluarkannya di akhir blok', () => {
    const makeRow = (parts: { text: string; x0: number; x1: number }[], y: number): RecognizedRow => ({
      confidence: 95,
      words: parts.map(({ text, x0, x1 }) => ({
        text, bbox: { x0, x1, y0: y, y1: y + 24 }, confidence: 95, symbols: [], choices: [], font_name: '',
      })),
    })
    const lines = layoutRows([
      makeRow([{ text: 'Nomor', x0: 285, x1: 340 }, { text: ':', x0: 343, x1: 347 }], 100),
      makeRow([{ text: 'Suku / Kewarganegaraan', x0: 138, x1: 323 }], 260),
      makeRow([{ text: 'Pekerjaan', x0: 138, x1: 245 }], 310),
      makeRow([{ text: '112 / 2023', x0: 354, x1: 469 }], 114),
      makeRow([{ text: ':', x0: 343, x1: 347 }, { text: 'Indonesia', x0: 351, x1: 479 }], 271),
    ], 840)

    expect(lines.map(({ text }) => text)).toEqual([
      'Nomor : 112 / 2023', 'Suku / Kewarganegaraan\t: Indonesia', 'Pekerjaan',
    ])
    expect(lines[1].tabStarts).toEqual([343])
  })

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
