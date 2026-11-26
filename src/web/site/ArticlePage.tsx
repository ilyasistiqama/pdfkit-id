import type { ReactNode } from 'react'
import { Link } from '../../router'
import { ARTICLES, TOOLS, type ArticleMeta, type ToolSlug } from '../../site/routes'
import { CONTACT_EMAIL } from '../../site/site'
import { AdSlot } from './AdSlot'
import { eyebrow } from '../ui'

export type Block =
  | { h2: string; p?: string[]; ul?: string[]; ol?: string[]; tools?: ToolSlug[] }
  | { callout: string }

type Reference = { label: string; url: string }
export type ArticleBody = {
  intro: string
  blocks: Block[]
  closing?: string
  cta?: { label: string; to: string }
  sources?: Reference[]
}

const signatureRules = {
  label: 'PP 71 Tahun 2019, Pasal 59–60 (JDIH Komdigi)',
  url: 'https://jdih.komdigi.go.id/produk_hukum/view/id/695/t/common',
}

const BODIES: Record<string, ArticleBody> = {
  'panduan-memilih-alat-pdf': {
    intro:
      'Kalau hasil scan perlu bisa dicari, lampiran harus muat dalam 2 MB, atau Anda ingin tahu apa yang berubah dari versi kemarin, gunakan panduan ini untuk memilih alat PDFKit berdasarkan hasil yang diinginkan. Berkas diproses langsung di browser.',
    blocks: [
      {
        h2: 'Gabungkan lampiran atau rapikan satu dokumen',
        ul: [
          'Gabung PDF menyatukan beberapa berkas sesuai urutan daftar. Cocok untuk mengirim surat utama bersama semua lampirannya.',
          'Pisah PDF mengambil rentang tertentu, misalnya halaman 1–3 dan 8. Susun Halaman PDF menyediakan pratinjau untuk mengurutkan, memutar, dan membuang halaman.',
          'Putar PDF memutar semua halaman, halaman ganjil, atau halaman genap sekaligus. Ini membantu saat arah halaman bolak-balik setelah dipindai.',
          'Workflow PDF menjalankan beberapa pekerjaan dalam sekali proses. Contohnya, gabungkan lampiran, tambahkan OCR, lalu beri watermark sebelum unduh.',
        ],
        tools: ['gabung-pdf', 'pisah-pdf', 'susun-pdf', 'putar-pdf', 'workflow-pdf'],
      },
      {
        h2: 'Ubah foto, gambar, atau hasil scan',
        ul: [
          'Foto ke PDF menyusun foto seperti JPG, PNG, WebP, atau AVIF sebagai halaman PDF. Dukungan HEIC, HEIF, dan TIFF mengikuti browser. PDF ke JPG mengekspor halaman ke JPG atau PNG.',
          'PDF Scan Bisa Dicari memakai OCR Indonesia atau Inggris untuk menambahkan teks yang dapat dicari atau disalin sambil mempertahankan tampilan scan.',
          'Foto ke Word cocok kalau isi foto dokumen perlu diedit. Periksa hasil OCR sambil melihat foto asli sebelum mengekspor dokumen DOCX.',
        ],
        tools: ['foto-ke-pdf', 'pdf-ke-jpg', 'pdf-bisa-dicari', 'foto-ke-word'],
      },
      {
        h2: 'Periksa revisi dan ukuran sebelum dikirim',
        ul: [
          'Bandingkan PDF menampilkan dua versi berdampingan dan menandai halaman yang berbeda berdasarkan teks dan tampilan. Pencocokan mengikuti nomor halaman, sehingga sisipan dapat menggeser perbandingan setelahnya.',
          'Kompres PDF menerima target KB atau MB. Mulai dengan mode yang menjaga teks dan tautan jika penerima masih perlu menyalin teks atau membuka tautan. Cek ukuran akhir dan pratinjau sebelum mengirim.',
        ],
        tools: ['bandingkan-pdf', 'kompres-pdf'],
      },
      {
        h2: 'Isi, lindungi, dan siapkan dokumen untuk ditandatangani',
        ul: [
          'Isi Formulir PDF mengisi kolom teks, centang, dan pilihan yang sudah tersedia pada formulir AcroForm.',
          'Watermark PDF memberi label seperti “DRAF” atau “SALINAN”. Untuk menutupi informasi sensitif, gunakan Sensor PDF. Hasil sensor berupa salinan PDF berbasis gambar.',
          'Tanda Tangan Massal menempelkan gambar tanda tangan dan paraf di banyak berkas. Simpan posisi dan keterangan sebagai template, lalu cek pratinjau untuk memastikan gambar tidak menutupi isi dokumen.',
        ],
        tools: ['isi-formulir-pdf', 'watermark-pdf', 'sensor-pdf', 'tanda-tangan-massal'],
      },
    ],
    closing: 'Simpan PDF asli. Untuk dokumen yang sudah bertanda tangan digital, cek hasil sebelum membagikan salinan yang diedit atau diekspor ulang.',
    cta: { label: 'Lihat semua alat PDF', to: '/alat' },
  },
  'workflow-pdf-dari-scan-sampai-siap-kirim': {
    intro:
      'Anda punya surat pengantar, hasil scan, dan beberapa lampiran yang harus dikirim sebagai satu PDF berukuran maksimal 2 MB. Contoh ini menunjukkan cara menyusun dokumen, mengecek revisi, lalu memilih hasil yang siap dikirim. Semua langkah pemrosesan berkas berjalan di browser.',
    blocks: [
      {
        h2: 'Satukan berkas, tambahkan OCR dan watermark',
        ol: [
          'Buka Workflow PDF. Pilih surat pengantar dan semua lampiran, lalu urutkan sesuai susunan yang ingin dibaca penerima.',
          'Tambahkan “OCR agar teks bisa dicari” untuk halaman scan. Pilih bahasa sesuai isi dokumen. Kalau perlu label seperti “DRAF” atau “SALINAN”, isi teks watermark. Jalankan OCR sebelum watermark agar halaman scan bisa dibaca.',
          'Pilih “Jalankan dan unduh PDF”. Coba cari kata yang muncul pada halaman scan dan periksa apakah urutan halaman sudah benar. Simpan preset jika susunan langkah ini akan sering dipakai.',
        ],
        tools: ['workflow-pdf', 'pdf-bisa-dicari'],
      },
      {
        h2: 'Cek revisi sebelum membuat salinan akhir',
        p: [
          'Jika ada dua versi, buka Bandingkan PDF. Pilih versi awal dan revisi, tekan “Bandingkan semua halaman”, lalu gunakan “Lompat ke perubahan”. Kedua tampilan bisa digulir bersama saat Anda memeriksa halaman.',
          'PDFKit membandingkan nomor halaman yang setara. Kalau versi baru punya sisipan di tengah, periksa urutan secara manual mulai dari halaman sisipan.',
        ],
        tools: ['bandingkan-pdf'],
      },
      {
        h2: 'Kompres sesuai batas pengiriman',
        p: [
          'Buka Kompres PDF, aktifkan “Tetapkan ukuran maksimum”, lalu masukkan 2 MB atau batas yang diminta. Coba “Pertahankan teks dan tautan” dulu jika hasil OCR masih diperlukan.',
          'Jika perlu penghematan lebih besar, coba rasterisasi. Halaman yang dirasterisasi jadi gambar sehingga teks hasil OCR tidak lagi bisa diseleksi dan tautan tidak aktif. Periksa status target dan pratinjau halaman, terutama angka kecil atau catatan kaki.',
        ],
        tools: ['kompres-pdf'],
      },
      {
        h2: 'Pakai template jika banyak berkas punya tata letak yang sama',
        p: [
          'Untuk sekumpulan berkas terpisah seperti surat dengan format sama, buka Tanda Tangan Massal. Pilih gambar tanda tangan yang berhak Anda gunakan, atur halaman dan posisi, serta tambahkan paraf bila diperlukan.',
          'Simpan posisi, ukuran, nama, jabatan, dan tanggal sebagai template. Saat memakai template, pilih kembali gambar yang akan dipakai. Buka pratinjau sebelum memproses semua berkas.',
        ],
        tools: ['tanda-tangan-massal'],
      },
      {
        callout: 'Jika PDF sudah memakai tanda tangan digital, simpan versi aslinya. Menggabungkan, mengompres, atau menambah watermark dapat membatalkan tanda tangan pada salinan hasil.',
      },
    ],
    cta: { label: 'Buka Workflow PDF', to: '/alat/workflow-pdf' },
  },
  'cara-tanda-tangan-pdf-di-hp': {
    intro:
      'Banyak dokumen sekarang datang dalam bentuk PDF lewat WhatsApp atau email, dan sering kali harus ditandatangani saat itu juga dari HP. Anda tidak perlu memasang aplikasi tambahan: browser di Android maupun iPhone sudah cukup.',
    blocks: [
      {
        h2: 'Yang perlu disiapkan',
        ul: [
          'Berkas PDF yang akan ditandatangani, tersimpan di HP.',
          'Foto tanda tangan di kertas putih (opsional) bila Anda tidak ingin menggambar langsung.',
          'Koneksi internet hanya untuk membuka halaman, bukan untuk memproses dokumen.',
        ],
      },
      {
        h2: 'Langkah 1: buka dokumen',
        p: [
          'Buka halaman utama alat ini, lalu pilih “Pilih PDF atau seret ke sini”. Di HP, tombol itu membuka pemilih berkas. Pilih PDF dari folder Unduhan atau dari aplikasi penyimpanan Anda.',
          'Setelah dimuat, halaman akan tampil seperti aslinya. Gunakan rel halaman di kiri pada layar lebar, atau geser ke atas-bawah pada layar HP untuk berpindah halaman.',
        ],
      },
      {
        h2: 'Langkah 2: buat tanda tangan',
        p: [
          'Ada dua pilihan. Pertama, gambar langsung dengan jari pada area tanda tangan. Ini paling cepat kalau tanda tangan Anda sederhana. Kedua, unggah foto tanda tangan di kertas putih; latar putihnya akan dihapus otomatis sehingga tersisa goresan tinta saja.',
          'Kalau dokumen membutuhkan nama dan jabatan di bawah tanda tangan, buka bagian “Keterangan nama & tanggal”. Blok keterangan itu digabung ke dalam gambar sehingga ikut tercetak di posisi yang sama.',
        ],
      },
      {
        h2: 'Langkah 3: tempel dan atur posisi',
        p: [
          'Tekan “Tempel di halaman”. Tanda tangan muncul di halaman yang sedang Anda lihat. Geser dengan jari ke posisi yang tepat, tarik titik emas di sudut untuk mengubah ukuran, dan gunakan tombol putar bila perlu dimiringkan sedikit agar sejajar dengan garis tanda tangan.',
          'Untuk presisi, gunakan dua jari untuk memperbesar tampilan. Posisi tanda tangan tetap benar saat zoom berubah.',
        ],
      },
      {
        h2: 'Langkah 4: unduh',
        p: [
          'Tekan “Unduh PDF”. File baru akan tersimpan di folder Unduhan HP Anda dengan akhiran “-ttd”. PDF asli tidak diubah, jadi Anda tetap punya salinan tanpa tanda tangan bila perlu.',
        ],
      },
      {
        h2: 'Kalau dokumennya lebih dari satu',
        p: [
          'Jika beberapa PDF memakai posisi yang sama, buka Tanda Tangan Massal. Anda bisa menyiapkan tanda tangan di halaman terakhir, paraf di semua halaman, dan keterangan nama atau jabatan. Cek satu atau beberapa berkas lewat pratinjau sebelum memproses semuanya.',
          'Kalau penerima meminta satu berkas gabungan untuk dokumen dan lampirannya, susun dulu dengan Gabung PDF atau Workflow PDF, lalu buka hasilnya di alat tanda tangan.',
        ],
        tools: ['tanda-tangan-massal', 'gabung-pdf', 'workflow-pdf'],
      },
      {
        h2: 'Kendala yang sering muncul di HP',
        ul: [
          'Layar kecil membuat penempatan presisi sulit: perbesar halaman dulu, lalu geser dengan gerakan pendek.',
          'Safari di iPhone kadang membuka PDF di penampil bawaan: pastikan Anda memilih berkas lewat tombol di halaman ini, bukan membukanya dari aplikasi Files.',
          'File sangat besar bisa lambat: tutup tab lain agar memori cukup.',
        ],
      },
    ],
    closing:
      'Setelah selesai, periksa hasil unduhan di penampil PDF HP Anda untuk memastikan tanda tangan berada di tempat yang benar sebelum dikirim.',
  },
  'apa-itu-tanda-tangan-elektronik': {
    intro:
      'Tanda tangan bisa terlihat serupa di atas PDF meski cara memeriksa identitas penanda tangan dan keutuhan dokumennya berbeda. Di Indonesia, syarat keabsahan berkaitan dengan proses yang dipakai untuk menandatangani dokumen.',
    blocks: [
      {
        h2: 'Definisi singkat',
        p: [
          'Tanda tangan elektronik mengaitkan penanda tangan dengan informasi elektronik untuk membantu memeriksa identitas dan keutuhan informasi tersebut.',
          'Pasal 59 PP No. 71 Tahun 2019 antara lain mensyaratkan kendali penanda tangan atas data pembuatan tanda tangan, cara untuk menunjukkan identitas dan persetujuannya, serta kemampuan mengetahui perubahan setelah penandatanganan.',
        ],
      },
      {
        h2: 'Dua jenis menurut aturan Indonesia',
        ol: [
          'Tanda tangan elektronik tersertifikasi menggunakan sertifikat dari Penyelenggara Sertifikasi Elektronik (PSrE) Indonesia dan perangkat pembuat tanda tangan tersertifikasi.',
          'Tanda tangan elektronik tidak tersertifikasi dibuat tanpa jasa PSrE Indonesia. Kekuatan pembuktiannya bergantung pada bukti dan proses yang menyertai penandatanganan.',
        ],
      },
      {
        h2: 'Periksa format yang diterima',
        p: [
          'Tanyakan format tanda tangan yang diterima sebelum mengisi surat, formulir, atau dokumen internal. Kalau penerima menerima gambar tanda tangan, simpan dokumen asli dan pastikan pihak yang bersangkutan menyetujui isi dokumen.',
        ],
      },
      {
        h2: 'Kapan sebaiknya memakai PSrE',
        p: [
          'Jika penerima mensyaratkan tanda tangan tersertifikasi, siapkan dokumen final dan gunakan layanan PSrE. Selesaikan pekerjaan seperti mengisi formulir, menggabungkan lampiran, dan mengompres PDF sebelum penandatanganan.',
          'Alat tanda tangan PDFKit menempelkan gambar dan keterangan ke halaman. Pemeriksaan tanda tangan digital pada beberapa alat memberi tahu jika data tanda tangan terdeteksi sebelum Anda menyunting salinan.',
        ],
        tools: ['isi-formulir-pdf', 'workflow-pdf', 'kompres-pdf'],
      },
    ],
    sources: [signatureRules],
    cta: { label: 'Lihat alat untuk menyiapkan PDF', to: '/alat' },
  },
  'beda-tanda-tangan-elektronik-dan-psre': {
    intro:
      'Dua PDF bisa menampilkan gambar tanda tangan yang sama, tetapi pembaca mungkin hanya dapat memeriksa identitas dan keutuhan dokumen lewat informasi yang tersimpan di salah satunya.',
    blocks: [
      {
        h2: 'Gambar tanda tangan di halaman PDF',
        p: [
          'Gambar menampilkan bentuk tanda tangan yang ditambahkan ke halaman. Bukti siapa yang menyetujui isi dokumen perlu dilihat dari proses yang menyertainya. Gunakan gambar milik sendiri atau gambar yang penggunaannya sudah diizinkan pemiliknya.',
        ],
      },
      {
        h2: 'Tanda tangan tersertifikasi PSrE',
        p: [
          'Tanda tangan elektronik tersertifikasi menggunakan sertifikat dari PSrE Indonesia. Sertifikat dan data tanda tangan kriptografis membantu pemeriksaan identitas serta keutuhan bagian dokumen yang ditandatangani.',
          'Perubahan setelah penandatanganan dapat memengaruhi hasil pemeriksaan, termasuk ketika PDF digabung atau diekspor ulang. Simpan berkas asli yang sudah ditandatangani dan selesaikan penyuntingan sebelum menandatangani versi final.',
        ],
      },
      {
        h2: 'Cara memeriksa revisi sebelum tanda tangan',
        p: [
          'Gunakan Bandingkan PDF untuk melihat perbedaan teks dan tampilan sebelum memilih versi final. Jika PDFKit menampilkan peringatan tanda tangan digital, pertahankan berkas aslinya dan gunakan layanan PSrE yang sesuai untuk memeriksa status sertifikat.',
        ],
        tools: ['bandingkan-pdf'],
      },
      {
        h2: 'Pilih cara yang diterima pihak tujuan',
        p: [
          'Tanyakan syarat penerima sebelum mengirim dokumen. Jika gambar diterima dan ada beberapa dokumen berformat sama, PDFKit menyediakan template tanda tangan massal untuk mengulang posisi gambar dan paraf.',
        ],
        tools: ['tanda-tangan-massal'],
      },
    ],
    sources: [signatureRules],
    cta: { label: 'Buka Bandingkan PDF', to: '/alat/bandingkan-pdf' },
  },
  'cara-tanda-tangan-di-word-simpan-pdf': {
    intro:
      'Microsoft Word menyediakan beberapa cara menyisipkan tanda tangan. Masing-masing punya kelebihan, dan semuanya berakhir pada satu langkah yang sama: menyimpan dokumen sebagai PDF agar tampilannya tidak bergeser.',
    blocks: [
      {
        h2: 'Cara 1: sisipkan gambar tanda tangan',
        ol: [
          'Buat tanda tangan di kertas putih, foto dengan pencahayaan rata, lalu pindahkan fotonya ke komputer.',
          'Di Word, buka Insert → Pictures dan pilih foto tanda tangan.',
          'Gunakan Picture Format → Remove Background atau atur transparansi agar latar putih hilang.',
          'Ubah tata letak gambar menjadi “In Front of Text” supaya bisa digeser bebas tanpa mengganggu teks.',
        ],
      },
      {
        h2: 'Cara 2: gambar langsung dengan fitur Draw',
        p: [
          'Kalau Anda memakai Word versi terbaru dengan layar sentuh, tab Draw memungkinkan Anda menggambar tanda tangan langsung di dokumen. Hasilnya berupa objek tinta yang bisa dipindah dan diubah ukurannya seperti gambar.',
          'Kekurangannya, hasil gambar dengan mouse kurang natural dibanding tanda tangan asli yang dipindai.',
        ],
      },
      {
        h2: 'Cara 3: gunakan Signature Line di Word desktop',
        p: [
          'Menu Insert → Signature Line menambahkan tempat tanda tangan yang bisa memuat nama dan jabatan. Saat penanda tangan menyelesaikan proses Sign, Word menambahkan tampilan tanda tangan dan tanda tangan digital berbasis sertifikat pada file Word.',
          'Kalau penerima meminta PDF yang ditandatangani secara digital, ekspor PDF final terlebih dahulu dan gunakan layanan penandatanganan yang sesuai untuk berkas PDF tersebut.',
        ],
      },
      {
        h2: 'Menyimpan sebagai PDF',
        p: [
          'Untuk menyimpan salinan PDF, pilih File → Save As atau Export, lalu pilih format PDF. Periksa hasilnya di penampil PDF untuk memastikan tanda tangan berada di halaman dan posisi yang benar.',
        ],
      },
      {
        h2: 'Kalau Anda hanya punya PDF, bukan file Word',
        p: [
          'Jika PDF sudah siap, buka di alat tanda tangan PDFKit, tempel gambar tanda tangan di halaman yang sesuai, lalu unduh salinannya.',
        ],
      },
      {
        h2: 'Kalau sumbernya foto dokumen',
        p: [
          'Pilih Foto ke Word jika teks dari beberapa foto perlu disunting dalam satu DOCX. Tinjau hasil OCR sebelum mengunduh. Jika cukup menyusun foto sebagai halaman PDF, gunakan Foto ke PDF, lalu tambahkan gambar tanda tangan setelah susunan halaman final.',
        ],
        tools: ['foto-ke-word', 'foto-ke-pdf'],
      },
    ],
    sources: [{
      label: 'Panduan tanda tangan digital Microsoft 365',
      url: 'https://support.microsoft.com/en-us/office/security-privacy/add-or-remove-a-digital-signature-for-microsoft-365-files',
    }],
    closing:
      'Selesaikan penyuntingan dan periksa posisi tanda tangan pada PDF akhir sebelum membagikannya.',
  },
}

