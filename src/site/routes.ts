/**
 * Daftar rute tunggal sebagai sumber kebenaran untuk router, prerender, sitemap,
 * navigasi, dan service worker. File ini sengaja bebas React/JSX supaya bisa
 * diimpor juga oleh `vite.config.ts` dan skrip build Node.
 */

export type ToolSlug =
  | 'gabung-pdf'
  | 'pisah-pdf'
  | 'pdf-ke-jpg'
  | 'jpg-ke-pdf'
  | 'kompres-pdf'
  | 'putar-pdf'
  | 'watermark-pdf'
  | 'isi-formulir-pdf'
  | 'tanda-tangan-massal'

export type ToolMeta = {
  slug: ToolSlug
  name: string
  /** satu baris untuk kartu di beranda */
  tagline: string
  /** meta description halaman */
  description: string
  icon: string
}

export const TOOLS: ToolMeta[] = [
  {
    slug: 'gabung-pdf',
    name: 'Gabung PDF',
    tagline: 'Satukan beberapa PDF menjadi satu berkas.',
    description:
      'Gabungkan dua atau lebih berkas PDF menjadi satu dokumen langsung di browser. Urutan bisa diatur, file tidak diunggah ke server.',
    icon: 'merge',
  },
  {
    slug: 'pisah-pdf',
    name: 'Pisah PDF',
    tagline: 'Ambil halaman tertentu atau pecah jadi beberapa file.',
    description:
      'Pisahkan PDF menjadi beberapa berkas berdasarkan rentang halaman, atau simpan setiap halaman sebagai file sendiri. Tanpa server.',
    icon: 'split',
  },
  {
    slug: 'pdf-ke-jpg',
    name: 'PDF ke JPG',
    tagline: 'Ubah halaman PDF menjadi gambar JPG atau PNG.',
    description:
      'Simpan setiap halaman PDF sebagai gambar JPG atau PNG dengan resolusi pilihan. Cocok untuk lampiran chat atau pratinjau.',
    icon: 'image',
  },
  {
    slug: 'jpg-ke-pdf',
    name: 'JPG ke PDF',
    tagline: 'Susun foto atau scan menjadi satu PDF.',
    description:
      'Ubah beberapa foto JPG atau PNG menjadi satu berkas PDF yang rapi, dengan ukuran A4 atau mengikuti ukuran gambar.',
    icon: 'images',
  },
  {
    slug: 'kompres-pdf',
    name: 'Kompres PDF',
    tagline: 'Perkecil ukuran file agar mudah dikirim.',
    description:
      'Kurangi ukuran PDF dengan menurunkan resolusi dan kualitas gambar per halaman. Hasilnya berupa PDF gambar, bukan PDF berteks.',
    icon: 'gauge',
  },
  {
    slug: 'putar-pdf',
    name: 'Putar PDF',
    tagline: 'Perbaiki halaman yang tampil miring atau terbalik.',
    description:
      'Putar semua halaman atau halaman tertentu sebesar 90, 180, atau 270 derajat, lalu unduh PDF yang sudah benar arahnya.',
    icon: 'rotate',
  },
  {
    slug: 'watermark-pdf',
    name: 'Watermark PDF',
    tagline: 'Beri tanda "RAHASIA" atau teks lain di setiap halaman.',
    description:
      'Tambahkan watermark teks di seluruh halaman PDF dengan pengaturan ukuran, warna, dan transparansi. Diproses di browser.',
    icon: 'stamp',
  },
  {
    slug: 'isi-formulir-pdf',
    name: 'Isi Formulir PDF',
    tagline: 'Isi kolom formulir PDF lalu simpan hasilnya.',
    description:
      'Isi kolom teks, kotak centang, dan pilihan pada formulir PDF langsung di browser, lalu unduh PDF yang sudah terisi.',
    icon: 'form',
  },
  {
    slug: 'tanda-tangan-massal',
    name: 'Tanda Tangan Massal',
    tagline: 'Tempel satu tanda tangan ke banyak dokumen sekaligus.',
    description:
      'Gunakan tanda tangan yang tersimpan untuk dibubuhkan pada banyak PDF sekaligus di posisi yang sama. Semua diproses di perangkat.',
    icon: 'layers',
  },
]

export type ArticleMeta = {
  slug: string
  title: string
  description: string
  date: string
  updated?: string
  readingMinutes: number
}

export const ARTICLES: ArticleMeta[] = [
  {
    slug: 'cara-tanda-tangan-pdf-di-hp',
    title: 'Cara Tanda Tangan PDF di HP Tanpa Aplikasi Tambahan',
    description:
      'Langkah demi langkah menandatangani PDF dari HP Android atau iPhone lewat browser, tanpa memasang aplikasi dan tanpa mengunggah dokumen.',
    date: '2026-11-20',
    readingMinutes: 5,
  },
  {
    slug: 'apa-itu-tanda-tangan-elektronik',
    title: 'Apa Itu Tanda Tangan Elektronik dan Kapan Sah Digunakan',
    description:
      'Penjelasan sederhana tentang tanda tangan elektronik, dasar hukumnya di Indonesia, dan kapan bentuk paling sederhana sudah cukup.',
    date: '2026-11-20',
    readingMinutes: 6,
  },
  {
    slug: 'beda-tanda-tangan-elektronik-dan-psre',
    title: 'Beda Tanda Tangan Elektronik Biasa dan Tersertifikasi PSrE',
    description:
      'Perbedaan tanda tangan elektronik gambar dengan tanda tangan digital bersertifikat, plus panduan memilih yang sesuai kebutuhan dokumen Anda.',
    date: '2026-11-20',
    readingMinutes: 6,
  },
  {
    slug: 'cara-tanda-tangan-di-word-simpan-pdf',
    title: 'Cara Tanda Tangan di Word Lalu Simpan sebagai PDF',
    description:
      'Tiga cara menyisipkan tanda tangan di Microsoft Word, kelebihan dan kekurangannya, serta cara menyimpan hasilnya menjadi PDF yang rapi.',
    date: '2026-11-20',
    readingMinutes: 5,
  },
]

