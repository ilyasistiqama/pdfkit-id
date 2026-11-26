import { useEffect, useState, type ReactNode } from 'react'
import { OPEN_PRIVACY_SETTINGS } from '../../site/privacyPreferences'
import { BATCH_TEMPLATE_KEY, clearBrowserCopy, hasBrowserCopy, SIGNATURE_STORAGE_KEY, WORKFLOW_PRESET_KEY } from '../signatureStore'
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
        PDFKit menempelkan gambar tanda tangan pada salinan PDF. Tanyakan format yang diterima pihak
        tujuan. Untuk dokumen yang mensyaratkan tanda tangan elektronik tersertifikasi, gunakan
        Penyelenggara Sertifikasi Elektronik (PSrE) Indonesia yang diakui.
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

function StoredDataControls() {
  const entries = [
    [SIGNATURE_STORAGE_KEY, 'Hapus gambar tanda tangan tersimpan'],
    [BATCH_TEMPLATE_KEY, 'Hapus template tanda tangan tersimpan'],
    [WORKFLOW_PRESET_KEY, 'Hapus preset workflow tersimpan'],
  ] as const
  const [copies, setCopies] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const refresh = () => setCopies(entries.map(([key]) => key).filter(hasBrowserCopy))
  useEffect(refresh, [])
  if (!copies.length && !message) return null
  return <div className="space-y-2 rounded-xl bg-sunken p-3 text-sm">
    {copies.length > 0 && <p>Unduh gambar PNG yang ingin disimpan sebelum menghapus salinan browser. Data sementara dalam tab akan hilang saat tab ditutup atau dimuat ulang.</p>}
    {entries.filter(([key]) => copies.includes(key)).map(([key, label]) => (
      <button key={key} type="button" className="block font-medium text-loss hover:underline" onClick={() => {
        const removed = clearBrowserCopy(key)
        refresh()
        setMessage(removed ? 'Salinan penyimpanan browser sudah dihapus.' : 'Salinan belum bisa dihapus dari browser.')
      }}>{label}</button>
    ))}
    {message && <p role="status">{message}</p>}
  </div>
}

