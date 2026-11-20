import { useState } from 'react'
import { ImageUp, Loader2 } from 'lucide-react'
import { fileToSignature } from '../../core/image'
import type { SignatureImage } from '../../core/image'
import { cx } from '../ui'

interface Props {
  onSave: (image: SignatureImage) => void
  busy?: boolean
}

export function SignatureUpload({ onSave, busy }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<SignatureImage | null>(null)
  const [dropBackground, setDropBackground] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [over, setOver] = useState(false)

  const process = async (nextFile: File, drop: boolean) => {
    setProcessing(true)
    setError('')
    try {
      const image = await fileToSignature(nextFile, drop)
      if (!image) {
        setPreview(null)
        setError('Gambarnya kosong. Coba file lain atau matikan "Hapus latar putih".')
      } else {
        setPreview(image)
      }
    } catch {
      setPreview(null)
      setError('File ini tidak bisa dibaca sebagai gambar.')
    } finally {
      setProcessing(false)
    }
  }

  const accept = (nextFile: File | undefined) => {
    if (!nextFile) return
    if (!nextFile.type.startsWith('image/')) {
      setError('Pilih file PNG atau JPG.')
      return
    }
    setFile(nextFile)
    void process(nextFile, dropBackground)
  }

  const toggleBackground = () => {
    const next = !dropBackground
    setDropBackground(next)
    if (file) void process(file, next)
  }

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          accept(e.dataTransfer.files[0])
        }}
        className={cx(
          'flex h-[132px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed text-center transition',
          over ? 'border-gold bg-gold-soft' : 'border-line bg-sunken/60 hover:border-gold/70',
        )}
      >
        <input
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            accept(e.target.files?.[0])
            e.target.value = ''
          }}
        />
         {processing ? (
          <Loader2 className="size-5 animate-spin text-muted" />
        ) : (
          <ImageUp className="size-5 text-muted" strokeWidth={1.6} />
        )}
        <span className="text-sm font-medium text-ink-soft">Pilih gambar tanda tangan</span>
        <span className="text-xs text-muted">PNG transparan paling bagus, JPG juga bisa</span>
      </label>

      <button
        type="button"
        onClick={toggleBackground}
        aria-pressed={dropBackground}
        className="mt-3 flex w-full items-start gap-3 rounded-xl bg-sunken px-3 py-2.5 text-left transition hover:bg-sunken/70"
      >
        <span
          className={cx(
            'mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition',
            dropBackground ? 'bg-ink' : 'bg-line',
          )}
        >
          <span
            className={cx(
              'size-4 rounded-full bg-surface shadow-sm transition',
              dropBackground && 'translate-x-4',
            )}
          />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-ink">Hapus latar putih</span>
          <span className="block text-xs text-muted">
            Berguna untuk foto atau scan tanda tangan di kertas.
          </span>
        </span>
      </button>

      {error && <p className="mt-2 text-xs text-loss">{error}</p>}

      {preview && (
        <div className="mt-3">
          <div className="checker grid h-24 place-items-center rounded-xl p-2 ring-1 ring-line">
            <img src={preview.dataUrl} alt="Pratinjau tanda tangan" className="max-h-full max-w-full" />
          </div>
          <button
            type="button"
            onClick={() => onSave(preview)}
            disabled={busy}
            className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-sm font-medium text-on-ink transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Simpan tanda tangan
          </button>
        </div>
      )}
    </div>
  )
}
