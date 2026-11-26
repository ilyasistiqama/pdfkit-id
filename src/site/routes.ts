/**
 * Daftar rute tunggal sebagai sumber kebenaran untuk router, prerender, sitemap,
 * navigasi, dan service worker. File ini sengaja bebas React/JSX supaya bisa
 * diimpor juga oleh `vite.config.ts` dan skrip build Node.
 */

export type ToolSlug =
  | 'gabung-pdf'
  | 'pisah-pdf'
  | 'pdf-ke-jpg'
  | 'foto-ke-pdf'
  | 'foto-ke-word'
  | 'pdf-bisa-dicari'
  | 'susun-pdf'
  | 'sensor-pdf'
  | 'workflow-pdf'
  | 'bandingkan-pdf'
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
    slug: 'workflow-pdf', name: 'Workflow PDF',
    tagline: 'Gabung, OCR, putar, dan beri watermark dalam satu proses.',
    description: 'Susun langkah untuk beberapa PDF, simpan preset di perangkat, dan unduh satu salinan hasil tanpa mengunggah dokumen.',
    icon: 'workflow',
  },
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
    slug: 'foto-ke-pdf',
    name: 'Foto ke PDF',
    tagline: 'Susun foto atau scan menjadi satu PDF.',
    description:
      'Gabungkan foto seperti JPG, PNG, WebP, atau AVIF menjadi satu PDF berukuran A4 atau mengikuti ukuran gambar.',
    icon: 'images',
  },
  {
    slug: 'foto-ke-word',
    name: 'Foto ke Word',
    tagline: 'Susun beberapa foto menjadi satu Word yang bisa diedit.',
    description:
      'Atur urutan foto seperti JPG, PNG, WebP, atau AVIF, koreksi hasil OCR, lalu unduh satu dokumen Word (.docx).',
    icon: 'form',
  },
  {
    slug: 'pdf-bisa-dicari', name: 'PDF Scan Bisa Dicari',
    tagline: 'Buat teks pada PDF scan bisa dicari dan disalin.',
    description: 'Tambahkan lapisan teks OCR Indonesia atau Inggris ke PDF hasil scan sambil mempertahankan tampilan halaman.',
    icon: 'search',
  },
  {
    slug: 'susun-pdf', name: 'Susun Halaman PDF',
    tagline: 'Seret, putar, atau hapus halaman lewat pratinjau.',
    description: 'Atur urutan halaman dengan pratinjau, putar halaman yang miring, hapus halaman yang tidak diperlukan, lalu unduh PDF.',
    icon: 'layers',
  },
  {
    slug: 'sensor-pdf', name: 'Sensor PDF',
    tagline: 'Tutup data sensitif secara permanen sebelum dibagikan.',
    description: 'Tandai area sensitif pada halaman PDF dan unduh salinan berisi halaman gambar yang sudah disensor.',
    icon: 'redact',
  },
  {
    slug: 'kompres-pdf',
    name: 'Kompres PDF',
    tagline: 'Perkecil ukuran file agar mudah dikirim.',
    description:
      'Kompres PDF ke target KB atau MB, optimalkan struktur untuk mempertahankan teks dan tautan, atau perkecil halaman dengan rasterisasi.',
    icon: 'gauge',
  },
  {
    slug: 'bandingkan-pdf', name: 'Bandingkan PDF',
    tagline: 'Lihat dua PDF berdampingan dan temukan halaman yang berubah.',
    description: 'Bandingkan teks dan tampilan halaman pada dua versi PDF dengan pratinjau berdampingan dan pengguliran tersinkron.',
    icon: 'compare',
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
    tagline: 'Tempel gambar tanda tangan dan paraf dengan template tersimpan.',
    description:
      'Atur posisi gambar tanda tangan dan paraf, simpan template, lalu lihat pratinjau sebelum memproses banyak PDF di perangkat Anda.',
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

export const ARTICLES_INDEX = {
  title: 'Panduan PDF dan tanda tangan dokumen',
  description: 'Pelajari cara memilih alat PDF, mengolah hasil scan, membandingkan revisi, dan menyiapkan dokumen untuk ditandatangani.',
}

export const ARTICLES: ArticleMeta[] = [
  {
    slug: 'panduan-memilih-alat-pdf',
    title: 'Panduan Memilih Alat PDF Sesuai Kebutuhan',
    description: 'Pilih alat untuk menggabungkan, menyusun, mengonversi, menyensor, mengompres, membandingkan, atau menandatangani PDF langsung di browser.',
    date: '2026-11-26',
    readingMinutes: 4,
  },
  {
    slug: 'workflow-pdf-dari-scan-sampai-siap-kirim',
    title: 'Workflow PDF dari Hasil Scan sampai Siap Dikirim',
    description: 'Gabungkan hasil scan, tambahkan OCR dan watermark, cek revisi, lalu kompres ke batas ukuran atau gunakan template tanda tangan massal.',
    date: '2026-11-26',
    readingMinutes: 5,
  },
  {
    slug: 'cara-tanda-tangan-pdf-di-hp',
    title: 'Cara Tanda Tangan PDF di HP Tanpa Aplikasi Tambahan',
    description:
      'Langkah demi langkah menandatangani PDF dari HP Android atau iPhone lewat browser, tanpa memasang aplikasi dan tanpa mengunggah dokumen.',
    date: '2026-11-20',
    updated: '2026-11-26',
    readingMinutes: 5,
  },
  {
    slug: 'apa-itu-tanda-tangan-elektronik',
    title: 'Apa Itu Tanda Tangan Elektronik dan Kapan Sah Digunakan',
    description:
      'Penjelasan sederhana tentang tanda tangan elektronik, dasar hukumnya di Indonesia, dan kapan bentuk paling sederhana sudah cukup.',
    date: '2026-11-20',
    updated: '2026-11-26',
    readingMinutes: 4,
  },
  {
    slug: 'beda-tanda-tangan-elektronik-dan-psre',
    title: 'Beda Tanda Tangan Elektronik Biasa dan Tersertifikasi PSrE',
    description:
      'Perbedaan tanda tangan elektronik gambar dengan tanda tangan digital bersertifikat, plus panduan memilih yang sesuai kebutuhan dokumen Anda.',
    date: '2026-11-20',
    updated: '2026-11-26',
    readingMinutes: 4,
  },
  {
    slug: 'cara-tanda-tangan-di-word-simpan-pdf',
    title: 'Cara Tanda Tangan di Word Lalu Simpan sebagai PDF',
    description:
      'Tiga cara menyisipkan tanda tangan di Microsoft Word, kelebihan dan kekurangannya, serta cara menyimpan hasilnya menjadi PDF yang rapi.',
    date: '2026-11-20',
    updated: '2026-11-26',
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
        'Gabung, pisah, dan kompres PDF, atau ubah foto dokumen menjadi Word. Semua alat berjalan langsung di browser.',
      priority: 0.9,
    },
    {
      path: '/artikel',
      ...ARTICLES_INDEX,
      priority: 0.8,
    },
  ]

  for (const tool of TOOLS) {
    routes.push({
      path: `/alat/${tool.slug}`,
      title: toolTitle(tool),
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

export function toolTitle(tool: ToolMeta) {
  return tool.slug === 'foto-ke-word'
    ? 'Foto ke Word (DOCX) — OCR gratis di browser'
    : `${tool.name} — alat PDF gratis di browser`
}
