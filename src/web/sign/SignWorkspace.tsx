import { useCallback, useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { SignatureImage } from '../../core/image'
import { clamp, type SignRect } from '../../core/geometry'
import { newId } from '../../core/id'
import type { Placement, Signature } from '../../core/types'
import { Landing } from '../components/Landing'
import { Workspace } from '../components/Workspace'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Modal } from '../components/Modal'
import { canPersistSensitiveData, clearBrowserCopy, loadSignatures, saveSignatures, SIGNATURE_STORAGE_KEY } from '../signatureStore'
import { confirmSignedPdfChange } from '../tools/SignedPdfNotice'
import { useHistory } from '../useHistory'
import { btnGhost, btnPrimary, cx } from '../ui'
import { trackDownload } from '../../site/analytics'

const readError = (error: unknown) => {
  const message = (error as { message?: string } | null)?.message ?? ''
  if (message === 'password-dibatalkan') return ''
  const name = (error as { name?: string } | null)?.name ?? ''
  if (name === 'PasswordException' || message === 'PasswordException') {
    return 'PDF ini dikunci kata sandi. Buka kuncinya dulu, lalu coba lagi.'
  }
  return 'PDF tidak bisa dibuka. Pastikan filenya utuh dan bukan file yang dilindungi.'
}

type PageSize = { w: number; h: number }

interface Props {
  /** true saat dokumen terbuka: sembunyikan header/footer situs agar fokus ke lembar kerja. */
  onImmersiveChange?: (immersive: boolean) => void
}

