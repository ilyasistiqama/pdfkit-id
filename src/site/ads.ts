/**
 * Konfigurasi iklan dari environment build. Bila kosong, slot tetap tampil
 * sebagai ruang berlabel tanpa memuat skrip apa pun (aman untuk pengembangan
 * dan untuk deploy sebelum AdSense disetujui).
 */

export const ADSENSE_CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT ?? '').trim()

export const SLOTS = {
  /** di bawah area dokumen/alat, desktop */
  content: (import.meta.env.VITE_ADSENSE_SLOT_CONTENT ?? '').trim(),
  /** sidebar kanan, desktop */
  sidebar: (import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR ?? '').trim(),
  /** anchor bawah, hanya mobile */
  anchor: (import.meta.env.VITE_ADSENSE_SLOT_ANCHOR ?? '').trim(),
} as const

export type SlotName = keyof typeof SLOTS

export const adsConfigured = () => Boolean(ADSENSE_CLIENT)

let scriptPromise: Promise<void> | null = null

/** Muat skrip AdSense sekali saja. Wajib dipanggil hanya setelah consent. */
export function loadAdSense() {
  if (!ADSENSE_CLIENT) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-adsense]')
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.async = true
    script.crossOrigin = 'anonymous'
    script.dataset.adsense = ''
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}`
    script.onload = () => resolve()
    script.onerror = () => resolve()
    document.head.appendChild(script)
  })

  return scriptPromise
}
