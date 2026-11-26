import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { loadPdf, type PdfSession } from '../../core/pdf'
import { renderPdfCanvas } from '../../core/pdfCanvas'

type SelectedPdf = { file: File; bytes: Uint8Array; session: PdfSession }

export function useToolPdf() {
  const [selected, setSelected] = useState<SelectedPdf | null>(null)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState('')
  const session = useRef<PdfSession | null>(null)
  const request = useRef<AbortController | null>(null)

  useEffect(() => () => {
    request.current?.abort()
    void session.current?.destroy().catch(() => {})
  }, [])

  const open = async (files: File[]) => {
    if (request.current) return
    if (files.length !== 1) {
      setError('Pilih satu berkas PDF.')
      return
    }
    const [file] = files
    const job = new AbortController()
    request.current = job
    setOpening(true)
    setError('')
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const next = await loadPdf(bytes)
      if (job.signal.aborted) {
        await next.destroy()
        return
      }
      session.current = next
      setSelected({ file, bytes, session: next })
    } catch {
      if (!job.signal.aborted) setError('PDF tidak bisa dibuka. Berkas mungkin terkunci atau rusak.')
    } finally {
      request.current = null
      if (!job.signal.aborted) setOpening(false)
    }
  }

  const clear = () => {
    void session.current?.destroy().catch(() => {})
    session.current = null
    setSelected(null)
    setError('')
  }

  return { selected, opening, error, open, clear }
}

export function PdfToolPreview({ doc, number, rotation = 0, thumbnail = false, onRatio }: {
  doc: PDFDocumentProxy; number: number; rotation?: number; thumbnail?: boolean; onRatio?: (ratio: number) => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(!thumbnail)
  const [status, setStatus] = useState('Memuat halaman…')

  useEffect(() => {
    if (visible || !ref.current) return
    if (!('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, { rootMargin: '240px' })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const job = new AbortController()
    setStatus('Memuat halaman…')
    void doc.getPage(number).then((page) =>
      renderPdfCanvas(page, thumbnail ? 260 : 1350, job.signal, rotation),
    ).then(({ canvas }) => {
      const target = ref.current
      if (!job.signal.aborted && target) {
        target.width = canvas.width
        target.height = canvas.height
        target.getContext('2d')?.drawImage(canvas, 0, 0)
        onRatio?.(canvas.width / canvas.height)
        setStatus('')
      }
      canvas.width = 0
      canvas.height = 0
    }).catch(() => {
      if (!job.signal.aborted) setStatus('Pratinjau gagal dimuat.')
    })
    return () => job.abort()
  }, [doc, number, rotation, thumbnail, visible, onRatio])

  return (
    <>
      <canvas ref={ref} data-ready={visible && !status} aria-label={`Pratinjau halaman ${number}`}
        className={thumbnail ? 'block h-full w-full object-contain' : 'block h-auto w-full'}
        style={{ visibility: status ? 'hidden' : 'visible' }} />
      {status && <span className="pointer-events-none absolute inset-0 grid place-items-center px-2 text-center text-xs text-muted" role="status">{status}</span>}
    </>
  )
}

export function PdfResultPreview({ bytes, firstPage = 1 }: { bytes: Uint8Array; firstPage?: number }) {
  const [opened, setOpened] = useState<{ bytes: Uint8Array; doc: PDFDocumentProxy } | null>(null)
  const [failed, setFailed] = useState<Uint8Array | null>(null)
  const [number, setNumber] = useState(firstPage)

  useEffect(() => {
    let current = true
    let session: PdfSession | undefined
    void loadPdf(bytes).then((next) => {
      if (!current) return next.destroy()
      session = next
      setOpened({ bytes, doc: next.doc })
    }).catch(() => { if (current) setFailed(bytes) })
    return () => {
      current = false
      void session?.destroy().catch(() => {})
    }
  }, [bytes])

  if (failed === bytes) return <p role="status" className="text-sm text-loss">Pratinjau PDF gagal dibuka.</p>
  if (opened?.bytes !== bytes) return <p role="status" className="text-sm text-muted">Membuka pratinjau…</p>
  const { doc } = opened
  const page = Math.max(1, Math.min(number, doc.numPages))
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        <button type="button" className="rounded-lg bg-sunken px-3 py-2 disabled:opacity-35" disabled={page <= 1}
          onClick={() => setNumber(page - 1)}>Sebelumnya</button>
        <span className="tabular-nums">Halaman {page} / {doc.numPages}</span>
        <button type="button" className="rounded-lg bg-sunken px-3 py-2 disabled:opacity-35" disabled={page >= doc.numPages}
          onClick={() => setNumber(page + 1)}>Berikutnya</button>
      </div>
      <div className="relative mx-auto min-h-24 max-w-lg overflow-hidden rounded-lg bg-sunken ring-1 ring-line">
        <PdfToolPreview doc={doc} number={page} />
      </div>
    </div>
  )
}
