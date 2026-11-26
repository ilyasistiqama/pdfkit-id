import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ADSENSE_CLIENT, SLOTS, adsConfigured, loadAdSense, readCmp, startCmp, subscribeCmp, type SlotName } from '../../site/ads'
import { onConsentChange, readConsent } from '../../site/privacyPreferences'
import { cx } from '../ui'

interface Props {
  slot: SlotName
  /** kelas tambahan untuk pembungkus */
  className?: string
}

export function AdSlot({ slot, className }: Props) {
  const slotId = SLOTS[slot]
  if (!adsConfigured() || !slotId) return null
  return <ConfiguredAdSlot key={slotId} slotId={slotId} className={className} />
}

function ConfiguredAdSlot({ slotId, className }: { slotId: string; className?: string }) {
  const marker = useRef<HTMLDivElement>(null)
  const ad = useRef<HTMLModElement>(null)
  const requestedAd = useRef<HTMLModElement>(null)
  const [nearViewport, setNearViewport] = useState(false)
  const [status, setStatus] = useState<'pending' | 'ready' | 'failed'>('pending')
  const consent = useSyncExternalStore(onConsentChange, readConsent, () => null)
  const cmpAllows = useSyncExternalStore(subscribeCmp, readCmp, () => false)
  const allowed = consent?.ads === true && cmpAllows
  useEffect(() => { if (consent?.ads) startCmp() }, [consent?.ads])
  const showAdUnit = allowed && status === 'ready'

  useEffect(() => {
    const node = marker.current
    if (!allowed || nearViewport || !node) return
    if (typeof IntersectionObserver === 'undefined') {
      setNearViewport(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [allowed, nearViewport])

  useEffect(() => {
    if (!allowed || !nearViewport || status !== 'pending') return
    let current = true
    void loadAdSense().then((loaded) => {
      if (current) setStatus(loaded ? 'ready' : 'failed')
    })
    return () => {
      current = false
    }
  }, [allowed, nearViewport, status])

  useEffect(() => {
    const node = ad.current
    if (!showAdUnit || !node || requestedAd.current === node || (!readConsent()?.ads || !readCmp())) return
    requestedAd.current = node
    try {
      const ads = (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle
      if (ads) ads.push({})
      else setStatus('failed')
    } catch {
      setStatus('failed')
    }
  }, [showAdUnit])

  if (!allowed || status === 'failed') return null
  if (!showAdUnit) return <div ref={marker} aria-hidden="true" />

  return (
    <aside aria-label="Iklan" className={cx('ad-slot', className)}>
      <p className="ad-slot-label hidden border-b border-line/60 px-3 py-1.5 text-[0.6rem] font-semibold tracking-[0.16em] text-muted uppercase">
        Iklan
      </p>
      <ins
        ref={ad}
        className="adsbygoogle w-full"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  )
}
