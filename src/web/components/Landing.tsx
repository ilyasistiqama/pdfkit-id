import { ShieldCheck, MousePointerClick, Download } from 'lucide-react'
import { FileDrop } from './FileDrop'
import { eyebrow } from '../ui'

const STEPS = [
  {
    icon: MousePointerClick,
    title: 'Buka PDF',
    body: 'Pilih dokumen dari perangkat. Halaman langsung tampil seperti aslinya.',
  },
  {
    icon: ShieldCheck,
    title: 'Buat tanda tangan',
    body: 'Gambar dengan mouse atau jari, atau unggah PNG hasil scan.',
  },
  {
    icon: Download,
    title: 'Atur & unduh',
    body: 'Geser ke posisi yang pas, lalu unduh PDF yang sudah ditandatangani.',
  },
]

/** Ilustrasi kartu dokumen — hanya hiasan, disembunyikan di layar kecil. */
function DocumentPreview() {
  return (
    <div className="relative hidden lg:block">
      <div className="absolute -inset-8 -z-10 rounded-[42px] bg-gold-soft/70 blur-2xl" />
      <div className="relative -rotate-2 rounded-[20px] bg-surface p-5 shadow-[0_30px_60px_-32px_rgb(0_0_0/0.35)] ring-1 ring-line/80">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-14 rounded-full bg-gold/40" />
          <span className="ml-auto h-1.5 w-8 rounded-full bg-sunken" />
        </div>
        <div className="mt-5 space-y-2.5">
          <span className="block h-1.5 w-full rounded-full bg-sunken" />
          <span className="block h-1.5 w-11/12 rounded-full bg-sunken" />
          <span className="block h-1.5 w-4/5 rounded-full bg-sunken" />
          <span className="block h-1.5 w-2/3 rounded-full bg-sunken" />
        </div>
        <div className="mt-7 flex items-end justify-between">
          <div className="space-y-2">
            <span className="block h-1.5 w-16 rounded-full bg-sunken" />
            <span className="block h-1.5 w-10 rounded-full bg-sunken" />
          </div>
          <svg viewBox="0 0 120 52" className="h-12 w-[104px] text-ink" aria-hidden>
            <path
              d="M6 34c5-1 8-6 11-11s5-10 8-10 2 5 1 9-1 9 3 9 6-4 11-6 8 1 7 5-3 6 1 7 8-3 12-5 9-2 9 2-4 6-1 7 10-4 15-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path d="M6 46h108" stroke="currentColor" strokeWidth="1" opacity=".25" />
          </svg>
        </div>
      </div>
      <div className="absolute -top-3 -right-3 flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[0.7rem] font-medium tracking-wide text-on-ink shadow-[0_10px_24px_-12px_rgb(0_0_0/0.45)]">
        <ShieldCheck className="size-3.5" strokeWidth={2} />
        Ditandatangani
      </div>
    </div>
  )
}

interface Props {
  onFile: (file: File) => void
  loading: boolean
}

export function Landing({ onFile, loading }: Props) {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pt-8 pb-20 sm:pt-14">
      <div className="mb-10 flex items-center gap-2.5">
        <img src="/favicon.svg" alt="" className="size-8 rounded-lg" />
        <span className="font-serif text-lg tracking-tight">Tanda Tangan PDF</span>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
        <div className="max-w-2xl">
          <p className={eyebrow}>Tanpa server · Tanpa akun</p>
          <h1 className="mt-3 font-serif text-[2.15rem] leading-[1.12] tracking-tight sm:text-[2.9rem]">
            Tanda tangani PDF
            <br />
            <span className="text-gold">langsung di halamannya</span>
          </h1>
          <p className="mt-4 text-[0.97rem] leading-relaxed text-ink-soft">
            Gambar tanda tangan dengan mouse atau jari, atau unggah file PNG. Tempel di halaman mana
            pun, atur ukurannya, lalu unduh. Semua diproses di browser kamu.
          </p>
        </div>
        <DocumentPreview />
      </div>

      <div className="mt-10 max-w-3xl">
        <FileDrop onFile={onFile} loading={loading} />

        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, body }, index) => (
            <div key={title} className="rounded-2xl bg-surface/70 p-4 ring-1 ring-line/70">
              <div className="flex items-center gap-2 text-muted">
                <Icon className="size-4" strokeWidth={1.7} />
                <span className="text-[0.68rem] font-semibold tracking-[0.14em] uppercase">
                  Langkah {index + 1}
                </span>
              </div>
              <p className="mt-2 font-medium text-ink">{title}</p>
              <p className="mt-1 text-[0.82rem] leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-[0.78rem] leading-relaxed text-muted">
          Catatan: tanda tangan ini adalah tanda tangan elektronik berbentuk gambar, bukan tanda
          tangan digital tersertifikasi (PSrE). Untuk keperluan yang butuh keabsahan tertentu,
          gunakan penyelenggara sertifikasi resmi.
        </p>
      </div>
    </div>
  )
}
