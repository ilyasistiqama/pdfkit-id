import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { canvasToSignature } from '../../core/image'
import type { SignatureImage } from '../../core/image'
import { cx } from '../ui'

const INKS = [
  { name: 'Tinta', value: '#1b1915' },
  { name: 'Biru', value: '#1d3f8f' },
  { name: 'Merah', value: '#9a2b22' },
]

const WIDTHS = [
  { label: 'Tipis', value: 2.2 },
  { label: 'Sedang', value: 3.4 },
  { label: 'Tebal', value: 5 },
]

type Point = { x: number; y: number }
type Stroke = { color: string; width: number; points: Point[] }

function paint(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  for (const stroke of strokes) {
    const { points } = stroke
    if (!points.length) continue
    ctx.strokeStyle = stroke.color
    ctx.fillStyle = stroke.color
    ctx.lineWidth = stroke.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (points.length === 1) {
      ctx.beginPath()
      ctx.arc(points[0].x, points[0].y, stroke.width / 2, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length - 1; i++) {
      const mid = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 }
      ctx.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y)
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
    ctx.stroke()
  }
}

interface Props {
  onSave: (image: SignatureImage) => void
  busy?: boolean
}

export function SignaturePad({ onSave, busy }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<Stroke[]>([])
  const drawing = useRef<{ pointerId: number; stroke: Stroke } | null>(null)
  const [ink, setInk] = useState(INKS[0].value)
  const [width, setWidth] = useState(WIDTHS[1].value)
  const [empty, setEmpty] = useState(true)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = canvas.width / canvas.clientWidth || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
    paint(ctx, strokes.current)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = Math.min(3, window.devicePixelRatio || 1)
      const cssWidth = canvas.clientWidth
      const cssHeight = canvas.clientHeight
      canvas.width = Math.round(cssWidth * dpr)
      canvas.height = Math.round(cssHeight * dpr)
      redraw()
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [redraw])

  const pointFrom = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const handleDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const stroke: Stroke = { color: ink, width, points: [pointFrom(event)] }
    drawing.current = { pointerId: event.pointerId, stroke }
    strokes.current.push(stroke)
    setEmpty(false)
    redraw()
  }

  const handleMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const current = drawing.current
    if (!current || current.pointerId !== event.pointerId) return
    current.stroke.points.push(pointFrom(event))
    redraw()
  }

  const handleUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawing.current?.pointerId !== event.pointerId) return
    drawing.current = null
  }

  const clear = () => {
    strokes.current = []
    drawing.current = null
    setEmpty(true)
    redraw()
  }

  const save = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const image = canvasToSignature(canvas)
    if (image) onSave(image)
  }

  return (
    <div>
      <div className="relative rounded-2xl bg-white ring-1 ring-line">
        <canvas
          ref={canvasRef}
          className="block h-[172px] w-full touch-none rounded-2xl"
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          aria-label="Area gambar tanda tangan"
        />
        {empty && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="font-serif text-lg text-muted/70 italic">tanda tangan di sini</span>
            <span className="h-px w-2/3 border-t border-dashed border-line" />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" role="group" aria-label="Warna tinta">
          {INKS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setInk(color.value)}
              aria-label={`Tinta ${color.name}`}
              aria-pressed={ink === color.value}
              className={cx(
                'size-7 rounded-full ring-1 ring-line transition',
                ink === color.value && 'ring-2 ring-ink ring-offset-2 ring-offset-surface',
              )}
              style={{ background: color.value }}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-sunken p-1" role="group" aria-label="Ketebalan">
          {WIDTHS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => setWidth(option.value)}
              aria-pressed={width === option.value}
              className={cx(
                'rounded-full px-2.5 py-1 text-xs font-medium transition',
                width === option.value ? 'bg-surface text-ink ring-1 ring-line' : 'text-muted',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={clear}
          className="h-11 shrink-0 rounded-xl px-3 text-sm font-medium text-muted transition hover:bg-sunken hover:text-ink"
        >
          Hapus
        </button>
        <button
          type="button"
          onClick={save}
          disabled={empty || busy}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-ink text-sm font-medium text-on-ink transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
        >
          {busy && <Loader2 className="size-4 animate-spin" />}
          Simpan tanda tangan
        </button>
      </div>
    </div>
  )
}
