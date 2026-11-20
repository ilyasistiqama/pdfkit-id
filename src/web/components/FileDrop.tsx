import { useState } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { cx } from '../ui'

interface Props {
  onFile: (file: File) => void
  loading?: boolean
  compact?: boolean
}

export function FileDrop({ onFile, loading, compact }: Props) {
  const [over, setOver] = useState(false)

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        onFile(event.dataTransfer.files[0])
      }}
      className={cx(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[22px] border border-dashed text-center transition',
        compact ? 'h-32' : 'mt-7 px-6 py-10',
        over ? 'border-gold bg-gold-soft' : 'border-line bg-surface hover:border-gold/70',
      )}
    >
      <input
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          onFile(event.target.files?.[0] as File)
          event.target.value = ''
        }}
      />
      <span className="grid size-11 place-items-center rounded-full bg-gold-soft text-gold">
        {loading ? <Loader2 className="size-5 animate-spin" /> : <FileUp className="size-5" strokeWidth={1.7} />}
      </span>
      <span className="text-[0.95rem] font-medium text-ink">
        {loading ? 'Membuka PDF…' : 'Pilih PDF atau seret ke sini'}
      </span>
      <span className="text-xs text-muted">File tetap di perangkat kamu, tidak diunggah ke server.</span>
    </label>
  )
}
