import { useState } from 'react'
import { ChevronDown, HardDrive, PenLine, Trash2, Upload, UserRound } from 'lucide-react'
import { withCaption } from '../../core/image'
import type { SignatureImage } from '../../core/image'
import type { Signature } from '../../core/types'
import { SignaturePad } from './SignaturePad'
import { SignatureUpload } from './SignatureUpload'
import { cx, eyebrow } from '../ui'

interface Props {
  signatures: Signature[]
  selectedId: string | null
  activePage: number
  persist: boolean
  onTogglePersist: (value: boolean) => void
  onSelect: (id: string) => void
  onAdd: (image: SignatureImage) => void
  onRemove: (id: string) => void
  onPlace: () => void
}

const TABS = [
  { id: 'draw', label: 'Gambar', icon: PenLine },
  { id: 'upload', label: 'Unggah PNG', icon: Upload },
] as const

const today = () =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(),
  )

export function SignatureStudio({
  signatures,
  selectedId,
  activePage,
  persist,
  onTogglePersist,
  onSelect,
  onAdd,
  onRemove,
  onPlace,
}: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('draw')
  const [captionOpen, setCaptionOpen] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [date, setDate] = useState(today)
  const [busy, setBusy] = useState(false)

  const hasCaption = Boolean(name.trim() || role.trim())

  const save = async (image: SignatureImage) => {
    if (!hasCaption) {
      onAdd(image)
      return
    }
    setBusy(true)
    try {
      onAdd(await withCaption(image, { name, role, date }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="mb-3 flex gap-1 rounded-xl bg-sunken p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={cx(
              'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition',
              tab === id
                ? 'bg-surface text-ink shadow-sm ring-1 ring-line/70'
                : 'text-muted hover:text-ink',
            )}
          >
            <Icon className="size-4" strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </div>

      <div className="mb-3 overflow-hidden rounded-xl bg-sunken/70">
        <button
          type="button"
          onClick={() => setCaptionOpen((open) => !open)}
          aria-expanded={captionOpen}
          className="flex w-full items-center justify-between px-3 py-2.5"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-ink">
            <UserRound className="size-4 text-muted" strokeWidth={1.8} />
            Keterangan nama & tanggal
          </span>
          <ChevronDown
            className={cx('size-4 text-muted transition', captionOpen && 'rotate-180')}
            strokeWidth={2}
          />
        </button>
        {captionOpen && (
          <div className="grid gap-2 px-3 pb-3">
            <label className="block">
              <span className="mb-1 block text-[0.7rem] font-medium text-muted">Nama</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nama lengkap"
                className="h-9 w-full rounded-lg bg-surface px-2.5 text-sm outline-none ring-1 ring-line/80 focus:ring-gold/60"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.7rem] font-medium text-muted">
                Jabatan / keterangan
              </span>
              <input
                value={role}
                onChange={(event) => setRole(event.target.value)}
                placeholder="Contoh: Direktur"
                className="h-9 w-full rounded-lg bg-surface px-2.5 text-sm outline-none ring-1 ring-line/80 focus:ring-gold/60"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.7rem] font-medium text-muted">Tanggal</span>
              <input
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-9 w-full rounded-lg bg-surface px-2.5 text-sm outline-none ring-1 ring-line/80 focus:ring-gold/60"
              />
            </label>
            <p className="text-[0.68rem] leading-relaxed text-muted">
              Keterangan digabung ke dalam gambar tanda tangan, jadi ikut tercetak di posisi yang
              sama.
            </p>
          </div>
        )}
      </div>

      <div aria-busy={busy}>
        {tab === 'draw' ? (
          <SignaturePad onSave={(image) => void save(image)} busy={busy} />
        ) : (
          <SignatureUpload onSave={(image) => void save(image)} busy={busy} />
        )}
      </div>

      {signatures.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-2">
            <p className={eyebrow}>Tanda tangan tersimpan</p>
            <button
              type="button"
              onClick={() => onTogglePersist(!persist)}
              aria-pressed={persist}
              title={
                persist
                  ? 'Tanda tangan disimpan di perangkat ini'
                  : 'Tanda tangan hanya ada selama tab terbuka'
              }
              className={cx(
                'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.68rem] font-medium transition',
                persist ? 'bg-gold-soft text-gold' : 'bg-sunken text-muted hover:text-ink',
              )}
            >
              <HardDrive className="size-3" strokeWidth={2} />
              {persist ? 'Tersimpan' : 'Sementara'}
            </button>
          </div>

          <ul className="mt-2 grid grid-cols-2 gap-2">
            {signatures.map((signature) => (
              <li key={signature.id} className="relative">
                <button
                  type="button"
                  onClick={() => onSelect(signature.id)}
                  aria-pressed={selectedId === signature.id}
                  className={cx(
                    'checker grid h-16 w-full place-items-center rounded-xl p-1.5 transition',
                    selectedId === signature.id ? 'ring-2 ring-ink' : 'ring-1 ring-line hover:ring-gold',
                  )}
                >
                  <img
                    src={signature.dataUrl}
                    alt="Tanda tangan tersimpan"
                    className="max-h-full max-w-full"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(signature.id)}
                  aria-label="Hapus tanda tangan tersimpan"
                  className="absolute -top-1.5 -right-1.5 grid size-6 place-items-center rounded-full bg-surface text-muted ring-1 ring-line transition hover:text-loss"
                >
                  <Trash2 className="size-3.5" strokeWidth={1.8} />
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onPlace}
            disabled={!selectedId}
            className="mt-3 h-11 w-full rounded-xl bg-gold-soft text-sm font-semibold text-gold transition hover:bg-gold/15 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
          >
            Tempel di halaman {activePage}
          </button>
        </div>
      )}
    </div>
  )
}
