import { Download } from 'lucide-react'
import { downloadSignaturePng } from '../../core/download'
import { cx } from '../ui'

/** Tombol kecil di pojok kartu tanda tangan untuk mengunduhnya sebagai PNG. */
export function SignatureDownload({
  dataUrl,
  number,
  className,
}: {
  dataUrl: string
  /** nomor urut 1-based, dipakai di nama berkas */
  number: number
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => downloadSignaturePng(dataUrl, number)}
      aria-label={`Unduh tanda tangan ${number} sebagai PNG`}
      title="Unduh PNG"
      className={cx(
        'absolute -top-1.5 grid size-6 place-items-center rounded-full bg-surface text-muted ring-1 ring-line transition hover:text-gold',
        className,
      )}
    >
      <Download className="size-3.5" strokeWidth={1.8} />
    </button>
  )
}
