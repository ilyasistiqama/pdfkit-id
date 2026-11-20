/**
 * Penulis ZIP minimal (metode STORE, tanpa kompresi) tanpa dependensi.
 * Dipakai untuk mengunduh banyak hasil sekaligus: browser memblokir beberapa
 * unduhan otomatis, sedangkan satu ZIP selalu diizinkan. PDF, JPEG, dan PNG
 * sudah terkompresi, jadi STORE tidak memperbesar ukuran secara berarti.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

type Entry = { name: string; data: Uint8Array }

/** Tanggal/jam format MS-DOS; nilai tetap supaya hasil deterministik. */
const DOS_TIME = 0
const DOS_DATE = ((2026 - 1980) << 9) | (11 << 5) | 20

export type ZipInput = { name: string; blob: Blob }

/** Gabungkan beberapa berkas menjadi satu Blob ZIP. */
export async function zipFiles(files: ZipInput[]): Promise<Blob> {
  const entries: Entry[] = []
  const encoder = new TextEncoder()
  const used = new Set<string>()

  for (const file of files) {
    let name = file.name.replace(/[\\/]/g, '-')
    if (used.has(name)) {
      const dot = name.lastIndexOf('.')
      const base = dot > 0 ? name.slice(0, dot) : name
      const ext = dot > 0 ? name.slice(dot) : ''
      let counter = 2
      while (used.has(`${base}-${counter}${ext}`)) counter++
      name = `${base}-${counter}${ext}`
    }
    used.add(name)
    entries.push({ name, data: new Uint8Array(await file.blob.arrayBuffer()) })
  }

  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    const crc = crc32(entry.data)

    const local = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true)
    lv.setUint16(8, 0, true)
    lv.setUint16(10, DOS_TIME, true)
    lv.setUint16(12, DOS_DATE, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, entry.data.length, true)
    lv.setUint32(22, entry.data.length, true)
    lv.setUint16(26, nameBytes.length, true)
    lv.setUint16(28, 0, true)
    local.set(nameBytes, 30)

    const central = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, DOS_TIME, true)
    cv.setUint16(14, DOS_DATE, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, entry.data.length, true)
    cv.setUint32(24, entry.data.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint16(30, 0, true)
    cv.setUint16(32, 0, true)
    cv.setUint16(34, 0, true)
    cv.setUint16(36, 0, true)
    cv.setUint32(38, 0, true)
    cv.setUint32(42, offset, true)
    central.set(nameBytes, 46)

    locals.push(local, entry.data)
    centrals.push(central)
    offset += local.length + entry.data.length
  }

  const centralSize = centrals.reduce((sum, item) => sum + item.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  return new Blob([...locals, ...centrals, end] as BlobPart[], { type: 'application/zip' })
}
