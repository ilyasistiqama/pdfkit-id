import { describe, expect, it } from 'vitest'
import { dataUrlToBlob } from './download'

const PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

describe('dataUrlToBlob', () => {
  it('menghasilkan PNG utuh dengan tipe yang benar', async () => {
    const blob = dataUrlToBlob(PNG_1X1)
    expect(blob.type).toBe('image/png')
    const bytes = new Uint8Array(await blob.arrayBuffer())
    // tanda tangan berkas PNG
    expect([...bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    expect(bytes.length).toBe(atob(PNG_1X1.split(',')[1]).length)
  })
})
