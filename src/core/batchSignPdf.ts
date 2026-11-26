import { PDFDocument, type PDFPage } from 'pdf-lib'
import { signPdfDocument } from './exportPdf'
import { visibleBox, visualSize } from './geometry'
import { newId } from './id'
import type { Caption, Placement, Signature } from './types'

export const batchPositions = {
  'kiri-bawah': 'Kiri bawah', 'kanan-bawah': 'Kanan bawah', tengah: 'Tengah bawah',
  'kiri-atas': 'Kiri atas', 'kanan-atas': 'Kanan atas',
}

export type BatchPosition = keyof typeof batchPositions
export type BatchTemplate = {
  position: BatchPosition
  pageMode: 'first' | 'last' | 'all'
  width: number
  caption: Caption
  initials: boolean
  initialsPosition: BatchPosition
  initialsWidth: number
}

function placementRect(position: BatchPosition, widthPercent: number, aspect: number, page: PDFPage) {
  const area = visibleBox(page.getCropBox(), page.getMediaBox())
  const { w, h } = visualSize(area.width, area.height, page.getRotation().angle)
  const width = Math.min(widthPercent / 100, (0.83 * h * aspect) / w)
  const height = (width * w) / aspect / h
  const x = position.startsWith('kiri') ? 0.06 : position.startsWith('kanan') ? 0.94 - width : (1 - width) / 2
  return { x, y: position.endsWith('atas') ? 0.07 : 0.9 - height, w: width, tilt: 0 }
}

export async function batchSignPdf(bytes: Uint8Array, title: string, template: BatchTemplate, signature: Signature, initials?: Signature) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })
  const pages = doc.getPages()
  if (!pages.length) throw new Error('PDF tidak berisi halaman.')
  const primaryIndex = template.pageMode === 'last' ? pages.length - 1 : 0
  const placements: Placement[] = []
  const add = (image: Signature, position: BatchPosition, width: number, index: number, page: PDFPage) => {
    placements.push({ id: newId(), signatureId: image.id, pageIndex: index,
      rect: placementRect(position, width, image.aspect, page) })
  }

  pages.forEach((page, index) => {
    if (initials) add(initials, template.initialsPosition, template.initialsWidth, index, page)
    if (template.pageMode === 'all' || index === primaryIndex) add(signature, template.position, template.width, index, page)
  })

  const output = await signPdfDocument(doc, placements, initials ? [signature, initials] : [signature], title)
  return { bytes: output, primaryPage: primaryIndex + 1 }
}
