import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { RouterProvider, usePath } from './router'
import { matchRoute, STATIC_PAGES, TOOLS, toolTitle, type Match } from './site/routes'
import { CONTACT_EMAIL, SITE_NAME } from './site/site'
import { useSeo } from './site/useSeo'
import { SiteHeader } from './web/site/SiteHeader'
import { SiteFooter } from './web/site/SiteFooter'
import { ConsentNotice } from './web/site/ConsentNotice'
import { ArticlesIndex, HomeExtras, ToolsIndex } from './web/site/SiteSections'
import { ToolFooter, ToolIntro } from './web/tools/ToolPage'
import { ClientOnly } from './web/site/ClientOnly'
import SignWorkspace from './web/sign/SignWorkspace'
import { AboutPage, FaqPage, PrivacyPage, TermsPage, FAQ_ITEMS_EXPORT } from './web/site/InfoPages'
import { ArticlePage } from './web/site/ArticlePage'
import { Link } from './router'
import { eyebrow } from './web/ui'

const MergeTool = lazy(() =>
  import('./web/tools/BasicTools').then((module) => ({ default: module.MergeTool })),
)
const RotateTool = lazy(() =>
  import('./web/tools/BasicTools').then((module) => ({ default: module.RotateTool })),
)
const WatermarkTool = lazy(() =>
  import('./web/tools/BasicTools').then((module) => ({ default: module.WatermarkTool })),
)
const SplitTool = lazy(() =>
  import('./web/tools/SplitTool').then((module) => ({ default: module.SplitTool })),
)
const JpgToPdfTool = lazy(() =>
  import('./web/tools/JpgToPdfTool').then((module) => ({ default: module.JpgToPdfTool })),
)
const PhotoToWordTool = lazy(() => import('./web/tools/PhotoToWordTool'))
const SearchablePdfTool = lazy(() => import('./web/tools/SearchablePdfTool'))
const OrganizePdfTool = lazy(() => import('./web/tools/OrganizePdfTool'))
const RedactPdfTool = lazy(() => import('./web/tools/RedactPdfTool'))
const PdfToJpgTool = lazy(() =>
  import('./web/tools/ConvertTools').then((module) => ({ default: module.PdfToJpgTool })),
)
const CompressTool = lazy(() =>
  import('./web/tools/ConvertTools').then((module) => ({ default: module.CompressTool })),
)
const FillFormTool = lazy(() =>
  import('./web/tools/FillFormTool').then((module) => ({ default: module.FillFormTool })),
)
const BatchSignTool = lazy(() =>
  import('./web/tools/BatchSignTool').then((module) => ({ default: module.BatchSignTool })),
)

const TOOL_COMPONENTS = {
  'gabung-pdf': MergeTool,
  'pisah-pdf': SplitTool,
  'pdf-ke-jpg': PdfToJpgTool,
  'foto-ke-pdf': JpgToPdfTool,
  'foto-ke-word': PhotoToWordTool,
  'pdf-bisa-dicari': SearchablePdfTool,
  'susun-pdf': OrganizePdfTool,
  'sensor-pdf': RedactPdfTool,
  'kompres-pdf': CompressTool,
  'putar-pdf': RotateTool,
  'watermark-pdf': WatermarkTool,
  'isi-formulir-pdf': FillFormTool,
  'tanda-tangan-massal': BatchSignTool,
} as const

/** Ringkasan <head> per rute, dipakai klien dan skrip prerender. */
export function headFor(match: Match) {
  switch (match.kind) {
    case 'home':
      return {
        path: '/',
        title: 'Tanda Tangan PDF — Tanda tangani dokumen langsung di browser',
        description:
          'Gambar atau unggah tanda tangan, tempel di halaman PDF, lalu unduh. Gratis, tanpa akun, dan file tidak pernah diunggah ke server.',
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: SITE_NAME,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description:
              'Alat tanda tangan PDF yang berjalan di browser: menggambar atau mengunggah tanda tangan, menempatkannya di halaman, lalu mengunduh hasilnya.',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'IDR' },
          },
        ],
      }
    case 'tools':
      return {
        path: '/alat',
        title: 'Alat PDF — gabung, pisah, kompres, dan lainnya',
        description:
          'Gabung, pisah, dan kompres PDF, atau ubah foto dokumen menjadi Word. Semua alat berjalan langsung di browser.',
      }
    case 'tool':
      return {
        path: `/alat/${match.tool.slug}`,
        title: toolTitle(match.tool),
        description: match.tool.description,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: match.tool.name,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description: match.tool.description,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'IDR' },
          },
        ],
      }
    case 'articles':
      return {
        path: '/artikel',
        title: 'Artikel — panduan tanda tangan dokumen',
        description:
          'Panduan praktis seputar tanda tangan elektronik, keabsahan dokumen, dan cara menangani PDF di HP maupun komputer.',
      }
    case 'article':
      return {
        path: `/artikel/${match.article.slug}`,
        title: match.article.title,
        description: match.article.description,
        type: 'article' as const,
        publishedTime: match.article.date,
        jsonLd: [
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: match.article.title,
            description: match.article.description,
            datePublished: match.article.date,
            dateModified: match.article.updated ?? match.article.date,
            author: { '@type': 'Organization', name: SITE_NAME },
            publisher: { '@type': 'Organization', name: SITE_NAME },
            inLanguage: 'id-ID',
          },
        ],
      }
    case 'page': {
      const page = STATIC_PAGES[match.key]
      return {
        path: page.path,
        title: `${page.title} — ${SITE_NAME}`,
        description: page.description,
        jsonLd:
          match.key === 'faq'
            ? [
                {
                  '@context': 'https://schema.org',
                  '@type': 'FAQPage',
                  mainEntity: FAQ_ITEMS_EXPORT.map((item) => ({
                    '@type': 'Question',
                    name: item.q,
                    acceptedAnswer: { '@type': 'Answer', text: item.a },
                  })),
                },
              ]
            : undefined,
      }
    }
    default:
      return {
        path: '/404',
        title: 'Halaman tidak ditemukan',
        description: 'Halaman yang Anda cari tidak ada.',
        noindex: true,
      }
  }
}

