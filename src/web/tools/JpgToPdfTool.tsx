import { useState } from 'react'
import { imagesToPdf, uniqueName } from '../../core/pdfOps'
import { downloadBlob, pdfBlob } from '../../core/download'
import { trackDownload } from '../../site/analytics'
import { ActionButton, DropZone, Field, FileList, Status, ToolBody } from './ToolUi'

export function JpgToPdfTool() {
  const [files, setFiles] = useState<File[]>([])
  const [layout, setLayout] = useState<'a4' | 'auto'>('a4')
  const [margin, setMargin] = useState(24)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const move = (from: number, to: number) => {
    setFiles((current) => {
      if (to < 0 || to >= current.length) return current
      const next = [...current]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      const output = await imagesToPdf(files, { layout, margin: layout === 'a4' ? margin : 0 }, 'Gambar ke PDF')
      downloadBlob(pdfBlob(output), uniqueName('gambar.pdf', new Set()))
      trackDownload('jpg-ke-pdf')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal membuat PDF dari gambar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolBody>
      <DropZone
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        multiple
        onFiles={(next) => setFiles((current) => [...current, ...next])}
        label="Pilih gambar JPG atau PNG"
        hint="Bisa beberapa berkas sekaligus"
      />

      <FileList files={files} onRemove={(index) => setFiles((current) => current.filter((_, i) => i !== index))} onMove={move} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Ukuran halaman">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-sunken p-1">
            {([
              ['a4', 'A4'],
              ['auto', 'Ikut gambar'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setLayout(value)}
                aria-pressed={layout === value}
                className={
                  layout === value
                    ? 'rounded-lg bg-surface py-1.5 text-sm font-medium text-ink ring-1 ring-line'
                    : 'rounded-lg py-1.5 text-sm text-muted'
                }
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        {layout === 'a4' && (
          <Field label={`Margin: ${margin} pt`}>
            <input
              type="range"
              min={0}
              max={72}
              step={4}
              value={margin}
              onChange={(event) => setMargin(Number(event.target.value))}
              className="w-full accent-[var(--gold)]"
            />
          </Field>
        )}
      </div>

      {error && <Status tone="error">{error}</Status>}

      <ActionButton busy={busy} disabled={!files.length} onClick={() => void run()} busyLabel="Menyusun…">
        Buat PDF ({files.length} halaman)
      </ActionButton>
    </ToolBody>
  )
}
