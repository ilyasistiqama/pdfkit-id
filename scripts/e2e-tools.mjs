#!/usr/bin/env node
/**
 * Uji cepat tiap alat PDF di headless Chrome: unggah berkas, jalankan, lalu
 * pastikan berkas hasil benar-benar terunduh dan valid.
 *
 *   npm run build && node scripts/e2e-tools.mjs
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PDFDocument, PDFName, PDFString, StandardFonts, degrees, rgb } = require('pdf-lib')

const PORT = Number(process.env.E2E_PORT ?? 4174)
const CDP_PORT = Number(process.env.E2E_CDP_PORT ?? 9334)
const BASE_URL = process.env.APP ?? `http://localhost:${PORT}/`
const CHROME = process.env.CHROME ?? 'google-chrome'
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'ttd-tools-'))
const DOWNLOADS = path.join(WORK, 'downloads')
const PDF_A = path.join(WORK, 'satu.pdf')
const PDF_B = path.join(WORK, 'dua.pdf')
const FORM = path.join(WORK, 'form.pdf')
const IMG = path.join(WORK, 'tanda.png')
const PHOTO = path.join(WORK, 'surat.png')
const PHOTO_TWO = path.join(WORK, 'lampiran.webp')
const SCAN = path.join(WORK, 'scan.pdf')
const PRIVATE_PDF = path.join(WORK, 'pribadi.pdf')
const CAMERA_JPEG = path.join(WORK, 'kamera.jpg')

const failures = []
let checks = 0
const check = (ok, label, detail = '') => {
  checks++
  console.log(ok ? `  ok   ${label}` : `  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(label)
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function characterAccuracy(expected, actual) {
  const normalize = (text) => Array.from(text.normalize('NFC').replace(/\s+/g, ' ').trim())
  const target = normalize(expected)
  const output = normalize(actual)
  let previous = Array.from({ length: output.length + 1 }, (_, index) => index)
  for (const [index, letter] of target.entries()) {
    const current = [index + 1]
    for (const [column, candidate] of output.entries()) {
      current.push(Math.min(current[column] + 1, previous[column + 1] + 1, previous[column] + Number(letter !== candidate)))
    }
    previous = current
  }
  return Math.max(0, 1 - previous[output.length] / target.length)
}

async function makeFixtures() {
  const a = await PDFDocument.create()
  const font = await a.embedFont(StandardFonts.Helvetica)
  for (let i = 0; i < 2; i++) {
    const page = a.addPage([595, 842])
    page.drawText(`DOKUMEN SATU halaman ${i + 1}`, { x: 40, y: 780, size: 18, font })
  }
  fs.writeFileSync(PDF_A, await a.save())

  const b = await PDFDocument.create()
  const page = b.addPage([600, 800])
  page.setRotation(degrees(90))
  page.drawText('DOKUMEN DUA', { x: 40, y: 700, size: 18, font: await b.embedFont(StandardFonts.Helvetica) })
  fs.writeFileSync(PDF_B, await b.save())

  const form = await PDFDocument.create()
  const formPage = form.addPage([595, 842])
  formPage.drawText('FORMULIR', { x: 40, y: 790, size: 18, font: await form.embedFont(StandardFonts.Helvetica) })
  const formFields = form.getForm()
  const name = formFields.createTextField('nama_lengkap')
  name.addToPage(formPage, { x: 40, y: 700, width: 300, height: 24 })
  const agree = formFields.createCheckBox('setuju')
  agree.addToPage(formPage, { x: 40, y: 650, width: 18, height: 18 })
  fs.writeFileSync(FORM, await form.save())

  const privateDoc = await PDFDocument.create()
  const privatePage = privateDoc.addPage([595, 842])
  privatePage.drawText('PRIVATE SECRET 13245', { x: 45, y: 765, size: 23 })
  privatePage.drawText('KEEP VISIBLE', { x: 45, y: 675, size: 23 })
  privateDoc.setTitle('PRIVATE METADATA')
  await privateDoc.attach(new Uint8Array([1, 2, 3]), 'secret.txt')
  fs.writeFileSync(PRIVATE_PDF, await privateDoc.save())

  // PNG tanda tangan sederhana
  fs.writeFileSync(
    IMG,
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAGQAAAAyCAYAAACqNX6+AAAAJUlEQVR4nO3BMQEAAADCoPVPbQ0P' +
        'oAAAAAAAAAAAAAAAAAAAvg0vAAGXHZGXAAAAAElFTkSuQmCC',
      'base64',
    ),
  )
}

function connect(url) {
  const state = { page: '' }
  const ws = new WebSocket(url)
  const pending = new Map()
  const waiters = []
  const errors = []
  let seq = 0

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data)
    if (message.id) {
      const handler = pending.get(message.id)
      if (!handler) return
      pending.delete(message.id)
      message.error ? handler.reject(new Error(message.error.message)) : handler.resolve(message.result)
      return
    }
    if (message.method === 'Runtime.exceptionThrown') {
      const desc = message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text
      errors.push({ page: state.page, desc: String(desc).split('\n')[0] })
    }
    for (let i = waiters.length - 1; i >= 0; i--) {
      if (waiters[i].method === message.method) {
        waiters[i].resolve(message.params)
        waiters.splice(i, 1)
      }
    }
  }

  const ready = new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })

  const waitEvent = (method) => new Promise((resolve) => waiters.push({ method, resolve }))

  return { ws, ready, send, waitEvent, errors, state }
}

let server = null
let chrome = null
const result = { exitCode: 0 }

try {
  fs.mkdirSync(DOWNLOADS, { recursive: true })
  await makeFixtures()

  if (!process.env.APP) {
    if (!fs.existsSync('dist/index.html')) throw new Error('Folder dist belum ada. Jalankan npm run build.')
    server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  }
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(BASE_URL)).ok) break
    } catch {}
    await sleep(250)
  }

  chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--hide-scrollbars',
      '--window-size=1280,1000',
      `--user-data-dir=${path.join(WORK, 'chrome')}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  let target
  for (let i = 0; i < 80; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
      target = targets.find((item) => item.type === 'page')
      if (target) break
    } catch {}
    await sleep(250)
  }

  const { ready, send, waitEvent, errors, ws, state } = connect(target.webSocketDebuggerUrl)
  await ready

  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text)
    return response.result.value
  }

  const go = async (route) => {
    state.page = route
    const loaded = waitEvent('Page.loadEventFired')
    await send('Page.navigate', { url: `${BASE_URL.replace(/\/$/, '')}${route}` })
    await loaded
    await sleep(900)
  }

  const upload = async (files) => {
    let objectId
    for (let attempt = 0; attempt < 24 && !objectId; attempt++) {
      const { result } = await send('Runtime.evaluate', { expression: `document.querySelector('input[type=file]')` })
      objectId = result.objectId
      if (!objectId) await sleep(250)
    }
    if (!objectId) throw new Error(`Input berkas belum tersedia di ${state.page}`)
    await send('DOM.setFileInputFiles', { files, objectId })
    await sleep(900)
  }

  const clickText = (text) =>
    evaluate(`(() => {
      const el = [...document.querySelectorAll('button')].find((b) => b.textContent.trim().startsWith(${JSON.stringify(text)}))
      if (!el) return false
      el.click()
      return true
    })()`)

  const waitDownload = async (ext, timeout = 20000) => {
    const end = Date.now() + timeout
    while (Date.now() < end) {
      const files = fs.readdirSync(DOWNLOADS).filter((name) => name.endsWith(ext))
      if (files.length) return files.map((name) => path.join(DOWNLOADS, name))
      await sleep(250)
    }
    return []
  }

  const cleanDownloads = () => {
    for (const name of fs.readdirSync(DOWNLOADS)) fs.rmSync(path.join(DOWNLOADS, name), { force: true })
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS })

  const isValidZip = (file) => {
    const listing = spawnSync('unzip', ['-t', file], { encoding: 'utf8' })
    return listing.status === 0 && /No errors detected/.test(listing.stdout)
  }

  const pageCount = (file) => {
    const info = spawnSync('pdfinfo', [file], { encoding: 'utf8' })
    return info.status === 0 ? Number(/Pages:\s+(\d+)/.exec(info.stdout)?.[1]) : null
  }
  const textIn = (file, page) => spawnSync('pdftotext', [...(page ? ['-f', String(page), '-l', String(page)] : []), file, '-'], { encoding: 'utf8' }).stdout ?? ''

  console.log('\nGabung PDF')
  await go('/alat/gabung-pdf/')
  await upload([PDF_A, PDF_B])
  check(await evaluate(`[...document.querySelectorAll('button')].some(b => !b.disabled && b.textContent.trim() === 'Gabung 2 PDF')`), 'dua berkas terdaftar')
  await clickText('Gabung')
  let files = await waitDownload('.pdf')
  check(files.length === 1, 'hasil gabung terunduh')
  if (files[0]) {
    check(pageCount(files[0]) === 3, 'gabungan berisi 3 halaman', String(pageCount(files[0])))
    check(['DOKUMEN SATU halaman 1', 'DOKUMEN SATU halaman 2', 'DOKUMEN DUA'].every((expected, index) => textIn(files[0], index + 1).includes(expected)), 'urutan isi gabungan tepat')
  }
  cleanDownloads()

  console.log('\nPisah PDF')
  await go('/alat/pisah-pdf/')
  await upload([PDF_A])
  await evaluate(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Tiap halaman').click()`)
  await sleep(200)
  await clickText('Pecah')
  await sleep(1500)
  await evaluate(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Unduh semua')).click()`)
  files = await waitDownload('.zip')
  check(files.length === 1, 'hasil pisah terunduh sebagai ZIP')
  if (files[0]) {
    for (const [index, expected] of ['DOKUMEN SATU halaman 1', 'DOKUMEN SATU halaman 2'].entries()) {
      const pageFile = path.join(WORK, `pisah-${index + 1}.pdf`)
      const entry = spawnSync('unzip', ['-p', files[0], `satu-hal-${index + 1}.pdf`])
      if (entry.status === 0) fs.writeFileSync(pageFile, entry.stdout)
      check(entry.status === 0 && pageCount(pageFile) === 1 && textIn(pageFile).includes(expected), `hasil pisah berisi halaman ${index + 1} yang tepat`)
    }
  }
  cleanDownloads()

  console.log('\nPutar PDF')
  await go('/alat/putar-pdf/')
  await upload([PDF_B])
  check((await evaluate('document.body.innerText')).includes('1 halaman'), 'jumlah halaman terbaca')
  await clickText('Putar dan unduh')
  files = await waitDownload('.pdf')
  check(files.length === 1, 'PDF hasil putar terunduh')
  if (files[0]) check((await PDFDocument.load(fs.readFileSync(files[0]))).getPage(0).getRotation().angle === 180, 'rotasi 90° ditambahkan ke rotasi awal 90°')
  cleanDownloads()

  console.log('\nWatermark PDF')
  await go('/alat/watermark-pdf/')
  await upload([PDF_A])
  await clickText('Miring')
  await clickText('Tambah watermark')
  files = await waitDownload('.pdf')
  check(files.length === 1, 'PDF berwatermark terunduh')
  if (files[0]) check(pageCount(files[0]) === 2 && [1, 2].every((page) => textIn(files[0], page).includes('RAHASIA')), 'watermark ada di kedua halaman tanpa mengubah jumlahnya')
  cleanDownloads()

  console.log('\nFoto ke PDF')
  await go('/alat/foto-ke-pdf/')
  await upload([IMG])
  await clickText('Buat PDF')
  files = await waitDownload('.pdf')
  check(files.length === 1, 'PDF dari gambar terunduh')
  if (files[0]) check(pageCount(files[0]) === 1, 'satu halaman')
  cleanDownloads()

  const cameraImages = await evaluate(`(() => {
    const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 80;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 120, 80);
    ctx.fillStyle = '#fa0808'; ctx.fillRect(0, 0, 65, 38);
    return { jpeg: canvas.toDataURL('image/jpeg', 0.98).split(',')[1], webp: canvas.toDataURL('image/webp', 0.95).split(',')[1] };
  })()`)
  const jpegBytes = Buffer.from(cameraImages.jpeg, 'base64')
  const exifOrientation6 = Buffer.from('ffe1002245786966000049492a0008000000010012010300010000000600000000000000', 'hex')
  fs.writeFileSync(CAMERA_JPEG, Buffer.concat([jpegBytes.subarray(0, 2), exifOrientation6, jpegBytes.subarray(2)]))
  await go('/alat/foto-ke-pdf/')
  await upload([CAMERA_JPEG])
  await clickText('Ikut gambar')
  await clickText('Buat PDF')
  files = await waitDownload('.pdf')
  if (files[0]) {
    const page = (await PDFDocument.load(fs.readFileSync(files[0]))).getPage(0)
    const ppm = spawnSync('pdftoppm', ['-r', '72', '-singlefile', files[0]]).stdout
    const header = /^P6\s+80\s+120\s+255\n/.exec(ppm.toString('latin1', 0, 80))
    const pixel = header ? header[0].length + 3 * (20 * 80 + 60) : 0
    check(page.getWidth() === 80 && page.getHeight() === 120 && header && ppm[pixel] > 200 && ppm[pixel + 1] < 40,
      'foto JPEG EXIF berotasi ke orientasi visual yang benar')
  } else check(false, 'foto JPEG dengan EXIF terunduh')
  cleanDownloads()

  const webpDisguised = path.join(WORK, 'foto-webp-salah-ekstensi.png')
  const avif = path.join(WORK, 'foto.avif')
  const gif = path.join(WORK, 'foto.gif')
  const bmp = path.join(WORK, 'foto.bmp')
  fs.writeFileSync(webpDisguised, Buffer.from(cameraImages.webp, 'base64'))
  fs.writeFileSync(avif, Buffer.from('AAAAHGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZgAAAOptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAImlsb2MAAAAAREAAAQABAAAAAAEOAAEAAAAAAAAAIAAAACNpaW5mAAAAAAABAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAamlwcnAAAABLaXBjbwAAABNjb2xybmNseAABAA0ABoAAAAAMYXYxQ4FAbAAAAAAUaXNwZQAAAAAAAAAMAAAACAAAABBwaXhpAAAAAAMMDAwAAAAXaXBtYQAAAAAAAAABAAEEAYIDBAAAAChtZGF0EgAKCVgMr7GgIaDcIDIRGAAOOOOEAADDXtKTyOyfvoE=', 'base64'))
  fs.writeFileSync(gif, Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAEALAAAAAABAAEAAAIBRAA7', 'base64'))
  const bmpBytes = Buffer.alloc(78)
  bmpBytes.write('BM')
  bmpBytes.writeUInt32LE(bmpBytes.length, 2)
  bmpBytes.writeUInt32LE(54, 10)
  bmpBytes.writeUInt32LE(40, 14)
  bmpBytes.writeInt32LE(2, 18)
  bmpBytes.writeInt32LE(3, 22)
  bmpBytes.writeUInt16LE(1, 26)
  bmpBytes.writeUInt16LE(24, 28)
  bmpBytes.writeUInt32LE(24, 34)
  fs.writeFileSync(bmp, bmpBytes)
  await go('/alat/foto-ke-pdf/')
  await upload([webpDisguised, avif, gif, bmp])
  await clickText('Ikut gambar')
  await clickText('Buat PDF')
  files = await waitDownload('.pdf')
  if (files[0]) {
    const sizes = (await PDFDocument.load(fs.readFileSync(files[0]))).getPages().map((page) => `${page.getWidth()}x${page.getHeight()}`)
    check(sizes.join(',') === '120x80,12x8,1x1,2x3', 'WebP salah ekstensi, AVIF, GIF, dan BMP menjadi PDF dalam urutan dan ukuran yang benar')
  } else check(false, 'PDF dari input berbagai format terunduh')
  cleanDownloads()

  console.log('\nFoto ke Word')
  await go('/alat/foto-ke-word/')
  const photoData = await evaluate(`(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1400
    canvas.height = 990
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.translate(0, canvas.height)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = '#111'
    ctx.font = 'bold 44px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('SURAT KETERANGAN', 495, 135)
    ctx.fillRect(100, 170, 785, 3)
    ctx.fillStyle = '#a13548'
    ctx.beginPath()
    ctx.ellipse(145, 118, 30, 31, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#111'
    ctx.font = '30px Arial'
    ctx.textAlign = 'left'
    ctx.fillText('Dokumen ini menerangkan bahwa', 100, 250)
    ctx.fillText('Budi Santoso hadir pada hari Senin.', 100, 295)
    ctx.fillText('Yang bertanda tangan di bawah ini :', 100, 341)
    ctx.fillText('Nama', 130, 385)
    ctx.fillText(': Budi Santoso', 435, 385)
    ctx.strokeStyle = '#234ba0'
    ctx.lineWidth = 12
    ctx.beginPath()
    ctx.ellipse(635, 955, 45, 47, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = '#222'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(616, 959)
    ctx.bezierCurveTo(664, 916, 639, 984, 745, 955)
    ctx.stroke()
    ctx.fillStyle = '#222'
    ctx.font = '22px Arial'
    ctx.fillText('PENANGGUNG JAWAB', 590, 925)
    ctx.fillText('MIRA PRATAMA', 580, 1005)
    return canvas.toDataURL('image/png').split(',')[1]
  })()`)
  fs.writeFileSync(PHOTO, Buffer.from(photoData, 'base64'))
  await upload([PHOTO])
  await evaluate(`document.querySelector('[aria-label="Putar foto 90 derajat"]').click()`)
  await clickText('Baca teks dari foto')
  await sleep(100)
  await clickText('Batalkan pembacaan')
  await sleep(200)
  check(await evaluate(`[...document.querySelectorAll('button')].some((b) => !b.disabled && b.textContent.includes('Baca teks dari foto'))`),
    'pembacaan foto bisa dibatalkan dan diulang')
  await clickText('Baca teks dari foto')
  let photoText = ''
  for (let i = 0; i < 80; i++) {
    photoText = await evaluate(`document.querySelector('#photo-word-text')?.value ?? ''`)
    if (photoText || await evaluate(`document.querySelector('[role="status"].text-loss') !== null`)) break
    await sleep(250)
  }
  check(photoText.includes('SURAT KETERANGAN') && photoText.includes('Budi Santoso'),
    'OCR membaca isi foto setelah diputar', photoText || await evaluate('document.body.innerText'))
  if (photoText) {
    await evaluate(`(() => {
      const editor = document.querySelector('#photo-word-text')
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
      setter.call(editor, editor.value.replace('Budi Santoso', 'Dewi Sari & Rekan'))
      editor.dispatchEvent(new Event('input', { bubbles: true }))
    })()`)
    await clickText('Unduh Word')
    files = await waitDownload('.docx')
    check(files.length === 1 && path.basename(files[0]) === 'surat.docx', 'hasil terunduh dengan nama surat.docx')
    if (files[0]) {
      const { stdout: xml } = spawnSync('unzip', ['-p', files[0], 'word/document.xml'], { encoding: 'utf8' })
      check(isValidZip(files[0]), 'paket DOCX bisa dibaca')
      check(xml.includes('<w:t xml:space="preserve">Dewi Sari &amp; Rekan hadir'), 'koreksi tersimpan sebagai teks Word')
      check(xml.includes('<w:jc w:val="center"') && xml.includes('<w:ind w:left='), 'rata tengah dan inden tersimpan')
      check(xml.includes('<w:pBdr>') && xml.includes('<w:tabs>'), 'garis kop dan tab formulir tersimpan')
      check(['Logo kop surat', 'Stempel', 'Tanda tangan'].every((label) => xml.includes(`name="${label}"`)) &&
        (xml.match(/<wp:anchor\b/g) ?? []).length === 3,
        'logo, tanda tangan, dan stempel masing-masing tersimpan sebagai gambar Word')
      check(xml.includes('>PENANGGUNG JAWAB</w:t>') && xml.includes('>MIRA PRATAMA</w:t>'),
        'jabatan dan nama di area stempel tetap menjadi teks Word')
      check((xml.match(/<w:r>.*?<\/w:r>/g) ?? []).some((run) =>
        run.includes('Yang bertanda tangan di bawah ini') && run.includes('<w:b/>')),
      'baris pengantar tanda tangan tersimpan dalam huruf tebal')
    }
    cleanDownloads()
    await clickText('Pilih area gambar')
    await sleep(400)
    const area = await evaluate(`(() => {
      const canvas = document.querySelector('[role="dialog"] canvas')
      const { x, y, width, height } = canvas.getBoundingClientRect()
      return { x, y, width, height }
    })()`)
    const start = { x: area.x + area.width * 0.42, y: area.y + area.height * 0.59 }
    const end = { x: area.x + area.width * 0.51, y: area.y + area.height * 0.64 }
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...start, button: 'left', buttons: 1, clickCount: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...end, button: 'left', buttons: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...end, button: 'left', clickCount: 1 })
    await clickText('Pertahankan area ini')
    await clickText('Unduh Word')
    files = await waitDownload('.docx')
    if (files[0]) {
      const { stdout: xml } = spawnSync('unzip', ['-p', files[0], 'word/document.xml'], { encoding: 'utf8' })
      check(xml.includes('Bagian grafis dokumen') && xml.includes('Dewi Sari &amp; Rekan'),
        'area pilihan manual dan koreksi teks ikut tersimpan')
    } else check(false, 'DOCX dengan area pilihan manual terunduh')
  }
  cleanDownloads()
  await evaluate(`(() => {
    const mode = [...document.querySelectorAll('select')].find((select) => select.options[1]?.value === 'photo')
    mode.value = 'photo'
    mode.dispatchEvent(new Event('change', { bubbles: true }))
  })()`)
  await clickText('Unduh salinan foto')
  files = await waitDownload('.docx')
  check(files.length === 1 && path.basename(files[0]) === 'surat-salinan-foto.docx', 'salinan foto terunduh')
  if (files[0]) {
    const { stdout: xml } = spawnSync('unzip', ['-p', files[0], 'word/document.xml'], { encoding: 'utf8' })
    check(isValidZip(files[0]) && xml.includes('<w:drawing>'), 'salinan DOCX menyimpan foto sebagai gambar')
  }
  cleanDownloads()

  console.log('\nBanyak Foto ke Word')
  const photoTwo = await evaluate(`(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 850
    canvas.height = 1150
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#111'
    ctx.font = '36px Arial'
    ctx.fillText('LAMPIRAN DIGITAL', 105, 145)
    ctx.font = '26px Arial'
    ctx.fillText('Kode lampiran 34825.', 105, 225)
    return canvas.toDataURL('image/webp', 0.95).split(',')[1]
  })()`)
  fs.writeFileSync(PHOTO_TWO, Buffer.from(photoTwo, 'base64'))
  await go('/alat/foto-ke-word/')
  await upload([PHOTO, PHOTO_TWO])
  await evaluate(`document.querySelector('[aria-label="Putar foto 90 derajat"]').click()`)
  await evaluate(`document.querySelector('[aria-label="Naikkan lampiran.webp"]').click()`)
  await clickText('Baca semua foto yang tersisa')
  let bothReady = false
  for (let i = 0; i < 120 && !bothReady; i++) {
    bothReady = await evaluate(`[...document.querySelectorAll('button')].some(b => !b.disabled && b.textContent.includes('Unduh Word (.docx)'))`)
    if (!bothReady) await sleep(250)
  }
  check(bothReady, 'PNG dan WebP selesai dibaca dalam satu pekerjaan')
  if (bothReady) {
    await clickText('Unduh Word')
    files = await waitDownload('.docx')
    check(files.length === 1 && path.basename(files[0]) === 'lampiran.docx', 'satu DOCX terunduh mengikuti pilihan urutan')
    if (files[0]) {
      const { stdout: xml } = spawnSync('unzip', ['-p', files[0], 'word/document.xml'], { encoding: 'utf8' })
      check((xml.match(/<w:sectPr>/g) ?? []).length === 2 && xml.includes('LAMPIRAN DIGITAL') &&
        xml.includes('SURAT KETERANGAN') && xml.indexOf('LAMPIRAN DIGITAL') < xml.indexOf('SURAT KETERANGAN'),
      'Word memuat dua bagian editable dalam urutan baru')
      if (process.env.E2E_KEEP) fs.copyFileSync(files[0], path.join(WORK, 'hasil-multifoto.docx'))
    }
  }
  cleanDownloads()

  console.log('\nPDF Scan Bisa Dicari')
  const scan = await PDFDocument.create()
  const scanImage = await scan.embedPng(fs.readFileSync(PHOTO))
  const scanPage = scan.addPage([700, 495])
  scanPage.drawImage(scanImage, { width: 700, height: 495 })
  scanPage.setRotation(degrees(90))
  scan.addPage().drawText('NATIVE TEXT PRESENT')
  const reference = [
    'BERITA ACARA PENYERAHAN',
    'Pada Senin, 23 November 2026, dokumen ini diterima.',
    'Nomor dokumen: 017/ADM/2026.',
    'Jumlah lampiran 12 berkas dan 4 lembar persetujuan.',
    'Penanggung jawab: Rina Setiawan.',
  ]
  const referencePng = await evaluate(`(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 660;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#f0f0eb'; ctx.fillRect(0, 0, 1200, 660);
    ctx.fillStyle = '#53534b'; ctx.font = '36px serif';
    ${JSON.stringify(reference)}.forEach((line, index) => ctx.fillText(line, 100, 125 + 95 * index));
    return canvas.toDataURL('image/png').split(',')[1];
  })()`)
  const mixedPage = scan.addPage([600, 400])
  mixedPage.drawImage(await scan.embedPng(Buffer.from(referencePng, 'base64')), { x: 0, y: 55, width: 600, height: 330 })
  mixedPage.drawText('HALAMAN 03', { x: 44, y: 23, size: 14 })
  fs.writeFileSync(SCAN, await scan.save())
  await go('/alat/pdf-bisa-dicari/')
  await upload([SCAN])
  await clickText('Buat PDF yang bisa dicari')
  files = await waitDownload('.pdf', 40000)
  check(files.length === 1, 'PDF scan OCR terunduh')
  if (files[0]) {
    const extracted = textIn(files[0])
    check(extracted.includes('SURAT KETERANGAN') && extracted.includes('NATIVE TEXT PRESENT'),
      'teks halaman scan yang diputar dan halaman teks asli dapat diekstrak')
    const doc = await PDFDocument.load(fs.readFileSync(files[0]))
    check(doc.getPageCount() === 3 && doc.getPage(0).getRotation().angle === 90, 'jumlah dan orientasi halaman scan tetap')
    const mixedText = textIn(files[0], 3)
    check((mixedText.match(/HALAMAN 03/g) ?? []).length === 1, 'nomor halaman asli tidak diduplikasi oleh OCR')
    const accuracy = characterAccuracy(reference.join(' '), mixedText.replace('HALAMAN 03', ''))
    check(accuracy >= 0.99, 'OCR sampel scan campuran memenuhi target akurasi karakter', `${(accuracy * 100).toFixed(2)}%`)
    console.log(`  OCR sampel Indonesia campuran: ${(accuracy * 100).toFixed(2)}% akurasi karakter setelah normalisasi spasi`)
    if (process.env.E2E_KEEP) fs.copyFileSync(files[0], path.join(WORK, 'hasil-searchable.pdf'))
  }
  cleanDownloads()

  console.log('\nSusun Halaman PDF')
  await go('/alat/susun-pdf/')
  await upload([PDF_A])
  await evaluate(`(() => {
    window.testDrag = new DataTransfer()
    document.querySelector('[data-page="1"]').dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: window.testDrag }))
  })()`)
  await evaluate(`document.querySelector('[data-page="2"]').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: window.testDrag }))`)
  check(await evaluate(`document.querySelector('[data-page]')?.dataset.page === '2'`), 'kartu halaman bisa diseret untuk menyusun urutan')
  await clickText('Atur ulang')
  await evaluate(`document.querySelector('[aria-label="Majukan halaman 2"]').click()`)
  await evaluate(`document.querySelector('[aria-label="Putar halaman 2"]').click()`)
  await clickText('Unduh PDF tersusun')
  files = await waitDownload('.pdf')
  check(files.length === 1, 'susunan halaman PDF terunduh')
  if (files[0]) {
    const arranged = await PDFDocument.load(fs.readFileSync(files[0]))
    const extracted = textIn(files[0])
    check(arranged.getPage(0).getRotation().angle === 90 && extracted.includes('halaman 2') &&
      extracted.indexOf('halaman 2') < extracted.indexOf('halaman 1'), 'urutan dan rotasi diterapkan')
  }
  cleanDownloads()
  await evaluate(`document.querySelector('[aria-label="Hapus halaman 1"]').click()`)
  await clickText('Unduh PDF tersusun')
  files = await waitDownload('.pdf')
  check(files.length === 1 && pageCount(files[0]) === 1 && !textIn(files[0]).includes('halaman 1'), 'halaman yang dihapus tidak ikut diekspor')
  cleanDownloads()

  console.log('\nSensor PDF')
  await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 820, deviceScaleFactor: 1, mobile: true })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true })
  await go('/alat/sensor-pdf/')
  await upload([PRIVATE_PDF])
  const redactArea = await evaluate(`(() => {
    const canvas = document.querySelector('canvas[data-ready=true]')
    if (!canvas) return null
    canvas.scrollIntoView({ block: 'center', behavior: 'instant' })
    const { x, y, width, height } = canvas.getBoundingClientRect()
    return { x, y, width, height }
  })()`)
  check(!!redactArea, 'pratinjau PDF untuk sensor tampil')
  if (redactArea) {
    const start = { x: redactArea.x + redactArea.width * 0.06, y: redactArea.y + redactArea.height * 0.06 }
    const end = { x: redactArea.x + redactArea.width * 0.67, y: redactArea.y + redactArea.height * 0.105 }
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] })
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await clickText('Unduh PDF disensor')
    files = await waitDownload('.pdf')
    check(files.length === 1 && pageCount(files[0]) === 1, 'PDF disensor terunduh')
    if (files[0]) {
      const redacted = await PDFDocument.load(fs.readFileSync(files[0]))
      check(!textIn(files[0]).trim() && !redacted.getTitle() && !redacted.catalog.get(require('pdf-lib').PDFName.of('Names')),
        'teks, judul internal, dan lampiran dari PDF sumber tidak ikut')
      const raster = spawnSync('pdftoppm', ['-singlefile', '-scale-to', '400', files[0]], { maxBuffer: 2_000_000 }).stdout
      const header = /^P6\s+(\d+)\s+(\d+)\s+255\n/.exec(raster.toString('latin1', 0, 80))
      if (header) {
        const [width, height] = header.slice(1).map(Number)
        const pixel = (x, y) => raster[header[0].length + 3 * (Math.round(y * height) * width + Math.round(x * width))]
        check(pixel(0.25, 0.085) === 0 && pixel(0.7, 0.085) > 240 && pixel(0.25, 0.125) > 240,
          'kotak sensor menjadi piksel hitam dan area sekitar tetap terlihat')
      } else check(false, 'hasil sensor bisa dirender')
      if (process.env.E2E_KEEP) fs.copyFileSync(files[0], path.join(WORK, 'hasil-sensor.pdf'))
    }
  }
  await send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await send('Emulation.clearDeviceMetricsOverride')
  cleanDownloads()

  console.log('\nPDF ke JPG')
  await go('/alat/pdf-ke-jpg/')
  await upload([PDF_A])
  await clickText('Ubah ke gambar')
  await sleep(3500)
  const imageCount = await evaluate(`(document.body.innerText.match(/\\d+ gambar siap/) || [''])[0]`)
  check(imageCount.startsWith('2'), 'dua gambar dihasilkan', imageCount)
  await evaluate(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Unduh semua')).click()`)
  files = await waitDownload('.zip')
  check(files.length === 1, 'gambar diunduh sebagai ZIP')
  if (files[0]) check(isValidZip(files[0]), 'ZIP bisa dibaca')
  cleanDownloads()

  console.log('\nKompres PDF')
  await go('/alat/kompres-pdf/')
  await upload([PDF_A])
  await clickText('Kompres PDF')
  let done = false
  for (let i = 0; i < 60; i++) {
    if ((await evaluate('document.body.innerText')).includes('Unduh hasil')) {
      done = true
      break
    }
    await sleep(300)
  }
  check(done, 'hasil kompres siap')
  await clickText('Unduh hasil')
  files = await waitDownload('.pdf')
  check(files.length === 1, 'PDF terkompres terunduh')
  cleanDownloads()

  const compressionInput = await PDFDocument.load(fs.readFileSync(PDF_A), { updateMetadata: false })
  const uncompressed = await compressionInput.save({ useObjectStreams: false })
  const compressionFile = path.join(WORK, 'target-ukuran.pdf')
  fs.writeFileSync(compressionFile, uncompressed)
  const limit = Math.floor((uncompressed.length + (await compressionInput.save()).length) / 2)
  await go('/alat/kompres-pdf/')
  await upload([compressionFile])
  await evaluate(`(() => {
    const field = document.querySelector('select'); field.value = 'retain';
    field.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('input[type=checkbox]').click();
  })()`)
  await evaluate(`(() => {
    const unit = [...document.querySelectorAll('select')].find(el => [...el.options].some(o => o.value === 'KB'));
    unit.value = 'KB'; unit.dispatchEvent(new Event('change', { bubbles: true }));
    const input = document.querySelector('input[type=number]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(String(limit / 1000))});
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`)
  await clickText('Kompres PDF')
  for (let i = 0; i < 30 && !(await evaluate('document.body.innerText')).includes('Unduh hasil'); i++) await sleep(200)
  await clickText('Unduh hasil')
  files = await waitDownload('.pdf')
  check(files.length === 1 && fs.statSync(files[0]).size <= limit && pageCount(files[0]) === 2 &&
    textIn(files[0]).includes('DOKUMEN SATU halaman 2'), 'batas ukuran dalam byte tercapai tanpa kehilangan halaman atau teks')
  cleanDownloads()

  console.log('\nIsi Formulir PDF')
  await go('/alat/isi-formulir-pdf/')
  await upload([FORM])
  await sleep(600)
  const fields = await evaluate(`document.querySelectorAll('input:not([type]), input[type=text], textarea, input[type=checkbox]').length`)
  check(fields >= 2, 'kolom formulir terbaca', String(fields))
  await evaluate(`(() => {
    const input = document.querySelector('input:not([type]), input[type=text]')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(input, 'Budi Santoso')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    const box = document.querySelector('input[type=checkbox]')
    box.click()
    return true
  })()`)
  await sleep(300)
  await clickText('Simpan dan unduh')
  files = await waitDownload('.pdf')
  check(files.length === 1, 'PDF terisi terunduh')
  if (files[0]) {
    const form = (await PDFDocument.load(fs.readFileSync(files[0]))).getForm()
    check(form.getTextField('nama_lengkap').getText() === 'Budi Santoso' && form.getCheckBox('setuju').isChecked(), 'nilai teks dan centang tersimpan benar di AcroForm')
  }
  cleanDownloads()

  console.log('\nTanda Tangan Massal')
  await go('/alat/tanda-tangan-massal/')
  await upload([PDF_A, PDF_B])
  const batchReady = (await evaluate('document.body.innerText')).includes('Buat baru')
  check(batchReady, 'alat massal tampil')
  await evaluate(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Buat baru').click()`)
  const imageInput = await send('Runtime.evaluate', { expression: `document.querySelector('input[type=file][accept*=".webp"]')` })
  await send('DOM.setFileInputFiles', { files: [webpDisguised], objectId: imageInput.result.objectId })
  let signatureImage = false
  for (let i = 0; i < 20 && !signatureImage; i++) {
    signatureImage = await evaluate(`document.querySelector('img[alt="Pratinjau tanda tangan"]')?.src.startsWith('data:image/png;base64,') ?? false`)
    if (!signatureImage) await sleep(150)
  }
  check(signatureImage, 'unggahan tanda tangan menerima WebP meski nama berakhiran PNG')
  const pad = await evaluate(`(() => {
    const el = document.querySelector('canvas[aria-label="Area gambar tanda tangan"]')
    if (!el) return null
    el.scrollIntoView({ block: 'center', behavior: 'instant' })
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  })()`)
  if (pad) {
    for (let i = 0; i < 12; i++) {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pad.x + 20 + i * 8, y: pad.y + pad.h / 2, button: 'left', clickCount: 1, buttons: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pad.x + 30 + i * 8, y: pad.y + pad.h / 2 - 10, button: 'left', buttons: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pad.x + 30 + i * 8, y: pad.y + pad.h / 2 - 10, button: 'left', clickCount: 1, buttons: 0 })
    }
  }
  await sleep(300)
  await clickText('Simpan tanda tangan')
  await sleep(600)
  check(await evaluate(`[...document.querySelectorAll('button')].some(b => !b.disabled && b.textContent.trim().startsWith('Tandatangani'))`), 'gambar tanda tangan siap dipakai di alat massal')
  await clickText('Tandatangani')
  await sleep(4000)
  const outCount = await evaluate(`[...document.querySelectorAll('button')].filter((b) => b.textContent.includes('Unduh semua')).length`)
  check(outCount > 0, 'berkas massal siap diunduh')
  if (outCount > 0) {
    await evaluate(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Unduh semua')).click()`)
    files = await waitDownload('.zip')
    check(files.length === 1, 'dua PDF bertanda tangan terunduh sebagai ZIP')
    if (files[0]) {
      const listing = spawnSync('unzip', ['-l', files[0]], { encoding: 'utf8' })
      check(listing.status === 0 && /2 files/.test(listing.stdout), 'ZIP berisi 2 berkas', listing.stdout?.split('\n').slice(-3).join(' '))
      const signed = spawnSync('unzip', ['-p', files[0], 'satu-ttd.pdf'])
      if (signed.status === 0) {
        const pages = (await PDFDocument.load(signed.stdout)).getPages()
        const counts = pages.map((page) => page.node.Resources()?.lookup(PDFName.of('XObject'))?.keys()?.length ?? 0)
        check(counts[0] === 0 && counts[1] === 1, 'gambar tanda tangan hanya ada pada halaman terakhir')
      } else check(false, 'hasil massal berisi PDF yang dapat diverifikasi')
    }
  }
  cleanDownloads()

  console.log('\nWorkflow PDF')
  await go('/alat/workflow-pdf/')
  await upload([PDF_A, PDF_B])
  await clickText('+ Putar semua halaman')
  check(await clickText('Jalankan dan unduh PDF'), 'workflow bisa dijalankan')
  files = await waitDownload('.pdf')
  if (files[0]) {
    const doc = await PDFDocument.load(fs.readFileSync(files[0]))
    check(doc.getPageCount() === 3 && doc.getPages().map((page) => page.getRotation().angle).join(',') === '90,90,180', 'workflow menggabungkan dan memutar seluruh halaman sesuai urutan')
  } else check(false, 'hasil workflow terunduh')
  cleanDownloads()

  console.log('\nBandingkan PDF')
  const comparisonPair = await Promise.all(['https://awal.example/', 'https://revisi.example/'].map(async (url, index) => {
    const doc = await PDFDocument.create()
    const samePage = doc.addPage()
    samePage.drawText('Teks dan tampilan identik')
    const linkedPage = doc.addPage()
    linkedPage.drawText('Tautan di bawah ini berubah', { x: 40, y: 780 })
    linkedPage.node.set(PDFName.of('Annots'), doc.context.obj([{
      Type: 'Annot', Subtype: 'Link', Rect: [30, 750, 200, 775], Border: [0, 0, 0],
      A: { S: 'URI', URI: PDFString.of(url) },
    }]))
    const file = path.join(WORK, `tautan-${index}.pdf`)
    fs.writeFileSync(file, await doc.save())
    return file
  }))
  await go('/alat/bandingkan-pdf/')
  const right = await send('Runtime.evaluate', { expression: `document.querySelectorAll('input[type=file]')[1]` })
  await send('DOM.setFileInputFiles', { files: [comparisonPair[1]], objectId: right.result.objectId })
  await upload([comparisonPair[0]])
  check(await clickText('Bandingkan semua halaman'), 'dua versi dapat dibandingkan')
  let compared = false
  for (let i = 0; i < 30 && !compared; i++) {
    compared = (await evaluate('document.body.innerText')).includes('1 dari 2 halaman berbeda')
    if (!compared) await sleep(200)
  }
  check(compared, 'perubahan URL terdeteksi walau teks dan tampilan halaman sama')

  console.log('\nRute konten')
  await go('/')
  check((await evaluate('document.body.innerText')).includes('Tanda tangani PDF'), 'beranda tampil')
  await go('/artikel/')
  check((await evaluate('document.body.innerText')).includes('Artikel'), 'daftar artikel tampil')
  await go('/halaman-tidak-ada/')
  check((await evaluate('document.body.innerText')).includes('tidak ditemukan'), 'halaman 404 tampil')

  check(errors.length === 0, 'tidak ada error konsol', JSON.stringify(errors.slice(0, 3)))
  ws.close()
} catch (error) {
  result.exitCode = 1
  console.error('\nE2E alat gagal:', error.message)
} finally {
  chrome?.kill()
  server?.kill()
  console.log(`\n${checks - failures.length}/${checks} pemeriksaan lolos`)
  if (failures.length) {
    console.log('Gagal:', failures.join(', '))
    result.exitCode = 1
  }
  if (process.env.E2E_KEEP) console.log('Artefak:', WORK)
  else await sleep(300)
  process.exit(result.exitCode)
}