export const STATIC_PAGES = {
  tentang: {
    path: '/tentang',
    title: 'Tentang',
    description:
      'Tentang Tanda Tangan PDF: alat tanda tangan dokumen yang berjalan sepenuhnya di browser, tanpa unggahan, akun, atau pelacakan isi dokumen.',
  },
  privasi: {
    path: '/privasi',
    title: 'Kebijakan Privasi',
    description:
      'Kebijakan privasi Tanda Tangan PDF: apa yang tetap di perangkat Anda, apa yang diproses pihak ketiga, dan cara mengatur cookie iklan.',
  },
  syarat: {
    path: '/syarat',
    title: 'Syarat dan Ketentuan',
    description:
      'Syarat dan ketentuan penggunaan Tanda Tangan PDF, termasuk batasan tanggung jawab dan status tanda tangan elektronik yang dihasilkan.',
  },
  faq: {
    path: '/faq',
    title: 'Pertanyaan yang Sering Diajukan',
    description:
      'Jawaban singkat soal keamanan file, keabsahan tanda tangan, batas ukuran dokumen, dan cara kerja Tanda Tangan PDF di browser.',
  },
} as const

export type StaticPageKey = keyof typeof STATIC_PAGES

export type Match =
  | { kind: 'home' }
  | { kind: 'tools' }
  | { kind: 'tool'; tool: ToolMeta }
  | { kind: 'articles' }
  | { kind: 'article'; article: ArticleMeta }
  | { kind: 'page'; key: StaticPageKey }
  | { kind: 'notFound' }

/** Path dari router sudah bebas base dan selalu diawali "/" tanpa garis miring akhir. */
export function matchRoute(path: string): Match {
  if (path === '/') return { kind: 'home' }

  const toolMatch = /^\/alat\/([a-z0-9-]+)$/.exec(path)
  if (toolMatch) {
    const tool = TOOLS.find((item) => item.slug === toolMatch[1])
    return tool ? { kind: 'tool', tool } : { kind: 'notFound' }
  }

  const articleMatch = /^\/artikel\/([a-z0-9-]+)$/.exec(path)
  if (articleMatch) {
    const article = ARTICLES.find((item) => item.slug === articleMatch[1])
    return article ? { kind: 'article', article } : { kind: 'notFound' }
  }

  if (path === '/alat') return { kind: 'tools' }
  if (path === '/artikel') return { kind: 'articles' }

  for (const key of Object.keys(STATIC_PAGES) as StaticPageKey[]) {
    if (STATIC_PAGES[key].path === path) return { kind: 'page', key }
  }

  return { kind: 'notFound' }
}

export type SiteRoute = {
  path: string
  title: string
  description: string
  priority: number
}

/** Semua halaman statis, dipakai untuk prerender dan sitemap. */
export function siteRoutes(): SiteRoute[] {
  const routes: SiteRoute[] = [
    {
      path: '/',
      title: 'Tanda Tangan PDF — Tanda tangani dokumen langsung di browser',
      description:
        'Gambar atau unggah tanda tangan, tempel di halaman PDF, lalu unduh. Gratis, tanpa akun, dan file tidak pernah diunggah ke server.',
      priority: 1,
    },
    {
      path: '/alat',
      title: 'Alat PDF — gabung, pisah, kompres, dan lainnya',
      description:
        'Kumpulan alat PDF gratis yang berjalan di browser: gabung, pisah, PDF ke JPG, JPG ke PDF, kompres, putar, watermark, dan isi formulir.',
      priority: 0.9,
    },
    {
      path: '/artikel',
      title: 'Artikel — panduan tanda tangan dokumen',
      description:
        'Panduan praktis seputar tanda tangan elektronik, keabsahan dokumen, dan cara menangani PDF di HP maupun komputer.',
      priority: 0.8,
    },
  ]

  for (const tool of TOOLS) {
    routes.push({
      path: `/alat/${tool.slug}`,
      title: `${tool.name} — alat PDF gratis di browser`,
      description: tool.description,
      priority: 0.8,
    })
  }

  for (const article of ARTICLES) {
    routes.push({
      path: `/artikel/${article.slug}`,
      title: article.title,
      description: article.description,
      priority: 0.6,
    })
  }

  for (const page of Object.values(STATIC_PAGES)) {
    routes.push({
      path: page.path,
      title: page.title,
      description: page.description,
      priority: page.path === '/faq' ? 0.5 : 0.4,
    })
  }

  return routes
}
