import { useEffect, useState, type ReactNode } from 'react'

/**
 * Render anak hanya setelah komponen ter-mount di browser. Markup server dan
 * render pertama klien sama-sama `fallback`, sehingga hidrasi tidak pernah
 * bentrok dengan komponen yang dimuat malas (mis. alat PDF yang mengimpor
 * pdf-lib/pdf.js di sisi klien).
 */
export function ClientOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return <>{mounted ? children : (fallback ?? null)}</>
}
