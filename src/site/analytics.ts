/**
 * Analitik ringan tanpa dependensi. Skrip (GA4, Plausible, atau Umami) baru
 * dimuat setelah pengguna menyetujui cookie. Sebelum itu, event hanya antre di
 * memori dan dibuang bila tidak pernah ada persetujuan.
 */

const SCRIPT = (import.meta.env.VITE_ANALYTICS_SCRIPT ?? '').trim()
const DOMAIN = (import.meta.env.VITE_ANALYTICS_DOMAIN ?? '').trim()

type Params = Record<string, string | number | boolean>
type QueueItem = { event: string; params?: Params }

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    plausible?: (event: string, options?: { props?: Params }) => void
    umami?: { track: (event: string, data?: Params) => void }
  }
}

const queue: QueueItem[] = []
let loaded = false

export const analyticsReady = () => Boolean(SCRIPT)

function loadScript() {
  if (loaded || !SCRIPT) return
  loaded = true

  const script = document.createElement('script')
  script.async = true
  script.defer = true

  if (SCRIPT.includes('googletagmanager') || SCRIPT.includes('gtag')) {
    script.src = SCRIPT
    window.dataLayer = window.dataLayer ?? []
    window.gtag = (...args: unknown[]) => window.dataLayer?.push(args)
    window.gtag('js', new Date())
    if (DOMAIN) window.gtag('config', DOMAIN, { anonymize_ip: true })
  } else if (DOMAIN) {
    script.src = SCRIPT
    script.setAttribute('data-domain', DOMAIN)
    if (SCRIPT.includes('plausible')) script.setAttribute('data-api', '/api/event')
  } else {
    script.src = SCRIPT
  }

  document.head.appendChild(script)
  flush()
}

function send(item: QueueItem) {
  if (window.gtag && DOMAIN) window.gtag('event', item.event, item.params)
  else if (window.plausible) window.plausible(item.event, { props: item.params })
  else if (window.umami) window.umami.track(item.event, item.params)
}

function flush() {
  while (queue.length) {
    const item = queue.shift()
    if (item) send(item)
  }
}

/** Catat event. Tidak melakukan apa pun sebelum consent diberikan. */
export function track(event: string, params?: Params) {
  if (!SCRIPT) return
  queue.push({ event, params })
  if (loaded) flush()
}

/** Dipanggil sekali dari lapisan consent setelah izin diberikan. */
export function enableAnalytics() {
  if (!SCRIPT) return
  loadScript()
}

/** Event konversi utama: dokumen berhasil diunduh. */
export const trackDownload = (kind: string) =>
  track('document_downloaded', { tool: kind, page: window.location.pathname })
