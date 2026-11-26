import type { ToolMeta } from '../../site/routes'
import { Link } from '../../router'
import { eyebrow } from '../ui'

const STEPS: Record<string, string[]> = {
  'workflow-pdf': [
    'Pilih satu PDF atau urutkan beberapa PDF untuk digabung.',
    'Atur langkah OCR, putar, atau watermark. Simpan pengaturan bila akan dipakai lagi.',
    'Jalankan proses dan unduh satu PDF hasil akhir.',
  ],
  'bandingkan-pdf': [
    'Pilih dua PDF sebagai versi awal dan versi revisi.',
    'Bandingkan tampilan dan teks pada nomor halaman yang sama.',
    'Lompat ke perubahan dan periksa kedua versi berdampingan.',
  ],
  'gabung-pdf': [
    'Pilih dua berkas PDF atau lebih.',
    'Atur urutan dengan tombol panah pada daftar.',
    'Tekan “Gabung” untuk mengunduh satu PDF hasil gabungan.',
  ],
  'pisah-pdf': [
    'Pilih PDF yang ingin dipisah.',
    'Tentukan rentang halaman (mis. 1-3, 5) atau pilih pecah tiap halaman.',
    'Unduh satu berkas, atau semua berkas sekaligus.',
  ],
  'pdf-ke-jpg': [
    'Pilih PDF.',
    'Tentukan format gambar dan resolusinya.',
    'Unduh semua gambar yang dihasilkan.',
  ],
  'foto-ke-pdf': [
    'Pilih beberapa foto dalam format yang didukung browser.',
    'Atur urutan dan ukuran halaman.',
    'Tekan “Buat PDF” lalu unduh hasilnya.',
  ],
  'foto-ke-word': [
    'Pilih foto dokumen dalam format yang didukung browser, lalu atur urutan dan arahnya.',
    'Baca teks otomatis, lalu koreksi sambil melihat foto.',
    'Unduh semua halaman sebagai satu dokumen Word.',
  ],
  'pdf-bisa-dicari': [
    'Pilih PDF hasil scan.',
    'Pilih bahasa teks pada halaman.',
    'Unduh PDF dan cari kata di dalamnya.',
  ],
  'susun-pdf': [
    'Buka PDF untuk melihat pratinjau halaman.',
    'Seret, putar, atau hapus halaman.',
    'Unduh PDF dengan susunan baru.',
  ],
  'sensor-pdf': [
    'Buka PDF dan pilih halaman.',
    'Tarik kotak untuk menutup bagian sensitif.',
    'Unduh salinan PDF yang sudah disensor.',
  ],
  'kompres-pdf': [
    'Pilih PDF yang ukurannya terlalu besar.',
    'Pilih metode kompresi dan tetapkan ukuran maksimum jika diperlukan.',
    'Cek ukuran hasil dan pratinjau kualitas, lalu unduh salinannya.',
  ],
  'putar-pdf': [
    'Pilih PDF.',
    'Tentukan sudut putar dan halaman yang ingin diputar.',
    'Unduh PDF dengan arah halaman yang sudah diperbaiki.',
  ],
  'watermark-pdf': [
    'Pilih PDF.',
    'Isi teks watermark, warna, ukuran, dan transparansi.',
    'Unduh PDF yang sudah diberi watermark.',
  ],
  'isi-formulir-pdf': [
    'Pilih PDF yang memiliki kolom formulir.',
    'Isi kolom teks, centang, dan pilihan yang tersedia.',
    'Simpan lalu unduh PDF yang sudah terisi.',
  ],
  'tanda-tangan-massal': [
    'Pilih beberapa PDF sekaligus.',
    'Atur gambar tanda tangan dan paraf. Simpan posisi dan keterangan sebagai template.',
    'Lihat pratinjau, proses dokumen, lalu unduh salinannya.',
  ],
}

/** Kop halaman alat dirender statis agar isinya terbaca mesin pencari. */
export function ToolIntro({ tool }: { tool: ToolMeta }) {
  const steps = STEPS[tool.slug] ?? []

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pt-10">
      <p className={eyebrow}>{tool.slug === 'foto-ke-word' ? 'Konversi dokumen' : 'Alat PDF'}</p>
      <h1 className="mt-2 font-serif text-3xl leading-tight tracking-tight sm:text-4xl">
        {tool.name}
      </h1>
      <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">{tool.description}</p>

      <ol className="mt-5 grid gap-2 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step} className="rounded-2xl bg-surface/70 p-3.5 ring-1 ring-line/70">
            <p className="text-[0.66rem] font-semibold tracking-[0.14em] text-muted uppercase">
              Langkah {index + 1}
            </p>
            <p className="mt-1 text-[0.84rem] leading-relaxed text-ink-soft">{step}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Penutup halaman berisi catatan privasi dan tautan ke alat lain. */
export function ToolFooter({ tool }: { tool: ToolMeta }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 pb-4">
      <p className="mt-6 rounded-xl bg-sunken px-3 py-2.5 text-[0.75rem] leading-relaxed text-muted">
        Berkas diproses di perangkat Anda dan tidak diunggah ke server. Menutup tab akan menghapusnya
        dari memori.
      </p>

      <section className="mt-8">
        <p className={eyebrow}>Alat lain</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            to="/alat"
            className="rounded-full bg-surface px-3 py-1.5 text-[0.8rem] font-medium text-ink-soft ring-1 ring-line hover:ring-gold/60"
          >
            Semua alat PDF
          </Link>
          {tool.slug !== 'tanda-tangan-massal' && (
            <Link
              to="/alat/tanda-tangan-massal"
              className="rounded-full bg-surface px-3 py-1.5 text-[0.8rem] font-medium text-ink-soft ring-1 ring-line hover:ring-gold/60"
            >
              Tanda tangan massal
            </Link>
          )}
          <Link
            to="/"
            className="rounded-full bg-surface px-3 py-1.5 text-[0.8rem] font-medium text-ink-soft ring-1 ring-line hover:ring-gold/60"
          >
            Tanda tangani PDF
          </Link>
        </div>
      </section>
    </div>
  )
}
