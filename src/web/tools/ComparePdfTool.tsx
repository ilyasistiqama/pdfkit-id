import { useEffect, useRef, useState, type UIEvent } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { comparePdfPage, type PageComparison } from '../../core/comparePdf'
import { PdfToolPreview, useToolPdf } from './PdfToolPreview'
import { ActionButton, DropZone, Field, Progress, Status, ToolBody, inputClass } from './ToolUi'
import { cx } from '../ui'

const labels: Record<PageComparison, string> = {
  same: 'Sama', changed: 'Berubah', removed: 'Hanya di versi awal', added: 'Hanya di versi revisi',
}

export default function ComparePdfTool() {
  const before = useToolPdf()
  const after = useToolPdf()

  return (
    <ToolBody>
      <div className="grid gap-3 sm:grid-cols-2">
        {([['Versi awal', before], ['Versi revisi', after]] as const).map(([name, pdf]) => (
          <section key={name} className="min-w-0 space-y-2" aria-label={name}>
            {pdf.selected ? (
              <div className="flex items-center justify-between gap-2 rounded-2xl bg-surface p-3 ring-1 ring-line/70">
                <div className="min-w-0">
                  <h2 className="text-xs font-medium text-muted">{name}</h2>
                  <p className="truncate text-sm font-medium" title={pdf.selected.file.name}>{pdf.selected.file.name}</p>
                  <p className="text-xs text-muted">{pdf.selected.session.doc.numPages} halaman</p>
                </div>
                <button type="button" onClick={pdf.clear} aria-label={`Ganti ${name.toLowerCase()}`}
                  className="shrink-0 text-sm text-gold hover:underline">Ganti</button>
              </div>
            ) : pdf.opening ? <Status tone="info">Membuka {name.toLowerCase()}…</Status> : (
              <DropZone accept="application/pdf,.pdf" label={`Pilih ${name.toLowerCase()}`} compact onFiles={(files) => void pdf.open(files)} />
            )}
            {pdf.error && <Status tone="error">{pdf.error}</Status>}
          </section>
        ))}
      </div>
      {before.selected && after.selected && (
        <CompareWorkspace before={before.selected.session.doc} after={after.selected.session.doc} />
      )}
    </ToolBody>
  )
}

