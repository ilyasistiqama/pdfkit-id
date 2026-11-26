import { onConsentChange, readConsent } from './privacyPreferences'

const scriptUrl = (import.meta.env.VITE_ANALYTICS_SCRIPT ?? '').trim()
const domain = (import.meta.env.VITE_ANALYTICS_DOMAIN ?? '').trim()

type Details = { tool: string; page: string }
let active: { send: (details: Details) => void; dispose: () => void } | null = null

function configuration() {
  try {
    const url = new URL(scriptUrl)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    const google = url.hostname === 'www.googletagmanager.com' && url.pathname === '/gtag/js'
    const id = google ? (domain || url.searchParams.get('id') || '') : domain
    if (google && !/^G-[A-Z0-9]+$/i.test(id)) return null
    return { url: url.href, provider: google ? 'google' : url.hostname === 'plausible.io' ? 'plausible' : 'custom', id }
  } catch {
    return null
  }
}

const configured = configuration()
export const analyticsReady = () => configured !== null

/** Keep vendor code in an opaque-origin frame so it cannot read documents or browser data in the app. */
function analyticsDocument(config: NonNullable<typeof configured>, page: string) {
  const initial = JSON.stringify({ ...config, page }).replace(/</g, '\\u003c')
  return `<!doctype html><meta charset="utf-8"><script>
    const config = ${initial};
    const vendor = document.createElement('script');
    vendor.src = config.url;
    vendor.referrerPolicy = 'no-referrer';
    vendor.async = true;
    vendor.setAttribute('data-auto-track', 'false');
    if (config.provider === 'google') {
      window.dataLayer = [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      gtag('js', new Date());
      gtag('config', config.id, {
        send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
        page_location: config.page,
      });
    } else if (config.id) {
      vendor.setAttribute('data-domain', config.id);
    }
    window.addEventListener('message', (event) => {
      if (event.source !== parent || event.data?.type !== 'ttd:download') return;
      const { tool, page, url } = event.data;
      if (config.provider === 'google') gtag('event', 'document_downloaded', { tool, page_location: url });
      else if (typeof window.plausible === 'function') window.plausible('document_downloaded', { u: url, props: { tool, page } });
      else if (typeof window.umami?.track === 'function') window.umami.track((properties) => ({ ...properties, name: 'document_downloaded', url: page, data: { tool } }));
    });
    vendor.onload = () => parent.postMessage('ttd:analytics-ready', '*');
    vendor.onerror = () => parent.postMessage('ttd:analytics-failed', '*');
    document.head.appendChild(vendor);
  </script>`
}

export function stopAnalytics() {
  const current = active
  active = null
  current?.dispose()
}

export function enableAnalytics() {
  if (active || !configured || !readConsent()?.analytics) return
  const frame = document.createElement('iframe')
  frame.hidden = true
  frame.title = 'Analitik PDFKit'
  frame.referrerPolicy = 'no-referrer'
  frame.sandbox.add('allow-scripts')
  frame.srcdoc = analyticsDocument(configured, window.location.origin + window.location.pathname)
  const queue: Details[] = []
  let ready = false
  let failed = false

  const send = (details: Details) => {
    if (!readConsent()?.analytics || failed) return
    if (ready) {
      frame.contentWindow?.postMessage({ type: 'ttd:download', ...details, url: window.location.origin + details.page }, '*')
    } else if (queue.length < 24) {
      queue.push(details)
    }
  }
  const fromFrame = (event: MessageEvent) => {
    if (event.source !== frame.contentWindow || event.origin !== 'null' || !readConsent()?.analytics) return
    if (event.data === 'ttd:analytics-ready') {
      ready = true
      queue.splice(0).forEach(send)
    } else if (event.data === 'ttd:analytics-failed') {
      failed = true
      queue.length = 0
    }
  }
  window.addEventListener('message', fromFrame)
  const unsubscribe = onConsentChange(() => { if (!readConsent()?.analytics) stopAnalytics() })
  active = { send, dispose() {
    unsubscribe()
    window.removeEventListener('message', fromFrame)
    queue.length = 0
    frame.remove()
  } }
  document.body.appendChild(frame)
}

export function trackDownload(kind: string) {
  if (!analyticsReady() || !readConsent()?.analytics) return
  enableAnalytics()
  active?.send({ tool: kind, page: window.location.pathname })
}
