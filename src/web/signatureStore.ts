import type { Signature } from '../core/types'
import { adsConfigured } from '../site/ads'
import { BASE_PATH } from '../site/site'

export const SIGNATURE_STORAGE_KEY = 'ttd-pdf:signatures'
export const BATCH_TEMPLATE_KEY = 'ttd-pdf:batch-sign-templates'
export const WORKFLOW_PRESET_KEY = 'ttd-pdf:workflow-presets'
const configuredOrigin = (import.meta.env.VITE_SIGNATURE_STORAGE_ORIGIN ?? '').trim()
const maxSignatures = 6
let sessionSignatures: Signature[] | undefined

export function canPersistSensitiveData() {
  if (typeof window === 'undefined' || BASE_PATH || adsConfigured()) return false
  const { protocol, hostname, origin } = window.location
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
  return loopback || (protocol === 'https:' && origin === configuredOrigin)
}

export function hasBrowserCopy(key: string) {
  try {
    return localStorage.getItem(key) !== null
  } catch {
    return false
  }
}

export function clearBrowserCopy(key: string) {
  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

export function loadSignatures() {
  let enabled = false
  let saved: Signature[] = []
  let needsReview = false
  try {
    const raw = localStorage.getItem(SIGNATURE_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) as { version?: number; enabled?: boolean; signatures?: unknown[] } | null : null
    if (parsed && Array.isArray(parsed.signatures)) {
      enabled = parsed.version === 2 && parsed.enabled === true && canPersistSensitiveData()
      needsReview = !enabled
      saved = parsed.signatures.filter((item): item is Signature => {
        if (!item || typeof item !== 'object') return false
        const { id, dataUrl, aspect } = item as Partial<Signature>
        return typeof id === 'string' && typeof dataUrl === 'string' && dataUrl.startsWith('data:image/png;base64,') &&
          typeof aspect === 'number' && Number.isFinite(aspect) && aspect > 0
      }).slice(-maxSignatures)
    }
  } catch {
    needsReview = hasBrowserCopy(SIGNATURE_STORAGE_KEY)
  }
  return { enabled, signatures: sessionSignatures ?? saved, needsReview }
}

export function saveSignatures(enabled: boolean, signatures: Signature[]) {
  sessionSignatures = signatures
  if (!enabled) return true
  if (!canPersistSensitiveData()) return false
  try {
    localStorage.setItem(SIGNATURE_STORAGE_KEY,
      JSON.stringify({ version: 2, enabled: true, signatures: signatures.slice(-maxSignatures) }))
    return true
  } catch {
    return false
  }
}