export function PrivacyPage() {
  return (
    <Page
      title="Kebijakan Privasi"
      lede={
        'PDFKit memproses berkas di browser. Halaman ini menjelaskan penyimpanan lokal, log hosting, serta pilihan untuk analitik dan iklan.'
      }
    >
      <p className="text-[0.78rem] text-muted">Terakhir diperbarui 26 November 2026</p>

      <H2>Pemrosesan berkas dan hosting</H2>
      <P>Alat PDFKit membaca, mengolah, dan membuat salinan hasil di browser Anda. PDFKit tidak mengunggah isi berkas, nama berkas, atau gambar tanda tangan ke server. Berkas yang Anda unduh tersimpan di lokasi unduhan perangkat.</P>
      <P>GitHub Pages sebagai penyedia hosting mencatat alamat IP pengunjung untuk keamanan, termasuk saat analitik dan iklan opsional dimatikan. <a href="https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection" className="text-gold underline">Penjelasan GitHub Pages</a></P>

      <H2>Penyimpanan di browser</H2>
      <P>Gambar tanda tangan tersedia sementara. Pada origin khusus yang mendukung penyimpanan lokal, Anda bisa memilih “Simpan di browser” atau mengunduh PNG sendiri. Template dan preset yang Anda simpan dapat memuat nama, jabatan, tanggal, atau teks watermark. Pada alamat berbagi proyek, penyimpanan baru hanya berlaku selama tab terbuka. Pilihan privasi disimpan secara lokal bila browser mengizinkannya.</P>
      <StoredDataControls />

      <H2>Analitik dan iklan opsional</H2>
      <P>Jika Anda mengizinkan analitik dan fitur itu tersedia, penyedia analitik dapat menerima statistik unduhan seperti alat dan halaman yang digunakan, serta data koneksi normal. Kode analitik berjalan di frame terisolasi. Pencabutan izin menutup frame dan menghentikan pengiriman event baru dari PDFKit.</P>
      <P>Jika iklan diaktifkan, layanan pengelola consent dan Google AdSense dapat memproses data seperti alamat IP, jenis perangkat, pengenal, dan halaman panduan yang dikunjungi. Slot membutuhkan pilihan iklan dari Anda dan sinyal yang diperlukan dari pengelola consent. Mencabut izin iklan akan memuat ulang halaman panduan jika layanan iklan sudah dimulai.</P>
      {consentNeeded() && <button type="button" className="font-medium text-gold hover:underline"
        onClick={() => window.dispatchEvent(new Event(OPEN_PRIVACY_SETTINGS))}>Buka pengaturan privasi</button>}

      <H2>Kontak dan hak privasi</H2>
      <P>Untuk pertanyaan, akses, koreksi, penghapusan, atau permintaan terkait data yang dikelola PDFKit, hubungi <a href={`mailto:${CONTACT_EMAIL}`} className="text-gold underline">{CONTACT_EMAIL}</a>. Hindari melampirkan berkas sensitif pada laporan awal.</P>

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
      <p className="text-[0.78rem] text-muted">Terakhir diperbarui 26 November 2026</p>

      <H2>1. Penggunaan layanan</H2>
      <P>
        {SITE_NAME} boleh dipakai untuk keperluan pribadi maupun komersial tanpa biaya. Anda
        hanya boleh memproses dokumen yang berhak Anda gunakan. Gunakan gambar tanda tangan atau paraf sendiri atau gambar yang telah diizinkan pemiliknya. Penggunaan untuk menyamar sebagai pihak lain atau memalsukan dokumen dilarang.
      </P>

      <H2>2. Status tanda tangan</H2>
      <P>
        Alat tanda tangan menghasilkan salinan PDF dengan gambar tanda tangan. Untuk dokumen yang mensyaratkan penandatanganan tersertifikasi, gunakan layanan PSrE Indonesia yang diakui. Simpan dokumen asli yang telah ditandatangani secara digital. Pengeditan dan ekspor ulang bisa membatalkan tanda tangan pada salinan hasil.
      </P>

      <H2>3. Tidak ada jaminan</H2>
      <P>
        Layanan disediakan “sebagaimana adanya”. Kami tidak menjamin bahwa hasil akan diterima oleh
        setiap instansi, bahwa file selalu bebas galat, atau bahwa situs selalu tersedia. Selalu
        periksa hasil unduhan sebelum mengirimkannya.
      </P>

      <H2>4. Batas tanggung jawab</H2>
      <P>
        Hak pengguna dan tanggung jawab pengelola mengikuti hukum yang berlaku. Laporkan dugaan pelanggaran, penyalahgunaan, atau masalah keamanan melalui alamat kontak yang tercantum di Kebijakan Privasi.
      </P>

      <H2>5. Kekayaan intelektual</H2>
      <P>
        Hak atas dokumen tetap pada pemegang haknya. Pastikan Anda memiliki izin untuk menyalin, mengubah, atau membagikan dokumen. Kode dan desain situs dilindungi hak cipta masing-masing pemegangnya.
      </P>

      <H2>6. Iklan</H2>
      <P>
        Jika diaktifkan, iklan hanya ditampilkan di halaman katalog atau panduan dan diberi label “Iklan”.
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
    a: 'PDFKit menempelkan gambar tanda tangan pada PDF. Penerimaan hasil bergantung pada syarat dokumen dan pihak penerima. Gunakan PSrE Indonesia yang diakui jika tanda tangan elektronik tersertifikasi disyaratkan.',
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
    a: 'Secara default gambar tersedia selama tab aktif. Jika penyimpanan browser tersedia, Anda dapat mengaktifkannya sendiri. Unduh PNG untuk menyimpan salinan atau hapus salinan browser lewat Kebijakan Privasi.',
  },
  {
    q: 'Apakah situs ini memakai cookie?',
    a: consentNeeded()
      ? 'Layanan iklan dan analitik bersifat opsional. Pengaturannya tersedia melalui menu privasi, dan hosting GitHub Pages mencatat alamat IP untuk keamanan.'
      : 'Analitik dan iklan opsional belum aktif pada konfigurasi ini. Hosting GitHub Pages tetap mencatat alamat IP untuk keamanan.',
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
