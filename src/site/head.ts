import { CONTENT_UPDATED, SITE_NAME, SITE_URL, absolute } from './site'

/** Escape minimal untuk atribut dan isi teks. */
const esc = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export type HeadInput = {
  path: string
  title: string
  description: string
  /** tautan gambar sosial, relatif terhadap situs */
  image?: string
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  /** JSON-LD tambahan, satu objek atau array objek */
  jsonLd?: unknown[]
  noindex?: boolean
}

/** Daftar tag yang perlu ada di <head> untuk satu rute. */
export function headTags(input: HeadInput): string {
  const url = absolute(input.path)
  const image = absolute(input.image ?? '/og.png')
  const tags: string[] = [
    `<title>${esc(input.title)}</title>`,
    `<meta name="description" content="${esc(input.description)}" />`,
  ]

  if (input.noindex) tags.push('<meta name="robots" content="noindex, follow" />')
  else tags.push('<meta name="robots" content="index, follow, max-image-preview:large" />')

  if (url) tags.push(`<link rel="canonical" href="${esc(url)}" />`)

  tags.push(`<meta property="og:site_name" content="${esc(SITE_NAME)}" />`)
  tags.push(`<meta property="og:locale" content="id_ID" />`)
  tags.push(`<meta property="og:type" content="${input.type ?? 'website'}" />`)
  tags.push(`<meta property="og:title" content="${esc(input.title)}" />`)
  tags.push(`<meta property="og:description" content="${esc(input.description)}" />`)
  if (url) tags.push(`<meta property="og:url" content="${esc(url)}" />`)
  if (image) tags.push(`<meta property="og:image" content="${esc(image)}" />`)

  tags.push(`<meta name="twitter:card" content="summary_large_image" />`)
  tags.push(`<meta name="twitter:title" content="${esc(input.title)}" />`)
  tags.push(`<meta name="twitter:description" content="${esc(input.description)}" />`)
  if (image) tags.push(`<meta name="twitter:image" content="${esc(image)}" />`)

  if (input.type === 'article') {
    tags.push(`<meta property="article:published_time" content="${input.publishedTime ?? CONTENT_UPDATED}" />`)
    tags.push(`<meta property="article:modified_time" content="${input.modifiedTime ?? input.publishedTime ?? CONTENT_UPDATED}" />`)
  }

  for (const item of input.jsonLd ?? []) {
    // </script> di dalam data JSON bisa menutup tag lebih awal, amankan.
    const json = JSON.stringify(item).replace(/</g, '\\u003c')
    tags.push(`<script type="application/ld+json">${json}</script>`)
  }

  return tags.join('\n    ')
}

/** URL gambar sosial default. */
export const DEFAULT_OG_IMAGE = SITE_URL ? `${SITE_URL}/og.png` : '/og.png'
