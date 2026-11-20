import { useEffect, useState } from 'react'
import { Cookie } from 'lucide-react'
import { enableAnalytics } from '../../site/analytics'
import { loadAdSense } from '../../site/ads'
import { readConsent, writeConsent, type Consent } from '../../site/consent'
import { Link } from '../../router'
import { btnPrimary, cx } from '../ui'

/**
 * Notice persetujuan cookie pihak ketiga. Isi dokumen tetap di perangkat apa pun
 * pilihannya; notice ini hanya mengatur skrip iklan dan analitik.
 *
 * Pilihan disimpan di perangkat dan dibaca setelah mount: HTML hasil prerender
 * tidak pernah memuat notice, sehingga pengunjung yang sudah memilih tidak
 * melihatnya berkedip dan hidrasi tidak bentrok.
 */
export function ConsentNotice() {
  const [consent, setConsent] = useState<Consent | 'unknown'>('unknown')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setConsent(readConsent())
  }, [])

  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener('ttd:open-cookie-settings', show)
    return () => window.removeEventListener('ttd:open-cookie-settings', show)
  }, [])

  useEffect(() => {
    if (consent !== 'granted') return
    enableAnalytics()
    void loadAdSense()
  }, [consent])

  const decide = (value: Exclude<Consent, null>) => {
    writeConsent(value)
    setConsent(value)
    setOpen(false)
  }

  if (consent === 'unknown') return null
  if (consent && !open) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-3xl rounded-2xl bg-surface p-4 shadow-[0_-10px_40px_-20px_rgb(0_0_0/0.35)] ring-1 ring-line">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 size-4 shrink-0 text-gold" strokeWidth={1.8} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Iklan memakai cookie</p>
            <p className="mt-1 text-[0.8rem] leading-relaxed text-muted">
              Dokumen Anda tidak pernah diunggah. Namun iklan dan analitik pihak ketiga memakai
              cookie untuk mengukur tayangan. Anda bisa menolak dan situs tetap berfungsi penuh.{' '}
              <Link to="/privasi" className="font-medium text-gold underline-offset-2 hover:underline">
                Kebijakan privasi
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => decide('denied')}
            className="h-10 flex-1 rounded-xl text-sm font-medium text-ink-soft ring-1 ring-line transition hover:bg-sunken"
          >
            Tolak iklan personal
          </button>
          <button
            type="button"
            onClick={() => decide('granted')}
            className={cx(btnPrimary, 'h-10 flex-1 text-sm')}
          >
            Setuju
          </button>
        </div>
      </div>
    </div>
  )
}
