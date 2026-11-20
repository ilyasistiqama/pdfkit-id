import { describe, expect, it } from 'vitest'
import {
  pageToVisual,
  rectToPoints,
  snapMove,
  visibleBox,
  toPageBox,
  visualSize,
  type SignRect,
} from './geometry'

const ROTATIONS = [0, 90, 180, 270]
const TILTS = [0, 8, -12, 25, -40]
const PAGES = [
  { w: 595, h: 842 },
  { w: 842, h: 595 },
]

const rotate = (x: number, y: number, cx: number, cy: number, degrees: number) => {
  const angle = (degrees * Math.PI) / 180
  const dx = x - cx
  const dy = y - cy
  return {
    x: cx + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: cy + dx * Math.sin(angle) + dy * Math.cos(angle),
  }
}

describe('toPageBox', () => {
  it('mengembalikan gambar ke posisi visual semula untuk semua rotasi & kemiringan', () => {
    for (const rotation of ROTATIONS) {
      for (const tilt of TILTS) {
        for (const page of PAGES) {
          const vis = visualSize(page.w, page.h, rotation)
          const rect: SignRect = { x: 0.18, y: 0.55, w: 0.3, tilt }
          const points = rectToPoints(rect, 2.5, vis.w, vis.h)
          const box = toPageBox(rotation, page.w, page.h, points, tilt)

          const rad = (box.rotate * Math.PI) / 180
          const ux = Math.cos(rad)
          const uy = Math.sin(rad)
          const vx = -Math.sin(rad)
          const vy = Math.cos(rad)

          const corners = ([[0, 0], [1, 0], [0, 1], [1, 1]] as const).map(([s, t]) => {
            const px = box.x + s * box.width * ux + t * box.height * vx
            const py = box.y + s * box.width * uy + t * box.height * vy
            return pageToVisual(rotation, page.w, page.h, px, py)
          })

          const center = { x: points.x + points.w / 2, y: points.y + points.h / 2 }
          const expected = [
            { x: points.x, y: points.y },
            { x: points.x + points.w, y: points.y },
            { x: points.x, y: points.y + points.h },
            { x: points.x + points.w, y: points.y + points.h },
          ]

          for (const corner of corners) {
            const restored = rotate(corner.x, corner.y, center.x, center.y, -tilt)
            const nearest = expected.reduce((best, item) => {
              const distance = Math.hypot(item.x - restored.x, item.y - restored.y)
              return Math.min(best, distance)
            }, Number.POSITIVE_INFINITY)
            expect(nearest).toBeLessThan(0.5)
          }
        }
      }
    }
  })

  it('tetap berada di dalam batas halaman', () => {
    for (const rotation of ROTATIONS) {
      for (const page of PAGES) {
        const vis = visualSize(page.w, page.h, rotation)
        const points = rectToPoints({ x: 0.62, y: 0.8, w: 0.26, tilt: 0 }, 4, vis.w, vis.h)
        const box = toPageBox(rotation, page.w, page.h, points, 0)
        const rad = (box.rotate * Math.PI) / 180
        const ux = Math.cos(rad)
        const uy = Math.sin(rad)
        const vx = -Math.sin(rad)
        const vy = Math.cos(rad)
        for (const [s, t] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
          const px = box.x + s * box.width * ux + t * box.height * vx
          const py = box.y + s * box.width * uy + t * box.height * vy
          expect(px).toBeGreaterThanOrEqual(-0.001)
          expect(py).toBeGreaterThanOrEqual(-0.001)
          expect(px).toBeLessThanOrEqual(page.w + 0.001)
          expect(py).toBeLessThanOrEqual(page.h + 0.001)
        }
      }
    }
  })
})

describe('visualSize', () => {
  it('menukar lebar dan tinggi untuk rotasi 90/270', () => {
    expect(visualSize(600, 800, 0)).toEqual({ w: 600, h: 800 })
    expect(visualSize(600, 800, 90)).toEqual({ w: 800, h: 600 })
    expect(visualSize(600, 800, 180)).toEqual({ w: 600, h: 800 })
    expect(visualSize(600, 800, 270)).toEqual({ w: 800, h: 600 })
    expect(visualSize(600, 800, -90)).toEqual({ w: 800, h: 600 })
  })
})

describe('snapMove', () => {
  it('menarik ke tengah halaman', () => {
    const result = snapMove(0.39, 0.3, 0.2, 0.1)
    expect(result.x).toBeCloseTo(0.4)
    expect(result.guides.v).toBe(0.5)
  })

  it('menarik ke tepi margin', () => {
    const result = snapMove(0.064, 0.911, 0.2, 0.03)
    expect(result.x).toBeCloseTo(0.06)
    expect(result.guides.v).toBeCloseTo(0.06)
    expect(result.y).toBeCloseTo(0.91)
    expect(result.guides.h).toBeCloseTo(0.94)
  })

  it('tidak mengubah posisi kalau jauh dari garis bantu', () => {
    const result = snapMove(0.3, 0.25, 0.2, 0.1)
    expect(result.x).toBeCloseTo(0.3)
    expect(result.y).toBeCloseTo(0.25)
    expect(result.guides).toEqual({})
  })
})

describe('visibleBox', () => {
  const media = { x: 0, y: 0, width: 612, height: 792 }

  it('memakai CropBox bila ada di dalam MediaBox', () => {
    expect(visibleBox({ x: 36, y: 72, width: 500, height: 600 }, media)).toEqual({
      x: 36,
      y: 72,
      width: 500,
      height: 600,
    })
  })

  it('memotong CropBox yang melewati MediaBox, seperti pdf.js', () => {
    expect(visibleBox({ x: -10, y: 700, width: 100, height: 200 }, media)).toEqual({
      x: 0,
      y: 700,
      width: 90,
      height: 92,
    })
  })

  it('kembali ke MediaBox bila tidak beririsan', () => {
    expect(visibleBox({ x: 1000, y: 1000, width: 10, height: 10 }, media)).toEqual(media)
  })
})
