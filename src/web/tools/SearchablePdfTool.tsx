import { useEffect, useRef, useState } from 'react'
import { downloadBlob, pdfBlob } from '../../core/download'
import type { OcrLanguage } from '../../core/photoOcr'
import { trackDownload } from '../../site/analytics'
import { ActionButton, DropZone, Field, Status, ToolBody, inputClass } from './ToolUi'

export default function SearchablePdfTool() {
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState<OcrLanguage>('ind')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ added: number; existing: number; unreadable: number } | null>(null)
  const job = useRef<AbortController | null>(null)
  useEffect(() => () => job.current?.abort(), [])

  const run = async () => {
    if (!file || job.current) return
    const controller = new AbortController()
    job.current = controller
    setBusy(true)
    setError('')
    setResult(null)
    setProgress('Menyiapkan pembaca PDF…')
    try {
      const { makeSearchablePdf } = await import('../../core/searchablePdf')
      const response = await makeSearchablePdf(new Uint8Array(await file.arrayBuffer()), language, controller.signal,
        (page, total, value) => setProgress(`Halaman ${page}/${total}${value === undefined ? '' : ` · ${Math.floor(value * 100)}%`}`))
      controller.signal.throwIfAborted()
      setResult(response)
      if (!response.added && !response.existing) return
      downloadBlob(pdfBlob(response.bytes), `${file.name.replace(/\.pdf$/i, '')}-bisa-dicari.pdf`)
      trackDownload('pdf-bisa-dicari')
    } catch {
      if (!controller.signal.aborted) setError('PDF gagal diproses. Pastikan berkas dapat dibuka tanpa kata sandi.')
    } finally {
      job.current = null
      setBusy(false)
    }
  }

  return (
    <ToolBody>
      {!file && <DropZone accept="application/pdf,.pdf" label="Pilih PDF hasil scan" onFiles={(files) => {
        if (files.length !== 1) { setError('Pilih satu PDF hasil scan.'); return }
        setFile(files[0]); setError('')
      }} />}
      {file && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-xl bg-sunken p-3">
            <p className="min-w-0 truncate text-sm">{file.name}</p>
            <button type="button" disabled={busy} className="shrink-0 text-sm text-gold hover:underline"
              onClick={() => { setFile(null); setResult(null); setError('') }}>Ganti PDF</button>
          </div>
          <Field label="Bahasa dokumen">
            <select className={inputClass} value={language} disabled={busy} onChange={(event) => setLanguage(event.target.value as OcrLanguage)}>
              <option value="ind">Indonesia</option>
              <option value="eng">Inggris</option>
              <option value="ind+eng">Indonesia dan Inggris</option>
            </select>
          </Field>
          <ActionButton busy={busy} busyLabel={progress} onClick={() => void run()}>Buat PDF yang bisa dicari</ActionButton>
          {busy && <button type="button" onClick={() => job.current?.abort()} className="text-sm text-gold hover:underline">Batalkan pembacaan</button>}
          {result && (
            <Status tone={result.unreadable ? 'info' : 'ok'}>
              Teks ditambahkan pada {result.added} halaman. {result.existing} halaman sudah berisi teks.
              {result.unreadable > 0 && ` Teks pada ${result.unreadable} halaman belum terbaca.`}
            </Status>
          )}
        </>
      )}
      {error && <Status tone="error">{error}</Status>}
    </ToolBody>
  )
}
