#!/usr/bin/env node
/**
 * Uji ujung-ke-ujung tanpa dependensi tambahan:
 * menjalankan `vite preview`, mengendalikan Chrome lewat DevTools Protocol,
 * lalu memeriksa hasil ekspor PDF.
 *
 *   npm run build && npm run test:e2e
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PDFDocument, StandardFonts, degrees, rgb } = require('pdf-lib')

const PORT = Number(process.env.E2E_PORT ?? 4173)
const CDP_PORT = Number(process.env.E2E_CDP_PORT ?? 9333)
const BASE_URL = process.env.APP ?? `http://localhost:${PORT}/`
const CHROME = process.env.CHROME ?? 'google-chrome'
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'ttd-pdf-e2e-'))
const DOWNLOADS = path.join(WORK, 'downloads')
const PDF_PATH = path.join(WORK, 'dokumen.pdf')
const SCAN_PATH = path.join(WORK, 'scan.png')

const SCAN_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAMgAAAA8CAIAAACsOWLGAAACn0lEQVR4nO2bS44CMQxEw2iuwIZrcP8jcA02HIJZtDRCfDq24/IH1duCkopdcZLuzuF+vw9CvPnJFkC+ExqLQKCxCAQai0CgsQgEGotAoLEIBBqLQKCxCAQai0CgsQgEGotAoLEIBBqLQKCxCITfbAHPHE/nTz/drpdIJVNaS0UrPJT60G8nVRt1EvY1UkE6Cxlrmqp/EnMmFzkKeEuoFqGzirFUCRtJOdOKHH3mwIaj2hLGegrB2+HF7xLMGiTDQTOV+sl2XmrzjSVPw9tYhKVN5exEb6mihJuumcayjSqldBmMUkGnpFOQzrTnWObxVFgBJbzqtLWzgiRWt+tFuEqqqPKAVGUXRCDMvbv80wXH9Xc9pDnGqrC9FbIoNWwO+Opcp0rF0hKTMJcJECDVpU1fnQnG6lKuwqqLO+aQOnqra8Ua4TutlQkAnTzQiWqOqshYjjnzjcKrt7ykumcLNA3QOs3MjbVJXw/Ea9ZdxoA41YNqgLu3QEXaReeesXAFYLhW7CLFP70vXEgNOveMhdvEuO85ukh1bC34DKQN6WQpdElYl2PgCJGa+3RXzuLY1afCLoEw6AybAF2kruicG2tRdLX3/C5/dqesVLO3RBXL3HrZt3iRTaHbz30j+QnpUuiyMwgIgU1nSlntItXWBfDJe9YiqE1Y4mLdRaphDiiMpWq90UmQSNB6S1exmh6Vd3SmT4BGUh+7nvZu+TR5f4QVbj28VTJ9+VPnRk1ZqcfTWdi18Zv3LtfrWtxV3GgkVQL2sxlJzUQLcPwblEZSJSzd0km5u22gi87RSuo+q9e/iqz9Qh7VUiqU/Aur5Ctp/GkyqQyNRSDQWAQCjUUg0FgEAo1FINBYBAKNRSDQWAQCjUUg0FgEAo1FINBYBMIf9GLISvah394AAAAASUVORK5CYII='

const failures = []
let checks = 0

const check = (ok, label, detail = '') => {
  checks++
  if (ok) {
    console.log(`  ok   ${label}`)
  } else {
    failures.push(label)
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function makePdf() {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.HelveticaBold)
  for (const rotation of [0, 90, 180, 270]) {
    const page = pdf.addPage([600, 800])
    page.setRotation(degrees(rotation))
    page.drawText(`ROT ${rotation}`, { x: 30, y: 740, size: 34, font })
    page.drawRectangle({
      x: 28,
      y: 660,
      width: 140,
      height: 40,
      borderColor: rgb(0.1, 0.1, 0.1),
      borderWidth: 2,
    })
    page.drawText('KIRI-ATAS', { x: 34, y: 672, size: 16, font })
    page.drawText('KIRI-BAWAH', { x: 30, y: 40, size: 16, font })
  }
  fs.writeFileSync(PDF_PATH, await pdf.save())
  fs.writeFileSync(SCAN_PATH, Buffer.from(SCAN_PNG_BASE64, 'base64'))
}

async function waitForServer(url) {
  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      /* belum siap */
    }
    await sleep(250)
  }
  throw new Error(`server tidak siap di ${url}`)
}

async function findTarget() {
  for (let i = 0; i < 80; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
      const page = targets.find((target) => target.type === 'page')
      if (page) return page
    } catch {
      /* belum siap */
    }
    await sleep(250)
  }
  throw new Error('Chrome tidak merespons')
}

