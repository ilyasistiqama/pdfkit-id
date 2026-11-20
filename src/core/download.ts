import { trackDownload } from '../site/analytics'

export type OutputFile = { name: string; blob: Blob }

/** Unduh satu blob dengan nama tertentu. */
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/**
 * Unduh banyak berkas sebagai satu ZIP. Browser memblokir beberapa unduhan
 * otomatis dalam satu klik, jadi ZIP adalah cara yang paling andal.
 */
export async function downloadAll(files: OutputFile[], kind: string, zipName = 'hasil.zip') {
  if (files.length === 1) {
    downloadBlob(files[0].blob, files[0].name)
  } else {
    const { zipFiles } = await import('./zip')
    downloadBlob(await zipFiles(files), zipName)
  }
  trackDownload(kind)
}

export const pdfBlob = (bytes: Uint8Array) =>
  new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })

export const bytesToBlob = (bytes: Uint8Array, type: string) =>
  new Blob([new Uint8Array(bytes)], { type })

export const formatBytes = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) return '0 KB'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

/** data:image/png;base64,... → Blob, tanpa fetch agar tetap jalan di semua browser. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  const type = /^data:([^;,]+)/.exec(dataUrl)?.[1] ?? 'application/octet-stream'
  const binary = atob(dataUrl.slice(comma + 1))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

/** Unduh tanda tangan tersimpan sebagai PNG transparan, siap diimpor ulang. */
export function downloadSignaturePng(dataUrl: string, number: number) {
  downloadBlob(dataUrlToBlob(dataUrl), `tanda-tangan-${number}.png`)
  trackDownload('ekspor-tanda-tangan')
}
