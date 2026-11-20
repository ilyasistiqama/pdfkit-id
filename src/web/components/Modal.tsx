import { useEffect, useRef, type ReactNode } from 'react'
import { cx } from '../ui'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  labelledBy?: string
  variant?: 'center' | 'sheet'
  className?: string
}

/**
 * Dialog dasar: menangkap fokus, menutup dengan Esc, dan mengembalikan fokus
 * ke elemen pemicu saat ditutup.
 */
export function Modal({ open, onClose, children, labelledBy, variant = 'center', className }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    restoreRef.current = document.activeElement as HTMLElement | null
    const items = () => [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
    // fokus awal ke panel, bukan ke tombol pertama (biar tidak ada ring besar di tombol tutup)
    panel.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const list = items()
      if (!list.length) return
      const index = list.indexOf(document.activeElement as HTMLElement)
      if (event.shiftKey) {
        if (index <= 0) {
          event.preventDefault()
          list[list.length - 1].focus()
        }
      } else if (index === list.length - 1) {
        event.preventDefault()
        list[0].focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = previousOverflow
      restoreRef.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 animate-[overlay_0.18s_ease-out] bg-ink/40"
      />
      {variant === 'sheet' ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          tabIndex={-1}
          className={cx(
            'absolute inset-x-0 bottom-0 max-h-[89dvh] outline-none animate-[sheet_0.22s_ease-out] overflow-y-auto rounded-t-[26px] bg-surface px-4 pt-3 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.4)]',
            className,
          )}
        >
          {children}
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            className={cx(
              'pointer-events-auto w-[min(92vw,26rem)] outline-none animate-[pop_0.18s_ease-out] rounded-[22px] bg-surface p-5 shadow-[0_30px_70px_-30px_rgb(0_0_0/0.45)]',
              className,
            )}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
