import { useEffect, useRef, useState } from 'react'
import { batchPositions, batchSignPdf, type BatchPosition, type BatchTemplate } from '../../core/batchSignPdf'
import type { Signature } from '../../core/types'
import { withCaption, type SignatureImage } from '../../core/image'
import { newId } from '../../core/id'
import { downloadAll, formatBytes, pdfBlob } from '../../core/download'
import { baseName, uniqueName } from '../../core/pdfOps'
import { BATCH_TEMPLATE_KEY, loadSignatures } from '../signatureStore'
import { SignaturePad } from '../components/SignaturePad'
import { SignatureUpload } from '../components/SignatureUpload'
import { SignatureDownload } from '../components/SignatureDownload'
import { LocalPresets } from './LocalPresets'
import { PdfResultPreview } from './PdfToolPreview'
import { confirmSignedPdfChange, SignedPdfNotice } from './SignedPdfNotice'
import { ActionButton, DropZone, Field, FileList, Status, ToolBody, inputClass } from './ToolUi'
import { cx, eyebrow } from '../ui'

const defaults: BatchTemplate = {
  position: 'kanan-bawah', pageMode: 'last', width: 26, caption: { name: '', role: '', date: '' },
  initials: false, initialsPosition: 'kiri-bawah', initialsWidth: 12,
}

function parseTemplate(value: unknown): BatchTemplate | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Partial<BatchTemplate>
  const { position, pageMode, width, caption, initials, initialsPosition, initialsWidth } = item
  if (typeof position !== 'string' || !Object.hasOwn(batchPositions, position) || !pageMode || !['first', 'last', 'all'].includes(pageMode) ||
    typeof width !== 'number' || !Number.isInteger(width) || width < 8 || width > 60 || !caption || typeof caption.name !== 'string' ||
    typeof caption.role !== 'string' || typeof caption.date !== 'string' || typeof initials !== 'boolean' ||
    typeof initialsPosition !== 'string' || !Object.hasOwn(batchPositions, initialsPosition) || typeof initialsWidth !== 'number' ||
    !Number.isInteger(initialsWidth) || initialsWidth < 5 || initialsWidth > 30) return null
  return { position, pageMode, width, initials, initialsPosition, initialsWidth,
    caption: { name: caption.name.slice(0, 80), role: caption.role.slice(0, 80), date: caption.date.slice(0, 80) } }
}

