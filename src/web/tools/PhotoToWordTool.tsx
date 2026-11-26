import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCw, X } from 'lucide-react'
import { downloadBlob, formatBytes } from '../../core/download'
import type { OcrLanguage } from '../../core/photoOcr'
import type { PhotoFont } from '../../core/photoDocx'
import { obscuresPhotoText } from '../../core/photoGraphics'
import { editedPhotoLines, type PhotoLayout } from '../../core/photoLayout'
import { decodePhotoUrl, normalizePhotoFile, PHOTO_ACCEPT, PHOTO_HINT } from '../../core/photoInput'
import { trackDownload } from '../../site/analytics'
import { ActionButton, DropZone, Field, FileList, Status, ToolBody, inputClass } from './ToolUi'
import { PhotoGraphicPicker } from './PhotoGraphicPicker'

type Page = {
  file: File
  url: string
  rotation: number
  layout: PhotoLayout | null
  draft: string
  photoOnly: boolean
}

function withDocument(page: Page, layout: PhotoLayout): Page {
  const lines = layout.lines.filter((line) => !layout.graphics?.some((graphic) => obscuresPhotoText(graphic, line)))
  return { ...page, layout: { ...layout, lines }, draft: lines.map((line) => line.text).join('\n') }
}

export default function PhotoToWordTool() {
  const [pages, setPages] = useState<Page[]>([])
  const [activeUrl, setActiveUrl] = useState('')
  const index = Math.max(0, pages.findIndex((page) => page.url === activeUrl))
  const current = pages[index]
  const file = current?.file
  const sourceUrl = current?.url ?? ''
  const rotation = current?.rotation ?? 0
  const layout = current?.layout ?? null
  const draft = current?.draft ?? ''
  const [language, setLanguage] = useState<OcrLanguage>('ind')
  const [font, setFont] = useState<PhotoFont>('Times New Roman')
  const [exportMode, setExportMode] = useState<'editable' | 'photo'>('editable')
  const [busy, setBusy] = useState<'checking' | 'ocr' | 'editable' | 'photo' | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [reading, setReading] = useState('')
  const [error, setError] = useState('')
  const [pickingGraphic, setPickingGraphic] = useState(false)
  const currentJob = useRef<AbortController | null>(null)
  const urls = useRef(new Set<string>())
  const closeGraphicPicker = useCallback(() => setPickingGraphic(false), [])
  const pending = pages.filter((page) => !page.layout && !page.photoOnly)
  const ready = pages.every((page) => page.photoOnly || (page.layout && (page.draft.trim() || page.layout.graphics?.length)))

  useEffect(() => () => {
    currentJob.current?.abort()
    for (const url of urls.current) URL.revokeObjectURL(url)
    urls.current.clear()
  }, [])

  const updatePage = (url: string, update: (page: Page) => Page) => {
    setPages((previous) => previous.map((page) => page.url === url ? update(page) : page))
  }

  const clearResult = () => {
    updatePage(sourceUrl, (page) => ({ ...page, layout: null, draft: '', photoOnly: false }))
    setError('')
  }

  const selectPhoto = async (files: File[]) => {
    if (currentJob.current) return
    const job = new AbortController()
    currentJob.current = job
    setBusy('checking')
    setError('')
    const next: Page[] = []
    const errors: string[] = []
    try {
      for (const file of files) {
        let url: string | undefined
        try {
          const normalized = await normalizePhotoFile(file)
          if (job.signal.aborted) return
          url = URL.createObjectURL(normalized)
          urls.current.add(url)
          await decodePhotoUrl(url)
          if (job.signal.aborted) return
          next.push({ file, url, rotation: 0, layout: null, draft: '', photoOnly: false })
        } catch (error) {
          if (url) { URL.revokeObjectURL(url); urls.current.delete(url) }
          if (job.signal.aborted) return
          errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Gambar gagal dibaca.'}`)
        }
      }
      if (next.length) {
        setPages((previous) => [...previous, ...next])
        setActiveUrl((previous) => previous || next[0].url)
      }
      setError(errors.join(' '))
    } finally {
      currentJob.current = null
      if (!job.signal.aborted) setBusy(null)
    }
  }

  const remove = (from: number) => {
    const target = pages[from]
    if (!target || busy) return
    URL.revokeObjectURL(target.url)
    urls.current.delete(target.url)
    setPages((previous) => previous.filter((page) => page.url !== target.url))
    if (sourceUrl === target.url) setActiveUrl(pages[from + 1]?.url ?? pages[from - 1]?.url ?? '')
    setError('')
  }

  const move = (from: number, to: number) => {
    setPages((previous) => {
      if (busy || to < 0 || to >= previous.length) return previous
      const next = [...previous]
      const [page] = next.splice(from, 1)
      next.splice(to, 0, page)
      return next
    })
  }

  const readPhoto = async (targets: Page[]) => {
    if (!targets.length || currentJob.current) return
    const job = new AbortController()
    currentJob.current = job
    setBusy('ocr')
    setError('')
    const errors: string[] = []
    try {
      const { withOcrWorker, recognizePhotoInWorker } = await import('../../core/photoOcr')
      await withOcrWorker(language, job.signal, setProgress, async (worker) => {
        for (const [position, page] of targets.entries()) {
          job.signal.throwIfAborted()
          setReading(targets.length > 1 ? `Foto ${position + 1}/${targets.length} · ` : '')
          setProgress(null)
          try {
            const result = await recognizePhotoInWorker(worker, page.url, page.rotation)
            job.signal.throwIfAborted()
            updatePage(page.url, (previous) => withDocument(previous, result))
          } catch (cause) {
            job.signal.throwIfAborted()
            errors.push(`${page.file.name}: ${cause instanceof Error ? cause.message : 'Teks gagal dibaca.'}`)
          }
        }
      })
      if (errors.length) setError(errors.join(' '))
    } catch (cause) {
      if (!job.signal.aborted) setError(cause instanceof Error ? cause.message : 'Foto gagal diproses. Coba lagi.')
    } finally {
      currentJob.current = null
      setBusy(null)
      setReading('')
      setProgress(null)
    }
  }

  const exportWord = async (mode: 'editable' | 'photo') => {
    if (!pages.length || currentJob.current || (mode === 'editable' && !ready)) return
    const job = new AbortController()
    currentJob.current = job
    setBusy(mode)
    setError('')
    try {
      const { buildPhotoWord } = await import('../../core/photoDocx')
      const output = pages.map((page) => {
        const source = { url: page.url, rotation: page.rotation }
        if (mode === 'editable' && !page.photoOnly && page.layout) {
          return { source: { ...source, graphics: page.layout.graphics ?? [] }, layout: page.layout, draft: page.draft }
        }
        return { source }
      })
      const blob = await buildPhotoWord(output, font, job.signal)
      job.signal.throwIfAborted()
      const name = pages[0].file.name.replace(/\.[^.]+$/, '') || 'dokumen'
      downloadBlob(blob, `${name}${mode === 'photo' ? '-salinan-foto' : ''}.docx`)
      trackDownload('foto-ke-word')
    } catch {
      if (!job.signal.aborted) setError('Dokumen Word belum bisa dibuat. Coba unduh kembali.')
    } finally {
      currentJob.current = null
      setBusy(null)
    }
  }

  const ocrStatus = progress === null
    ? `${reading}Menyiapkan pembaca teks…`
    : `${reading}Membaca teks… ${Math.min(99, Math.floor(progress * 100))}%`

  return (
    <ToolBody>
      {!busy && (
        <DropZone accept={PHOTO_ACCEPT} multiple onFiles={(files) => void selectPhoto(files)} compact={!!file}
          label={file ? 'Tambah foto' : 'Pilih foto dokumen'} hint={`${PHOTO_HINT} sesuai dukungan browser`} />
      )}
      {busy === 'checking' && <Status tone="info">Memeriksa format dan membuka foto…</Status>}
      {pages.length > 1 && (
        <div className="space-y-2">
          {!busy && <FileList files={pages.map((page) => page.file)} onRemove={remove} onMove={move} />}
          <Field label="Foto yang sedang ditinjau">
            <select className={inputClass} value={sourceUrl} disabled={!!busy} onChange={(event) => setActiveUrl(event.target.value)}>
              {pages.map((page, i) => <option key={page.url} value={page.url}>{i + 1}. {page.file.name}{page.layout || page.photoOnly ? ' ✓' : ''}</option>)}
            </select>
          </Field>
        </div>
      )}
      {file && (
        <div className="grid gap-3 md:grid-cols-2">
          <section aria-label="Pratinjau foto" className="min-w-0 overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink" title={file.name}>{file.name}</p>
                <p className="text-xs text-muted">{formatBytes(file.size)}</p>
              </div>
              <button type="button" disabled={!!busy} aria-label="Putar foto 90 derajat" title="Putar foto 90 derajat"
                className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-sunken disabled:opacity-40"
                onClick={() => { clearResult(); updatePage(sourceUrl, (page) => ({ ...page, rotation: (page.rotation + 90) % 360 })) }}>
                <RotateCw className="size-4" />
              </button>
              <button type="button" disabled={!!busy} aria-label="Hapus foto" title="Hapus foto"
                className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-sunken disabled:opacity-40"
                onClick={() => remove(index)}>
                <X className="size-4" />
              </button>
            </div>
            <div className="grid h-64 place-items-center overflow-hidden bg-sunken">
              {sourceUrl && (
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" aria-label="Buka foto asli di tab baru"
                  title="Buka foto asli di tab baru" className="cursor-zoom-in">
                  <img src={sourceUrl} alt="Foto dokumen yang dipilih"
                    onError={() => setError('Foto gagal ditampilkan. Pilih foto lain atau coba format berbeda.')}
                    className="max-h-56 max-w-56 object-contain"
                    style={{ transform: `rotate(${rotation}deg)` }} />
                </a>
              )}
            </div>
          </section>
          <div className="min-w-0 space-y-3">
            <Field label="Jenis hasil">
              <select className={inputClass} value={exportMode} disabled={!!busy}
                onChange={(event) => { setError(''); setExportMode(event.target.value as 'editable' | 'photo') }}>
                <option value="editable">Dokumen yang bisa diedit</option>
                <option value="photo">Salinan foto</option>
              </select>
            </Field>
            {exportMode === 'photo' ? (
              <>
                <p className="text-sm leading-relaxed text-muted">
                  Salinan foto mempertahankan kop, stempel, dan tanda tangan. Isi halaman berupa gambar.
                </p>
                <ActionButton busy={busy === 'photo'} disabled={!sourceUrl} busyLabel="Menyiapkan Word…"
                  onClick={() => void exportWord('photo')}>
                  Unduh salinan foto (.docx)
                </ActionButton>
              </>
            ) : (
              <>
                <Field label="Bahasa dokumen">
                  <select className={inputClass} value={language} disabled={!!busy}
                    onChange={(event) => setLanguage(event.target.value as OcrLanguage)}>
                    <option value="ind">Indonesia</option>
                    <option value="eng">Inggris</option>
                    <option value="ind+eng">Indonesia dan Inggris</option>
                  </select>
                </Field>
                {pages.length > 1 && (
                  <label className="flex items-center gap-2 text-sm text-ink-soft">
                    <input type="checkbox" checked={current.photoOnly} disabled={!!busy}
                      onChange={(event) => { const photoOnly = event.target.checked; updatePage(sourceUrl, (page) => ({ ...page, photoOnly })) }} />
                    Sertakan halaman ini sebagai foto
                  </label>
                )}
                {current.photoOnly ? null : layout ? (
                  <>
                    <Field label="Jenis huruf Word">
                      <select className={inputClass} value={font} disabled={!!busy}
                        onChange={(event) => setFont(event.target.value as PhotoFont)}>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Arial">Arial</option>
                      </select>
                    </Field>
                    <label className="block text-xs font-medium text-muted" htmlFor="photo-word-text">
                      Koreksi hasil baca
                    </label>
                    <textarea id="photo-word-text" value={draft} onChange={(event) => { const draft = event.target.value; updatePage(sourceUrl, (page) => ({ ...page, draft })) }}
                      disabled={!!busy} spellCheck={false}
                      className="min-h-56 w-full resize-y rounded-xl bg-surface p-3 text-sm leading-relaxed text-ink outline-none ring-1 ring-line focus:ring-gold/60" />
                  </>
                ) : (
                  <>
                    <p className="text-sm leading-relaxed text-muted">
                      Gunakan foto yang tajam, terang, dan menghadap lurus. Pembacaan pertama memuat mesin OCR dan model bahasa.
                    </p>
                    <ActionButton busy={busy === 'ocr'} disabled={!sourceUrl} busyLabel={ocrStatus} onClick={() => void readPhoto([current])}>
                      Baca teks dari foto
                    </ActionButton>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {error && <Status tone="error">{error}</Status>}

      {layout && !current?.photoOnly && exportMode === 'editable' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sunken px-3 py-2.5">
            <p className="text-xs text-muted">
              {layout.graphics?.length ? `${layout.graphics.length} gambar dipertahankan. Teks yang terbaca di sekitar stempel dan tanda tangan bisa diedit.`
                : 'Tandai logo, stempel, atau tanda tangan yang ingin dipertahankan.'}
            </p>
            <button type="button" disabled={!!busy || !sourceUrl} onClick={() => setPickingGraphic(true)}
              className="text-sm font-medium text-gold hover:underline disabled:opacity-40">
              Pilih area gambar
            </button>
          </div>
          <Status tone="info">Periksa ejaan, angka, dan susunan baris sebelum mengunduh.</Status>
          <button type="button" disabled={!!busy} onClick={clearResult}
            className="text-sm font-medium text-gold hover:underline disabled:opacity-40">
            Mulai ulang pembacaan
          </button>
        </>
      )}
      {pages.length > 1 && exportMode === 'editable' && pending.length > 0 && (
        <ActionButton busy={busy === 'ocr'} disabled={!!busy} busyLabel={ocrStatus} onClick={() => void readPhoto(pending)}>
          Baca semua foto yang tersisa ({pending.length})
        </ActionButton>
      )}
      {busy === 'ocr' && (
        <button type="button" onClick={() => currentJob.current?.abort()} className="text-sm font-medium text-gold hover:underline">
          Batalkan pembacaan
        </button>
      )}
      {file && exportMode === 'editable' && (ready || pages.length > 1) && (
        <ActionButton busy={busy === 'editable'} disabled={!ready || !!busy} busyLabel="Menyiapkan Word…"
          onClick={() => void exportWord('editable')}>
          Unduh Word (.docx)
        </ActionButton>
      )}
      {layout && sourceUrl && pickingGraphic && (
        <PhotoGraphicPicker url={sourceUrl} rotation={rotation} onClose={closeGraphicPicker} onSelect={(graphic) => {
          updatePage(sourceUrl, (page) => withDocument(page, { ...layout, lines: editedPhotoLines(layout.lines, draft), graphics: [...(layout.graphics ?? []), graphic] }))
          closeGraphicPicker()
        }} />
      )}
    </ToolBody>
  )
}
