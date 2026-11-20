/**
 * Persetujuan cookie pihak ketiga (iklan/analytics). Disimpan di perangkat saja.
 * Isi dokumen tetap tidak pernah dikirim ke mana pun, terlepas dari pilihan ini.
 */

import { adsConfigured } from './ads'
import { analyticsReady } from './analytics'

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

/**
 * Notice persetujuan hanya perlu bila ada skrip pihak ketiga yang akan dimuat
 * (AdSense atau analitik diisi saat build). Tanpa itu, tidak ada cookie pihak
 * ketiga, jadi notice dan tautan "Pengaturan cookie" disembunyikan.
 */
export const consentNeeded = () => adsConfigured() || analyticsReady()
