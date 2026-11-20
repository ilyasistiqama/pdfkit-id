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

/** URL absolut untuk canonical/OG, dengan garis miring akhir seperti URL yang disajikan. */
export const absolute = (path: string) => {
  if (!SITE_URL) return ''
  const clean = path.replace(/\/+$/, '')
  return clean ? `${SITE_URL}${clean}/` : `${SITE_URL}/`
}

export const CONTACT_EMAIL = 'ilyasistiqama@gmail.com'

/** Tanggal terakhir konten situs diperbarui (dipakai sitemap). */
export const CONTENT_UPDATED = '2026-11-20'
