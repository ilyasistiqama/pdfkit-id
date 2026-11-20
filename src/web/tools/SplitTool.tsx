import { useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { parseRanges, splitPdf } from '../../core/pdfOps'
import { downloadAll, formatBytes, pdfBlob, type OutputFile } from '../../core/download'
import { ActionButton, DropZone, Field, Status, ToolBody, inputClass } from './ToolUi'

export function SplitTool() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [mode, setMode] = useState<'range' | 'separate'>('range')
  const [ranges, setRanges] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [outputs, setOutputs] = useState<{ name: string; size: number }[] | null>(null)
  const [pending, setPending] = useState<OutputFile[]>([])

  const pick = async (next: File) => {
    setError('')
    setOutputs(null)
    try {
      const doc = await PDFDocument.load(new Uint8Array(await next.arrayBuffer()), {
        updateMetadata: false,
      })
      const total = doc.getPageCount()
      setFile(next)
      setPageCount(total)
      setRanges(`1-${total}`)
    } catch {
      setError('PDF tidak bisa dibaca. Berkas mungkin terkunci atau rusak.')
    }
  }

  const run = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    setOutputs(null)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const parsed = mode === 'range' ? parseRanges(ranges, pageCount) : [{ from: 1, to: pageCount }]
      const results = await splitPdf(bytes, parsed, mode === 'separate', file.name.replace(/\.pdf$/i, ''))
      setPending(results.map((item) => ({ name: item.name, blob: pdfBlob(item.bytes) })))
      setOutputs(
        results.map((item) => ({ name: item.name, size: item.bytes.byteLength })),
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memisah PDF.')
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!pending.length) return
    await downloadAll(
      pending,
      'pisah-pdf',
      `${file?.name.replace(/\.pdf$/i, '') ?? 'halaman'}-pisah.zip`,
    )
  }

  return (
    <ToolBody>
      {!file ? (
        <DropZone accept="application/pdf,.pdf" onFiles={(next) => next[0] && void pick(next[0])} label="Pilih PDF" />
      ) : (
        <>
          <div className="rounded-2xl bg-surface p-4 ring-1 ring-line/70">
            <p className="text-sm font-medium text-ink">{file.name}</p>
            <p className="text-[0.72rem] text-muted">
              {pageCount} halaman · {formatBytes(file.size)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl bg-sunken p-1">
            {([
              ['range', 'Rentang halaman'],
              ['separate', 'Tiap halaman'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={
                  mode === value
                    ? 'rounded-lg bg-surface py-2 text-sm font-medium text-ink ring-1 ring-line'
                    : 'rounded-lg py-2 text-sm text-muted'
                }
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'range' && (
            <Field label="Rentang" hint="contoh: 1-3, 5, 8-10">
              <input value={ranges} onChange={(event) => setRanges(event.target.value)} className={inputClass} />
            </Field>
          )}

          {error && <Status tone="error">{error}</Status>}

          <ActionButton busy={busy} onClick={() => void run()} busyLabel="Memisah…">
            {mode === 'separate' ? `Pecah jadi ${pageCount} berkas` : 'Buat berkas'}
          </ActionButton>

          {outputs && (
            <div className="rounded-2xl bg-surface p-4 ring-1 ring-line/70">
              <p className="text-sm font-medium text-ink">{outputs.length} berkas siap</p>
              <ul className="mt-2 space-y-1">
                {outputs.map((item) => (
                  <li key={item.name} className="flex justify-between gap-3 text-[0.8rem]">
                    <span className="truncate text-ink-soft">{item.name}</span>
                    <span className="shrink-0 text-muted tabular-nums">{formatBytes(item.size)}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => void save()}
                className="mt-3 h-11 w-full rounded-xl bg-gold-soft text-sm font-semibold text-gold transition hover:bg-gold/15"
              >
                Unduh semua
              </button>
              {outputs.length > 1 && (
                <p className="mt-2 text-[0.7rem] leading-relaxed text-muted">
                  Berkas digabung dalam satu ZIP agar dapat diunduh sekali klik.
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setFile(null)
              setOutputs(null)
              setPending([])
            }}
            className="text-xs font-medium text-muted hover:text-ink"
          >
            Ganti berkas
          </button>
        </>
      )}
    </ToolBody>
  )
}
