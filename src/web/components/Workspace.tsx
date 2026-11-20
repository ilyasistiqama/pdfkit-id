import { useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Minus,
  Plus,
  Redo2,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { SignatureImage } from '../../core/image'
import type { SignRect } from '../../core/geometry'
import type { Placement, Signature } from '../../core/types'
import { PdfViewer, type ViewerHandle } from './PdfViewer'
import { SignatureStudio } from './SignatureStudio'
import { ConfirmDialog } from './ConfirmDialog'
import { Modal } from './Modal'
import { btnIcon, btnPrimary, card, cx, eyebrow } from '../ui'

interface Props {
  doc: PDFDocumentProxy
  fileName: string
  zoom: number
  activePage: number
  onZoom: (zoom: number) => void
  onBack: () => void
  signatures: Signature[]
  selectedSignatureId: string | null
  persistSignatures: boolean
  onTogglePersist: (value: boolean) => void
  onSelectSignature: (id: string) => void
  onAddSignature: (image: SignatureImage) => void
  onRemoveSignature: (id: string) => void
  placements: Placement[]
  selectedPlacementId: string | null
  onSelectPlacement: (id: string | null) => void
  onChangePlacement: (id: string, rect: SignRect) => void
  onDragStart: () => void
  onDragEnd: () => void
  onDeletePlacement: (id: string) => void
  onActivePage: (page: number) => void
  onPlace: () => void
  onExport: () => void
  exporting: boolean
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function Workspace(props: Props) {
  const [sheet, setSheet] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const viewerRef = useRef<ViewerHandle>(null)

  const jumpTo = (page: number) => {
    const next = Math.max(0, Math.min(props.doc.numPages - 1, page))
    viewerRef.current?.scrollToPage(next)
    props.onActivePage(next)
  }

  const requestClose = () => {
    if (props.placements.length > 0) setConfirmLeave(true)
    else props.onBack()
  }

  const buildPanel = (onPlace: () => void) => (
    <div className="space-y-4">
      <section className={cx(card, 'p-5')}>
        <div className="flex items-baseline justify-between">
          <p className={eyebrow}>Langkah 2</p>
          <span className="text-xs text-muted">{props.doc.numPages} halaman</span>
        </div>
        <h2 className="mt-1 font-serif text-xl tracking-tight">Buat tanda tangan</h2>
        <p className="mt-1 mb-4 text-[0.82rem] leading-relaxed text-muted">
          Gambar langsung, atau unggah PNG hasil scan. Bagian kosong otomatis dipangkas.
        </p>
        <SignatureStudio
          signatures={props.signatures}
          selectedId={props.selectedSignatureId}
          activePage={props.activePage + 1}
          persist={props.persistSignatures}
          onTogglePersist={props.onTogglePersist}
          onSelect={props.onSelectSignature}
          onAdd={props.onAddSignature}
          onRemove={props.onRemoveSignature}
          onPlace={onPlace}
        />
      </section>

      <section className={cx(card, 'p-5')}>
        <div className="flex items-baseline justify-between">
          <p className={eyebrow}>Langkah 3</p>
          <span className="text-xs text-muted">{props.placements.length} tempel</span>
        </div>
        <h2 className="mt-1 font-serif text-xl tracking-tight">Tempel & unduh</h2>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-muted">
          Geser tanda tangan di halaman, tarik titik emas untuk mengubah ukuran, atau tombol putar
          untuk memiringkannya.
        </p>

        {props.placements.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {props.placements.map((placement) => {
              const signature = props.signatures.find((s) => s.id === placement.signatureId)
              return (
                <li
                  key={placement.id}
                  className={cx(
                    'flex items-center gap-2 rounded-xl px-2 py-1.5 transition',
                    props.selectedPlacementId === placement.id ? 'bg-gold-soft' : 'hover:bg-sunken',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      props.onSelectPlacement(placement.id)
                      jumpTo(placement.pageIndex)
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface text-muted ring-1 ring-line">
                      <FileText className="size-3.5" strokeWidth={1.8} />
                    </span>
                    <span className="truncate text-sm font-medium">
                      Halaman {placement.pageIndex + 1}
                    </span>
                    {signature && (
                      <img
                        src={signature.dataUrl}
                        alt=""
                        className="ml-auto h-5 w-14 shrink-0 object-contain opacity-70"
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onDeletePlacement(placement.id)}
                    aria-label={`Hapus tanda tangan di halaman ${placement.pageIndex + 1}`}
                    className="grid size-7 shrink-0 place-items-center rounded-full text-muted transition hover:text-loss"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.8} />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl bg-sunken px-3 py-2.5 text-xs text-muted">
            Belum ada tanda tangan ditempel. Simpan tanda tangan dulu, lalu tekan “Tempel di
            halaman”.
          </p>
        )}

        <button
          type="button"
          onClick={props.onExport}
          disabled={props.placements.length === 0 || props.exporting}
          className={cx(btnPrimary, 'mt-4 w-full')}
        >
          {props.exporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileText className="size-4" strokeWidth={1.8} />
          )}
          {props.exporting ? 'Menyiapkan…' : 'Unduh PDF'}
        </button>
        <p className="mt-2 text-center text-[0.68rem] leading-relaxed text-muted">
          Diproses di browser kamu. File tidak dikirim ke mana pun.
        </p>
        <p className="mt-3 border-t border-line pt-2.5 text-[0.68rem] leading-relaxed text-muted">
          Pintasan: <span className="font-medium text-ink-soft">panah</span> geser ·{' '}
          <span className="font-medium text-ink-soft">Shift+panah</span> geser cepat ·{' '}
          <span className="font-medium text-ink-soft">Del</span> hapus ·{' '}
          <span className="font-medium text-ink-soft">Ctrl/Cmd+Z</span> undo
        </p>
      </section>
    </div>
  )

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="z-30 shrink-0 border-b border-line/70 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1440px] items-center gap-2 px-3 py-2.5 sm:px-8 sm:py-3">
          <button
            type="button"
            onClick={requestClose}
            aria-label="Tutup dokumen"
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-sunken hover:text-ink"
          >
            <ChevronLeft className="size-5" strokeWidth={1.8} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{props.fileName}</p>
            <p className="text-[0.7rem] text-muted">
              Halaman {props.activePage + 1} dari {props.doc.numPages}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <div className="flex items-center rounded-full bg-surface ring-1 ring-line/80">
              <button
                type="button"
                onClick={() => jumpTo(props.activePage - 1)}
                disabled={props.activePage <= 0}
                aria-label="Halaman sebelumnya"
                className={cx(btnIcon, 'size-8 disabled:opacity-30')}
              >
                <ChevronLeft className="size-3.5" strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={() => jumpTo(props.activePage + 1)}
                disabled={props.activePage >= props.doc.numPages - 1}
                aria-label="Halaman berikutnya"
                className={cx(btnIcon, 'size-8 disabled:opacity-30')}
              >
                <ChevronRight className="size-3.5" strokeWidth={2.2} />
              </button>
            </div>

            <div className="hidden items-center rounded-full bg-surface ring-1 ring-line/80 sm:flex">
              <button
                type="button"
                onClick={() => props.onZoom(props.zoom - 0.15)}
                disabled={props.zoom <= 0.5}
                aria-label="Perkecil"
                className={cx(btnIcon, 'size-8')}
              >
                <Minus className="size-3.5" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => props.onZoom(1)}
                className="min-w-11 text-center text-xs font-medium tabular-nums text-ink-soft"
                aria-label="Kembalikan zoom ke 100%"
              >
                {Math.round(props.zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => props.onZoom(props.zoom + 0.15)}
                disabled={props.zoom >= 2.4}
                aria-label="Perbesar"
                className={cx(btnIcon, 'size-8')}
              >
                <Plus className="size-3.5" strokeWidth={2} />
              </button>
            </div>

            <div className="flex items-center">
              <button
                type="button"
                onClick={props.onUndo}
                disabled={!props.canUndo}
                aria-label="Urungkan"
                title="Urungkan (Ctrl/Cmd+Z)"
                className={cx(btnIcon, 'size-9 disabled:opacity-30')}
              >
                <Undo2 className="size-4" strokeWidth={1.9} />
              </button>
              <button
                type="button"
                onClick={props.onRedo}
                disabled={!props.canRedo}
                aria-label="Ulangi"
                title="Ulangi (Shift+Ctrl/Cmd+Z)"
                className={cx(btnIcon, 'size-9 disabled:opacity-30')}
              >
                <Redo2 className="size-4" strokeWidth={1.9} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-0 w-full max-w-[1440px] flex-1 gap-6 px-0 pb-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_384px] lg:px-8 lg:pb-6">
        <section className="min-h-0 overflow-hidden sm:rounded-[22px] sm:ring-1 sm:ring-line/60 lg:h-full">
          <PdfViewer
            ref={viewerRef}
            doc={props.doc}
            zoom={props.zoom}
            activePage={props.activePage}
            signatures={props.signatures}
            placements={props.placements}
            selectedId={props.selectedPlacementId}
            onSelect={props.onSelectPlacement}
            onChange={props.onChangePlacement}
            onDragStart={props.onDragStart}
            onDragEnd={props.onDragEnd}
            onDelete={props.onDeletePlacement}
            onActivePage={props.onActivePage}
          />
        </section>

        <aside className="hidden min-h-0 overflow-y-auto pb-4 lg:block">
          <div className="sticky top-0">{buildPanel(props.onPlace)}</div>
        </aside>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl gap-2">
          <button
            type="button"
            onClick={() => setSheet(true)}
            className="h-12 flex-1 rounded-2xl bg-surface text-sm font-medium ring-1 ring-line"
          >
            Tanda tangan
          </button>
          <button
            type="button"
            onClick={props.onExport}
            disabled={props.placements.length === 0 || props.exporting}
            className="h-12 flex-1 rounded-2xl bg-ink text-sm font-medium text-on-ink disabled:opacity-40"
          >
            {props.exporting ? 'Menyiapkan…' : 'Unduh PDF'}
          </button>
        </div>
      </div>

      <Modal
        open={sheet}
        onClose={() => setSheet(false)}
        variant="sheet"
        labelledBy="sheet-title"
        className="lg:hidden"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <div className="mb-3 flex items-center justify-between">
          <p id="sheet-title" className="font-serif text-lg">
            Tanda tangan
          </p>
          <button
            type="button"
            onClick={() => setSheet(false)}
            aria-label="Tutup panel tanda tangan"
            className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-sunken"
          >
            <X className="size-4" />
          </button>
        </div>
        {buildPanel(() => {
          props.onPlace()
          setSheet(false)
        })}
      </Modal>

      <ConfirmDialog
        open={confirmLeave}
        title="Tutup dokumen ini?"
        body="Tanda tangan yang sudah ditempel akan hilang. Tanda tangan tersimpan tetap ada di perangkat."
        confirmLabel="Tutup"
        cancelLabel="Lanjut mengerjakan"
        danger
        onConfirm={() => {
          setConfirmLeave(false)
          props.onBack()
        }}
        onCancel={() => setConfirmLeave(false)}
      />
    </div>
  )
}
