import { useEffect, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { signPdf } from '../../core/exportPdf'
import type { Placement, Signature } from '../../core/types'
import type { SignatureImage } from '../../core/image'
import { newId } from '../../core/id'
import { downloadAll, formatBytes, pdfBlob } from '../../core/download'
import { loadSignatures } from '../signatureStore'
import { SignaturePad } from '../components/SignaturePad'
import { SignatureUpload } from '../components/SignatureUpload'
import { ActionButton, DropZone, Field, FileList, Status, ToolBody, inputClass } from './ToolUi'
import { cx, eyebrow } from '../ui'

type Preset = 'kiri-bawah' | 'kanan-bawah' | 'tengah' | 'kiri-atas'

const PRESETS: Record<Preset, { x: number; yAnchor: 'top' | 'bottom' }> = {
  'kiri-bawah': { x: 0.06, yAnchor: 'bottom' },
  'kanan-bawah': { x: 0.66, yAnchor: 'bottom' },
  tengah: { x: 0.36, yAnchor: 'bottom' },
  'kiri-atas': { x: 0.06, yAnchor: 'top' },
}

export function BatchSignTool() {
  const [files, setFiles] = useState<File[]>([])
  const [signatures, setSignatures] = useState<Signature[]>(() => loadSignatures().signatures)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'simpan' | 'baru'>('simpan')
  const [preset, setPreset] = useState<Preset>('kanan-bawah')
  const [pageMode, setPageMode] = useState<'last' | 'first' | 'all'>('last')
  const [width, setWidth] = useState(26)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [outputs, setOutputs] = useState<{ name: string; size: number; blob: Blob }[]>([])
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  useEffect(() => {
    if (!selectedId && signatures.length) setSelectedId(signatures.at(-1)?.id ?? null)
  }, [selectedId, signatures])

  const addSignature = (image: SignatureImage) => {
    const signature: Signature = { id: newId(), ...image }
    setSignatures((current) => [...current, signature])
    setSelectedId(signature.id)
    setTab('simpan')
  }

  const run = async () => {
    const signature = signatures.find((item) => item.id === selectedId)
    if (!signature || !files.length) return
    setBusy(true)
    setError('')
    setOutputs([])
    setProgress({ done: 0, total: files.length })

    const results: { name: string; size: number; blob: Blob }[] = []
    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index]
        const bytes = new Uint8Array(await file.arrayBuffer())
        const doc = await PDFDocument.load(bytes, { updateMetadata: false })
        const total = doc.getPageCount()
        const pages =
          pageMode === 'all'
            ? Array.from({ length: total }, (_, page) => page)
            : pageMode === 'first'
              ? [0]
              : [total - 1]

        const placements: Placement[] = pages.map((pageIndex) => ({
          id: newId(),
          signatureId: signature.id,
          pageIndex,
          rect: placementRect(preset, width / 100, signature.aspect, doc, pageIndex),
        }))

        const output = await signPdf(bytes, placements, [signature], file.name.replace(/\.pdf$/i, ''))
        results.push({
          name: `${file.name.replace(/\.pdf$/i, '')}-ttd.pdf`,
          size: output.byteLength,
          blob: pdfBlob(output),
        })
        setProgress({ done: index + 1, total: files.length })
      }
      setOutputs(results)
    } catch {
      setError('Satu atau lebih berkas gagal diproses. Pastikan semuanya PDF yang tidak terkunci.')
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
        label="Pilih beberapa PDF"
        hint="Semua berkas akan ditandatangani dengan pengaturan yang sama"
      />
      <FileList files={files} onRemove={(index) => setFiles((current) => current.filter((_, i) => i !== index))} />

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
              {signatures.map((signature) => (
                <li key={signature.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(signature.id)}
                    aria-pressed={selectedId === signature.id}
                    className={cx(
                      'checker grid h-16 w-full place-items-center rounded-xl p-1.5 transition',
                      selectedId === signature.id ? 'ring-2 ring-ink' : 'ring-1 ring-line hover:ring-gold',
                    )}
                  >
                    <img src={signature.dataUrl} alt="Tanda tangan" className="max-h-full max-w-full" />
                  </button>
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
        <Field label="Posisi">
          <select value={preset} onChange={(event) => setPreset(event.target.value as Preset)} className={inputClass}>
            <option value="kanan-bawah">Kanan bawah</option>
            <option value="kiri-bawah">Kiri bawah</option>
            <option value="tengah">Tengah bawah</option>
            <option value="kiri-atas">Kiri atas</option>
          </select>
        </Field>
        <Field label="Halaman">
          <select
            value={pageMode}
            onChange={(event) => setPageMode(event.target.value as typeof pageMode)}
            className={inputClass}
          >
            <option value="last">Halaman terakhir</option>
            <option value="first">Halaman pertama</option>
            <option value="all">Semua halaman</option>
          </select>
        </Field>
      </div>

      <Field label={`Lebar tanda tangan: ${width}% halaman`}>
        <input
          type="range"
          min={8}
          max={60}
          value={width}
          onChange={(event) => setWidth(Number(event.target.value))}
          className="w-full accent-[var(--gold)]"
        />
      </Field>

      {progress.total > 0 && busy && (
        <p className="text-[0.75rem] text-muted tabular-nums">
          Memproses {progress.done} / {progress.total} berkas…
        </p>
      )}

      {error && <Status tone="error">{error}</Status>}

      <ActionButton
        busy={busy}
        disabled={!files.length || !selectedId}
        onClick={() => void run()}
        busyLabel="Menandatangani…"
      >
        Tandatangani {files.length || ''} PDF
      </ActionButton>

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
            onClick={() =>
              void downloadAll(
                outputs.map(({ name, blob }) => ({ name, blob })),
                'tanda-tangan-massal',
                'dokumen-bertanda-tangan.zip',
              )
            }
            className="mt-3 h-11 w-full rounded-xl bg-gold-soft text-sm font-semibold text-gold transition hover:bg-gold/15"
          >
            Unduh semua
          </button>
        </div>
      )}
    </ToolBody>
  )
}

/** Posisi pecahan; tinggi diturunkan dari rasio gambar terhadap ukuran halaman tampil. */
function placementRect(
  preset: Preset,
  widthFraction: number,
  aspect: number,
  doc: PDFDocument,
  pageIndex: number,
) {
  const page = doc.getPages()[pageIndex]
  const { width: pw, height: ph } = page.getSize()
  const rotation = page.getRotation().angle
  const swapped = rotation % 180 !== 0
  const visW = swapped ? ph : pw
  const visH = swapped ? pw : ph
  const height = (widthFraction * visW) / aspect / visH
  const config = PRESETS[preset]
  return {
    x: config.x,
    y: config.yAnchor === 'bottom' ? Math.max(0.03, 0.9 - height) : 0.07,
    w: widthFraction,
    tilt: 0,
  }
}
