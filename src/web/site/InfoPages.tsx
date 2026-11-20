import type { ReactNode } from 'react'
import { Link } from '../../router'
import { CONTACT_EMAIL, SITE_NAME } from '../../site/site'
import { consentNeeded } from '../../site/consent'
import { eyebrow } from '../ui'

export function Page({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-3xl px-5 pt-10 pb-4">
      <p className={eyebrow}>Halaman</p>
      <h1 className="mt-2 font-serif text-3xl leading-tight tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">{lede}</p>
      <div className="mt-7 space-y-5 text-[0.92rem] leading-relaxed text-ink-soft">{children}</div>
    </article>
  )
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 font-serif text-xl tracking-tight text-ink">{children}</h2>
}

export function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>
}

export function AboutPage() {
  return (
    <Page
      title="Tentang Tanda Tangan PDF"
      lede="Alat kecil yang dibuat karena menandatangani dokumen seharusnya tidak perlu mengunggah file pribadi ke server orang lain."
    >
      <P>
        {SITE_NAME} adalah aplikasi web yang berjalan sepenuhnya di browser. Anda membuka PDF,
        menggambar atau mengunggah tanda tangan, menempatkannya di halaman, lalu mengunduh salinan
        yang sudah ditandatangani. Tidak ada berkas yang dikirim ke server, tidak ada akun, dan tidak
        ada batas jumlah dokumen.
      </P>

      <H2>Kenapa dibuat</H2>
      <P>
        Banyak layanan tanda tangan online meminta Anda mengunggah dokumen ke server mereka. Untuk
        kontrak, surat lamaran, atau berkas pribadi, itu berarti dokumen sensitif berpindah tangan
        tanpa Anda tahu apa yang terjadi setelahnya. Dengan memproses semuanya di perangkat, tidak
        ada data dokumen yang perlu dipercayakan kepada pihak ketiga.
      </P>

      <H2>Cara kerjanya secara teknis</H2>
      <UL>
        <li>PDF ditampilkan memakai pdf.js, pustaka render PDF open source dari Mozilla.</li>
        <li>Tanda tangan disimpan sebagai gambar PNG transparan, ditempel dengan pdf-lib tanpa mengubah isi halaman asli.</li>
        <li>Posisi disimpan sebagai pecahan dari ukuran halaman, sehingga tetap tepat saat zoom atau halaman diputar.</li>
        <li>Ekspor hanya menambah lapisan gambar; teks, tautan, dan formulir di dokumen tetap utuh.</li>
      </UL>

      <H2>Yang perlu Anda ketahui</H2>
      <P>
        Tanda tangan yang dihasilkan adalah tanda tangan elektronik berbentuk gambar. Ini sah untuk
        banyak keperluan sehari-hari, tetapi bukan tanda tangan digital tersertifikasi dengan
        sertifikat kriptografis. Untuk dokumen yang mensyaratkanPSrE, gunakan penyelenggara
        sertifikasi resmi.
      </P>

      <H2>Kontak</H2>
      <P>
        Pertanyaan, laporan bug, atau masukan bisa dikirim ke{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-gold hover:underline">
          {CONTACT_EMAIL}
        </a>{' '}
        atau lewat halaman <Link to="/faq" className="font-medium text-gold hover:underline">FAQ</Link>.
      </P>
    </Page>
  )
}

export function PrivacyPage() {
  return (
    <Page
      title="Kebijakan Privasi"
      lede={
        consentNeeded()
          ? 'Ringkasnya: isi dokumen Anda tidak pernah dikirim ke server. Yang diproses pihak ketiga hanya iklan dan statistik kunjungan, dan itu pun setelah Anda menyetujui cookie.'
          : 'Ringkasnya: isi dokumen Anda tidak pernah dikirim ke server. Saat ini situs tidak memuat iklan, analitik, atau cookie pihak ketiga.'
      }
    >
      <p className="text-[0.78rem] text-muted">Terakhir diperbarui: 20 November 2026</p>

      <H2>1. Isi dokumen tetap di perangkat Anda</H2>
      <P>
        Semua pemrosesan PDF — membuka, menandatangani, menggabung, memisah, mengompres, dan
        mengonversi — dilakukan di browser Anda. Berkas tidak diunggah, tidak disalin ke server, dan
        tidak disimpan di luar perangkat. Menutup tab menghapus dokumen dari memori.
      </P>

      <H2>2. Yang disimpan di perangkat</H2>
      <UL>
        <li>Gambar tanda tangan tersimpan di <em>localStorage</em> agar tidak perlu digambar ulang. Tombol “Tersimpan” bisa dimatikan, dan data langsung dihapus saat dimatikan.</li>
        {consentNeeded() && (
          <li>Pilihan persetujuan cookie disimpan agar Anda tidak ditanya berulang.</li>
        )}
        <li>Tidak ada data dokumen yang disimpan di penyimpanan perangkat.</li>
      </UL>

      <H2>3. Iklan dan cookie pihak ketiga</H2>
      {!consentNeeded() && (
        <P>
          <strong>Saat ini belum ada iklan atau analitik yang aktif</strong>, sehingga tidak ada
          cookie pihak ketiga. Bila iklan diaktifkan nanti, notice persetujuan akan muncul lebih
          dulu dan ketentuan di bawah ini berlaku.
        </P>
      )}
      <P>
        Situs ini gratis dan direncanakan dibiayai iklan. Setelah Anda menyetujui, penyedia iklan (misalnya Google
        AdSense) dapat memakai cookie dan pengenal untuk menampilkan serta mengukur iklan. Penyedia
        iklan dapat memproses data seperti perkiraan lokasi, jenis perangkat, dan halaman yang
        dikunjungi — <strong>tidak termasuk isi dokumen Anda</strong>, karena dokumen tidak pernah
        meninggalkan perangkat.
      </P>
      <UL>
        <li>Anda bisa menolak lewat notice cookie; situs tetap berfungsi penuh tanpa iklan personal.</li>
        {consentNeeded() && (
          <li>Pengaturan bisa diubah kapan saja lewat tautan “Pengaturan cookie” di bagian bawah halaman.</li>
        )}
        <li>Menonaktifkan personalisasi iklan Google: kunjungi pengaturan iklan akun Google Anda.</li>
      </UL>

      <H2>4. Analitik</H2>
      <P>
        Bila diaktifkan, situs mencatat statistik agregat seperti jumlah kunjungan dan peristiwa
        “dokumen berhasil diunduh”. Analitik hanya dimuat setelah persetujuan dan tidak menerima isi
        dokumen atau nama berkas.
      </P>

      <H2>5. Dasar hukum dan hak Anda</H2>
      <P>
        Untuk pengunjung Indonesia, pemrosesan data oleh pihak ketiga mengacu pada UU No. 27 Tahun
        2022 tentang Pelindungan Data Pribadi. Anda berhak mengetahui, mengubah, dan menarik
        persetujuan.{' '}
        {consentNeeded() && 'Menarik persetujuan cookie cukup dilakukan lewat “Pengaturan cookie”. '}
        Untuk permintaan lain, hubungi{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-gold hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </P>

      <H2>6. Anak-anak</H2>
      <P>
        Situs ini tidak ditujukan untuk anak di bawah 13 tahun dan tidak dengan sengaja mengumpulkan
        data dari mereka.
      </P>

      <H2>7. Perubahan kebijakan</H2>
      <P>
        Kebijakan ini dapat diperbarui bila ada perubahan penyedia iklan atau analitik. Tanggal
        pembaruan selalu dicantumkan di atas.
      </P>
    </Page>
  )
}

export function TermsPage() {
  return (
    <Page
      title="Syarat dan Ketentuan"
      lede="Dengan memakai situs ini, Anda menyetujui ketentuan di bawah. Baca bagian tentang batas tanggung jawab dan status tanda tangan."
    >
      <p className="text-[0.78rem] text-muted">Terakhir diperbarui: 20 November 2026</p>

      <H2>1. Penggunaan layanan</H2>
      <P>
        {SITE_NAME} boleh dipakai untuk keperluan pribadi maupun komersial tanpa biaya. Anda
        bertanggung jawab memastikan bahwa Anda berhak menandatangani dokumen yang Anda proses dan
        bahwa penggunaannya sah.
      </P>

      <H2>2. Status tanda tangan</H2>
      <P>
        Hasil aplikasi ini adalah tanda tangan elektronik berbentuk gambar. Ini bukan tanda tangan
        digital tersertifikasi dan tidak memiliki sertifikat, segel waktu, atau jejak audit
        kriptografis. Untuk dokumen yang mewajibkan tanda tangan tersertifikasi, gunakan penyelenggara
        sertifikasi elektronik (PSrE) yang terdaftar.
      </P>

      <H2>3. Tidak ada jaminan</H2>
      <P>
        Layanan disediakan “sebagaimana adanya”. Kami tidak menjamin bahwa hasil akan diterima oleh
        setiap instansi, bahwa file selalu bebas galat, atau bahwa situs selalu tersedia. Selalu
        periksa hasil unduhan sebelum mengirimkannya.
      </P>

      <H2>4. Batas tanggung jawab</H2>
      <P>
        Sejauh diizinkan hukum, kami tidak bertanggung jawab atas kerugian yang timbul dari penggunaan
        atau ketidakmampuan menggunakan situs, termasuk kehilangan dokumen atau penolakan dokumen
        oleh pihak lain.
      </P>

      <H2>5. Kekayaan intelektual</H2>
      <P>
        Dokumen yang Anda proses tetap milik Anda. Kami tidak mengklaim hak apa pun atasnya. Kode dan
        desain situs dilindungi hak cipta masing-masing pemegangnya.
      </P>

      <H2>6. Iklan</H2>
      <P>
        Situs ini menampilkan iklan pihak ketiga untuk membiayai operasional. Iklan dipisahkan secara
        visual dari antarmuka alat dan diberi label jelas.
      </P>

      <H2>7. Perubahan ketentuan</H2>
      <P>
        Ketentuan ini dapat berubah sewaktu-waktu. Versi terbaru selalu tersedia di halaman ini.
      </P>
    </Page>
  )
}

const FAQ_ITEMS = [
  {
    q: 'Apakah dokumen saya diunggah ke server?',
    a: 'Tidak. Seluruh proses berjalan di browser Anda. Dokumen tidak pernah dikirim, disalin, atau disimpan di server mana pun.',
  },
  {
    q: 'Apakah tanda tangan ini sah secara hukum?',
    a: 'Untuk banyak keperluan sehari-hari, tanda tangan elektronik berbentuk gambar sudah diterima. Namun ini bukan tanda tangan digital tersertifikasi PSrE yang memiliki sertifikat dan jejak audit. Untuk dokumen yang mensyaratkan sertifikasi, gunakan penyelenggara resmi.',
  },
  {
    q: 'Apakah saya perlu akun atau membayar?',
    a: 'Tidak perlu akun dan tidak ada biaya. Situs gratis penuh, tanpa batas jumlah dokumen.',
  },
  {
    q: 'Format gambar tanda tangan apa yang paling baik?',
    a: 'PNG dengan latar transparan memberi hasil paling bersih. Foto atau scan di kertas putih juga bisa; gunakan opsi “Hapus latar putih” agar latarnya hilang otomatis.',
  },
  {
    q: 'Bagaimana kalau halaman PDF saya terbalik atau miring?',
    a: 'Tanda tangan tetap ditempatkan pada posisi yang benar untuk halaman dengan rotasi 90, 180, atau 270 derajat. Untuk memperbaiki arah halaman itu sendiri, gunakan alat Putar PDF.',
  },
  {
    q: 'Apakah formulir dan tautan di PDF tetap berfungsi?',
    a: 'Ya. Ekspor hanya menambah lapisan gambar di atas halaman. Teks, tautan, dan kolom formulir yang sudah ada tidak diubah.',
  },
  {
    q: 'PDF saya terkunci kata sandi, bisa dibuka?',
    a: 'Bisa. Anda akan diminta memasukkan kata sandi untuk membuka dokumen. Perlu dicatat, file hasil unduhan tidak dienkripsi ulang.',
  },
  {
    q: 'Berapa ukuran dokumen yang didukung?',
    a: 'Tidak ada batas tetap. Dokumen yang sangat besar (ratusan halaman atau puluhan megabita) bergantung pada memori perangkat. Di perangkat kelas bawah, proses bisa lebih lambat.',
  },
  {
    q: 'Apakah tanda tangan saya tersimpan?',
    a: 'Gambar tanda tangan disimpan di penyimpanan perangkat agar bisa dipakai ulang. Anda bisa mematikannya kapan saja; data akan langsung dihapus dari perangkat.',
  },
  {
    q: 'Apakah situs ini memakai cookie?',
    a: consentNeeded()
      ? 'Isi dokumen tidak. Cookie hanya dipakai iklan dan analitik pihak ketiga, dan itu pun setelah Anda memberi izin lewat notice yang muncul.'
      : 'Tidak. Saat ini situs tidak memuat iklan, analitik, atau cookie pihak ketiga. Bila iklan diaktifkan nanti, notice persetujuan akan muncul lebih dulu.',
  },
]

export function FaqPage() {
  return (
    <Page
      title="Pertanyaan yang Sering Diajukan"
      lede="Jawaban singkat soal keamanan, keabsahan, dan cara kerja alat ini."
    >
      <dl className="space-y-3">
        {FAQ_ITEMS.map((item) => (
          <div key={item.q} className="rounded-2xl bg-surface p-4 ring-1 ring-line/70">
            <dt className="font-medium text-ink">{item.q}</dt>
            <dd className="mt-1.5 text-[0.88rem] leading-relaxed text-muted">{item.a}</dd>
          </div>
        ))}
      </dl>
      <P>
        Belum terjawab? Kirim pertanyaan ke{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-gold hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </P>
    </Page>
  )
}

export const FAQ_ITEMS_EXPORT = FAQ_ITEMS
