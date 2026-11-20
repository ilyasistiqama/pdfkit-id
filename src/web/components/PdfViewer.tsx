import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
  type RefObject,
} from 'react'
import { RotateCw, X } from 'lucide-react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { clamp, snapMove, TILT_LIMIT, type Guides, type SignRect } from '../../core/geometry'
import type { Placement, Signature } from '../../core/types'
import { cx } from '../ui'

const heightFraction = (width: number, aspect: number, boxW: number, boxH: number) =>
  (width * boxW) / aspect / boxH

export type ViewerHandle = { scrollToPage: (index: number) => void }

interface ViewerProps {
  doc: PDFDocumentProxy
  zoom: number
  activePage: number
  signatures: Signature[]
  placements: Placement[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (id: string, rect: SignRect) => void
  onDragStart: () => void
  onDragEnd: () => void
  onDelete: (id: string) => void
  onActivePage: (page: number) => void
  ref?: Ref<ViewerHandle>
}

export function PdfViewer({
  ref,
  doc,
  zoom,
  activePage,
  placements,
  signatures,
  selectedId,
  onSelect,
  onChange,
  onDragStart,
  onDragEnd,
  onDelete,
  onActivePage,
}: ViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [available, setAvailable] = useState(0)
  const activeRef = useRef(onActivePage)

  activeRef.current = onActivePage

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width))
    observer.observe(el)
    setAvailable(el.clientWidth)
    return () => observer.disconnect()
  }, [])

  // Halaman yang paling banyak terlihat = halaman tujuan saat menempel tanda tangan.
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const ratios = new Map<number, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.page)
          ratios.set(index, entry.isIntersecting ? entry.intersectionRatio : 0)
        }
        let best = 0
        let bestRatio = -1
        for (const [index, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio
            best = index
          }
        }
        activeRef.current(best)
      },
      { threshold: [0, 0.15, 0.35, 0.6, 0.85, 1] },
    )
    const nodes = root.querySelectorAll<HTMLElement>('[data-page]')
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [doc, available])

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    rail.querySelector<HTMLElement>(`[data-thumb="${activePage}"]`)?.scrollIntoView({
      block: 'nearest',
    })
  }, [activePage])

  const pageWidth = Math.max(200, available * zoom)

  // Zoom tidak boleh "melempar" dokumen: jaga titik tengah viewport tetap.
  // Hanya saat zoom berubah — perubahan lebar kontainer cukup ditata ulang.
  const previous = useRef({ width: 0, zoom })
  useLayoutEffect(() => {
    const el = scrollRef.current
    const state = previous.current
    previous.current = { width: pageWidth, zoom }
    if (!el || !state.width || state.zoom === zoom) return
    const ratio = pageWidth / state.width
    if (!Number.isFinite(ratio) || ratio <= 0) return
    el.scrollTop = (el.scrollTop + el.clientHeight / 2) * ratio - el.clientHeight / 2
    el.scrollLeft = (el.scrollLeft + el.clientWidth / 2) * ratio - el.clientWidth / 2
  }, [pageWidth, zoom])

  const scrollToPage = (index: number) => {
    const container = scrollRef.current
    const node = listRef.current?.querySelector<HTMLElement>(`[data-page="${index}"]`)
    if (!container || !node) return
    const top =
      node.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
    container.scrollTo({ top: Math.max(0, top - 16), behavior: 'smooth' })
  }

  useImperativeHandle(ref, () => ({ scrollToPage }), [doc, available])

  return (
    <div className="flex h-full min-h-0">
      <nav
        ref={railRef}
        aria-label="Halaman dokumen"
        className="hidden w-[88px] shrink-0 overflow-y-auto border-r border-line/60 px-2 py-3 lg:block"
      >
        <div className="space-y-2">
          {Array.from({ length: doc.numPages }, (_, index) => (
            <Thumb
              key={index}
              doc={doc}
              index={index}
              active={index === activePage}
              onPick={scrollToPage}
            />
          ))}
        </div>
      </nav>

      <div
        ref={scrollRef}
        className="h-full min-h-0 flex-1 overflow-auto overscroll-contain"
        onPointerDown={(event) => {
          if (!(event.target as HTMLElement).closest('[data-overlay]')) onSelect(null)
        }}
      >
        <div ref={listRef} className="flex flex-col items-center gap-9 px-4 pt-7 pb-8 sm:px-8">
          {Array.from({ length: doc.numPages }, (_, index) => (
            <PageView
              key={index}
              doc={doc}
              index={index}
              width={pageWidth}
              pagePlacements={placements.filter((p) => p.pageIndex === index)}
              signatures={signatures}
              selectedId={selectedId}
              onSelect={onSelect}
              onChange={onChange}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface ThumbProps {
  doc: PDFDocumentProxy
  index: number
  active: boolean
  onPick: (index: number) => void
}

function Thumb({ doc, index, active, onPick }: ThumbProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [shown, setShown] = useState(false)
  const [ratio, setRatio] = useState(1 / 1.414)

  useEffect(() => {
    const node = wrapperRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          observer.disconnect()
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!shown) return
    let cancelled = false
    void (async () => {
      const page = await doc.getPage(index + 1)
      if (cancelled) return
      const base = page.getViewport({ scale: 1 })
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const viewport = page.getViewport({ scale: (64 / base.width) * dpr })
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = Math.max(1, Math.round(viewport.width))
      canvas.height = Math.max(1, Math.round(viewport.height))
      setRatio(base.height / base.width)
      try {
        await page.render({ canvas, viewport }).promise
      } catch {
        /* dibatalkan */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [shown, doc, index])

  return (
    <div ref={wrapperRef}>
      <button
        type="button"
        data-thumb={index}
        onClick={() => onPick(index)}
        aria-label={`Ke halaman ${index + 1}`}
        aria-current={active}
        className={cx(
          'block w-full rounded-lg p-1 transition',
          active ? 'bg-gold-soft ring-1 ring-gold/40' : 'hover:bg-sunken',
        )}
      >
        <canvas
          ref={canvasRef}
          className="w-full rounded-sm bg-white ring-1 ring-line/70"
          style={{ aspectRatio: `${1 / ratio}` }}
        />
        <span
          className={cx(
            'mt-1 block text-center text-[0.65rem] tabular-nums',
            active ? 'font-semibold text-ink' : 'text-muted',
          )}
        >
          {index + 1}
        </span>
      </button>
    </div>
  )
}

interface PageViewProps {
  doc: PDFDocumentProxy
  index: number
  width: number
  pagePlacements: Placement[]
  signatures: Signature[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (id: string, rect: SignRect) => void
  onDragStart: () => void
  onDragEnd: () => void
  onDelete: (id: string) => void
}

function PageView({
  doc,
  index,
  width,
  pagePlacements,
  signatures,
  selectedId,
  onSelect,
  onChange,
  onDragStart,
  onDragEnd,
  onDelete,
}: PageViewProps) {
  const pageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const taskRef = useRef<RenderTask | null>(null)
  const [inView, setInView] = useState(false)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [guides, setGuides] = useState<Guides>({})

  // Kanvas dilepas saat halaman jauh dari layar (memori tetap wajar di PDF tebal).
  useEffect(() => {
    const node = pageRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: '1400px 0px',
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !inView || !width) return
    let cancelled = false

    void (async () => {
      const page = await doc.getPage(index + 1)
      if (cancelled) return
      const base = page.getViewport({ scale: 1 })
      const cssHeight = (width * base.height) / base.width
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const viewport = page.getViewport({ scale: (width / base.width) * dpr })

      canvas.width = Math.max(1, Math.round(viewport.width))
      canvas.height = Math.max(1, Math.round(viewport.height))
      canvas.style.width = `${width}px`
      canvas.style.height = `${cssHeight}px`
      setSize({ w: width, h: cssHeight })

      taskRef.current?.cancel()
      const task = page.render({ canvas, viewport })
      taskRef.current = task
      try {
        await task.promise
      } catch {
        // render dibatalkan karena ukuran/zoom berubah
      }
    })()

    return () => {
      cancelled = true
      taskRef.current?.cancel()
      canvas.width = 0
      canvas.height = 0
    }
  }, [doc, index, width, inView])

  return (
    <div
      ref={pageRef}
      data-page={index}
      className="relative shrink-0 rounded-[3px] bg-white ring-1 ring-line/80 shadow-[0_18px_40px_-28px_rgb(0_0_0/0.45)]"
      style={{ width: size.w || width, height: size.h || 420 }}
    >
      <canvas ref={canvasRef} className="block rounded-[3px]" />

      {guides.v !== undefined && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-px bg-gold/70"
          style={{ left: `${guides.v * 100}%` }}
        />
      )}
      {guides.h !== undefined && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-px bg-gold/70"
          style={{ top: `${guides.h * 100}%` }}
        />
      )}

      {pagePlacements.map((placement) => {
        const signature = signatures.find((item) => item.id === placement.signatureId)
        if (!signature) return null
        return (
          <Overlay
            key={placement.id}
            placement={placement}
            signature={signature}
            pageRef={pageRef}
            selected={selectedId === placement.id}
            onSelect={onSelect}
            onChange={onChange}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDelete={onDelete}
            onGuides={setGuides}
          />
        )
      })}

      <span className="pointer-events-none absolute -top-5 left-0 text-[0.68rem] font-medium tracking-[0.1em] text-muted">
        {index + 1}
      </span>
    </div>
  )
}

type DragMode = 'move' | 'resize' | 'rotate'

interface OverlayProps {
  placement: Placement
  signature: Signature
  pageRef: RefObject<HTMLDivElement | null>
  selected: boolean
  onSelect: (id: string) => void
  onChange: (id: string, rect: SignRect) => void
  onDragStart: () => void
  onDragEnd: () => void
  onDelete: (id: string) => void
  onGuides: (guides: Guides) => void
}

type DragState = {
  mode: DragMode
  pointerId: number
  rect: SignRect
  startX: number
  startY: number
  boxW: number
  boxH: number
  height: number
  centerX: number
  centerY: number
  startAngle: number
}

function Overlay({
  placement,
  signature,
  pageRef,
  selected,
  onSelect,
  onChange,
  onDragStart,
  onDragEnd,
  onDelete,
  onGuides,
}: OverlayProps) {
  const drag = useRef<DragState | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)
  const { rect } = placement

  // Tanda tangan baru langsung dibawa ke tengah layar supaya kelihatan.
  useEffect(() => {
    if (mounted.current) return
    mounted.current = true
    if (selected) rootRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [selected])

  const begin = (mode: DragMode) => (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.stopPropagation()
    event.preventDefault()
    onSelect(placement.id)
    const box = pageRef.current?.getBoundingClientRect()
    if (!box) return
    const height = heightFraction(rect.w, signature.aspect, box.width, box.height)
    const centerX = box.left + (rect.x + rect.w / 2) * box.width
    const centerY = box.top + (rect.y + height / 2) * box.height
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      mode,
      pointerId: event.pointerId,
      rect,
      startX: event.clientX,
      startY: event.clientY,
      boxW: box.width,
      boxH: box.height,
      height,
      centerX,
      centerY,
      startAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX),
    }
    onDragStart()
  }

  const move = (event: React.PointerEvent<HTMLElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    const start = state.rect

    if (state.mode === 'rotate') {
      const angle = Math.atan2(event.clientY - state.centerY, event.clientX - state.centerX)
      let delta = ((angle - state.startAngle) * 180) / Math.PI
      while (delta > 180) delta -= 360
      while (delta < -180) delta += 360
      onChange(placement.id, {
        ...start,
        tilt: clamp(start.tilt + delta, -TILT_LIMIT, TILT_LIMIT),
      })
      return
    }

    const dx = (event.clientX - state.startX) / state.boxW
    const dy = (event.clientY - state.startY) / state.boxH

    if (state.mode === 'move') {
      const x = clamp(start.x + dx, 0, Math.max(0, 1 - start.w))
      const y = clamp(start.y + dy, 0, Math.max(0, 1 - state.height))
      const snapped = snapMove(x, y, start.w, state.height)
      onChange(placement.id, { ...start, x: snapped.x, y: snapped.y })
      onGuides(snapped.guides)
      return
    }

    const minW = Math.min(0.04, 1 - start.x)
    const maxW = Math.max(
      minW,
      Math.min(1 - start.x, ((1 - start.y) * state.boxH * signature.aspect) / state.boxW),
    )
    onChange(placement.id, { ...start, w: clamp(start.w + dx, minW, maxW) })
  }

  const end = (event: React.PointerEvent<HTMLElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return
    drag.current = null
    onGuides({})
    onDragEnd()
  }

  return (
    <div
      ref={rootRef}
      data-overlay={placement.id}
      className={cx(
        'absolute touch-none select-none',
        selected ? 'z-20' : 'z-10',
        drag.current ? 'cursor-grabbing' : 'cursor-grab',
      )}
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.w * 100}%`,
        transform: `rotate(${rect.tilt}deg)`,
        transformOrigin: 'center',
      }}
      onPointerDown={begin('move')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <img
        src={signature.dataUrl}
        alt="Tanda tangan"
        draggable={false}
        className="pointer-events-none block w-full"
      />
      <div
        className={cx(
          'pointer-events-none absolute -inset-px rounded-[2px] transition',
          selected ? 'ring-2 ring-gold' : 'ring-1 ring-gold/0 hover:ring-1 hover:ring-gold/40',
        )}
      />
      {selected && (
        <>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onDelete(placement.id)}
            aria-label="Hapus tanda tangan dari halaman"
            className="absolute -top-2.5 -right-2.5 grid size-6 place-items-center rounded-full bg-ink text-on-ink shadow-sm ring-2 ring-surface"
          >
            <X className="size-3.5" strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onPointerDown={begin('rotate')}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            aria-label="Putar tanda tangan"
            title="Putar tanda tangan"
            className="absolute -top-8 left-1/2 grid size-7 -translate-x-1/2 cursor-grab place-items-center rounded-full bg-surface text-gold shadow-sm ring-1 ring-line"
          >
            <RotateCw className="size-3.5" strokeWidth={2} />
          </button>
          <span
            role="presentation"
            onPointerDown={begin('resize')}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            className="absolute -right-2 -bottom-2 size-4 cursor-nwse-resize rounded-full bg-gold ring-2 ring-surface"
          />
        </>
      )}
    </div>
  )
}
