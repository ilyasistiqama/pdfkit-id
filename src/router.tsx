import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { BASE_PATH, href } from './site/site'

const ROUTE_EVENT = 'ttd:route'

/** Path saat ini tanpa base, selalu diawali "/" dan tanpa garis miring akhir. */
function readPath(): string {
  if (typeof window === 'undefined') return '/'
  let path = window.location.pathname
  if (BASE_PATH && path.startsWith(BASE_PATH)) path = path.slice(BASE_PATH.length)
  path = path.replace(/\/index\.html$/i, '/').replace(/\/+$/, '')
  return path || '/'
}

/** Ganti rute tanpa memuat ulang halaman. */
export function navigate(to: string, options: { replace?: boolean } = {}) {
  if (typeof window === 'undefined') return
  const url = href(to)
  if (window.location.pathname === url) return
  if (options.replace) window.history.replaceState(null, '', url)
  else window.history.pushState(null, '', url)
  window.dispatchEvent(new Event(ROUTE_EVENT))
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
}

const RouterContext = createContext<string | null>(null)

interface ProviderProps {
  /** Dipakai saat render di server/build; klien membacanya dari location. */
  initialPath?: string
  children: ReactNode
}

export function RouterProvider({ initialPath, children }: ProviderProps) {
  const [path, setPath] = useState(() => initialPath ?? readPath())

  useEffect(() => {
    if (initialPath) return
    const sync = () => setPath(readPath())
    window.addEventListener('popstate', sync)
    window.addEventListener(ROUTE_EVENT, sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener(ROUTE_EVENT, sync)
    }
  }, [initialPath])

  return <RouterContext.Provider value={path}>{children}</RouterContext.Provider>
}

export function usePath() {
  const path = useContext(RouterContext)
  return path ?? '/'
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  to: string
  children: ReactNode
}

export function Link({ to, children, onClick, ...rest }: LinkProps) {
  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event)
      if (event.defaultPrevented) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      if (event.button !== 0) return
      event.preventDefault()
      navigate(to)
    },
    [onClick, to],
  )

  return (
    <a href={href(to)} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}

/** Tandai link aktif tanpa harus meneruskan prop className di setiap tempat. */
export function useIsActive(to: string) {
  const path = usePath()
  return useMemo(() => path === to || (to !== '/' && path.startsWith(`${to}/`)), [path, to])
}
