import { decodePhotoUrl } from './photoInput'

export async function preparePhotoCanvas(url: string, rotation: number, minLongEdge = 0) {
  const image = await decodePhotoUrl(url)

  const longEdge = Math.max(image.naturalWidth, image.naturalHeight)
  const limit = minLongEdge ? 3200 : 4096
  const scale = Math.min(2, limit / longEdge, Math.max(1, minLongEdge / longEdge))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const sideways = rotation % 180 !== 0
  const canvas = document.createElement('canvas')
  canvas.width = sideways ? height : width
  canvas.height = sideways ? width : height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Browser tidak bisa memproses foto ini.')

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(rotation * Math.PI / 180)
  ctx.drawImage(image, -width / 2, -height / 2, width, height)
  ctx.resetTransform()
  return canvas
}
