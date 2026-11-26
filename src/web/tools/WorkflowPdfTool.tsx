import { useEffect, useRef, useState } from 'react'
import { downloadBlob, pdfBlob } from '../../core/download'
import { baseName, mergePdfs, rotatePdf, watermarkPdf } from '../../core/pdfOps'
import type { OcrLanguage } from '../../core/photoOcr'
import { trackDownload } from '../../site/analytics'
import { WORKFLOW_PRESET_KEY } from '../signatureStore'
import { LocalPresets } from './LocalPresets'
import { confirmSignedPdfChange, SignedPdfNotice } from './SignedPdfNotice'
import { ActionButton, DropZone, Field, FileList, Status, ToolBody, inputClass } from './ToolUi'

const labels = { ocr: 'OCR agar teks bisa dicari', rotate: 'Putar semua halaman', watermark: 'Tambah watermark' } as const
type Step = keyof typeof labels
type Settings = { steps: Step[]; text: string; language: OcrLanguage; angle: number }
const initial: Settings = { steps: ['watermark'], text: 'RAHASIA', language: 'ind', angle: 90 }

function validOrder(steps: Step[]) {
  return !steps.includes('ocr') || !steps.includes('watermark') || steps.indexOf('ocr') < steps.indexOf('watermark')
}

function parseSettings(value: unknown): Settings | null {
  if (!value || typeof value !== 'object') return null
  const { steps, text, language, angle } = value as Partial<Settings>
  if (!Array.isArray(steps) || steps.some((step) => typeof step !== 'string' || !Object.hasOwn(labels, step)) ||
    new Set(steps).size !== steps.length || !validOrder(steps) || typeof text !== 'string' ||
    !language || !['ind', 'eng', 'ind+eng'].includes(language) || !angle || ![90, 180, 270].includes(angle)) return null
  return { steps, text: text.slice(0, 40), language, angle }
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items
  const ordered = [...items]
  ordered.splice(to, 0, ...ordered.splice(from, 1))
  return ordered
}

