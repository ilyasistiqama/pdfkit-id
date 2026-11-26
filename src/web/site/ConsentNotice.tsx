import { useEffect, useState, useSyncExternalStore } from 'react'
import { advertisingStarted, adsConfigured } from '../../site/ads'
import { analyticsReady, enableAnalytics, stopAnalytics } from '../../site/analytics'
import { noConsent, onConsentChange, OPEN_PRIVACY_SETTINGS, readConsent, writeConsent, type Consent } from '../../site/privacyPreferences'
import { consentNeeded } from '../../site/consent'
import { Link } from '../../router'
import { btnPrimary } from '../ui'

export function ConsentNotice() {
  const consent = useSyncExternalStore(onConsentChange, readConsent, () => null)
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState(noConsent)

  useEffect(() => {
    setMounted(true)
    const show = () => { setChoice(readConsent() ?? noConsent); setOpen(true) }
    window.addEventListener(OPEN_PRIVACY_SETTINGS, show)
    return () => window.removeEventListener(OPEN_PRIVACY_SETTINGS, show)
  }, [])

  useEffect(() => {
    if (consent?.analytics) enableAnalytics()
    else stopAnalytics()
    if (!consent?.ads && advertisingStarted()) window.location.reload()
  }, [consent])

  const decide = (value: Consent) => {
    writeConsent({ analytics: analyticsReady() && value.analytics, ads: adsConfigured() && value.ads })
    setOpen(false)
  }

  if (!mounted || !consentNeeded() || (consent && !open)) return null

  return (
    <section aria-label="Pilihan privasi" className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3">
      <div className="mx-auto max-w-2xl space-y-3 rounded-2xl bg-surface p-4 shadow-xl ring-1 ring-line">
        <h2 className="text-sm font-medium text-ink">Pilihan privasi</h2>
        <p className="text-xs text-muted">Analitik dan iklan bersifat opsional. Alat tetap dapat digunakan. <Link to="/privasi" className="text-gold hover:underline">Kebijakan Privasi</Link></p>
        {analyticsReady() && <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={choice.analytics} onChange={(event) => setChoice({ ...choice, analytics: event.target.checked })} />
          Izinkan statistik penggunaan alat
        </label>}
        {adsConfigured() && <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={choice.ads} onChange={(event) => setChoice({ ...choice, ads: event.target.checked })} />
          Izinkan layanan iklan di halaman panduan
        </label>}
        {consent?.ads && advertisingStarted() && <p className="text-xs text-muted">Halaman panduan dimuat ulang jika izin iklan dicabut.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="flex-1 rounded-xl px-3 py-2 text-sm ring-1 ring-line" onClick={() => decide(noConsent)}>Tolak semua</button>
          <button type="button" className={`${btnPrimary} flex-1`} onClick={() => decide(choice)}>Simpan pilihan</button>
          {open && consent && <button type="button" className="px-3 text-sm text-muted" onClick={() => setOpen(false)}>Tutup</button>}
        </div>
      </div>
    </section>
  )
}
