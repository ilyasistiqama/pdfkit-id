import { describe, expect, it } from 'vitest'
import { parseRanges } from './pdfOps'
import { matchRoute, siteRoutes } from '../site/routes'

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
