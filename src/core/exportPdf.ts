import { degrees, PDFDocument, type PDFImage } from 'pdf-lib'
import { rectToPoints, toPageBox, visibleBox, visualSize } from './geometry'
import type { Placement, Signature } from './types'

const PRODUCER = 'Tanda Tangan PDF'

function base64ToBytes(dataUrl: string) {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Tempel semua tanda tangan ke PDF asli. PDF tidak diubah selain menambah
 * gambar, jadi teks, tautan, dan formulir tetap utuh.
 */
export async function signPdf(
  bytes: Uint8Array,
  placements: Placement[],
  signatures: Signature[],
  title?: string,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })
  const pages = doc.getPages()
  const images = new Map<string, PDFImage>()
  const byId = new Map(signatures.map((signature) => [signature.id, signature]))

  for (const placement of placements) {
    const signature = byId.get(placement.signatureId)
    const page = pages[placement.pageIndex]
    if (!signature || !page) continue

    let image = images.get(signature.id)
    if (!image) {
      image = await doc.embedPng(base64ToBytes(signature.dataUrl))
      images.set(signature.id, image)
    }

    const rotation = page.getRotation().angle
    const area = visibleBox(page.getCropBox(), page.getMediaBox())
    const { w, h } = visualSize(area.width, area.height, rotation)
    const box = toPageBox(
      rotation,
      area.width,
      area.height,
      rectToPoints(placement.rect, signature.aspect, w, h),
      placement.rect.tilt,
    )

    page.drawImage(image, {
      x: area.x + box.x,
      y: area.y + box.y,
      width: box.width,
      height: box.height,
      rotate: degrees(box.rotate),
    })
  }

  if (title) doc.setTitle(title)
  doc.setProducer(PRODUCER)
  doc.setCreator(PRODUCER)
  doc.setModificationDate(new Date())

  return doc.save()
}
