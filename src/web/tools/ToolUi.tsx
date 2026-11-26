import { useRef, useState, type ReactNode } from 'react'
import { FileUp, Loader2, X } from 'lucide-react'
import { formatBytes } from '../../core/download'
import { cx } from '../ui'

/** Ruang kerja alat. Kop halaman dirender terpisah agar bisa diprerender statis. */
export function ToolBody({ children }: { children: ReactNode }) {
  return <div className="mt-6 space-y-4">{children}</div>
}

interface DropZoneProps {
  accept: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  label: string
  hint?: string
  compact?: boolean
}

export function DropZone({ accept, multiple, onFiles, label, hint, compact }: DropZoneProps) {
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const take = (list: FileList | null) => {
    if (!list?.length) return
    onFiles([...list])
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        take(event.dataTransfer.files)
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          inputRef.current?.click()
        }
      }}
      className={cx(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[22px] border border-dashed text-center transition',
        compact ? 'px-4 py-7' : 'px-6 py-10',
        over ? 'border-gold bg-gold-soft' : 'border-line bg-surface hover:border-gold/70',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          take(event.target.files)
          event.target.value = ''
        }}
      />
      <span className="grid size-11 place-items-center rounded-full bg-gold-soft text-gold">
        <FileUp className="size-5" strokeWidth={1.7} />
      </span>
      <span className="text-[0.95rem] font-medium text-ink">{label}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  )
}

export function FileList({
  files,
  onRemove,
  onMove,
}: {
  files: File[]
  onRemove: (index: number) => void
  onMove?: (from: number, to: number) => void
}) {
  if (!files.length) return null
  return (
    <ul className="space-y-1.5">
      {files.map((file, index) => (
        <li
          key={`${file.name}-${index}`}
          className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 ring-1 ring-line/70"
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-sunken text-[0.65rem] font-semibold text-muted tabular-nums">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">{file.name}</span>
            <span className="block text-[0.7rem] text-muted">{formatBytes(file.size)}</span>
          </span>
          {onMove && (
            <span className="flex gap-1">
              <button
                type="button"
                onClick={() => onMove(index, index - 1)}
                disabled={index === 0}
                aria-label={`Naikkan ${file.name}`}
                className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-sunken disabled:opacity-25"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => onMove(index, index + 1)}
                disabled={index === files.length - 1}
                aria-label={`Turunkan ${file.name}`}
                className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-sunken disabled:opacity-25"
              >
                ↓
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label={`Hapus ${file.name}`}
            className="grid size-7 shrink-0 place-items-center rounded-full text-muted transition hover:bg-sunken hover:text-loss"
          >
            <X className="size-3.5" strokeWidth={2} />
          </button>
        </li>
      ))}
    </ul>
  )
}

export function ActionButton({
  busy,
  disabled,
  onClick,
  children,
  busyLabel,
}: {
  busy: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
  busyLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 text-[0.95rem] font-medium text-on-ink shadow-[0_12px_30px_-14px_rgb(0_0_0/0.55)] transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
    >
      {busy && <Loader2 className="size-4 animate-spin" />}
      {busy ? (busyLabel ?? 'Memproses…') : children}
    </button>
  )
}

export function Status({ tone, children }: { tone: 'error' | 'ok' | 'info'; children: ReactNode }) {
  return (
    <p
      role="status"
      className={cx(
        'rounded-xl px-3 py-2.5 text-[0.82rem] leading-relaxed',
        tone === 'error' && 'bg-loss/10 text-loss',
        tone === 'ok' && 'bg-ok/10 text-ok',
        tone === 'info' && 'bg-sunken text-muted',
      )}
    >
      {children}
    </p>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted">{label}</span>
        {hint && <span className="text-[0.68rem] text-muted/80">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export const inputClass =
  'h-10 w-full rounded-xl bg-surface px-3 text-sm outline-none ring-1 ring-line focus:ring-gold/60'

export function Progress({ value, total, unit = 'halaman' }: { value: number; total: number; unit?: string }) {
  if (!total) return null
  const percent = Math.round((value / total) * 100)
  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-sunken">
        <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1.5 text-[0.72rem] text-muted tabular-nums">
        {value} / {total} {unit}
      </p>
    </div>
  )
}
