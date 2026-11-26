import { useEffect, useRef, useState } from 'react'
import { compressPdf, type CompressedPdf } from '../../core/compressPdf'
import { downloadBlob, formatBytes, pdfBlob } from '../../core/download'
import { baseName } from '../../core/pdfOps'
import { trackDownload } from '../../site/analytics'
import { PdfResultPreview } from './PdfToolPreview'
import { confirmSignedPdfChange, SignedPdfNotice } from './SignedPdfNotice'
import { ActionButton, DropZone, Field, Progress, Status, ToolBody, inputClass } from './ToolUi'

const presets = {
  ringan: { scale: 2, quality: 0.92 },
  seimbang: { scale: 1.5, quality: 0.8 },
  kuat: { scale: 1, quality: 0.62 },
} as const

const units = { KB: 1000, MB: 1_000_000 }

type Result = CompressedPdf & { target?: number }

export default function CompressTool() {
  const [file, setFile] = useState<File | null>(null)
  const [method, setMethod] = useState<'retain' | 'image'>('image')
  const [level, setLevel] = useState<keyof typeof presets>('seimbang')
  const [targetMode, setTargetMode] = useState(false)
  const [targetValue, setTargetValue] = useState('2')
  const [targetUnit, setTargetUnit] = useState<keyof typeof units>('MB')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [preview, setPreview] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const job = useRef<AbortController | null>(null)
  useEffect(() => () => { job.current?.abort(); job.current = null }, [])

  const target = targetMode ? Math.floor(Number(targetValue) * units[targetUnit]) : undefined
  const invalidTarget = target !== undefined && (!Number.isSafeInteger(target) || target < 1)

  const resetResult = () => {
    setResult(null)
    setPreview(false)
    setError('')
  }

  const run = async () => {
    if (!file || invalidTarget || job.current) return
    const controller = new AbortController()
    job.current = controller
    setBusy(true)
    resetResult()
    setProgress({ done: 0, total: 0 })
    try {
      const output = await compressPdf(new Uint8Array(await file.arrayBuffer()), {
        title: baseName(file.name), method, target, preset: presets[level], signal: controller.signal,
        onProgress: (done, total) => setProgress({ done, total }),
      })
      controller.signal.throwIfAborted()
      setResult({ ...output, target })
    } catch {
      if (!controller.signal.aborted) setError('Gagal mengompres. Pastikan PDF utuh, tidak terkunci, dan coba metode lain.')
    } finally {
      if (job.current === controller) {
        job.current = null
        setBusy(false)
      }
    }
  }

  if (!file) return (
    <ToolBody>
      <DropZone accept="application/pdf,.pdf" label="Pilih PDF" onFiles={(files) => {
        if (files.length === 1) { setFile(files[0]); resetResult() }
        else setError('Pilih satu PDF.')
      }} />
      {error && <Status tone="error">{error}</Status>}
    </ToolBody>
  )

  const after = result?.bytes.length ?? 0
  const saved = result ? Math.round((1 - after / file.size) * 100) : 0

  return (
    <ToolBody>
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line/70">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted">{formatBytes(file.size)}</p>
        </div>
        <button type="button" disabled={busy} className="shrink-0 text-sm text-gold hover:underline disabled:opacity-40"
          onClick={() => { setFile(null); resetResult() }}>Ganti berkas</button>
      </div>
      <SignedPdfNotice source={file} />

      <fieldset disabled={busy} className="space-y-3 disabled:opacity-60" onChange={resetResult}>
        <Field label="Metode kompresi">
          <select className={inputClass} value={method} onChange={(event) => setMethod(event.target.value as typeof method)}>
            <option value="image">Perkecil dengan rasterisasi</option>
            <option value="retain">Pertahankan teks dan tautan</option>
          </select>
        </Field>
        <p className="text-xs text-muted">
          {method === 'retain' ? 'Optimalkan struktur PDF. Besarnya penghematan bergantung pada berkas.'
            : 'Halaman yang dirasterisasi menjadi gambar. Teks tidak bisa diseleksi dan tautan tidak aktif.'}
        </p>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={targetMode} onChange={(event) => setTargetMode(event.target.checked)}
            className="accent-[var(--gold)]" /> Tetapkan ukuran maksimum
        </label>
        {targetMode ? (
          <div className="grid grid-cols-[1fr_6rem] gap-2">
            <Field label="Target ukuran"><input className={inputClass} type="number" min="0.001" step="any" inputMode="decimal"
              value={targetValue} onChange={(event) => setTargetValue(event.target.value)} /></Field>
            <Field label="Satuan"><select className={inputClass} value={targetUnit}
              onChange={(event) => setTargetUnit(event.target.value as keyof typeof units)}>
              <option>KB</option><option>MB</option>
            </select></Field>
          </div>
        ) : method === 'image' && (
          <Field label="Tingkat kompresi">
            <select className={inputClass} value={level} onChange={(event) => setLevel(event.target.value as keyof typeof presets)}>
              <option value="ringan">Ringan</option><option value="seimbang">Seimbang</option><option value="kuat">Kuat</option>
            </select>
          </Field>
        )}
      </fieldset>

      {busy && <Progress value={progress.done} total={progress.total} unit="langkah render" />}
      {error && <Status tone="error">{error}</Status>}
      {invalidTarget && <Status tone="info">Masukkan ukuran maksimum yang lebih besar dari nol.</Status>}
      <ActionButton busy={busy} disabled={invalidTarget} onClick={() => void run()} busyLabel="Mengompres…">Kompres PDF</ActionButton>
      {busy && <button type="button" onClick={() => job.current?.abort()} className="text-sm text-gold hover:underline">Batalkan kompresi</button>}

      {result && (
        <section className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-line/70">
          <h2 className="text-sm font-medium">{formatBytes(file.size)} → {formatBytes(after)}{saved > 0 && ` · hemat ${saved}%`}</h2>
          {result.target !== undefined && (
            <Status tone={after <= result.target ? 'ok' : 'info'}>
              {after <= result.target ? 'Ukuran memenuhi target' : 'Target belum tercapai'} · {after.toLocaleString('id-ID')} byte
              dari batas {result.target.toLocaleString('id-ID')} byte.
            </Status>
          )}
          <p className="text-xs text-muted">{result.mode === 'original' ? 'Berkas asli dipertahankan.'
            : result.mode === 'retain' ? 'Hasil tetap menyimpan teks dan tautan yang ada.' : 'Hasil berisi halaman gambar.'}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-expanded={preview} onClick={() => setPreview(!preview)}
              className="rounded-xl bg-sunken px-4 py-2 text-sm">{preview ? 'Tutup pratinjau' : 'Pratinjau kualitas'}</button>
            <button type="button" onClick={async () => {
              if (result.mode !== 'original' && !await confirmSignedPdfChange(file)) return
              downloadBlob(pdfBlob(result.bytes), `${baseName(file.name)}-${result.mode === 'original' ? 'salinan' : 'kompres'}.pdf`)
              trackDownload('kompres-pdf')
            }} className="rounded-xl bg-gold-soft px-4 py-2 text-sm font-semibold text-gold">Unduh hasil</button>
          </div>
          {preview && <PdfResultPreview bytes={result.bytes} />}
        </section>
      )}
    </ToolBody>
  )
}
