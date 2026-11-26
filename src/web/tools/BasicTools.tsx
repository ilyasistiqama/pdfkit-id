import { useState } from 'react'
import { mergePdfs } from '../../core/pdfOps'
import { downloadBlob, pdfBlob } from '../../core/download'
import { trackDownload } from '../../site/analytics'
import { confirmSignedPdfChange, SignedPdfNotice } from './SignedPdfNotice'
import { ActionButton, DropZone, Field, FileList, Status, ToolBody, inputClass } from './ToolUi'

export function MergeTool() {
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const move = (from: number, to: number) => {
    setFiles((current) => {
      if (to < 0 || to >= current.length) return current
      const next = [...current]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const run = async () => {
    setBusy(true)
    setError('')
    setDone('')
    try {
      if (!await confirmSignedPdfChange(files)) return
      const bytes = await mergePdfs(files, 'Gabungan PDF')
      downloadBlob(pdfBlob(bytes), 'gabungan.pdf')
      trackDownload('gabung-pdf')
      setDone(`${files.length} berkas digabung menjadi gabungan.pdf.`)
    } catch {
      setError('Salah satu berkas tidak bisa dibaca. Pastikan semuanya PDF yang utuh dan tidak terkunci.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolBody>
      <DropZone
        accept="application/pdf,.pdf"
        multiple
        onFiles={(next) => setFiles((current) => [...current, ...next])}
        label="Pilih atau seret beberapa PDF"
        hint="Tambahkan dua berkas atau lebih"
      />

      <SignedPdfNotice source={files} />
      <FileList files={files} onRemove={(index) => setFiles((current) => current.filter((_, i) => i !== index))} onMove={move} />

      {error && <Status tone="error">{error}</Status>}
      {done && <Status tone="ok">{done}</Status>}

      <ActionButton busy={busy} disabled={files.length < 2} onClick={() => void run()} busyLabel="Menggabung…">
        Gabung {files.length || ''} PDF
      </ActionButton>
      {files.length === 1 && <Status tone="info">Tambahkan minimal satu berkas lagi.</Status>}
    </ToolBody>
  )
}

export function RotateTool() {
  const [file, setFile] = useState<File | null>(null)
  const [angle, setAngle] = useState(90)
  const [scope, setScope] = useState<'all' | 'odd' | 'even'>('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pageCount, setPageCount] = useState(0)

  const pick = async (next: File) => {
    setError('')
    try {
      const { PDFDocument } = await import('pdf-lib')
      const doc = await PDFDocument.load(new Uint8Array(await next.arrayBuffer()), {
        updateMetadata: false,
      })
      setFile(next)
      setPageCount(doc.getPageCount())
    } catch {
      setError('PDF tidak bisa dibaca. Berkas mungkin terkunci atau rusak.')
    }
  }

  const run = async () => {
    if (!file) return
    const pages: number[] = []
    for (let index = 0; index < pageCount; index++) {
      const even = index % 2 === 1
      if (scope === 'all' || (scope === 'odd' && !even) || (scope === 'even' && even)) pages.push(index)
    }
    if (!pages.length) {
      setError('PDF ini tidak punya halaman genap. Pilih "Semua" atau "Ganjil".')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (!await confirmSignedPdfChange(file)) return
      const { rotatePdf, baseName } = await import('../../core/pdfOps')
      const bytes = new Uint8Array(await file.arrayBuffer())
      const output = await rotatePdf(bytes, angle, { pages })
      downloadBlob(pdfBlob(output), `${baseName(file.name)}-diputar.pdf`)
      trackDownload('putar-pdf')
    } catch {
      setError('Gagal memutar halaman. Coba berkas lain.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolBody>
      {!file ? (
        <DropZone accept="application/pdf,.pdf" onFiles={(next) => next[0] && void pick(next[0])} label="Pilih PDF" />
      ) : (
        <>
          <div className="rounded-2xl bg-surface p-4 ring-1 ring-line/70">
            <p className="text-sm font-medium text-ink">{file.name}</p>
            <p className="text-[0.72rem] text-muted">{pageCount} halaman</p>
          </div>

          <SignedPdfNotice source={file} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Sudut putar">
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-sunken p-1">
                {[90, 180, 270].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAngle(value)}
                    aria-pressed={angle === value}
                    className={
                      angle === value
                        ? 'rounded-lg bg-surface py-1.5 text-sm font-medium text-ink ring-1 ring-line'
                        : 'rounded-lg py-1.5 text-sm text-muted'
                    }
                  >
                    {value}°
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Halaman">
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-sunken p-1">
                {([
                  ['all', 'Semua'],
                  ['odd', 'Ganjil'],
                  ['even', 'Genap'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setScope(value)}
                    aria-pressed={scope === value}
                    className={
                      scope === value
                        ? 'rounded-lg bg-surface py-1.5 text-sm font-medium text-ink ring-1 ring-line'
                        : 'rounded-lg py-1.5 text-sm text-muted'
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {error && <Status tone="error">{error}</Status>}

          <ActionButton busy={busy} onClick={() => void run()} busyLabel="Memutar…">
            Putar dan unduh
          </ActionButton>
          <button
            type="button"
            onClick={() => {
              setFile(null)
              setError('')
            }}
            className="text-xs font-medium text-muted hover:text-ink"
          >
            Ganti berkas
          </button>
        </>
      )}
    </ToolBody>
  )
}

export function WatermarkTool() {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('RAHASIA')
  const [opacity, setOpacity] = useState(0.18)
  const [fontSize, setFontSize] = useState(64)
  const [color, setColor] = useState<'abu' | 'merah' | 'biru'>('abu')
  const [diagonal, setDiagonal] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      if (!await confirmSignedPdfChange(file)) return
      const { watermarkPdf, baseName } = await import('../../core/pdfOps')
      const output = await watermarkPdf(
        new Uint8Array(await file.arrayBuffer()),
        { text, opacity, fontSize, color, diagonal },
      )
      downloadBlob(pdfBlob(output), `${baseName(file.name)}-watermark.pdf`)
      trackDownload('watermark-pdf')
    } catch {
      setError('Gagal menambahkan watermark. Coba berkas lain.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolBody>
      {!file ? (
        <DropZone accept="application/pdf,.pdf" onFiles={(next) => next[0] && setFile(next[0])} label="Pilih PDF" />
      ) : (
        <>
          <div className="rounded-2xl bg-surface p-4 ring-1 ring-line/70">
            <p className="text-sm font-medium text-ink">{file.name}</p>
          </div>

          <SignedPdfNotice source={file} />

          <Field label="Teks watermark">
            <input value={text} onChange={(event) => setText(event.target.value)} className={inputClass} maxLength={40} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Warna">
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-sunken p-1">
                {(['abu', 'merah', 'biru'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setColor(value)}
                    aria-pressed={color === value}
                    className={
                      color === value
                        ? 'rounded-lg bg-surface py-1.5 text-sm font-medium capitalize text-ink ring-1 ring-line'
                        : 'rounded-lg py-1.5 text-sm capitalize text-muted'
                    }
                  >
                    {value}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Posisi">
              <button
                type="button"
                onClick={() => setDiagonal((value) => !value)}
                aria-pressed={diagonal}
                className="flex h-10 w-full items-center justify-between rounded-xl bg-surface px-3 text-sm ring-1 ring-line"
              >
                <span>{diagonal ? 'Miring 35°' : 'Mendatar'}</span>
                <span className={diagonal ? 'text-gold' : 'text-muted'}>{diagonal ? 'Aktif' : 'Mati'}</span>
              </button>
            </Field>
          </div>

          <Field label={`Ukuran huruf: ${fontSize} pt`}>
            <input
              type="range"
              min={16}
              max={140}
              value={fontSize}
              onChange={(event) => setFontSize(Number(event.target.value))}
              className="w-full accent-[var(--gold)]"
            />
          </Field>

          <Field label={`Transparansi: ${Math.round(opacity * 100)}%`}>
            <input
              type="range"
              min={5}
              max={80}
              value={Math.round(opacity * 100)}
              onChange={(event) => setOpacity(Number(event.target.value) / 100)}
              className="w-full accent-[var(--gold)]"
            />
          </Field>

          {error && <Status tone="error">{error}</Status>}

          <ActionButton busy={busy} onClick={() => void run()} busyLabel="Menambahkan…">
            Tambah watermark dan unduh
          </ActionButton>
          <button type="button" onClick={() => setFile(null)} className="text-xs font-medium text-muted hover:text-ink">
            Ganti berkas
          </button>
        </>
      )}
    </ToolBody>
  )
}
