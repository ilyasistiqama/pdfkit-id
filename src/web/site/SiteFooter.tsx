import { Link } from '../../router'
import { ARTICLES, STATIC_PAGES, TOOLS } from '../../site/routes'
import { SITE_NAME } from '../../site/site'

const year = new Date().getFullYear()

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line/70 bg-surface/50">
      <div className="mx-auto w-full max-w-6xl px-5 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-serif text-base tracking-tight">{SITE_NAME}</p>
            <p className="mt-2 max-w-xs text-[0.8rem] leading-relaxed text-muted">
              Tanda tangan dan alat PDF yang berjalan sepenuhnya di browser. Dokumen tidak pernah
              diunggah ke server.
            </p>
          </div>

          <nav aria-label="Alat PDF">
            <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-muted uppercase">
              Alat
            </p>
            <ul className="mt-2 space-y-1.5">
              {TOOLS.slice(0, 5).map((tool) => (
                <li key={tool.slug}>
                  <Link
                    to={`/alat/${tool.slug}`}
                    className="text-[0.82rem] text-ink-soft hover:text-ink hover:underline"
                  >
                    {tool.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/alat" className="text-[0.82rem] font-medium text-gold hover:underline">
                  Semua alat
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Artikel">
            <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-muted uppercase">
              Panduan
            </p>
            <ul className="mt-2 space-y-1.5">
              {ARTICLES.slice(0, 3).map((article) => (
                <li key={article.slug}>
                  <Link
                    to={`/artikel/${article.slug}`}
                    className="text-[0.82rem] text-ink-soft hover:text-ink hover:underline"
                  >
                    {article.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/artikel" className="text-[0.82rem] font-medium text-gold hover:underline">
                  Semua artikel
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Informasi situs">
            <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-muted uppercase">
              Situs
            </p>
            <ul className="mt-2 space-y-1.5">
              {Object.values(STATIC_PAGES).map((page) => (
                <li key={page.path}>
                  <Link
                    to={page.path}
                    className="text-[0.82rem] text-ink-soft hover:text-ink hover:underline"
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent('ttd:open-cookie-settings'))
                  }
                  className="text-[0.82rem] text-ink-soft hover:text-ink hover:underline"
                >
                  Pengaturan cookie
                </button>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-line/70 pt-5 text-[0.72rem] leading-relaxed text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {SITE_NAME}. Gratis untuk dipakai.</p>
          <p>
            Tanda tangan elektronik berbentuk gambar, bukan tanda tangan digital tersertifikasi PSrE.
          </p>
        </div>
      </div>
    </footer>
  )
}
