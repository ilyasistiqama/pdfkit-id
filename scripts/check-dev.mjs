#!/usr/bin/env node
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createServer } from 'vite'

// Gunakan konfigurasi proyek supaya regresi middleware terdeteksi lewat HTTP.
// Cache terpisah menjaga server dev pengguna dari invalidasi dependensi saat tes.
const cacheDir = await mkdtemp(path.join(os.tmpdir(), 'ttd-dev-test-'))
let server
try {
  server = await createServer({ cacheDir, server: { host: '127.0.0.1', port: 0, open: false } })
  await server.listen()
  const { port } = server.httpServer.address()
  const base = `http://127.0.0.1:${port}${server.config.base}`
  for (const route of ['', 'alat/gabung-pdf/', 'faq/']) {
    const response = await fetch(`${base}${route}`)
    assert.equal(response.status, 200, `Halaman ${route || '/'}`)
    const html = await response.text()
    assert.match(html, /id="root"/, `Root React di ${route || '/'}`)
    assert.match(html, /src\/main\.tsx/, `Entry dev di ${route || '/'}`)
    assert.doesNotMatch(html, /\/assets\/.*\.js/, 'Dev harus memakai entry sumber, bukan build lama')
  }
  for (const module of ['@vite/client', '@react-refresh', 'src/main.tsx', 'src/App.tsx']) {
    const response = await fetch(`${base}${module}`)
    assert.equal(response.status, 200, `Modul ${module}`)
    assert.match(response.headers.get('content-type'), /javascript/, `MIME modul ${module}`)
    assert.doesNotMatch(await response.text(), /<!doctype html>/i, `Modul ${module} tidak boleh menjadi HTML`)
  }
  console.log('Dev: 3 rute dan 4 modul bootstrap berhasil dimuat.')
} finally {
  await server?.close()
  await rm(cacheDir, { recursive: true, force: true })
}