export function BatchSignTool() {
  const [files, setFiles] = useState<File[]>([])
  const [signatures, setSignatures] = useState<Signature[]>(() => loadSignatures().signatures)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'simpan' | 'baru'>('simpan')
  const [template, setTemplate] = useState(defaults)
  const [initialsId, setInitialsId] = useState('')
  const [busy, setBusy] = useState<'preview' | 'batch' | null>(null)
  const [error, setError] = useState('')
  const [outputs, setOutputs] = useState<{ name: string; size: number; blob: Blob }[]>([])
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [preview, setPreview] = useState<{ name: string; bytes: Uint8Array; primaryPage: number } | null>(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const job = useRef<AbortController | null>(null)
  useEffect(() => () => { job.current?.abort(); job.current = null }, [])

  useEffect(() => {
    if (!selectedId && signatures.length) setSelectedId(signatures.at(-1)?.id ?? null)
  }, [selectedId, signatures])

  const clearResult = () => {
    setPreview(null)
    setOutputs([])
    setError('')
  }

  const updateTemplate = (settings: BatchTemplate) => {
    setTemplate(settings)
    clearResult()
  }

  const signature = signatures.find((item) => item.id === selectedId)
  const initials = template.initials ? signatures.find((item) => item.id === initialsId) : undefined
  const ready = files.length > 0 && !!signature && (!template.initials || !!initials)

  const addSignature = (image: SignatureImage) => {
    const signature: Signature = { id: newId(), ...image }
    setSignatures((current) => [...current, signature])
    setSelectedId(signature.id)
    setTab('simpan')
    clearResult()
  }

  const run = async (mode: 'preview' | 'batch') => {
    if (job.current || !ready || !signature) return
    const controller = new AbortController()
    const { signal } = controller
    job.current = controller
    setBusy(mode)
    setError('')
    if (mode === 'batch') setOutputs([])
    else setPreview(null)
    setProgress({ done: 0, total: files.length })
    const results: { name: string; size: number; blob: Blob }[] = []
    const failures: string[] = []
    const used = new Set<string>()
    try {
      if (mode === 'batch' && !await confirmSignedPdfChange(files, signal)) return
      const main = Object.values(template.caption).some((text) => text.trim())
        ? { ...await withCaption(signature, template.caption), id: newId() }
        : signature
      const sign = async (file: File) => batchSignPdf(new Uint8Array(await file.arrayBuffer()), baseName(file.name), template, main, initials)
      signal.throwIfAborted()
      if (mode === 'preview') {
        const file = files[Math.min(previewIndex, files.length - 1)]
        const result = await sign(file)
        signal.throwIfAborted()
        setPreview({ ...result, name: file.name })
        return
      }
      for (const [index, file] of files.entries()) {
        try {
          const { bytes } = await sign(file)
          signal.throwIfAborted()
          results.push({ name: uniqueName(`${baseName(file.name)}-ttd.pdf`, used), size: bytes.byteLength, blob: pdfBlob(bytes) })
        } catch {
          signal.throwIfAborted()
          failures.push(file.name)
        }
        setProgress({ done: index + 1, total: files.length })
      }
      setOutputs(results)
      if (failures.length) setError(`${failures.length} berkas gagal dibuka atau diproses (${failures.join(', ')}).`)
    } catch {
      if (!signal.aborted) setError('Gagal memproses PDF atau gambar. Pastikan berkas utuh dan tidak terkunci.')
    } finally {
      if (job.current === controller) {
        job.current = null
        setBusy(null)
      }
    }
  }

  return (
    <ToolBody>
      <fieldset disabled={Boolean(busy)} inert={Boolean(busy)} className="min-w-0 space-y-4 disabled:opacity-65">
        <Status tone="info">Alat ini menempelkan gambar tanda tangan. Gunakan gambar milik Anda atau yang diizinkan pemiliknya.</Status>
        <DropZone
          accept="application/pdf,.pdf"
          multiple
          onFiles={(next) => { setFiles((current) => [...current, ...next]); clearResult() }}
          label="Pilih beberapa PDF"
          hint="Semua berkas akan ditandatangani dengan pengaturan yang sama"
        />
        <FileList files={files} onRemove={(index) => { setFiles((current) => current.filter((_, i) => i !== index)); clearResult() }} />
        <SignedPdfNotice source={files} />

        <div className="rounded-2xl bg-surface p-4 ring-1 ring-line/70">
          <div className="mb-3 flex gap-1 rounded-xl bg-sunken p-1">
            {([
              ['simpan', 'Tanda tangan tersimpan'],
              ['baru', 'Buat baru'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                aria-pressed={tab === value}
                className={cx(
                  'flex-1 rounded-lg py-1.5 text-sm font-medium transition',
                  tab === value ? 'bg-surface text-ink ring-1 ring-line' : 'text-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'simpan' ? (
            signatures.length ? (
              <ul className="grid grid-cols-3 gap-2">
                {signatures.map((signature, index) => (
                  <li key={signature.id} className="relative">
                    <button
                      type="button"
                      onClick={() => { setSelectedId(signature.id); clearResult() }}
                      aria-pressed={selectedId === signature.id}
                      className={cx(
                        'checker grid h-16 w-full place-items-center rounded-xl p-1.5 transition',
                        selectedId === signature.id ? 'ring-2 ring-ink' : 'ring-1 ring-line hover:ring-gold',
                      )}
                    >
                      <img src={signature.dataUrl} alt="Tanda tangan" className="max-h-full max-w-full" />
                    </button>
                    <SignatureDownload
                      dataUrl={signature.dataUrl}
                      number={index + 1}
                      className="-right-1.5"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[0.82rem] text-muted">
                Belum ada tanda tangan tersimpan. Buat baru di tab sebelah.
              </p>
            )
          ) : (
            <div className="space-y-4">
              <div>
                <p className={cx(eyebrow, 'mb-1')}>Gambar</p>
                <SignaturePad onSave={addSignature} />
              </div>
              <div>
                <p className={cx(eyebrow, 'mb-1')}>Atau unggah</p>
                <SignatureUpload onSave={addSignature} />
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Posisi tanda tangan">
            <PositionSelect value={template.position} onChange={(position) => updateTemplate({ ...template, position })} />
          </Field>
          <Field label="Halaman tanda tangan">
            <select
              value={template.pageMode}
              onChange={(event) => updateTemplate({ ...template, pageMode: event.target.value as BatchTemplate['pageMode'] })}
              className={inputClass}
            >
              <option value="last">Halaman terakhir</option>
              <option value="first">Halaman pertama</option>
              <option value="all">Semua halaman</option>
            </select>
          </Field>
        </div>

        <Field label={`Lebar tanda tangan ${template.width}% halaman`}>
          <input
            type="range"
            min={8}
            max={60}
            value={template.width}
            onChange={(event) => updateTemplate({ ...template, width: Number(event.target.value) })}
            className="w-full accent-[var(--gold)]"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          {([['name', 'Nama'], ['role', 'Jabatan'], ['date', 'Tanggal']] as const).map(([key, label]) => (
            <Field key={key} label={label} hint="Opsional">
              <input className={inputClass} maxLength={80} value={template.caption[key]}
                onChange={(event) => updateTemplate({ ...template, caption: { ...template.caption, [key]: event.target.value } })} />
            </Field>
          ))}
        </div>

        <div className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-line/70">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="accent-[var(--gold)]" checked={template.initials}
              onChange={(event) => updateTemplate({ ...template, initials: event.target.checked })} /> Bubuhkan paraf di semua halaman
          </label>
          {template.initials && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Gambar paraf">
                  <select className={inputClass} value={initialsId} onChange={(event) => { setInitialsId(event.target.value); clearResult() }}>
                    <option value="">Pilih dari gambar tanda tangan</option>
                    {signatures.map((item, index) => <option value={item.id} key={item.id}>Gambar {index + 1}</option>)}
                  </select>
                </Field>
                <Field label="Posisi paraf">
                  <PositionSelect value={template.initialsPosition}
                    onChange={(initialsPosition) => updateTemplate({ ...template, initialsPosition })} />
                </Field>
              </div>
              <Field label={`Lebar paraf ${template.initialsWidth}% halaman`}>
                <input type="range" min={5} max={30} value={template.initialsWidth} className="w-full accent-[var(--gold)]"
                  onChange={(event) => updateTemplate({ ...template, initialsWidth: Number(event.target.value) })} />
              </Field>
            </>
          )}
        </div>

        <LocalPresets storageKey={BATCH_TEMPLATE_KEY} label="Template" settings={template} parse={parseTemplate} onApply={updateTemplate} />
        <p className="text-xs text-muted">Template menyimpan posisi dan keterangan. Pilih sendiri gambar tanda tangan dan paraf yang akan dipakai.</p>
        {files.length > 1 && <Field label="Berkas untuk pratinjau">
          <select className={inputClass} value={Math.min(previewIndex, files.length - 1)} onChange={(event) => {
            setPreviewIndex(Number(event.target.value)); setPreview(null)
          }}>
            {files.map((file, index) => <option key={`${file.name}-${index}`} value={index}>{file.name}</option>)}
          </select>
        </Field>}
      </fieldset>

      {progress.total > 0 && busy === 'batch' && (
        <p className="text-[0.75rem] text-muted tabular-nums">
          Memproses {progress.done} / {progress.total} berkas…
        </p>
      )}

      {error && <Status tone="error">{error}</Status>}

      <button type="button" disabled={!ready || Boolean(busy)} onClick={() => void run('preview')}
        className="w-full rounded-xl bg-sunken px-4 py-3 text-sm font-medium disabled:opacity-40">
        {busy === 'preview' ? 'Menyiapkan pratinjau…' : 'Pratinjau hasil tanda tangan'}
      </button>
      {preview && (
        <section className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-line/70">
          <div className="flex items-center justify-between gap-3">
            <h2 className="min-w-0 truncate text-sm font-medium">Pratinjau {preview.name}</h2>
            <button type="button" className="shrink-0 text-sm text-gold hover:underline" onClick={() => setPreview(null)}>Tutup</button>
          </div>
          <PdfResultPreview bytes={preview.bytes} firstPage={preview.primaryPage} />
        </section>
      )}
      <ActionButton
        busy={busy === 'batch'}
        disabled={!ready || busy === 'preview'}
        onClick={() => void run('batch')}
        busyLabel="Menandatangani…"
      >
        Tandatangani {files.length || ''} PDF
      </ActionButton>
      {busy && <button type="button" onClick={() => job.current?.abort()} className="text-sm text-gold hover:underline">Batalkan proses</button>}

      {outputs.length > 0 && (
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-line/70">
          <p className="text-sm font-medium text-ink">{outputs.length} berkas siap</p>
          <ul className="mt-2 space-y-1">
            {outputs.map((item) => (
              <li key={item.name} className="flex justify-between gap-3 text-[0.8rem]">
                <span className="truncate text-ink-soft">{item.name}</span>
                <span className="shrink-0 text-muted tabular-nums">{formatBytes(item.size)}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => {
              void downloadAll(
                outputs.map(({ name, blob }) => ({ name, blob })),
                'tanda-tangan-massal',
                'dokumen-bertanda-tangan.zip',
              ).catch(() => setError('Gagal menyiapkan unduhan. Coba lagi.'))
            }}
            className="mt-3 h-11 w-full rounded-xl bg-gold-soft text-sm font-semibold text-gold transition hover:bg-gold/15"
          >
            Unduh semua
          </button>
        </div>
      )}
    </ToolBody>
  )
}

function PositionSelect({ value, onChange }: { value: BatchPosition; onChange: (value: BatchPosition) => void }) {
  return <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value as BatchPosition)}>
    {Object.entries(batchPositions).map(([position, label]) => <option key={position} value={position}>{label}</option>)}
  </select>
}