function connect(url) {
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
      errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
    }
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      errors.push(message.params.entry.text)
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

  return { ws, ready, send, waitEvent, errors }
}

const result = { exitCode: 0 }
let server = null
let chrome = null

try {
  fs.mkdirSync(DOWNLOADS, { recursive: true })
  await makePdf()

  if (!process.env.APP) {
    if (!fs.existsSync('dist/index.html')) {
      throw new Error('Folder dist belum ada. Jalankan "npm run build" dulu.')
    }
    server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
      stdio: 'ignore',
    })
  }
  await waitForServer(BASE_URL)

  chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--hide-scrollbars',
      '--window-size=1440,1000',
      `--user-data-dir=${path.join(WORK, 'chrome')}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  const target = await findTarget()
  const { ready, send, waitEvent, errors, ws } = connect(target.webSocketDebuggerUrl)
  await ready

  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text)
    return response.result.value
  }

  const clickText = (text) =>
    evaluate(`(() => {
      const el = [...document.querySelectorAll('button')].find((button) =>
        button.textContent.trim().startsWith(${JSON.stringify(text)}))
      if (!el) return false
      el.click()
      return true
    })()`)

  const boxOf = (selector) =>
    evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)})
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return { x: rect.x, y: rect.y, w: rect.width, h: rect.height }
    })()`)

  const drag = async (from, to, steps = 12) => {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: from.x, y: from.y, button: 'left', clickCount: 1, buttons: 1 })
    for (let i = 1; i <= steps; i++) {
      await send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: from.x + ((to.x - from.x) * i) / steps,
        y: from.y + ((to.y - from.y) * i) / steps,
        button: 'left',
        buttons: 1,
      })
    }
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: to.x, y: to.y, button: 'left', clickCount: 1, buttons: 0 })
    await sleep(150)
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DOWNLOADS })

  console.log('\nMembuka aplikasi')
  const loaded = waitEvent('Page.loadEventFired')
  await send('Page.navigate', { url: BASE_URL })
  await loaded
  check((await evaluate('document.body.innerText')).includes('Tanda tangani PDF'), 'halaman awal tampil')

  console.log('\nMembuka PDF')
  const fileInput = (
    await send('Runtime.evaluate', {
      expression: `document.querySelector('input[type=file][accept^="application/pdf"]')`,
    })
  ).result.objectId
  await send('DOM.setFileInputFiles', { files: [PDF_PATH], objectId: fileInput })

  let pages = 0
  for (let i = 0; i < 60; i++) {
    pages = await evaluate(`document.querySelectorAll('[data-page]').length`)
    if (pages === 4) break
    await sleep(250)
  }
  check(pages === 4, '4 halaman dirender', `dapat ${pages}`)
  await sleep(600)
  check((await evaluate(`document.querySelectorAll('[data-thumb]').length`)) === 4, 'rail thumbnail terisi')

  console.log('\nMembuat tanda tangan')
  const pad = await boxOf('canvas[aria-label="Area gambar tanda tangan"]')
  check(Boolean(pad), 'pad tanda tangan ada')
  const points = []
  for (let i = 0; i <= 36; i++) {
    const t = i / 36
    points.push({
      x: pad.x + pad.w * (0.16 + 0.62 * t),
      y: pad.y + pad.h * (0.55 + 0.22 * Math.sin(t * Math.PI * 2)),
    })
  }
  await drag(points[0], points.at(-1))
  // goresan melengkung: dispatch manual supaya membentuk kurva
  check(await clickText('Simpan tanda tangan'), 'tanda tangan disimpan')

  const stored = async () => evaluate(`JSON.parse(localStorage.getItem('ttd-pdf:signatures') ?? 'null')`)
  await sleep(300)
  const firstStore = await stored()
  check(firstStore?.signatures?.length === 1, 'tanda tangan tersimpan di perangkat')

  console.log('\nMenempel, menggeser, memutar')
  const placeLabel = await evaluate(`(() => {
    const el = [...document.querySelectorAll('button')].find((button) => button.textContent.trim().startsWith('Tempel di halaman'))
    return el ? el.textContent.trim() : 'tidak ada'
  })()`)
  check(placeLabel === 'Tempel di halaman 1', 'halaman aktif = 1 sebelum menempel', placeLabel)
  check(await clickText('Tempel di halaman'), 'tanda tangan ditempel')
  await sleep(700)
  check(
    (await evaluate(`document.querySelector('[data-overlay]')?.closest('[data-page]')?.dataset.page`)) === '0',
    'tanda tangan berada di halaman pertama',
  )
  const beforeDrag = await boxOf('[data-overlay]')
  await drag({ x: beforeDrag.x + beforeDrag.w / 2, y: beforeDrag.y + beforeDrag.h / 2 }, { x: beforeDrag.x + beforeDrag.w / 2 - 90, y: beforeDrag.y + beforeDrag.h / 2 - 40 })
  const afterDrag = await boxOf('[data-overlay]')
  check(Math.round(beforeDrag.x - afterDrag.x) > 60, 'tanda tangan bisa digeser', `${beforeDrag.x} → ${afterDrag.x}`)

  const handle = await boxOf('[aria-label="Putar tanda tangan"]')
  await drag({ x: handle.x + handle.w / 2, y: handle.y + handle.h / 2 }, { x: handle.x + handle.w / 2 + 70, y: handle.y + handle.h / 2 + 45 })
  const tilt = await evaluate(
    `(() => {
      const el = document.querySelector('[data-overlay]')
      const match = el.style.transform.match(/rotate\\((-?[\\d.]+)deg\\)/)
      return match ? Number(match[1]) : 0
    })()`,
  )
  check(Math.abs(tilt) > 5, 'tanda tangan bisa diputar', `tilt ${tilt}`)
  const overlayBox = await boxOf('[data-overlay]')
  const pageBox = await boxOf('[data-page="0"]')
  const expectedCenter = {
    x: (overlayBox.x + overlayBox.w / 2 - pageBox.x) / pageBox.w,
    y: (overlayBox.y + overlayBox.h / 2 - pageBox.y) / pageBox.h,
  }

  console.log('\nMengekspor PDF')
  check(await clickText('Unduh PDF'), 'tombol unduh diklik')
  let file = null
  for (let i = 0; i < 60; i++) {
    const files = fs.readdirSync(DOWNLOADS).filter((name) => name.endsWith('.pdf'))
    if (files.length) {
      file = path.join(DOWNLOADS, files[0])
      break
    }
    await sleep(250)
  }
  check(Boolean(file), 'PDF hasil ekspor terunduh')

  if (file) {
    const info = spawnSync('pdfinfo', [file], { encoding: 'utf8' })
    if (info.status === 0) {
      const pagesLine = info.stdout.match(/Pages:\s+(\d+)/)
      check(pagesLine?.[1] === '4', 'jumlah halaman tetap 4')
      check(/Title:\s+dokumen/.test(info.stdout), 'metadata judul terisi')
    }

    if (spawnSync('which', ['pdftoppm']).status === 0) {
      const prefix = path.join(WORK, 'render')
      spawnSync('pdftoppm', ['-r', '120', '-f', '1', '-l', '1', '-png', file, prefix])
      const png = `${prefix}-1.png`
      const python = spawnSync(
        'python3',
        [
          '-c',
          `import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('L')
W, H = im.size
cx, cy = float(sys.argv[2]), float(sys.argv[3])
px = im.load()
x0, x1 = int(W * (cx - 0.18)), int(W * (cx + 0.18))
y0, y1 = int(H * (cy - 0.18)), int(H * (cy + 0.18))
xs, ys = [], []
for y in range(max(0, y0), min(H, y1)):
    for x in range(max(0, x0), min(W, x1)):
        if px[x, y] < 120:
            xs.append(x); ys.append(y)
print(f"{(min(xs)+max(xs))/2/W:.3f} {(min(ys)+max(ys))/2/H:.3f}" if xs else "none")
`,
          png,
          String(expectedCenter.x),
          String(expectedCenter.y),
        ],
        { encoding: 'utf8' },
      )
      const parsed = (python.stdout ?? '').trim().split(' ')
      if (parsed.length === 2) {
        const inkCenter = { x: Number(parsed[0]), y: Number(parsed[1]) }
        const dx = Math.abs(inkCenter.x - expectedCenter.x)
        const dy = Math.abs(inkCenter.y - expectedCenter.y)
        check(dx < 0.02 && dy < 0.02, 'posisi tanda tangan di PDF sesuai layar', `Δ ${dx.toFixed(3)}/${dy.toFixed(3)}`)
      } else {
        check(false, 'posisi tanda tangan di PDF sesuai layar', `stdout="${(python.stdout ?? '').trim()}" stderr="${(python.stderr ?? '').trim()}"`)
      }
    }
  }

  console.log('\nUndo / redo')
  const countOverlays = () => evaluate(`document.querySelectorAll('[data-overlay]').length`)
  const clickAction = async (label) => {
    await evaluate(`document.querySelector('[aria-label=${JSON.stringify(label)}]').click()`)
    await sleep(250)
  }

  await clickAction('Urungkan')
  const tiltAfterUndo = await evaluate(
    `(() => {
      const el = document.querySelector('[data-overlay]')
      if (!el) return null
      const match = el.style.transform.match(/rotate\\((-?[\\d.]+)deg\\)/)
      return match ? Number(match[1]) : 0
    })()`,
  )
  check(tiltAfterUndo === 0, 'undo mengembalikan kemiringan', `tilt ${tiltAfterUndo}`)

  await clickAction('Urungkan')
  await clickAction('Urungkan')
  check((await countOverlays()) === 0, 'undo berantai menghapus tanda tangan')

  await clickAction('Ulangi')
  await clickAction('Ulangi')
  await clickAction('Ulangi')
  check((await countOverlays()) === 1, 'redo mengembalikan tanda tangan')

  console.log('\nPintasan papan ketik')
  const selectOverlay = async () => {
    const box = await boxOf('[data-overlay]')
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x + box.w / 2, y: box.y + box.h / 2, button: 'left', clickCount: 1, buttons: 1 })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x + box.w / 2, y: box.y + box.h / 2, button: 'left', clickCount: 1, buttons: 0 })
    await sleep(200)
    return box
  }
  const pressArrow = async (key, virtualKeyCode) => {
    const params = {
      type: 'keyDown',
      key,
      code: key,
      windowsVirtualKeyCode: virtualKeyCode,
      nativeVirtualKeyCode: virtualKeyCode,
    }
    await send('Input.dispatchKeyEvent', params)
    await send('Input.dispatchKeyEvent', { ...params, type: 'keyUp' })
    await sleep(60)
  }

  const selected = await selectOverlay()
  for (let i = 0; i < 10; i++) await pressArrow('ArrowLeft', 37)
  const nudged = await boxOf('[data-overlay]')
  check(nudged && Math.round(selected.x - nudged.x) >= 8 && Math.round(selected.x - nudged.x) <= 20, 'panah menggeser tanda tangan halus', `${selected.x} → ${nudged?.x}`)

  console.log('\nPersistensi setelah muat ulang')
  await send('Page.reload')
  await sleep(1800)
  const reloadedStore = await evaluate(`JSON.parse(localStorage.getItem('ttd-pdf:signatures') ?? 'null')`)
  check(reloadedStore?.signatures?.length === 1, 'tanda tangan bertahan setelah reload')

  console.log('\nKeterangan nama & tanggal')
  const reloadedInput = (
    await send('Runtime.evaluate', {
      expression: `document.querySelector('input[type=file][accept^="application/pdf"]')`,
    })
  ).result.objectId
  await send('DOM.setFileInputFiles', { files: [PDF_PATH], objectId: reloadedInput })
  for (let i = 0; i < 60; i++) {
    if ((await evaluate(`document.querySelectorAll('[data-page]').length`)) === 4) break
    await sleep(250)
  }
  await sleep(500)

  check(await clickText('Keterangan nama'), 'panel keterangan terbuka')
  await sleep(250)
  await evaluate(`(() => {
    const input = document.querySelector('input[placeholder="Nama lengkap"]')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    setter.call(input, 'Budi Santoso')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    return input.value
  })()`)
  await sleep(200)
  const captionPad = await boxOf('canvas[aria-label="Area gambar tanda tangan"]')
  await drag({ x: captionPad.x + captionPad.w * 0.2, y: captionPad.y + captionPad.h * 0.5 }, { x: captionPad.x + captionPad.w * 0.75, y: captionPad.y + captionPad.h * 0.45 })
  check(await clickText('Simpan tanda tangan'), 'tanda tangan dengan keterangan disimpan')
  await sleep(400)
  const withCaption = await stored()
  const first = withCaption?.signatures?.[0]
  const last = withCaption?.signatures?.at(-1)
  check(withCaption?.signatures?.length === 2, 'dua tanda tangan tersimpan')
  check(Boolean(last && first && last.aspect < first.aspect), 'keterangan menambah tinggi gambar', `aspect ${first?.aspect?.toFixed(2)} → ${last?.aspect?.toFixed(2)}`)

  check(errors.length === 0, 'tidak ada error di konsol', errors.join(' | '))
  ws.close()
} catch (error) {
  result.exitCode = 1
  console.error('\nE2E gagal:', error.message)
} finally {
  chrome?.kill()
  server?.kill()
  console.log(`\n${checks - failures.length}/${checks} pemeriksaan lolos`)
  if (failures.length) {
    console.log('Gagal:', failures.join(', '))
    result.exitCode = 1
  }
  if (process.env.E2E_KEEP) console.log('Artefak:', WORK)
  else {
    await sleep(400)
    try {
      fs.rmSync(WORK, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    } catch {
      /* profil Chrome kadang masih terkunci; folder sementara boleh tertinggal */
    }
  }
  process.exit(result.exitCode)
}
