import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Link, useIsActive, usePath } from '../../router'
import { TOOLS } from '../../site/routes'
import { cx } from '../ui'

const NAV = [
  { to: '/', label: 'Tanda tangan' },
  { to: '/alat', label: 'Alat PDF' },
  { to: '/artikel', label: 'Artikel' },
  { to: '/faq', label: 'FAQ' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const path = usePath()
  const onTools = path === '/alat' || path.startsWith('/alat/')

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-5 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Tanda Tangan PDF, beranda">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-8 rounded-lg" />
          <span className="font-serif text-[1.05rem] tracking-tight">Tanda Tangan PDF</span>
        </Link>

        <nav aria-label="Navigasi utama" className="ml-auto hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} label={item.label} />
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          className="ml-auto grid size-9 place-items-center rounded-full text-muted transition hover:bg-sunken hover:text-ink md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line/70 px-5 pb-4 md:hidden">
          <nav aria-label="Navigasi seluler" className="grid gap-1 pt-2">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-sunken"
              >
                {item.label}
              </Link>
            ))}
            <p className="mt-2 px-3 pt-2 text-[0.68rem] font-semibold tracking-[0.14em] text-muted uppercase">
              Alat
            </p>
            {TOOLS.slice(0, 5).map((tool) => (
              <Link
                key={tool.slug}
                to={`/alat/${tool.slug}`}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2 text-sm text-muted hover:bg-sunken hover:text-ink"
              >
                {tool.name}
              </Link>
            ))}
            {onTools && <span className="sr-only">Halaman alat</span>}
          </nav>
        </div>
      )}
    </header>
  )
}

function NavLink({ to, label }: { to: string; label: string }) {
  const active = useIsActive(to)
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'rounded-full px-3 py-1.5 text-sm font-medium transition',
        active ? 'bg-ink text-on-ink' : 'text-ink-soft hover:bg-sunken',
      )}
    >
      {label}
    </Link>
  )
}
