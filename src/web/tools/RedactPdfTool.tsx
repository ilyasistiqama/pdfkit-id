import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { downloadBlob, pdfBlob } from '../../core/download'
import type { Redaction } from '../../core/redactPdf'
import { trackDownload } from '../../site/analytics'
import { PdfToolPreview, useToolPdf } from './PdfToolPreview'
import { ActionButton, DropZone, Field, Status, ToolBody, inputClass } from './ToolUi'

type Point = { x: number; y: number }

function rectangle(start: Point, end: Point): Redaction {
  return { left: Math.min(start.x, end.x), top: Math.min(start.y, end.y), right: Math.max(start.x, end.x), bottom: Math.max(start.y, end.y) }
}

export default function RedactPdfTool() {
  const { selected, opening, error: openError, open, clear } = useToolPdf()
  const [page, setPage] = useState(1)
  const [previewRatio, setPreviewRatio] = useState<number | null>(null)
  const [areas, setAreas] = useState<Record<number, Redaction[]>>({})
  const [draft, setDraft] = useState<Redaction | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const start = useRef<Point | null>(null)
  const job = useRef<AbortController | null>(null)
  useEffect(() => () => job.current?.abort(), [])

  const count = Object.values(areas).reduce((total, list) => total + list.length, 0)
  const current = areas[page] ?? []
  const total = selected?.session.doc.numPages ?? 0

  const point = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
      y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)),
    }
  }

  const changePage = (number: number) => {
    start.current = null
    setDraft(null)
    setPreviewRatio(null)
    setPage(number)
  }

  const save = async () => {
    if (!selected || !count || job.current) return
    const controller = new AbortController()
    job.current = controller
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      const { redactPdf } = await import('../../core/redactPdf')
      const data = await redactPdf(selected.session.doc, areas, controller.signal,
        (page, total) => setProgress(`Menyensor halaman ${page}/${total}…`))
      controller.signal.throwIfAborted()
      downloadBlob(pdfBlob(data), `${selected.file.name.replace(/\.pdf$/i, '')}-disensor.pdf`)
      trackDownload('sensor-pdf')
      setSaved(true)
    } catch {
      if (!controller.signal.aborted) setError('PDF yang disensor belum bisa dibuat.')
    } finally {
      job.current = null
      setBusy(false)
      setProgress('')
    }
  }

  return (
    <ToolBody>
      {!selected && !opening && <DropZone accept="application/pdf,.pdf" label="Pilih PDF yang akan disensor" onFiles={(files) => void open(files)} />}
      {opening && <Status tone="info">Membuka PDF…</Status>}
      {selected && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-medium">{selected.file.name}</p>
            <button type="button" disabled={busy} className="text-sm text-gold hover:underline"
              onClick={() => { clear(); changePage(1); setAreas({}); setSaved(false); setError('') }}>Ganti PDF</button>
          </div>
          <div className="flex items-end gap-2">
            <div className="max-w-60 flex-1">
              <Field label="Halaman">
                <select value={page} disabled={busy} className={inputClass} onChange={(event) => changePage(Number(event.target.value))}>
                  {Array.from({ length: total }, (_, index) => (
                    <option key={index} value={index + 1}>Halaman {index + 1}{areas[index + 1]?.length ? ` · ${areas[index + 1].length} area` : ''}</option>
                  ))}
                </select>
              </Field>
            </div>
            <button type="button" disabled={busy || !current.length} className="min-h-10 rounded-xl px-3 text-sm text-gold ring-1 ring-line disabled:opacity-40"
              onClick={() => { setAreas((previous) => ({ ...previous, [page]: previous[page].slice(0, -1) })); setSaved(false) }}>
              Urungkan area terakhir
            </button>
          </div>
          <p className="text-sm text-muted">Tarik kotak untuk menutup data. Pastikan seluruh teks atau gambar sensitif tertutup.</p>
          <div aria-label="Area pemilihan sensor" className="relative mx-auto w-full max-w-2xl touch-none select-none overflow-hidden bg-surface ring-1 ring-line"
            style={previewRatio ? { maxWidth: `min(100%, 42rem, ${previewRatio * 70}dvh)` } : undefined}
            onPointerDown={(event) => {
              if (busy || event.button !== 0 || !event.currentTarget.querySelector('canvas[data-ready=true]')) return
              start.current = point(event)
              event.currentTarget.setPointerCapture(event.pointerId)
              setDraft(rectangle(start.current, start.current))
            }}
            onPointerMove={(event) => {
              if (start.current) setDraft(rectangle(start.current, point(event)))
            }}
            onPointerUp={(event) => {
              if (!start.current) return
              const area = rectangle(start.current, point(event))
              start.current = null
              setDraft(null)
              if (area.right - area.left < 0.003 || area.bottom - area.top < 0.003) return
              setAreas((previous) => ({ ...previous, [page]: [...(previous[page] ?? []), area] }))
              setSaved(false)
            }}
            onPointerCancel={() => { start.current = null; setDraft(null) }}>
            <PdfToolPreview key={page} doc={selected.session.doc} number={page} onRatio={setPreviewRatio} />
            {[...current, ...(draft ? [draft] : [])].map((area, index) => (
              <div key={index} aria-hidden className="pointer-events-none absolute bg-black"
                style={{ left: `${area.left * 100}%`, top: `${area.top * 100}%`, width: `${(area.right - area.left) * 100}%`,
                  height: `${(area.bottom - area.top) * 100}%` }} />
            ))}
          </div>
          <Status tone="info">
            Hasil sensor berisi halaman gambar. Teks, tautan, dan formulir dari PDF sumber tidak ikut tersimpan.
          </Status>
          <ActionButton busy={busy} busyLabel={progress || 'Menyiapkan sensor…'} disabled={!count} onClick={() => void save()}>
            Unduh PDF disensor ({count} area)
          </ActionButton>
          {busy && <button type="button" onClick={() => job.current?.abort()} className="text-sm text-gold hover:underline">Batalkan sensor</button>}
          {saved && <Status tone="ok">PDF yang sudah disensor berhasil dibuat.</Status>}
        </>
      )}
      {(error || openError) && <Status tone="error">{error || openError}</Status>}
    </ToolBody>
  )
}