export default function WorkflowPdfTool() {
  const [files, setFiles] = useState<File[]>([])
  const [settings, setSettings] = useState(initial)
  const [progress, setProgress] = useState('')
  const [message, setMessage] = useState<{ tone: 'error' | 'ok' | 'info'; text: string } | null>(null)
  const job = useRef<AbortController | null>(null)
  useEffect(() => () => { job.current?.abort(); job.current = null }, [])
  const busy = Boolean(progress)

  const add = (step: Step) => {
    const steps = [...settings.steps]
    const index = step === 'ocr' ? steps.indexOf('watermark') : -1
    steps.splice(index < 0 ? steps.length : index, 0, step)
    setSettings({ ...settings, steps })
  }

  const run = async () => {
    if (job.current || !files.length || (files.length === 1 && !settings.steps.length)) return
    const controller = new AbortController()
    const { signal } = controller
    job.current = controller
    let current = files.length > 1 ? 'Menggabungkan PDF' : 'Membaca PDF'
    let unreadable = 0
    setProgress(`${current}…`)
    setMessage(null)
    try {
      if (!await confirmSignedPdfChange(files, signal)) return
      let bytes = files.length > 1
        ? await mergePdfs(files, 'Workflow PDF')
        : new Uint8Array(await files[0].arrayBuffer())
      for (const step of settings.steps) {
        signal.throwIfAborted()
        current = labels[step]
        setProgress(`${current}…`)
        if (step === 'ocr') {
          const { makeSearchablePdf } = await import('../../core/searchablePdf')
          const result = await makeSearchablePdf(bytes, settings.language, signal, (page, total) => {
            setProgress(`OCR halaman ${page}/${total}…`)
          })
          bytes = result.bytes
          unreadable = result.unreadable
        } else if (step === 'rotate') {
          bytes = await rotatePdf(bytes, settings.angle)
        } else {
          bytes = await watermarkPdf(bytes, { text: settings.text, opacity: 0.18, fontSize: 64, color: 'abu', diagonal: true })
        }
      }
      signal.throwIfAborted()
      const filename = files.length === 1 ? `${baseName(files[0].name)}-workflow.pdf` : 'hasil-workflow.pdf'
      downloadBlob(pdfBlob(bytes), filename)
      trackDownload('workflow-pdf')
      setMessage({ tone: unreadable ? 'info' : 'ok', text: unreadable
        ? `${filename} diunduh. OCR belum dapat membaca teks pada ${unreadable} halaman.`
        : `${filename} diunduh.` })
    } catch {
      if (!signal.aborted) setMessage({ tone: 'error', text: `Langkah “${current}” gagal. Periksa berkas dan pengaturan langkah.` })
    } finally {
      if (job.current === controller) {
        job.current = null
        setProgress('')
      }
    }
  }

  return (
    <ToolBody>
      <fieldset disabled={busy} className="min-w-0 space-y-4 disabled:opacity-65" inert={busy}>
        <DropZone accept="application/pdf,.pdf" multiple label="Pilih PDF untuk workflow"
          hint="Beberapa PDF akan digabung sesuai urutan daftar"
          onFiles={(next) => setFiles((items) => [...items, ...next])} />
        <FileList files={files} onRemove={(index) => setFiles((items) => items.filter((_, i) => i !== index))}
          onMove={(from, to) => setFiles((items) => moveItem(items, from, to))} />
        <SignedPdfNotice source={files} />

        <section className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-line/70">
          <h2 className="text-sm font-medium">Urutan proses</h2>
          <ol className="space-y-2">
            {files.length > 1 && <li className="rounded-xl bg-sunken px-3 py-2 text-sm">Gabung {files.length} PDF</li>}
            {settings.steps.map((step, index) => (
              <li key={step} className="rounded-xl bg-sunken p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{labels[step]}</p>
                  <div className="flex gap-2">
                    {([-1, 1] as const).map((offset) => {
                      const steps = moveItem(settings.steps, index, index + offset)
                      return <button key={offset} type="button" disabled={steps === settings.steps || !validOrder(steps)}
                        aria-label={`${offset < 0 ? 'Naikkan' : 'Turunkan'} ${labels[step]}`}
                        onClick={() => setSettings({ ...settings, steps })}
                        className="size-8 rounded-lg bg-surface text-sm disabled:opacity-30">{offset < 0 ? '↑' : '↓'}</button>
                    })}
                    <button type="button" className="rounded-lg px-2 text-sm text-loss" aria-label={`Hapus ${labels[step]}`}
                      onClick={() => setSettings({ ...settings, steps: settings.steps.filter((item) => item !== step) })}>Hapus</button>
                  </div>
                </div>
                <div className="mt-2">
                  {step === 'watermark' && <Field label="Teks watermark"><input className={inputClass} maxLength={40}
                    value={settings.text} onChange={(event) => setSettings({ ...settings, text: event.target.value })} /></Field>}
                  {step === 'ocr' && <Field label="Bahasa dokumen"><select className={inputClass} value={settings.language}
                    onChange={(event) => setSettings({ ...settings, language: event.target.value as OcrLanguage })}>
                    <option value="ind">Indonesia</option><option value="eng">Inggris</option><option value="ind+eng">Indonesia dan Inggris</option>
                  </select></Field>}
                  {step === 'rotate' && <Field label="Sudut putar"><select className={inputClass} value={settings.angle}
                    onChange={(event) => setSettings({ ...settings, angle: Number(event.target.value) })}>
                    {[90, 180, 270].map((angle) => <option key={angle} value={angle}>{angle}°</option>)}
                  </select></Field>}
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(labels) as Step[]).filter((step) => !settings.steps.includes(step)).map((step) => (
              <button key={step} type="button" onClick={() => add(step)}
                className="rounded-lg bg-gold-soft px-3 py-2 text-sm text-gold">+ {labels[step]}</button>
            ))}
          </div>
          {settings.steps.includes('ocr') && settings.steps.includes('watermark') && (
            <p className="text-xs text-muted">OCR dikerjakan sebelum watermark agar teks pada halaman scan bisa dibaca.</p>
          )}
        </section>

        <LocalPresets storageKey={WORKFLOW_PRESET_KEY} label="Preset" settings={settings} parse={parseSettings} onApply={setSettings} />
      </fieldset>

      <ActionButton busy={busy} busyLabel={progress} disabled={!files.length || (files.length === 1 && !settings.steps.length)}
        onClick={() => void run()}>Jalankan dan unduh PDF</ActionButton>
      {busy && <button type="button" className="text-sm text-gold hover:underline" onClick={() => { job.current?.abort(); setProgress('Membatalkan…') }}>Batalkan proses</button>}
      {message && <Status tone={message.tone}>{message.text}</Status>}
    </ToolBody>
  )
}
