import { useEffect, useState } from 'react'
import { Status } from './ToolUi'

type PdfSource = File | Uint8Array
type Source = PdfSource | PdfSource[]
const checks = new WeakMap<PdfSource, Promise<boolean>>()
const warning = 'Tanda tangan digital terdeteksi. Mengedit atau mengekspor ulang PDF dapat membatalkannya pada salinan hasil. Simpan PDF asli.'

function check(source: PdfSource) {
  const cached = checks.get(source)
  if (cached) return cached
  const result = import('../../core/pdfSignatures')
    .then(async ({ hasDigitalSignature }) => hasDigitalSignature(
      source instanceof Uint8Array ? source : new Uint8Array(await source.arrayBuffer()),
    ))
    .catch(() => false)
  checks.set(source, result)
  return result
}

async function containsSignedPdf(source: Source, signal?: AbortSignal) {
  for (const file of Array.isArray(source) ? source : [source]) {
    if (signal?.aborted) return false
    if (await check(file)) return !signal?.aborted
  }
  return false
}

export async function confirmSignedPdfChange(source: Source, signal?: AbortSignal) {
  const detected = await containsSignedPdf(source, signal)
  return !signal?.aborted && (!detected || window.confirm(`${warning}\n\nLanjutkan dengan salinan?`))
}

export function SignedPdfNotice({ source }: { source: Source | null }) {
  const [detected, setDetected] = useState<typeof source>(null)

  useEffect(() => {
    if (!source) return
    const job = new AbortController()
    void containsSignedPdf(source, job.signal).then((found) => {
      if (found && !job.signal.aborted) setDetected(source)
    })
    return () => job.abort()
  }, [source])

  return source && detected === source ? (
    <Status tone="info">{warning}</Status>
  ) : null
}
