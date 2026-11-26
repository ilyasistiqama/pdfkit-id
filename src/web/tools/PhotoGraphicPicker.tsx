import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { PhotoGraphic } from '../../core/photoGraphics'
import { preparePhotoCanvas } from '../../core/photoCanvas'
import { Modal } from '../components/Modal'
import { ActionButton, Status } from './ToolUi'

type Point = { x: number; y: number }

export function PhotoGraphicPicker({ url, rotation, onClose, onSelect }: {
  url: string
  rotation: number
  onClose: () => void
  onSelect: (graphic: PhotoGraphic) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const start = useRef<Point | null>(null)
  const [size, setSize] = useState<Point | null>(null)
  const [selection, setSelection] = useState<{ first: Point; last: Point } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void preparePhotoCanvas(url, rotation, 2560).then((source) => {
      const canvas = canvasRef.current
      if (active && canvas) {
        canvas.width = source.width
        canvas.height = source.height
        canvas.getContext('2d')?.drawImage(source, 0, 0)
        setSize({ x: canvas.width, y: canvas.height })
      }
      source.width = 0
      source.height = 0
    }).catch(() => {
      if (active) setError('Pratinjau foto belum bisa ditampilkan.')
    })
    return () => { active = false }
  }, [url, rotation])

  const point = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    }
  }
  const bounds = selection && {
    x0: Math.min(selection.first.x, selection.last.x),
    y0: Math.min(selection.first.y, selection.last.y),
    x1: Math.max(selection.first.x, selection.last.x),
    y1: Math.max(selection.first.y, selection.last.y),
  }

  const confirm = () => {
    if (!bounds || !size) return
    onSelect({
      label: 'Bagian grafis dokumen',
      bounds: {
        x0: Math.floor(bounds.x0 * size.x),
        y0: Math.floor(bounds.y0 * size.y),
        x1: Math.ceil(bounds.x1 * size.x),
        y1: Math.ceil(bounds.y1 * size.y),
      },
    })
  }

  return (
    <Modal open onClose={onClose} labelledBy="photo-graphic-title" className="w-[min(92vw,38rem)]">
      <h2 id="photo-graphic-title" className="font-serif text-xl text-ink">Pilih area gambar</h2>
      <p className="mt-1 text-sm text-muted">Tarik kotak mengelilingi logo, stempel, atau tanda tangan pada foto.</p>
      {error && <Status tone="error">{error}</Status>}
      <div className="my-3 flex justify-center">
        <div className="relative max-w-full">
          <canvas ref={canvasRef} aria-label="Foto dokumen untuk memilih area gambar"
            className="block max-h-[53dvh] max-w-full touch-none rounded-md ring-1 ring-line"
            style={{ visibility: size ? 'visible' : 'hidden' }}
            onPointerDown={(event) => {
              if (!size || event.button !== 0) return
              start.current = point(event)
              event.currentTarget.setPointerCapture(event.pointerId)
              setSelection({ first: start.current, last: start.current })
            }}
            onPointerMove={(event) => {
              if (start.current) setSelection({ first: start.current, last: point(event) })
            }}
            onPointerUp={(event) => {
              if (start.current) setSelection({ first: start.current, last: point(event) })
              start.current = null
            }}
            onPointerCancel={() => { start.current = null; setSelection(null) }}
          />
          {bounds && (
            <div aria-hidden className="pointer-events-none absolute border-2 border-gold bg-gold/15"
              style={{ left: `${bounds.x0 * 100}%`, top: `${bounds.y0 * 100}%`,
                width: `${(bounds.x1 - bounds.x0) * 100}%`, height: `${(bounds.y1 - bounds.y0) * 100}%` }} />
          )}
        </div>
      </div>
      <ActionButton busy={false}
        disabled={!bounds || bounds.x1 - bounds.x0 < 0.015 || bounds.y1 - bounds.y0 < 0.01}
        onClick={confirm}>
        Pertahankan area ini
      </ActionButton>
      <button type="button" onClick={onClose} className="mt-2 w-full py-2 text-sm text-muted hover:text-ink">Batal</button>
    </Modal>
  )
}
