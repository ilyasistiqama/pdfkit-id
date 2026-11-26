const key = 'ttd-pdf:privacy-preferences:v2'
export const OPEN_PRIVACY_SETTINGS = 'ttd:open-cookie-settings'
const changedEvent = 'ttd:consent'

export type Consent = { analytics: boolean; ads: boolean }
export const noConsent: Consent = { analytics: false, ads: false }
let rawSnapshot: string | null | undefined
let snapshot: Consent | null = null
let sessionChoice: Consent | null = null

export function readConsent(): Consent | null {
  if (typeof window === 'undefined') return null
  if (sessionChoice) return sessionChoice
  try {
    const raw = localStorage.getItem(key)
    if (raw !== rawSnapshot) {
      rawSnapshot = raw
      const value: Partial<Consent> | null = raw ? JSON.parse(raw) : null
      snapshot = value && typeof value.analytics === 'boolean' && typeof value.ads === 'boolean'
        ? { analytics: value.analytics, ads: value.ads } : null
    }
    return snapshot
  } catch {
    snapshot = null
    return null
  }
}

export function writeConsent(value: Consent) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    sessionChoice = null
  } catch {
    sessionChoice = value
  }
  window.dispatchEvent(new Event(changedEvent))
}

export function onConsentChange(listener: () => void) {
  const fromStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      sessionChoice = null
      listener()
    }
  }
  window.addEventListener(changedEvent, listener)
  window.addEventListener('storage', fromStorage)
  window.addEventListener('pageshow', listener)
  return () => {
    window.removeEventListener(changedEvent, listener)
    window.removeEventListener('storage', fromStorage)
    window.removeEventListener('pageshow', listener)
  }
}
