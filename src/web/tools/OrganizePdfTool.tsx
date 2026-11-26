import { useEffect, useRef, useState } from 'react'
import { downloadBlob, pdfBlob } from '../../core/download'
import { organizePdf, type PageArrangement } from '../../core/pdfOps'
import { trackDownload } from '../../site/analytics'
import { PdfToolPreview, useToolPdf } from './PdfToolPreview'
import { ActionButton, DropZone, Status, ToolBody } from './ToolUi'

export default function OrganizePdfTool() {
  const { selected, opening, error: openError, open, clear } = useToolPdf()
  const [pages, setPages] = useState<PageArrangement[]>([])
  const [dragging, setDragging] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const job = useRef<AbortController | null>(null)
  useEffect(() => () => job.current?.abort(), [])
  useEffect(() => {
    if (selected) setPages(Array.from({ length: selected.session.doc.numPages }, (_, index) => ({ index, rotation: 0 })))
  }, [selected])

  const move = (from: number, to: number) => {
    setPages((current) => {
      if (busy || from < 0 || to < 0 || to >= current.length || from === to) return current
      const next = [...current]
      const [page] = next.splice(from, 1)
      next.splice(to, 0, page)
      return next
    })
  }

  const save = async () => {
    if (!selected || !pages.length || job.current) return
    const controller = new AbortController()
    job.current = controller
    setBusy(true)
    setError('')
    try {
      const data = await organizePdf(selected.bytes, pages)
      controller.signal.throwIfAborted()
      downloadBlob(pdfBlob(data), `${selected.file.name.replace(/\.pdf$/i, '')}-disusun.pdf`)
      trackDownload('susun-pdf')
    } catch {
      if (!controller.signal.aborted) setError('Susunan PDF belum bisa disimpan.')
    } finally {
      job.current = null
      setBusy(false)
    }
  }

  return (
    <ToolBody>
      {!selected && !opening && <DropZone accept="application/pdf,.pdf" label="Pilih PDF" onFiles={(files) => void open(files)} />}
      {opening && <Status tone="info">Membuka PDF…</Status>}
      {selected && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-medium">{selected.file.name} · {pages.length} halaman</p>
            <div className="flex gap-3 text-sm text-gold">
              <button type="button" disabled={busy} className="hover:underline" onClick={() =>
                setPages(Array.from({ length: selected.session.doc.numPages }, (_, index) => ({ index, rotation: 0 })))
              }>Atur ulang</button>
              <button type="button" disabled={busy} className="hover:underline" onClick={() => { clear(); setError('') }}>Ganti PDF</button>
            </div>
          </div>
          <p className="text-sm text-muted">Seret kartu atau gunakan panah untuk mengubah urutan.</p>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pages.map((page, position) => (
              <li key={page.index} data-page={page.index + 1} draggable={!busy}
                onDragStart={(event) => { event.dataTransfer.setData('text/plain', String(page.index)); setDragging(page.index) }}
                onDragEnd={() => setDragging(null)}
                onDragOver={(event) => { if (dragging !== null) event.preventDefault() }}
                onDrop={(event) => {
                  event.preventDefault()
                  if (dragging !== null) move(pages.findIndex(({ index }) => index === dragging), position)
                  setDragging(null)
                }}
                className={`min-w-0 rounded-xl bg-surface p-2 ring-1 ring-line ${dragging === page.index ? 'opacity-50' : ''}`}>
                <div className="relative h-36 overflow-hidden rounded-lg bg-sunken">
                  <PdfToolPreview doc={selected.session.doc} number={page.index + 1} rotation={page.rotation} thumbnail />
                </div>
                <p className="mt-2 text-xs text-muted">Halaman asal {page.index + 1}</p>
                <div className="mt-1 flex justify-between gap-1 text-sm">
                  <button type="button" disabled={busy || position === 0} aria-label={`Majukan halaman ${page.index + 1}`}
                    className="size-8 rounded hover:bg-sunken disabled:opacity-30" onClick={() => move(position, position - 1)}>←</button>
                  <button type="button" disabled={busy || position === pages.length - 1} aria-label={`Mundurkan halaman ${page.index + 1}`}
                    className="size-8 rounded hover:bg-sunken disabled:opacity-30" onClick={() => move(position, position + 1)}>→</button>
                  <button type="button" disabled={busy} aria-label={`Putar halaman ${page.index + 1}`} className="size-8 rounded hover:bg-sunken"
                    onClick={() => setPages((current) => current.map((item) => item.index === page.index
                      ? { ...item, rotation: (item.rotation + 90) % 360 } : item))}>↻</button>
                  <button type="button" disabled={busy || pages.length === 1} aria-label={`Hapus halaman ${page.index + 1}`}
                    className="size-8 rounded hover:bg-sunken disabled:opacity-30"
                    onClick={() => setPages((current) => current.filter((item) => item.index !== page.index))}>×</button>
                </div>
              </li>
            ))}
          </ol>
          <ActionButton busy={busy} disabled={!pages.length} busyLabel="Menyimpan susunan…" onClick={() => void save()}>Unduh PDF tersusun</ActionButton>
        </>
      )}
      {(error || openError) && <Status tone="error">{error || openError}</Status>}
    </ToolBody>
  )
}
