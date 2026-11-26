/** Baca orientasi EXIF JPEG tanpa mengganti atau mengompres ulang pikselnya. */
export function jpegOrientation(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  for (let offset = 2; offset + 4 <= view.byteLength;) {
    if (bytes[offset++] !== 0xff) break
    while (bytes[offset] === 0xff) offset++
    const marker = bytes[offset++]
    if (marker === 0xda || marker === 0xd9 || offset + 2 > view.byteLength) break
    const length = view.getUint16(offset)
    const end = offset + length
    if (length < 2 || end > view.byteLength) break
    const exif = offset + 2
    if (marker === 0xe1 && length >= 16 && view.getUint32(exif) === 0x45786966 && view.getUint16(exif + 4) === 0) {
      const tiff = exif + 6
      const endian = view.getUint16(tiff)
      const little = endian === 0x4949
      if ((little || endian === 0x4d4d) && view.getUint16(tiff + 2, little) === 42) {
        const ifd = tiff + view.getUint32(tiff + 4, little)
        if (ifd >= tiff + 8 && ifd + 2 <= end) {
          const entries = view.getUint16(ifd, little)
          for (let i = 0, entry = ifd + 2; i < entries && entry + 12 <= end; i++, entry += 12) {
            if (view.getUint16(entry, little) !== 0x0112 || view.getUint16(entry + 2, little) !== 3 ||
              view.getUint32(entry + 4, little) !== 1) continue
            const orientation = view.getUint16(entry + 8, little)
            if (orientation >= 1 && orientation <= 8) return orientation
          }
        }
      }
    }
    offset = end
  }
  return 1
}

export function imageOrientationMatrix(orientation: number, width: number, height: number): [number, number, number, number, number, number] {
  switch (orientation) {
    case 2: return [-1, 0, 0, 1, width, 0]
    case 3: return [-1, 0, 0, -1, width, height]
    case 4: return [1, 0, 0, -1, 0, height]
    case 5: return [0, -1, -1, 0, width, height]
    case 6: return [0, -1, 1, 0, 0, height]
    case 7: return [0, 1, 1, 0, 0, 0]
    case 8: return [0, 1, -1, 0, width, 0]
    default: return [1, 0, 0, 1, 0, 0]
  }
}
