import { useState } from 'react'
import { fillFormPdf, readFormFields, type FormField } from '../../core/pdfOps'
import { downloadBlob, pdfBlob } from '../../core/download'
import { trackDownload } from '../../site/analytics'
import { ActionButton, DropZone, Field, Status, ToolBody, inputClass } from './ToolUi'

export function FillFormTool() {
  const [file, setFile] = useState<File | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [values, setValues] = useState<Record<string, string | boolean>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [loading, setLoading] = useState(false)

  const pick = async (next: File) => {
    setError('')
    setDone('')
    setLoading(true)
    try {
      const list = await readFormFields(new Uint8Array(await next.arrayBuffer()))
      setFile(next)
      setFields(list)
      const initial: Record<string, string | boolean> = {}
      for (const field of list) {
        if (field.kind === 'text') initial[field.name] = field.value
        else if (field.kind === 'checkbox') initial[field.name] = field.checked
        else initial[field.name] = field.value ?? ''
      }
      setValues(initial)
    } catch {
      setError('PDF tidak bisa dibaca. Berkas mungkin terkunci atau rusak.')
    } finally {
      setLoading(false)
    }
  }

  const run = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    setDone('')
    try {
      const output = await fillFormPdf(new Uint8Array(await file.arrayBuffer()), values)
      downloadBlob(pdfBlob(output), `${file.name.replace(/\.pdf$/i, '')}-terisi.pdf`)
      trackDownload('isi-formulir-pdf')
      setDone('PDF terisi sudah diunduh. Kolom dibuat rata agar tampil sama di semua penampil.')
    } catch {
      setError('Gagal menyimpan isian. Coba lagi dengan berkas lain.')
    } finally {
      setBusy(false)
    }
  }

  const setField = (name: string, value: string | boolean) =>
    setValues((current) => ({ ...current, [name]: value }))

  return (
    <ToolBody>
      {!file ? (
        <DropZone accept="application/pdf,.pdf" onFiles={(next) => next[0] && void pick(next[0])} label="Pilih PDF berformulir" />
      ) : loading ? (
        <Status tone="info">Membaca kolom formulir…</Status>
      ) : fields.length === 0 ? (
        <>
          <Status tone="info">
            Tidak ada kolom formulir yang bisa diisi di berkas ini. PDF hasil scan tidak memiliki
            kolom isian. Untuk dokumen seperti itu, gunakan alat tanda tangan atau watermark.
          </Status>
          <button type="button" onClick={() => setFile(null)} className="text-xs font-medium text-muted hover:text-ink">
            Ganti berkas
          </button>
        </>
      ) : (
        <>
          <div className="rounded-2xl bg-surface p-4 ring-1 ring-line/70">
            <p className="text-sm font-medium text-ink">{file.name}</p>
            <p className="text-[0.72rem] text-muted">{fields.length} kolom terdeteksi</p>
          </div>

          <div className="space-y-3">
            {fields.map((field) => {
              if (field.kind === 'text') {
                return (
                  <Field key={field.name} label={field.name}>
                    {field.multiline ? (
                      <textarea
                        value={String(values[field.name] ?? '')}
                        onChange={(event) => setField(field.name, event.target.value)}
                        rows={3}
                        className="w-full rounded-xl bg-surface px-3 py-2 text-sm outline-none ring-1 ring-line focus:ring-gold/60"
                      />
                    ) : (
                      <input
                        value={String(values[field.name] ?? '')}
                        onChange={(event) => setField(field.name, event.target.value)}
                        className={inputClass}
                      />
                    )}
                  </Field>
                )
              }

              if (field.kind === 'checkbox') {
                return (
                  <label key={field.name} className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5 ring-1 ring-line/70">
                    <input
                      type="checkbox"
                      checked={Boolean(values[field.name])}
                      onChange={(event) => setField(field.name, event.target.checked)}
                      className="size-4 accent-[var(--gold)]"
                    />
                    <span className="text-sm text-ink-soft">{field.name}</span>
                  </label>
                )
              }

              return (
                <Field key={field.name} label={field.name}>
                  <select
                    value={String(values[field.name] ?? '')}
                    onChange={(event) => setField(field.name, event.target.value)}
                    className={inputClass}
                  >
                    <option value="">— pilih —</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
              )
            })}
          </div>

          {error && <Status tone="error">{error}</Status>}
          {done && <Status tone="ok">{done}</Status>}

          <ActionButton busy={busy} onClick={() => void run()} busyLabel="Menyimpan…">
            Simpan dan unduh PDF terisi
          </ActionButton>
          <button type="button" onClick={() => setFile(null)} className="text-xs font-medium text-muted hover:text-ink">
            Ganti berkas
          </button>
        </>
      )}

      {error && !file && <Status tone="error">{error}</Status>}
    </ToolBody>
  )
}