const toolNames = new Map(TOOLS.map((tool) => [tool.slug, tool.name]))
const dateFormat = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'UTC' })

export function ArticlePage({ article }: { article: ArticleMeta }) {
  const body = BODIES[article.slug]
  const others = ARTICLES.filter((item) => item.slug !== article.slug).slice(0, 2)
  const date = article.updated ?? article.date
  const cta = body.cta ?? { label: 'Buka alat tanda tangan', to: '/' }

  return (
    <article className="mx-auto w-full max-w-3xl px-5 pt-10 pb-4">
      <p className={eyebrow}>Panduan</p>
      <h1 className="mt-2 font-serif text-3xl leading-tight tracking-tight sm:text-[2.4rem]">
        {article.title}
      </h1>
      <p className="mt-2 text-[0.75rem] text-muted">
        {article.readingMinutes} menit baca · {article.updated ? 'Diperbarui' : 'Terbit'}{' '}
        <time dateTime={date}>{dateFormat.format(new Date(date))}</time>
      </p>
      <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">{body.intro}</p>

      <div className="mt-8 space-y-2">
        {body.blocks.map((block, index) => (
          <section key={index}>
            {'callout' in block ? (
              <p className="my-5 rounded-2xl bg-gold-soft px-4 py-3 text-[0.88rem] leading-relaxed text-ink-soft">
                {block.callout}
              </p>
            ) : (
              <div className="mt-7 first:mt-0">
                <h2 className="font-serif text-xl tracking-tight text-ink">{block.h2}</h2>
                {block.p?.map((paragraph) => (
                  <p key={paragraph} className="mt-2.5 text-[0.92rem] leading-relaxed text-ink-soft">
                    {paragraph}
                  </p>
                ))}
                {block.ul && (
                  <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-[0.92rem] leading-relaxed text-ink-soft">
                    {block.ul.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {block.ol && (
                  <ol className="mt-2.5 list-decimal space-y-1.5 pl-5 text-[0.92rem] leading-relaxed text-ink-soft">
                    {block.ol.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                )}
                {block.tools && (
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Alat untuk ${block.h2.toLowerCase()}`}>
                    {block.tools.map((slug) => (
                      <li key={slug}>
                        <Link to={`/alat/${slug}`} className="inline-flex rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-gold ring-1 ring-line hover:underline">
                          {toolNames.get(slug)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        ))}
      </div>

      {body.closing && (
        <p className="mt-7 border-l-2 border-gold pl-4 text-[0.92rem] leading-relaxed text-ink-soft">
          {body.closing}
        </p>
      )}

      {body.sources && (
        <div className="mt-6 space-y-1 text-sm">
          <p className="font-medium text-ink-soft">Rujukan</p>
          {body.sources.map((source) => (
            <a key={source.url} href={source.url} className="block text-gold underline-offset-2 hover:underline">
              {source.label}
            </a>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-2xl bg-surface p-5 ring-1 ring-line/70">
        <p className="font-serif text-lg tracking-tight">Coba langsung</p>
        <Link
          to={cta.to}
          className="mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-ink px-5 text-sm font-medium text-on-ink transition active:scale-[0.99]"
        >
          {cta.label}
        </Link>
      </div>

      <AdSlot slot="content" className="mt-8" />

      <section className="mt-10">
        <p className={eyebrow}>Baca juga</p>
        <ul className="mt-3 space-y-2">
          {others.map((item) => (
            <li key={item.slug}>
              <Link
                to={`/artikel/${item.slug}`}
                className="block rounded-xl bg-surface/70 px-4 py-3 ring-1 ring-line/70 transition hover:ring-gold/60"
              >
                <span className="text-[0.9rem] font-medium text-ink">{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[0.8rem] text-muted">
          Ada pertanyaan? Kirim ke{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-gold hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </article>
  )
}

export function ArticleBody({ kind }: { kind: string }): ReactNode {
  return BODIES[kind]?.intro ?? null
}
