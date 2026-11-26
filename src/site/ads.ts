import { BASE_PATH } from './site'
import { readConsent } from './privacyPreferences'

/** Konfigurasi iklan dari environment build. */

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

const cmpUrl = (import.meta.env.VITE_ADSENSE_CMP_SCRIPT ?? '').trim()
function getCmpScript() {
  try {
    const url = new URL(cmpUrl)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''
  } catch {
    return ''
  }
}
const cmpScript = getCmpScript()
export const adsConfigured = () => !BASE_PATH && /^ca-pub-\d+$/.test(ADSENSE_CLIENT) && Boolean(cmpScript) && Object.values(SLOTS).some(Boolean)
export const isAdvertisingPath = (path: string) => path === '/alat' || path === '/artikel' || path.startsWith('/artikel/')

type TcfData = {
  eventStatus?: string
  cmpStatus?: string
  gdprApplies?: boolean
  tcString?: string
  purpose?: { consents?: Record<number, boolean> }
  vendor?: { consents?: Record<number, boolean> }
}
let cmpStarted = false
let cmpAllowed = false
const listeners = new Set<() => void>()
export const advertisingStarted = () => cmpStarted
export const readCmp = () => cmpAllowed
export function subscribeCmp(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function startCmp() {
  if (cmpStarted || !adsConfigured() || !readConsent()?.ads) return
  cmpStarted = true
  const script = document.createElement('script')
  script.src = cmpScript
  script.async = true
  script.onload = () => {
    const api = (window as Window & { __tcfapi?: (command: string, version: number, callback: (data: TcfData, ok: boolean) => void) => void }).__tcfapi
    api?.('addEventListener', 2, (data, ok) => {
      const updated = ok && data?.cmpStatus === 'loaded' && (
        data.gdprApplies === false || (data.gdprApplies === true &&
          ['tcloaded', 'useractioncomplete'].includes(data.eventStatus ?? '') && Boolean(data.tcString) &&
          data.vendor?.consents?.[755] === true && [1, 3, 4].every((purpose) => data.purpose?.consents?.[purpose] === true))
      )
      if (updated !== cmpAllowed) {
        cmpAllowed = updated
        listeners.forEach((listener) => listener())
      }
    })
  }
  document.head.appendChild(script)
}

let scriptPromise: Promise<boolean> | null = null

/** Muat skrip AdSense sekali saja. Wajib dipanggil hanya setelah consent. */
export function loadAdSense() {
  if (!adsConfigured() || !readConsent()?.ads || !readCmp()) return Promise.resolve(false)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement('script')
    script.async = true
    script.crossOrigin = 'anonymous'
    script.dataset.adsense = ''
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}`
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })

  return scriptPromise
}
