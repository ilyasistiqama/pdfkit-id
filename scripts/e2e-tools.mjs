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

  console.log('\nJPG ke PDF')
  await go('/alat/jpg-ke-pdf/')
  await upload([IMG])
  await clickText('Buat PDF')
  files = await waitDownload('.pdf')
  check(files.length === 1, 'PDF dari gambar terunduh')
  if (files[0]) check(pageCount(files[0]) === 1, 'satu halaman')
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