function CompareWorkspace({ before, after }: { before: PDFDocumentProxy; after: PDFDocumentProxy }) {
  const total = Math.max(before.numPages, after.numPages)
  const [number, setNumber] = useState(1)
  const [sync, setSync] = useState(true)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<PageComparison[]>([])
  const [error, setError] = useState('')
  const panes = useRef<(HTMLDivElement | null)[]>([])
  const mirrored = useRef(new WeakMap<HTMLDivElement, number>())
  const job = useRef<AbortController | null>(null)
  useEffect(() => () => { job.current?.abort(); job.current = null }, [])
  useEffect(() => { for (const pane of panes.current) pane?.scrollTo(0, 0) }, [number])

  const run = async () => {
    if (job.current) return
    const controller = new AbortController()
    job.current = controller
    setBusy(true)
    setError('')
    const statuses: PageComparison[] = []
    setResults(statuses)
    try {
      for (let page = 1; page <= total; page++) {
        statuses.push(await comparePdfPage(before, after, page, controller.signal))
        controller.signal.throwIfAborted()
        setResults([...statuses])
      }
    } catch {
      if (!controller.signal.aborted) setError('Perbandingan berhenti karena satu halaman tidak bisa dibaca.')
    } finally {
      if (job.current === controller) {
        job.current = null
        setBusy(false)
      }
    }
  }

  const scroll = (event: UIEvent<HTMLDivElement>, index: number) => {
    const from = event.currentTarget
    const to = panes.current[1 - index]
    const fromRange = from.scrollHeight - from.clientHeight
    const mirroredTop = mirrored.current.get(from)
    mirrored.current.delete(from)
    if (mirroredTop === from.scrollTop) return
    if (!sync || !to || fromRange <= 0) return
    const top = (from.scrollTop / fromRange) * (to.scrollHeight - to.clientHeight)
    if (Math.abs(top - to.scrollTop) > 1) {
      to.scrollTop = top
      mirrored.current.set(to, to.scrollTop)
    }
  }

  const changes = results.flatMap((result, index) => result === 'same' ? [] : [{ result, page: index + 1 }])
  const active = results[number - 1]

  return (
    <section className="space-y-3">
      <p className="text-xs leading-relaxed text-muted">
        PDFKit membandingkan teks, tampilan, tautan, dan kolom formulir pada nomor halaman yang sama. Sisipan di tengah dapat menggeser hasil setelahnya.
      </p>
      <ActionButton busy={busy} busyLabel="Memeriksa halaman…" onClick={() => void run()}>Bandingkan semua halaman</ActionButton>
      {busy && (
        <div className="space-y-2">
          <Progress value={results.length} total={total} />
          <button type="button" className="text-sm text-gold hover:underline" onClick={() => job.current?.abort()}>Batalkan perbandingan</button>
        </div>
      )}
      {error && <Status tone="error">{error}</Status>}
      {results.length === total && <Status tone={changes.length ? 'info' : 'ok'}>
        {changes.length ? `${changes.length} dari ${total} halaman berbeda.` : `Tidak ada perbedaan terdeteksi pada ${total} halaman.`}
      </Status>}
      {changes.length > 0 && <Field label="Lompat ke perubahan">
        <select className={inputClass} value={active && active !== 'same' ? number : ''} onChange={(event) => {
          if (event.target.value) setNumber(Number(event.target.value))
        }}>
          <option value="">Pilih halaman yang berbeda</option>
          {changes.map(({ page, result }) => <option key={page} value={page}>Halaman {page} · {labels[result]}</option>)}
        </select>
      </Field>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sunken px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          <button type="button" aria-label="Halaman sebelumnya" disabled={number <= 1} onClick={() => setNumber(number - 1)}
            className="size-8 rounded-lg bg-surface disabled:opacity-35">←</button>
          <label className="flex items-center gap-1 text-xs">
            Halaman
            <select className="rounded-md bg-surface p-1.5 tabular-nums" aria-label="Nomor halaman" value={number}
              onChange={(event) => setNumber(Number(event.target.value))}>
              {Array.from({ length: total }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
            </select>
            / {total}
          </label>
          <button type="button" aria-label="Halaman berikutnya" disabled={number >= total} onClick={() => setNumber(number + 1)}
            className="size-8 rounded-lg bg-surface disabled:opacity-35">→</button>
        </div>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={sync}
          className="accent-[var(--gold)]" onChange={(event) => setSync(event.target.checked)} /> Gulir bersama</label>
      </div>

      {active && <p role="status" className={cx('px-1 text-sm font-medium', active === 'same' ? 'text-muted' : 'text-loss')}>
        Halaman {number} · {labels[active]}
      </p>}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {([['Versi awal', before], ['Versi revisi', after]] as const).map(([title, doc], index) => (
          <section key={title} className={cx('min-w-0 overflow-hidden rounded-xl bg-sunken ring-1', active && active !== 'same' ? 'ring-loss/60' : 'ring-line')}>
            <h2 className="border-b border-line px-2 py-2 text-xs font-medium sm:px-3">{title}</h2>
            <div ref={(element) => { panes.current[index] = element }} tabIndex={0} aria-label={`Pratinjau ${title.toLowerCase()}`}
              onScroll={(event) => scroll(event, index)} className="h-[min(65vh,38rem)] min-h-44 overflow-auto sm:p-2">
              {number <= doc.numPages ? <div className="relative min-h-24 bg-white">
                <PdfToolPreview doc={doc} number={number} />
              </div> : <p className="p-3 text-xs text-muted">Halaman ini tidak ada di {title.toLowerCase()}.</p>}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