function PageChrome({ match }: { match: Match }) {
  switch (match.kind) {
    case 'tools':
      return <ToolsIndex />
    case 'articles':
      return <ArticlesIndex />
    case 'article':
      return <ArticlePage article={match.article} />
    case 'page':
      return match.key === 'tentang' ? (
        <AboutPage />
      ) : match.key === 'privasi' ? (
        <PrivacyPage />
      ) : match.key === 'syarat' ? (
        <TermsPage />
      ) : (
        <FaqPage />
      )
    default:
      return <NotFound />
  }
}

function NotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pt-16 pb-4 text-center">
      <p className={eyebrow}>404</p>
      <h1 className="mt-2 font-serif text-3xl tracking-tight">Halaman tidak ditemukan</h1>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">
        Alamatnya mungkin salah atau halaman sudah dipindahkan. Coba mulai dari beranda.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          to="/"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-ink px-5 text-sm font-medium text-on-ink"
        >
          Buka alat tanda tangan
        </Link>
        <Link
          to="/alat"
          className="inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-medium text-ink-soft ring-1 ring-line"
        >
          Lihat alat PDF
        </Link>
      </div>
      <p className="mt-6 text-[0.8rem] text-muted">
        Menemukan tautan rusak? Kirim ke{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-gold hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </div>
  )
}

function ToolsChrome({ slug }: { slug: string }) {
  const tool = TOOLS.find((item) => item.slug === slug)
  const Tool = TOOL_COMPONENTS[slug as keyof typeof TOOL_COMPONENTS]
  if (!tool) return <NotFound />

  return (
    <>
      <ToolIntro tool={tool} />
      <div className="mx-auto w-full max-w-4xl px-5">
        <ClientOnly fallback={<ToolPlaceholder />}>
          {Tool ? (
            <Suspense fallback={<ToolPlaceholder />}>
              <Tool />
            </Suspense>
          ) : (
            <p className="mt-8 text-sm text-muted">Alat ini belum tersedia.</p>
          )}
        </ClientOnly>
      </div>
      <ToolFooter tool={tool} />
    </>
  )
}

/** Ruang kerja sebelum JavaScript siap; bentuknya mengikuti isi alat. */
function ToolPlaceholder() {
  return (
    <div className="mt-6 space-y-4" aria-hidden>
      <div className="h-[152px] animate-pulse rounded-[22px] border border-dashed border-line bg-surface/60" />
      <div className="h-12 animate-pulse rounded-2xl bg-sunken/70" />
    </div>
  )
}


function Routes() {
  const path = usePath()
  const match = useMemo(() => matchRoute(path), [path])
  const head = useMemo(() => headFor(match), [match])
  const [immersive, setImmersive] = useState(false)
  useSeo(head)

  // Pindah rute saat lembar kerja sedang terbuka: muat ulang state dokumen.
  useEffect(() => {
    setImmersive(false)
  }, [path])

  if (match.kind === 'home') {
    return (
      <>
        {!immersive && <SiteHeader />}
        <main className={immersive ? '' : 'min-h-[60vh]'}>
          <SignWorkspace onImmersiveChange={setImmersive} />
          {!immersive && <HomeExtras />}
        </main>
        {!immersive && <SiteFooter />}
        <ConsentNotice />
      </>
    )
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-[60vh]">
        {match.kind === 'tool' ? (
          <ToolsChrome slug={match.tool.slug} />
        ) : (
          <PageChrome match={match} />
        )}
      </main>
      <SiteFooter />
      <ConsentNotice />
    </>
  )
}

interface AppProps {
  /** Path awal saat prerender; di klien dibaca dari location. */
  initialPath?: string
}

export default function App({ initialPath }: AppProps) {
  return (
    <RouterProvider initialPath={initialPath}>
      <Routes />
    </RouterProvider>
  )
}

