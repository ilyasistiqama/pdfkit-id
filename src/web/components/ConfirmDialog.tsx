import { Modal } from './Modal'
import { btnGhost, btnPrimary, cx } from '../ui'

interface Props {
  open: boolean
  title: string
  body: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  danger,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal open={open} onClose={onCancel} labelledBy="confirm-title">
      <h2 id="confirm-title" className="font-serif text-xl tracking-tight">
        {title}
      </h2>
      <p className="mt-2 text-[0.86rem] leading-relaxed text-muted">{body}</p>
      <div className="mt-5 flex gap-2">
        <button type="button" onClick={onCancel} className={cx(btnGhost, 'flex-1 ring-1 ring-line')}>
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={cx(
            btnPrimary,
            'flex-1',
            danger && 'bg-loss text-white shadow-[0_12px_30px_-14px_rgb(162_59_46/0.6)]',
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
