import type { Signature } from '../core/types'

const KEY = 'ttd-pdf:signatures'
const MAX_SIGNATURES = 6

export type StoredSignatures = { enabled: boolean; signatures: Signature[] }

/** Tanda tangan disimpan di perangkat saja (localStorage), tidak pernah dikirim. */
export function loadSignatures(): StoredSignatures {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { enabled: true, signatures: [] }
    const parsed: unknown = JSON.parse(raw)
    const data = parsed as Partial<StoredSignatures> | null
    if (!data || !Array.isArray(data.signatures)) return { enabled: true, signatures: [] }
    return {
      enabled: data.enabled !== false,
      signatures: data.signatures.filter(
        (item): item is Signature =>
          !!item &&
          typeof item.id === 'string' &&
          typeof item.dataUrl === 'string' &&
          typeof item.aspect === 'number',
      ),
    }
  } catch {
    return { enabled: true, signatures: [] }
  }
}

export function saveSignatures(enabled: boolean, signatures: Signature[]) {
  try {
    if (!enabled) {
      localStorage.removeItem(KEY)
      return true
    }
    localStorage.setItem(
      KEY,
      JSON.stringify({ enabled, signatures: signatures.slice(-MAX_SIGNATURES) }),
    )
    return true
  } catch {
    return false
  }
}