export default function SignWorkspace({ onImmersiveChange }: Props) {
  const [stored] = useState(loadSignatures)
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [fileName, setFileName] = useState('dokumen.pdf')
  const [loading, setLoading] = useState(false)

  const [signatures, setSignatures] = useState<Signature[]>(stored.signatures)
  const [persistSignatures, setPersistSignatures] = useState(stored.enabled)
  const [savedCopyNeedsReview, setSavedCopyNeedsReview] = useState(stored.needsReview)
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(
    stored.signatures.at(-1)?.id ?? null,
  )
  const history = useHistory<Placement[]>([])
  const placements = history.value
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null)

  const [activePage, setActivePage] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [exporting, setExporting] = useState(false)
  const [notice, setNotice] = useState('')

  const [dropActive, setDropActive] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordValue, setPasswordValue] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const destroyRef = useRef<(() => Promise<void>) | null>(null)
  const dragSnapshot = useRef<Placement[] | null>(null)
  const pageSizes = useRef(new Map<number, PageSize>())
  const passwordResolver = useRef<((value: string | null) => void) | null>(null)
  const docRef = useRef<PDFDocumentProxy | null>(null)

  docRef.current = doc

  useEffect(() => () => void destroyRef.current?.(), [])

  useEffect(() => {
    onImmersiveChange?.(doc !== null)
  }, [doc, onImmersiveChange])

  useEffect(() => () => onImmersiveChange?.(false), [onImmersiveChange])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 4200)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    const ok = saveSignatures(persistSignatures, signatures)
    if (!ok && persistSignatures) {
      setPersistSignatures(false)
      setNotice('Penyimpanan browser gagal. Gambar tetap tersedia di tab ini.')
    } else if (persistSignatures) {
      setSavedCopyNeedsReview(false)
    }
  }, [signatures, persistSignatures])

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if ((event.key === SIGNATURE_STORAGE_KEY || event.key === null) && event.newValue === null) {
        setPersistSignatures(false)
        setSavedCopyNeedsReview(false)
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const togglePersistence = (enabled: boolean) => {
    if (enabled) {
      if (canPersistSensitiveData()) setPersistSignatures(true)
      return
    }
    if (clearBrowserCopy(SIGNATURE_STORAGE_KEY)) {
      setPersistSignatures(false)
      setSavedCopyNeedsReview(false)
    } else {
      setPersistSignatures(false)
      setSavedCopyNeedsReview(true)
      setNotice('Salinan tersimpan belum bisa dihapus. Coba lagi dari pengaturan browser.')
    }
  }

  const askPassword = useCallback(
    (retry: boolean) =>
      new Promise<string | null>((resolve) => {
        passwordResolver.current = resolve
        setPasswordValue('')
        setPasswordError(retry ? 'Kata sandi salah, coba lagi.' : '')
        setPasswordOpen(true)
      }),
    [],
  )

  const openFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setNotice('Pilih file PDF ya.')
        return
      }
      setLoading(true)
      setNotice('')
      try {
        const { loadPdf } = await import('../../core/pdf')
        const data = new Uint8Array(await file.arrayBuffer())
        const session = await loadPdf(data, askPassword)
        await destroyRef.current?.()
        destroyRef.current = session.destroy
        pageSizes.current.clear()
        setDoc(session.doc)
        setBytes(data)
        setFileName(file.name)
        history.reset([])
        setSelectedPlacementId(null)
        setActivePage(0)
        setZoom(1)
      } catch (error) {
        const message = readError(error)
        if (message) setNotice(message)
      } finally {
        setLoading(false)
      }
    },
    [askPassword, history],
  )

  const requestFile = useCallback(
    (file: File | undefined) => {
      if (!file) return
      if (placements.length > 0) {
        setPendingFile(file)
        return
      }
      void openFile(file)
    },
    [openFile, placements.length],
  )

  const closeFile = useCallback(() => {
    void destroyRef.current?.()
    destroyRef.current = null
    pageSizes.current.clear()
    setDoc(null)
    setBytes(null)
    history.reset([])
    setSelectedPlacementId(null)
    setActivePage(0)
    setZoom(1)
  }, [history])

  const addSignature = useCallback((image: SignatureImage) => {
    const signature: Signature = { id: newId(), ...image }
    setSignatures((prev) => [...prev, signature])
    setSelectedSignatureId(signature.id)
    setNotice('Tanda tangan tersimpan. Tekan “Tempel di halaman” untuk memasangnya.')
  }, [])

  const removeSignature = useCallback(
    (id: string) => {
      setSignatures((prev) => prev.filter((signature) => signature.id !== id))
      history.set((prev) => prev.filter((placement) => placement.signatureId !== id))
      setSelectedSignatureId((current) => (current === id ? null : current))
    },
    [history],
  )

  const pageSize = useCallback(async (pageIndex: number) => {
    const cached = pageSizes.current.get(pageIndex)
    if (cached) return cached
    const activeDoc = docRef.current
    if (!activeDoc) return null
    const page = await activeDoc.getPage(pageIndex + 1)
    const viewport = page.getViewport({ scale: 1 })
    const size = { w: viewport.width, h: viewport.height }
    pageSizes.current.set(pageIndex, size)
    return size
  }, [])

  const placeSignature = useCallback(async () => {
    const signature = signatures.find((item) => item.id === selectedSignatureId)
    const size = await pageSize(activePage)
    if (!signature || !size) return
    const width = 0.26
    const height = (width * size.w) / signature.aspect / size.h
    const placement: Placement = {
      id: newId(),
      signatureId: signature.id,
      pageIndex: activePage,
      rect: { x: 0.62, y: Math.max(0.05, 0.8 - height), w: width, tilt: 0 },
    }
    history.set((prev) => [...prev, placement])
    setSelectedPlacementId(placement.id)
    setNotice(`Ditempel di halaman ${activePage + 1}. Geser untuk mengatur posisi.`)
  }, [activePage, history, pageSize, selectedSignatureId, signatures])

  const changePlacement = useCallback(
    (id: string, rect: SignRect) => {
      history.replace((prev) =>
        prev.map((placement) => (placement.id === id ? { ...placement, rect } : placement)),
      )
    },
    [history],
  )

  const nudge = useCallback(
    async (placement: Placement, dx: number, dy: number) => {
      const signature = signatures.find((item) => item.id === placement.signatureId)
      if (!signature) return
      const size = await pageSize(placement.pageIndex)
      if (!size) return
      const height = (placement.rect.w * size.w) / signature.aspect / size.h
      history.set((prev) =>
        prev.map((item) =>
          item.id === placement.id
            ? {
                ...item,
                rect: {
                  ...item.rect,
                  x: clamp(item.rect.x + dx, 0, Math.max(0, 1 - item.rect.w)),
                  y: clamp(item.rect.y + dy, 0, Math.max(0, 1 - height)),
                },
              }
            : item,
        ),
      )
    },
    [history, pageSize, signatures],
  )

  const deletePlacement = useCallback(
    (id: string) => {
      history.set((prev) => prev.filter((placement) => placement.id !== id))
      setSelectedPlacementId((current) => (current === id ? null : current))
    },
    [history],
  )

  const startDrag = useCallback(() => {
    dragSnapshot.current = placements
  }, [placements])

  const endDrag = useCallback(() => {
    const snapshot = dragSnapshot.current
    dragSnapshot.current = null
    if (snapshot) history.commit(snapshot)
  }, [history])

  const exportPdf = useCallback(async () => {
    if (!bytes || !placements.length) return
    setExporting(true)
    try {
      if (!await confirmSignedPdfChange(bytes)) return
      const { signPdf } = await import('../../core/exportPdf')
      const output = await signPdf(
        bytes,
        placements,
        signatures,
        fileName.replace(/\.pdf$/i, ''),
      )
      const blob = new Blob([new Uint8Array(output)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${fileName.replace(/\.pdf$/i, '')}-ttd.pdf`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 2000)
      trackDownload('tanda-tangan-pdf')
      setNotice('PDF selesai dibuat dan sudah diunduh.')
    } catch {
      setNotice('Gagal membuat PDF. Coba lagi dengan file lain.')
    } finally {
      setExporting(false)
    }
  }, [bytes, fileName, placements, signatures])

  // Pintasan papan ketik untuk penempatan yang sedang dipilih.
  useEffect(() => {
    if (!doc) return
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return

      const mod = event.metaKey || event.ctrlKey
      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) history.redo()
        else history.undo()
        return
      }
      if (event.key === 'Escape') {
        setSelectedPlacementId(null)
        return
      }

      const placement = placements.find((item) => item.id === selectedPlacementId)
      if (!placement) return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deletePlacement(placement.id)
        return
      }

      const steps: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      }
      const step = steps[event.key]
      if (!step) return
      event.preventDefault()
      const amount = event.shiftKey ? 0.01 : 0.0025
      void nudge(placement, step[0] * amount, step[1] * amount)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deletePlacement, doc, history, nudge, placements, selectedPlacementId])

  const submitPassword = () => {
    const resolve = passwordResolver.current
    passwordResolver.current = null
    setPasswordOpen(false)
    resolve?.(passwordValue)
  }

  const cancelPassword = () => {
    const resolve = passwordResolver.current
    passwordResolver.current = null
    setPasswordOpen(false)
    resolve?.(null)
  }

  return (
    <div
      className="min-h-[100dvh]"
      onDragOver={(event) => {
        if (!doc || !event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        setDropActive(true)
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDropActive(false)
      }}
      onDrop={(event) => {
        if (!doc) return
        event.preventDefault()
        setDropActive(false)
        requestFile(event.dataTransfer.files[0])
      }}
    >
      {doc ? (
        <Workspace
          doc={doc}
          fileName={fileName}
          bytes={bytes}
          zoom={zoom}
          activePage={activePage}
          onZoom={(next) => setZoom(Math.max(0.5, Math.min(2.4, Number(next.toFixed(2)))))}
          onBack={closeFile}
          signatures={signatures}
          selectedSignatureId={selectedSignatureId}
          persistSignatures={persistSignatures}
          canPersistSignatures={canPersistSensitiveData()}
          savedCopyNeedsReview={savedCopyNeedsReview}
          onTogglePersist={togglePersistence}
          onSelectSignature={setSelectedSignatureId}
          onAddSignature={addSignature}
          onRemoveSignature={removeSignature}
          placements={placements}
          selectedPlacementId={selectedPlacementId}
          onSelectPlacement={setSelectedPlacementId}
          onChangePlacement={changePlacement}
          onDragStart={startDrag}
          onDragEnd={endDrag}
          onDeletePlacement={deletePlacement}
          onActivePage={setActivePage}
          onPlace={() => void placeSignature()}
          onExport={() => void exportPdf()}
          exporting={exporting}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={history.undo}
          onRedo={history.redo}
        />
      ) : (
        <Landing onFile={requestFile} loading={loading} />
      )}

      {dropActive && (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-ink/30 p-6">
          <div className="rounded-[22px] bg-surface px-6 py-5 text-center shadow-2xl">
            <p className="font-serif text-lg">Lepas untuk membuka PDF baru</p>
            <p className="mt-1 text-xs text-muted">Dokumen yang sedang dikerjakan akan ditutup.</p>
          </div>
        </div>
      )}

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed top-[4.4rem] left-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 animate-fade rounded-2xl bg-ink px-4 py-3 text-center text-[0.82rem] leading-snug text-on-ink shadow-[0_18px_40px_-18px_rgb(0_0_0/0.5)]"
        >
          {notice}
        </div>
      )}

      <ConfirmDialog
        open={pendingFile !== null}
        title="Ganti dokumen?"
        body="Tanda tangan yang sudah ditempel di dokumen ini akan hilang. Tanda tangan tersimpan tidak terpengaruh."
        confirmLabel="Buka dokumen baru"
        onConfirm={() => {
          const file = pendingFile
          setPendingFile(null)
          void openFile(file ?? undefined)
        }}
        onCancel={() => setPendingFile(null)}
      />

      <Modal open={passwordOpen} onClose={cancelPassword} labelledBy="password-title">
        <h2 id="password-title" className="font-serif text-xl tracking-tight">
          PDF terkunci
        </h2>
        <p className="mt-2 text-[0.86rem] leading-relaxed text-muted">
          Masukkan kata sandi dokumen untuk membukanya. Kata sandi tidak disimpan.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submitPassword()
          }}
          className="mt-4"
        >
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Kata sandi</span>
            <input
              type="password"
              value={passwordValue}
              onChange={(event) => setPasswordValue(event.target.value)}
              autoComplete="off"
              className="h-11 w-full rounded-xl bg-sunken px-3 text-sm outline-none ring-1 ring-transparent focus:bg-surface focus:ring-gold/60"
            />
          </label>
          {passwordError && <p className="mt-2 text-xs text-loss">{passwordError}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={cancelPassword} className={cx(btnGhost, 'flex-1 ring-1 ring-line')}>
              Batal
            </button>
            <button type="submit" className={cx(btnPrimary, 'flex-1')}>
              Buka
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
