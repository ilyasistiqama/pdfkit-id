import { describe, expect, it } from 'vitest'
import { matchRoute } from '../site/routes'
import { href, absolute, absoluteUrl, BASE_PATH } from '../site/site'

describe('href', () => {
  it('menambahkan garis miring akhir agar hosting statis tidak redirect', () => {
    expect(href('/')).toBe(`${BASE_PATH}/`)
    expect(href('/faq')).toBe(`${BASE_PATH}/faq/`)
    expect(href('/alat/gabung-pdf')).toBe(`${BASE_PATH}/alat/gabung-pdf/`)
    expect(href('/faq/')).toBe(`${BASE_PATH}/faq/`)
  })
})

describe('absolute', () => {
  it('kosong saat SITE_URL tidak diisi', () => {
    expect(absolute('/faq')).toBe('')
  })

  it('rute diberi garis miring akhir, file tidak', () => {
    const site = 'https://contoh.id/pdfkit-id'
    expect(absoluteUrl(site, '/')).toBe(`${site}/`)
    expect(absoluteUrl(site, '/alat/gabung-pdf')).toBe(`${site}/alat/gabung-pdf/`)
    expect(absoluteUrl(site, '/og.png')).toBe(`${site}/og.png`)
    expect(absoluteUrl(site, '/sitemap.xml')).toBe(`${site}/sitemap.xml`)
  })
})

describe('matchRoute dengan garis miring ekstra', () => {
  it('rute yang dinormalisasi router tetap cocok', () => {
    expect(matchRoute('/faq').kind).toBe('page')
  })
})
