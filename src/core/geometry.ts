/**
 * Semua posisi tanda tangan disimpan sebagai pecahan (0..1) dari ukuran halaman
 * yang *terlihat*. Dengan begitu posisi tetap benar saat zoom berubah, dan bisa
 * dipakai langsung saat mengekspor — termasuk untuk halaman PDF yang diputar
 * (/Rotate 90, 180, 270).
 */

export type SignRect = {
  /** jarak dari kiri, 0..1 */
  x: number
  /** jarak dari atas, 0..1 */
  y: number
  /** lebar, 0..1 dari lebar halaman */
  w: number
  /** kemiringan tanda tangan, derajat searah jarum jam (seperti CSS rotate) */
  tilt: number
}

export type PointRect = { x: number; y: number; w: number; h: number }

/** Garis bantu yang sedang aktif saat menggeser, sebagai pecahan halaman. */
export type Guides = { v?: number; h?: number }

export const TILT_LIMIT = 40

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export type Rotation = 0 | 90 | 180 | 270

export const normalizeRotation = (rotation: number): Rotation =>
  ((((Math.round(rotation / 90) * 90) % 360) + 360) % 360) as Rotation

/** Ukuran halaman seperti yang tampil (lebar/tinggi tertukar untuk rotasi 90/270). */
export function visualSize(pageWidth: number, pageHeight: number, rotation: number) {
  const r = normalizeRotation(rotation)
  return r === 90 || r === 270 ? { w: pageHeight, h: pageWidth } : { w: pageWidth, h: pageHeight }
}

/** Titik di ruang tampilan (asal kiri-atas) → titik di halaman PDF (asal kiri-bawah). */
export function visualToPage(
  rotation: number,
  pageWidth: number,
  pageHeight: number,
  vx: number,
  vy: number,
) {
  const r = normalizeRotation(rotation)
  if (r === 90) return { x: vy, y: vx }
  if (r === 180) return { x: pageWidth - vx, y: vy }
  if (r === 270) return { x: pageWidth - vy, y: pageHeight - vx }
  return { x: vx, y: pageHeight - vy }
}

/** Kebalikan dari visualToPage — dipakai untuk verifikasi. */
export function pageToVisual(
  rotation: number,
  pageWidth: number,
  pageHeight: number,
  px: number,
  py: number,
) {
  const r = normalizeRotation(rotation)
  if (r === 90) return { x: py, y: px }
  if (r === 180) return { x: pageWidth - px, y: py }
  if (r === 270) return { x: pageHeight - py, y: pageWidth - px }
  return { x: px, y: pageHeight - py }
}

/** Pecahan → titik PDF di ruang tampilan. Tinggi mengikuti rasio gambar. */
export function rectToPoints(rect: SignRect, aspect: number, visW: number, visH: number): PointRect {
  const w = rect.w * visW
  return { x: rect.x * visW, y: rect.y * visH, w, h: w / aspect }
}

export type DrawBox = {
  x: number
  y: number
  width: number
  height: number
  rotate: number
}

/**
 * Kotak di ruang tampilan → posisi gambar untuk pdf-lib (asal kiri-bawah,
 * rotasi berlawanan arah jarum jam). `tilt` adalah kemiringan tanda tangan
 * yang terlihat di layar, jadi arah putarannya dibalik di ruang halaman.
 */
export function toPageBox(
  rotation: number,
  pageWidth: number,
  pageHeight: number,
  vis: PointRect,
  tilt = 0,
): DrawBox {
  const center = visualToPage(
    rotation,
    pageWidth,
    pageHeight,
    vis.x + vis.w / 2,
    vis.y + vis.h / 2,
  )
  const angle = ((normalizeRotation(rotation) - tilt) * Math.PI) / 180
  const xAxis = { x: Math.cos(angle), y: Math.sin(angle) }
  const yAxis = { x: -Math.sin(angle), y: Math.cos(angle) }
  return {
    x: center.x - (vis.w / 2) * xAxis.x - (vis.h / 2) * yAxis.x,
    y: center.y - (vis.w / 2) * xAxis.y - (vis.h / 2) * yAxis.y,
    width: vis.w,
    height: vis.h,
    rotate: (angle * 180) / Math.PI,
  }
}

const MARGIN = 0.06

/** Tarik posisi ke tengah halaman atau ke tepi margin kalau sudah dekat. */
export function snapMove(
  x: number,
  y: number,
  w: number,
  h: number,
  tolerance = 0.012,
): { x: number; y: number; guides: Guides } {
  const guides: Guides = {}
  let nx = x
  let ny = y

  const near = (a: number, b: number) => Math.abs(a - b) <= tolerance

  if (near(x + w / 2, 0.5)) {
    nx = 0.5 - w / 2
    guides.v = 0.5
  } else if (near(x, MARGIN)) {
    nx = MARGIN
    guides.v = MARGIN
  } else if (near(x + w, 1 - MARGIN)) {
    nx = 1 - MARGIN - w
    guides.v = 1 - MARGIN
  }

  if (near(y + h / 2, 0.5)) {
    ny = 0.5 - h / 2
    guides.h = 0.5
  } else if (near(y, MARGIN)) {
    ny = MARGIN
    guides.h = MARGIN
  } else if (near(y + h, 1 - MARGIN)) {
    ny = 1 - MARGIN - h
    guides.h = 1 - MARGIN
  }

  return { x: nx, y: ny, guides }
}
