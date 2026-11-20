import { useState } from 'react'
import { imagesToPdfBlob, rasterizePdf } from '../../core/raster'
import { downloadAll, formatBytes, type OutputFile } from '../../core/download'
import { ActionButton, DropZone, Field, Progress, Status, ToolBody } from './ToolUi'

export function PdfToJpgTool() {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg')
  const [quality, setQuality] = useState(0.9)
  const [scale, setScale] = useState(2)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [outputs, setOutputs] = useState<OutputFile[]>([])
  const [total, setTotal] = useState(0)

  const run = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    setOutputs([])
    setProgress({ done: 0, total: 0 })
    try {
      const images = await rasterizePdf(
        new Uint8Array(await file.arrayBuffer()),
        { scale, format, quality },
        (done, count) => setProgress({ done, total: count }),
      )
      const base = file.name.replace(/\.pdf$/i, '')
      const files = images.map((image) => ({
        name: `${base}-hal-${String(image.page).padStart(2, '0')}.${format === 'jpeg' ? 'jpg' : 'png'}`,
        blob: image.blob,
      }))
      setOutputs(files)
      setTotal(files.reduce((sum, item) => sum + item.blob.size, 0))
    } catch {
      setError('Gagal mengubah PDF menjadi gambar. Coba berkas lain atau turunkan resolusi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolBody>
      {!file ? (
        <DropZone accept="application/pdf,.pdf" onFiles={(next) => next[0] && setFile(next[0])} label="Pilih PDF" />
      ) : (
        <>
          <div className="rounded-2xl bg-surface p-4 ring-1 ring-line/70">
            <p className="text-sm font-medium text-ink">{file.name}</p>
            <p className="text-[0.72rem] text-muted">{formatBytes(file.size)}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Format">
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-sunken p-1">
                {([
                  ['jpeg', 'JPG'],
                  ['png', 'PNG'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormat(value)}
                    aria-pressed={format === value}
                    className={
                      format === value
                        ? 'rounded-lg bg-surface py-1.5 text-sm font-medium text-ink ring-1 ring-line'
                        : 'rounded-lg py-1.5 text-sm text-muted'
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Resolusi">
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-sunken p-1">
                {([
                  [1, '72 dpi'],
                  [2, '144 dpi'],
                  [3, '216 dpi'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setScale(value)}
                    aria-pressed={scale === value}
                    className={
                      scale === value
                        ? 'rounded-lg bg-surface py-1.5 text-xs font-medium text-ink ring-1 ring-line'
                        : 'rounded-lg py-1.5 text-xs text-muted'
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {format === 'jpeg' && (
            <Field label={`Kualitas: ${Math.round(quality * 100)}%`}>
              <input
                type="range"
                min={50}
                max={100}
                value={Math.round(quality * 100)}
                onChange={(event) => setQuality(Number(event.target.value) / 100)}
                className="w-full accent-[var(--gold)]"
              />
            </Field>
          )}

          {progress.total > 0 && <Progress value={progress.done} total={progress.total} />}
          {error && <Status tone="error">{error}</Status>}

          <ActionButton busy={busy} onClick={() => void run()} busyLabel="Merender halaman…">
            Ubah ke gambar
          </ActionButton>

          {outputs.length > 0 && (
            <div className="rounded-2xl bg-surface p-4 ring-1 ring-line/70">
              <p className="text-sm font-medium text-ink">
                {outputs.length} gambar siap · {formatBytes(total)}
              </p>
              <button
                type="button"
                onClick={() =>
                  void downloadAll(
                    outputs,
                    'pdf-ke-jpg',
                    `${file?.name.replace(/\.pdf$/i, '') ?? 'gambar'}-jpg.zip`,
                  )
                }
                className="mt-3 h-11 w-full rounded-xl bg-gold-soft text-sm font-semibold text-gold transition hover:bg-gold/15"
              >
                Unduh semua gambar
              </button>
              {outputs.length > 1 && (
                <p className="mt-2 text-[0.7rem] leading-relaxed text-muted">
                  Gambar digabung dalam satu ZIP agar dapat diunduh sekali klik.
                </p>
              )}
            </div>
          )}

          <button type="button" onClick={() => setFile(null)} className="text-xs font-medium text-muted hover:text-ink">
            Ganti berkas
          </button>
        </>
      )}
    </ToolBody>
  )
}

export function CompressTool() {
  const [file, setFile] = useState<File | null>(null)
  const [level, setLevel] = useState<'ringan' | 'seimbang' | 'kuat'>('seimbang')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ before: number; after: number; blob: Blob } | null>(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const presets = {
    ringan: { scale: 2, quality: 0.92 },
    seimbang: { scale: 1.5, quality: 0.8 },
    kuat: { scale: 1, quality: 0.62 },
  } as const

  const run = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    setResult(null)
    setProgress({ done: 0, total: 0 })
    try {
      const preset = presets[level]
      const images = await rasterizePdf(
        new Uint8Array(await file.arrayBuffer()),
        { scale: preset.scale, format: 'jpeg', quality: preset.quality },
        (done, total) => setProgress({ done, total }),
      )
      const bytes = await imagesToPdfBlob(images, file.name.replace(/\.pdf$/i, ''), preset.scale)
      setResult({
        before: file.size,
        after: bytes.byteLength,
        blob: new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
      })
    } catch {
      setError('Gagal mengompres. Coba tingkat kompresi lain.')
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!result || !file) return
    const { downloadBlob } = await import('../../core/download')
    downloadBlob(result.blob, `${file.name.replace(/\.pdf$/i, '')}-kompres.pdf`)
    const { trackDownload } = await import('../../site/analytics')
    trackDownload('kompres-pdf')
  }

  const saved = result ? Math.max(0, Math.round((1 - result.after / result.before) * 100)) : 0

  return (
    <ToolBody>
      {!file ? (
        <DropZone accept="application/pdf,.pdf" onFiles={(next) => next[0] && setFile(next[0])} label="Pilih PDF" />
      ) : (
        <>
          <div className="rounded-2xl bg-surface p-4 ring-1 ring-line/70">
            <p className="text-sm font-medium text-ink">{file.name}</p>
            <p className="text-[0.72rem] text-muted">{formatBytes(file.size)}</p>
          </div>

          <Field label="Tingkat kompresi">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-sunken p-1">
              {([
                ['ringan', 'Ringan'],
                ['seimbang', 'Seimbang'],
                ['kuat', 'Kuat'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLevel(value)}
                  aria-pressed={level === value}
                  className={
                    level === value
                      ? 'rounded-lg bg-surface py-1.5 text-sm font-medium text-ink ring-1 ring-line'
                      : 'rounded-lg py-1.5 text-sm text-muted'
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          {progress.total > 0 && <Progress value={progress.done} total={progress.total} />}
          {error && <Status tone="error">{error}</Status>}

          <ActionButton busy={busy} onClick={() => void run()} busyLabel="Mengompres…">
            Kompres PDF
          </ActionButton>

          {result && (
            <div className="rounded-2xl bg-surface p-4 ring-1 ring-line/70">
              <p className="text-sm font-medium text-ink">
                {formatBytes(result.before)} → {formatBytes(result.after)}
                {saved > 0 ? ` · hemat ${saved}%` : ' · tidak ada penurunan berarti'}
              </p>
              {saved <= 0 && (
                <p className="mt-1 text-[0.75rem] leading-relaxed text-muted">
                  File ini kemungkinan sudah kecil atau berisi teks vektor. Coba tingkat “Kuat”.
                </p>
              )}
              <button
                type="button"
                onClick={() => void save()}
                className="mt-3 h-11 w-full rounded-xl bg-gold-soft text-sm font-semibold text-gold transition hover:bg-gold/15"
              >
                Unduh hasil
              </button>
            </div>
          )}

          <button type="button" onClick={() => setFile(null)} className="text-xs font-medium text-muted hover:text-ink">
            Ganti berkas
          </button>
        </>
      )}
    </ToolBody>
  )
}
