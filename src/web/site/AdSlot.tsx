import { useEffect, useRef, useState } from 'react'
import { ADSENSE_CLIENT, SLOTS, adsConfigured, loadAdSense, type SlotName } from '../../site/ads'
import { readConsent } from '../../site/consent'
import { cx } from '../ui'

/**
 * Slot iklan dengan tinggi yang dipesan sejak awal (mencegah layout bergeser),
 * label "Iklan" yang jelas, dan pemuatan lazy. Tidak memuat skrip apa pun
 * sebelum pengguna memberi izin, dan tidak menaruh iklan di dalam area dokumen
 * atau menempel pada tombol unduh.
 */

const SIZES: Record<SlotName, { height: number; className: string }> = {
  content: { height: 250, className: 'w-full' },
  sidebar: { height: 600, className: 'w-full' },
  anchor: { height: 100, className: 'w-full' },
}

interface Props {
  slot: SlotName
  /** kelas tambahan untuk pembungkus */
  className?: string
}

export function AdSlot({ slot, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [ready, setReady] = useState(false)
  const size = SIZES[slot]
  const slotId = SLOTS[slot]
  const active = adsConfigured() && Boolean(slotId)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || !active) return
    const mount = () => {
      if (readConsent() !== 'granted') return
      void loadAdSense().then(() => setReady(true))
    }
    mount()
    window.addEventListener('ttd:consent', mount)
    return () => window.removeEventListener('ttd:consent', mount)
  }, [active, visible])

  useEffect(() => {
    if (!ready || !active) return
    try {
      const ads = (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle
      if (!ads) return
      ads.push({})
    } catch {
      /* iklan gagal dimuat: ruang berlabel tetap ada */
    }
  }, [ready, active])

  return (
    <aside
      ref={ref}
      aria-label="Iklan"
      className={cx('overflow-hidden rounded-2xl bg-surface/60 ring-1 ring-line/60', className)}
      style={{ minHeight: size.height }}
    >
      <p className="border-b border-line/60 px-3 py-1.5 text-[0.6rem] font-semibold tracking-[0.16em] text-muted uppercase">
        Iklan
      </p>
      <div className="grid place-items-center p-2" style={{ minHeight: size.height - 32 }}>
        {active && ready ? (
          <ins
            className="adsbygoogle block w-full"
            style={{ display: 'block' }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          <p className="px-4 text-center text-[0.7rem] leading-relaxed text-muted/70">
            Ruang iklan. Tidak ada pelacakan sebelum Anda menyetujui cookie.
          </p>
        )}
      </div>
    </aside>
  )
}
