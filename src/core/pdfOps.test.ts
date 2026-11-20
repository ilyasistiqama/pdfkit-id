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
