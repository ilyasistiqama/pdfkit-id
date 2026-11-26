export const PHOTO_ACCEPT = [
  'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/bmp', 'image/tiff',
  '.jpg', '.jpeg', '.jfif', '.png', '.webp', '.avif', '.gif', '.bmp', '.heic', '.heif', '.tif', '.tiff',
].join(',')
export const PHOTO_HINT = 'JPG/JPEG, PNG, WebP, AVIF, GIF, BMP, HEIC/HEIF, atau TIFF'

const heicBrands = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs'])

export function detectPhotoType(bytes: Uint8Array) {
  const matches = (signature: number[], offset = 0) => signature.every((value, index) => bytes[offset + index] === value)
  const tag = (offset: number, length = 4) => String.fromCharCode(...bytes.subarray(offset, offset + length))
  if (matches([0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (matches([137, 80, 78, 71, 13, 10, 26, 10])) return 'image/png'
  if (tag(0) === 'RIFF' && tag(8) === 'WEBP') return 'image/webp'
  if (tag(0, 6) === 'GIF87a' || tag(0, 6) === 'GIF89a') return 'image/gif'
  if (bytes.length >= 14 && tag(0, 2) === 'BM') return 'image/bmp'
  if (matches([73, 73, 42, 0]) || matches([77, 77, 0, 42])) return 'image/tiff'
  if (bytes.length >= 16 && tag(4) === 'ftyp') {
    const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0)
    if (length < 16) return null
    const brands = new Set([tag(8)])
    for (let offset = 16; offset + 4 <= Math.min(length, bytes.length, 4096); offset += 4) brands.add(tag(offset))
    if (brands.has('avif') || brands.has('avis')) return 'image/avif'
    if ([...brands].some((brand) => heicBrands.has(brand))) return 'image/heic'
    if (brands.has('mif1') || brands.has('msf1')) return 'image/heif'
  }
  return null
}

export function unknownPhotoError() {
  return new Error(`Format gambar tidak dikenali. Gunakan ${PHOTO_HINT}.`)
}

export async function normalizePhotoFile(file: File) {
  const type = detectPhotoType(new Uint8Array(await file.slice(0, 4096).arrayBuffer()))
  if (!type) throw unknownPhotoError()
  return type === file.type ? file : file.slice(0, file.size, type)
}

export async function decodePhotoUrl(url: string) {
  const image = new Image()
  image.src = url
  try {
    await image.decode()
    if (image.naturalWidth && image.naturalHeight) return image
  } catch {
    // Browser bisa menolak format tertentu atau file yang rusak.
  }
  throw new Error('Gambar rusak atau formatnya belum didukung browser ini. Coba buka di browser lain atau simpan sebagai JPG/PNG.')
}

export async function withPhotoImage<T>(blob: Blob, run: (image: HTMLImageElement) => T | Promise<T>) {
  const url = URL.createObjectURL(blob)
  try {
    return await run(await decodePhotoUrl(url))
  } finally {
    URL.revokeObjectURL(url)
  }
}
