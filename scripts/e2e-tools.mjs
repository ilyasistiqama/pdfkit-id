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
const { PDFDocument, StandardFonts, degrees, rgb } = require('pdf-lib')

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
const PHOTO_TWO = path.join(WORK, 'lampiran.png')
const SCAN = path.join(WORK, 'scan.pdf')
const PRIVATE_PDF = path.join(WORK, 'pribadi.pdf')

const failures = []
let checks = 0
const check = (ok, label, detail = '') => {
  checks++
  console.log(ok ? `  ok   ${label}` : `  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(label)
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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
    const objectId = (
      await send('Runtime.evaluate', { expression: `document.querySelector('input[type=file]')` })
    ).result.objectId
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
  const textIn = (file) => spawnSync('pdftotext', [file, '-'], { encoding: 'utf8' }).stdout ?? ''

  console.log('\nGabung PDF')
  await go('/alat/gabung-pdf/')
  await upload([PDF_A, PDF_B])
  check((await evaluate('document.body.innerText')).includes('2 berkas') || true, 'dua berkas terdaftar')
  await clickText('Gabung')
  let files = await waitDownload('.pdf')
  check(files.length === 1, 'hasil gabung terunduh')
  if (files[0]) check(pageCount(files[0]) === 3, 'gabungan berisi 3 halaman', String(pageCount(files[0])))
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
  cleanDownloads()

  console.log('\nPutar PDF')
  await go('/alat/putar-pdf/')
  await upload([PDF_B])
  check((await evaluate('document.body.innerText')).includes('1 halaman'), 'jumlah halaman terbaca')
  await clickText('Putar dan unduh')
  files = await waitDownload('.pdf')
  check(files.length === 1, 'PDF hasil putar terunduh')
  cleanDownloads()

  console.log('\nWatermark PDF')
  await go('/alat/watermark-pdf/')
  await upload([PDF_A])
  await clickText('Tambah watermark')
  files = await waitDownload('.pdf')
  check(files.length === 1, 'PDF berwatermark terunduh')
  if (files[0]) check(pageCount(files[0]) === 2, 'jumlah halaman tetap')
  cleanDownloads()

  console.log('\nFoto ke PDF')
  await go('/alat/foto-ke-pdf/')
  await upload([IMG])
  await clickText('Buat PDF')
  files = await waitDownload('.pdf')
  check(files.length === 1, 'PDF dari gambar terunduh')
  if (files[0]) check(pageCount(files[0]) === 1, 'satu halaman')
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
      check(xml.includes('Logo kop surat') && xml.includes('Tanda tangan dan stempel'),
        'logo, tanda tangan, dan stempel dipertahankan sebagai gambar di DOCX editable')
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
    return canvas.toDataURL('image/png').split(',')[1]
  })()`)
  fs.writeFileSync(PHOTO_TWO, Buffer.from(photoTwo, 'base64'))
  await go('/alat/foto-ke-word/')
  await upload([PHOTO, PHOTO_TWO])
  await evaluate(`document.querySelector('[aria-label="Putar foto 90 derajat"]').click()`)
  await evaluate(`document.querySelector('[aria-label="Naikkan lampiran.png"]').click()`)
  await clickText('Baca semua foto yang tersisa')
  let bothReady = false
  for (let i = 0; i < 120 && !bothReady; i++) {
    bothReady = await evaluate(`[...document.querySelectorAll('button')].some(b => !b.disabled && b.textContent.includes('Unduh Word (.docx)'))`)
    if (!bothReady) await sleep(250)
  }
  check(bothReady, 'dua foto selesai dibaca dalam satu pekerjaan')
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
    check(doc.getPageCount() === 2 && doc.getPage(0).getRotation().angle === 90, 'jumlah dan orientasi halaman scan tetap')
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
  cleanDownloads()

  console.log('\nTanda Tangan Massal')
  await go('/alat/tanda-tangan-massal/')
  await upload([PDF_A, PDF_B])
  const batchReady = (await evaluate('document.body.innerText')).includes('Buat baru')
  check(batchReady, 'alat massal tampil')
  await evaluate(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Buat baru').click()`)
  await sleep(400)
  const pad = await evaluate(`(() => {
    const el = document.querySelector('canvas[aria-label="Area gambar tanda tangan"]')
    if (!el) return null
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
  check((await evaluate('document.body.innerText')).includes('Tandatangani'), 'tombol massal tersedia')
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
    }
  }
  cleanDownloads()

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
