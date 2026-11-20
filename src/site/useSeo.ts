import { useEffect } from 'react'
import { CONTENT_UPDATED, SITE_NAME, absolute } from './site'
import type { HeadInput } from './head'

const MANAGED = 'data-managed-head'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    el.setAttribute(MANAGED, '')
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, hrefValue: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    el.setAttribute(MANAGED, '')
    document.head.appendChild(el)
  }
  el.setAttribute('href', hrefValue)
}

/**
 * Sinkronkan <head> di sisi klien. Saat build, tag yang sama sudah ditulis
 * langsung ke HTML oleh prerender, jadi ini hanya untuk navigasi tanpa muat ulang.
 */
export function useSeo(input: HeadInput) {
  useEffect(() => {
    document.title = input.title
    upsertMeta('name', 'description', input.description)
    upsertMeta('name', 'robots', input.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large')

    const url = absolute(input.path)
    if (url) upsertLink('canonical', url)

    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('property', 'og:locale', 'id_ID')
    upsertMeta('property', 'og:type', input.type ?? 'website')
    upsertMeta('property', 'og:title', input.title)
    upsertMeta('property', 'og:description', input.description)
    if (url) upsertMeta('property', 'og:url', url)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', input.title)
    upsertMeta('name', 'twitter:description', input.description)

    if (input.type === 'article') {
      upsertMeta('property', 'article:published_time', input.publishedTime ?? CONTENT_UPDATED)
      upsertMeta(
        'property',
        'article:modified_time',
        input.modifiedTime ?? input.publishedTime ?? CONTENT_UPDATED,
      )
    }

    const scripts: HTMLScriptElement[] = []
    for (const item of input.jsonLd ?? []) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.setAttribute(MANAGED, '')
      script.textContent = JSON.stringify(item)
      document.head.appendChild(script)
      scripts.push(script)
    }

    return () => {
      for (const script of scripts) script.remove()
    }
  }, [input])
}
