/** Identitas situs dan helper URL. Semua rute memakai path absolut tanpa base. */

export const SITE_NAME = 'Tanda Tangan PDF'
export const SITE_TAGLINE = 'Tanda tangani PDF langsung di halamannya'

/** Diisi saat build (mis. https://ttdpdf.id). Kosong = canonical dimatikan. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '')

/** Base path Vite tanpa garis miring di akhir ('' untuk root). */
export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/+$/, '')

/**
 * Path rute → URL yang bisa dipakai di href. Rute diberi garis miring akhir
 * agar hosting statis (GitHub Pages) menyajikan folder tanpa redirect.
 */
export const href = (path: string) => {
  const clean = path.replace(/\/+$/, '')
  return clean ? `${BASE_PATH}${clean}/` : `${BASE_PATH}/`
}

/** Path berakhiran ekstensi (og.png, sitemap.xml) adalah file, bukan folder rute. */
const isFile = (path: string) => /\.[a-z0-9]+$/i.test(path)

/**
 * URL absolut untuk canonical/OG. Rute diberi garis miring akhir seperti URL yang
 * disajikan; file (mis. /og.png) tidak, karena "og.png/" menghasilkan 404.
 */
export const absoluteUrl = (siteUrl: string, path: string) => {
  if (!siteUrl) return ''
  const clean = path.replace(/\/+$/, '')
  if (!clean) return `${siteUrl}/`
  return isFile(clean) ? `${siteUrl}${clean}` : `${siteUrl}${clean}/`
}

export const absolute = (path: string) => absoluteUrl(SITE_URL, path)

export const CONTACT_EMAIL = 'ilyasistiqama@gmail.com'

/** Tanggal terakhir konten situs diperbarui (dipakai sitemap). */
export const CONTENT_UPDATED = '2026-11-20'
