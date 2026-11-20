// Kelas Tailwind yang dipakai ulang supaya tampilan konsisten.

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ')

export const card =
  'rounded-[22px] bg-surface ring-1 ring-line/80 shadow-[0_1px_2px_rgb(0_0_0/0.03),0_10px_30px_-16px_rgb(0_0_0/0.12)]'

export const eyebrow = 'text-[0.66rem] font-semibold tracking-[0.16em] text-muted uppercase'

export const btnPrimary =
  'inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-ink px-5 text-[0.95rem] font-medium tracking-wide text-on-ink shadow-[0_12px_30px_-14px_rgb(0_0_0/0.55)] transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40'

export const btnGhost =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium text-ink-soft transition hover:bg-sunken disabled:pointer-events-none disabled:opacity-40'

export const btnIcon =
  'grid shrink-0 place-items-center rounded-full text-muted transition hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-30'

export const swatch = 'size-7 rounded-full ring-1 ring-line transition'

export const smallLabel = 'block text-xs font-medium text-muted'
