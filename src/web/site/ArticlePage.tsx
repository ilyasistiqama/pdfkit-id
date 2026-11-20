import type { ReactNode } from 'react'
import { Link } from '../../router'
import { ARTICLES, type ArticleMeta } from '../../site/routes'
import { CONTACT_EMAIL } from '../../site/site'
import { AdSlot } from './AdSlot'
import { eyebrow } from '../ui'

export type Block =
  | { h2: string; p?: string[]; ul?: string[]; ol?: string[] }
  | { callout: string }

export type ArticleBody = { intro: string; blocks: Block[]; closing?: string }

const BODIES: Record<string, ArticleBody> = {
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
      'Istilah “tanda tangan elektronik” sering dipakai untuk banyak hal berbeda, dari sekadar gambar tanda tangan sampai sertifikat kriptografis yang mahal. Memahami bedanya membantu Anda memilih cara yang tepat untuk dokumen yang sedang diurus.',
    blocks: [
      {
        h2: 'Definisi singkat',
        p: [
          'Tanda tangan elektronik adalah tanda tangan dalam bentuk data elektronik yang dilekatkan atau diasosiasikan dengan informasi elektronik lain. Definisi ini sengaja luas: gambar tanda tangan yang ditempel di PDF termasuk di dalamnya.',
          'Di Indonesia, pengaturan utamanya ada pada UU Informasi dan Transaksi Elektronik (ITE) beserta peraturan pelaksanaannya. Secara umum, tanda tangan elektronik diakui sebagai alat bukti, dengan kekuatan pembuktian yang bergantung pada jenisnya.',
        ],
      },
      {
        h2: 'Tiga tingkat yang umum dijumpai',
        ol: [
          'Tanda tangan elektronik sederhana: gambar tanda tangan, nama yang diketik, atau centang persetujuan. Cepat dan gratis, cocok untuk kesepakatan internal.',
          'Tanda tangan elektronik tersertifikasi: dibuat dengan sertifikat dari penyelenggara sertifikasi elektronik (PSrE) terdaftar, sehingga identitas penanda tangan terverifikasi.',
          'Tanda tangan digital dengan segel waktu dan jejak audit: tingkat paling ketat, biasanya untuk dokumen keuangan atau pemerintahan.',
        ],
      },
      {
        h2: 'Kapan yang sederhana sudah cukup',
        ul: [
          'Persetujuan internal tim atau nota kesepahaman sederhana.',
          'Surat lamaran, surat izin, dan formulir yang tidak mensyaratkan verifikasi identitas.',
          'Dokumen yang keasliannya bisa dikonfirmasi lewat jalur lain, misalnya email pengirim.',
        ],
      },
      {
        h2: 'Kapan sebaiknya memakai PSrE',
        p: [
          'Kalau dokumen berisiko disangkal, nilainya besar, atau pihak penerima mensyaratkan tanda tangan tersertifikasi, gunakan PSrE. Contohnya perjanjian kredit, dokumen lelang, dan berkas yang diajukan ke instansi tertentu.',
          'Ciri khas tanda tangan tersertifikasi adalah adanya verifikasi identitas sebelum sertifikat diterbitkan, serta kemampuan memeriksa keutuhan dokumen setelah ditandatangani. Kalau dokumen berubah satu huruf pun, validasi akan gagal.',
        ],
      },
      {
        h2: 'Jangan tertukar dengan scan tanda tangan',
        p: [
          'Memindai tanda tangan di kertas lalu menempelkannya di PDF secara teknis sama dengan menggambar tanda tangan digital. Keduanya adalah tanda tangan elektronik sederhana. Yang membedakan hanyalah cara membuat gambarnya, bukan kekuatan hukumnya.',
        ],
      },
    ],
    closing:
      'Aturan sederhananya: makin besar risiko penyangkalan dan makin ketat syarat penerima, makin tinggi tingkat tanda tangan yang perlu Anda pakai.',
  },
  'beda-tanda-tangan-elektronik-dan-psre': {
    intro:
      'Dua istilah ini sering dianggap sama, padahal berbeda secara teknis maupun hukum. Perbedaannya bukan soal gambar yang dihasilkan, melainkan soal bagaimana identitas penanda tangan dibuktikan dan bagaimana keutuhan dokumen dijaga.',
    blocks: [
      {
        h2: 'Tanda tangan elektronik biasa',
        p: [
          'Bentuk paling umum: gambar tanda tangan ditempel di halaman PDF, atau nama yang diketik di kolom persetujuan. Siapa pun yang memiliki gambar itu bisa menempelkannya di dokumen mana pun, jadi kekuatannya bergantung pada kepercayaan antar pihak.',
          'Kelebihannya jelas: gratis, cepat, tidak perlu pendaftaran, dan bisa dipakai di mana saja. Kekurangannya: tidak ada bukti kriptografis bahwa orang tertentu yang menandatangani, dan tidak ada cara mendeteksi perubahan dokumen setelah ditandatangani.',
        ],
      },
      {
        h2: 'Tanda tangan tersertifikasi PSrE',
        p: [
          'PSrE adalah penyelenggara sertifikasi elektronik yang terdaftar di Kementerian Komunikasi dan Digital. Sebelum menerbitkan sertifikat, mereka memverifikasi identitas Anda, biasanya dengan KTP dan verifikasi tatap muka atau video.',
          'Saat Anda menandatangani, kunci privat milik Anda membuat tanda tangan kriptografis yang terikat pada isi dokumen. Kalau dokumen diubah setelahnya, validasi akan gagal. Inilah yang membuat dokumen bisa dibuktikan keutuhannya bertahun-tahun kemudian.',
        ],
      },
      {
        h2: 'Perbandingan singkat',
        ul: [
          'Verifikasi identitas: tidak ada pada tanda tangan biasa, wajib pada PSrE.',
          'Deteksi perubahan dokumen: tidak ada vs. ada.',
          'Biaya: gratis vs. berlangganan.',
          'Kecepatan: hitungan detik vs. perlu pendaftaran lebih dulu.',
          'Cocok untuk: dokumen sehari-hari vs. dokumen berisiko tinggi.',
        ],
      },
      {
        h2: 'Bagaimana memilih',
        p: [
          'Tanyakan dua hal: apakah penerima mensyaratkan tanda tangan tersertifikasi, dan seberapa besar kerugian bila tanda tangan Anda disangkal. Kalau jawabannya “tidak” dan “kecil”, tanda tangan elektronik biasa sudah memadai.',
          'Kalau salah satu jawabannya “ya” dan “besar”, pakai PSrE. Membayar langganan jauh lebih murah daripada sengketa dokumen.',
        ],
      },
      {
        h2: 'Kombinasi yang wajar',
        p: [
          'Banyak organisasi memakai keduanya: tanda tangan biasa untuk alur internal yang cepat, dan PSrE untuk dokumen keluar yang mengikat. Yang penting adalah konsistensi kebijakan, bukan memilih satu untuk semua keadaan.',
        ],
      },
    ],
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
        h2: 'Cara 3: tanda tangan baris (signature line)',
        p: [
          'Word punya Insert → Signature Line yang membuat kotak tanda tangan resmi dengan nama dan jabatan. Ini cocok untuk dokumen internal. Namun signature line hanya benar-benar berfungsi penuh bila Anda memiliki sertifikat digital; tanpa sertifikat, Word hanya menyisipkan tanda tangan sebagai gambar.',
        ],
      },
      {
        h2: 'Menyimpan sebagai PDF',
        p: [
          'Setelah tanda tangan terpasang, pilih File → Save As atau Export, lalu pilih format PDF. Centang “Best for electronic distribution” bila tersedia. Periksa hasilnya di penampil PDF untuk memastikan tanda tangan tidak bergeser dari halaman.',
        ],
      },
      {
        h2: 'Kalau Anda hanya punya PDF, bukan file Word',
        p: [
          'Tidak perlu mengubah PDF kembali ke Word. Buka PDF langsung di alat tanda tangan seperti situs ini, tempel tanda tangan, lalu unduh. Lebih cepat dan tidak berisiko merusak tata letak dokumen asli.',
        ],
      },
    ],
    closing:
      'Menyisipkan tanda tangan di Word paling masuk akal bila Anda masih menyunting isi dokumen. Kalau dokumen sudah final dalam bentuk PDF, menandatanganinya langsung di PDF lebih aman.',
  },
}

export function ArticlePage({ article }: { article: ArticleMeta }) {
  const body = BODIES[article.slug]
  const others = ARTICLES.filter((item) => item.slug !== article.slug).slice(0, 2)

  return (
    <article className="mx-auto w-full max-w-3xl px-5 pt-10 pb-4">
      <p className={eyebrow}>Panduan</p>
      <h1 className="mt-2 font-serif text-3xl leading-tight tracking-tight sm:text-[2.4rem]">
        {article.title}
      </h1>
      <p className="mt-2 text-[0.75rem] text-muted">
        {article.readingMinutes} menit baca · Diperbarui 20 November 2026
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

      <div className="mt-8 rounded-2xl bg-surface p-5 ring-1 ring-line/70">
        <p className="font-serif text-lg tracking-tight">Coba langsung</p>
        <p className="mt-1 text-[0.86rem] leading-relaxed text-muted">
          Tanda tangani PDF dari HP atau komputer tanpa unggah ke server.
        </p>
        <Link
          to="/"
          className="mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-ink px-5 text-sm font-medium text-on-ink transition active:scale-[0.99]"
        >
          Buka alat tanda tangan
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
