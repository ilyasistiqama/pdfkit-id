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
