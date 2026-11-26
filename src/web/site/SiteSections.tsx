import { Link } from '../../router'
import { ARTICLES, TOOLS } from '../../site/routes'
import { AdSlot } from './AdSlot'
import { cx, eyebrow } from '../ui'

const Icon = ({ name }: { name: string }) => {
  const paths: Record<string, string> = {
    merge: 'M7 4v5a4 4 0 0 0 4 4h6M7 20v-5a4 4 0 0 1 4-4h6',
    split: 'M12 4v16M4 8h4M4 16h4M16 8h4M16 16h4',
    image: 'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6',
    images: 'M7 3h12v12H7zM3 7v12h12',
    gauge: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4.5 19a9 9 0 1 1 15 0',
    rotate: 'M4 9V4h5M20 15v5h-5M20 9a8 8 0 0 0-14-3M4 15a8 8 0 0 0 14 3',
    stamp: 'M6 17h12M8 17l1-4V7a3 3 0 0 1 6 0v6l1 4',
    form: 'M5 4h14v16H5zM8 9h8M8 13h8M8 17h4',
    layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5',
    search: 'M14 14l5 5M16 11a5 5 0 1 1-10 0 5 5 0 0 1 10 0z',
    redact: 'M4 5h16v14H4zM7 10h10v4H7z',
  }
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name] ?? paths.merge} />
    </svg>
  )
}

/** Blok alat + artikel supaya beranda punya konten yang bisa diindeks. */
export function HomeExtras() {
  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-5 pt-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={eyebrow}>Alat lain</p>
            <h2 className="mt-1 font-serif text-2xl tracking-tight">Butuh mengolah PDF, bukan hanya menandatangani?</h2>
            <p className="mt-1 max-w-xl text-[0.88rem] leading-relaxed text-muted">
              Semua alat berjalan di browser Anda. Tidak ada unggahan, tidak perlu akun.
            </p>
          </div>
          <Link to="/alat" className="text-sm font-medium text-gold hover:underline">
            Lihat semua alat
          </Link>
        </div>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <li key={tool.slug}>
              <Link
                to={`/alat/${tool.slug}`}
                className="group flex h-full gap-3 rounded-2xl bg-surface/70 p-4 ring-1 ring-line/70 transition hover:ring-gold/60"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold">
                  <Icon name={tool.icon} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink group-hover:text-gold">
                    {tool.name}
                  </span>
                  <span className="mt-0.5 block text-[0.78rem] leading-relaxed text-muted">
                    {tool.tagline}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <AdSlot slot="content" className={cx('mx-auto mt-10 max-w-5xl px-0', 'z-0')} />

      <section className="mx-auto w-full max-w-5xl px-5 pt-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={eyebrow}>Panduan</p>
            <h2 className="mt-1 font-serif text-2xl tracking-tight">Bacaan singkat sebelum menandatangani</h2>
          </div>
          <Link to="/artikel" className="text-sm font-medium text-gold hover:underline">
            Semua artikel
          </Link>
        </div>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {ARTICLES.map((article) => (
            <li key={article.slug}>
              <Link
                to={`/artikel/${article.slug}`}
                className="block h-full rounded-2xl bg-surface/70 p-4 ring-1 ring-line/70 transition hover:ring-gold/60"
              >
                <p className="text-[0.68rem] font-semibold tracking-[0.12em] text-muted uppercase">
                  {article.readingMinutes} menit baca
                </p>
                <p className="mt-1 font-serif text-[1.05rem] leading-snug tracking-tight text-ink">
                  {article.title}
                </p>
                <p className="mt-1.5 text-[0.8rem] leading-relaxed text-muted">{article.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

export function ToolsIndex() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pt-10 pb-4">
      <p className={eyebrow}>Kumpulan alat</p>
      <h1 className="mt-2 font-serif text-3xl leading-tight tracking-tight sm:text-4xl">
        Alat dokumen yang berjalan di browser
      </h1>
      <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">
        Gabung, pisah, ubah, dan rapikan dokumen tanpa memasang aplikasi. Berkas diproses di perangkat
        Anda, jadi tidak ada yang diunggah ke server.
      </p>

      <ul className="mt-7 grid gap-3 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <li key={tool.slug}>
            <Link
              to={`/alat/${tool.slug}`}
              className="group flex h-full gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line/70 transition hover:ring-gold/60"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-soft text-gold">
                <Icon name={tool.icon} />
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-ink group-hover:text-gold">{tool.name}</span>
                <span className="mt-0.5 block text-[0.82rem] leading-relaxed text-muted">
                  {tool.description}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <AdSlot slot="content" className="mt-8" />
    </div>
  )
}

export function ArticlesIndex() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pt-10 pb-4">
      <p className={eyebrow}>Panduan</p>
      <h1 className="mt-2 font-serif text-3xl leading-tight tracking-tight sm:text-4xl">
        Artikel tentang tanda tangan dokumen
      </h1>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
        Penjelasan praktis soal menandatangani PDF, keabsahan tanda tangan elektronik, dan cara
        menangani dokumen di HP maupun komputer.
      </p>

      <ul className="mt-7 space-y-3">
        {ARTICLES.map((article) => (
          <li key={article.slug}>
            <Link
              to={`/artikel/${article.slug}`}
              className="block rounded-2xl bg-surface p-5 ring-1 ring-line/70 transition hover:ring-gold/60"
            >
              <p className="text-[0.68rem] font-semibold tracking-[0.12em] text-muted uppercase">
                {article.readingMinutes} menit baca
              </p>
              <h2 className="mt-1 font-serif text-xl leading-snug tracking-tight">{article.title}</h2>
              <p className="mt-2 text-[0.86rem] leading-relaxed text-muted">{article.description}</p>
            </Link>
          </li>
        ))}
      </ul>

      <AdSlot slot="content" className="mt-8" />
    </div>
  )
}
