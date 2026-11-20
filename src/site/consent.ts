/**
 * Persetujuan cookie pihak ketiga (iklan/analytics). Disimpan di perangkat saja.
 * Isi dokumen tetap tidak pernah dikirim ke mana pun, terlepas dari pilihan ini.
 */

const KEY = 'ttd-pdf:consent'
const EVENT = 'ttd:consent'

export type Consent = 'granted' | 'denied' | null

export function readConsent(): Consent {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    return null
  }
}

export function writeConsent(value: Exclude<Consent, null>) {
  try {
    localStorage.setItem(KEY, value)
  } catch {
    /* mode privat: pilihan hanya berlaku sampai tab ditutup */
  }
  window.dispatchEvent(new Event(EVENT))
}

export function onConsentChange(listener: () => void) {
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
