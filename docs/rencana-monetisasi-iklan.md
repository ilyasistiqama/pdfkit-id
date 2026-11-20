# Rencana Monetisasi Iklan

> Status: **belum dikerjakan**. Dokumen ini disimpan sebagai catatan kerja untuk dikerjakan
> bertahap. Dibuat 19 November 2026.

## Keputusan model bisnis

- Aplikasi **gratis sepenuhnya** untuk pengguna. Tidak ada langganan, lisensi, paywall, atau batas
  jumlah dokumen.
- Pendapatan berasal dari **iklan** (model bisnis trafik).
- Konsekuensinya: prioritas utama bukan menambah fitur, tetapi **mendatangkan trafik** dan
  **menaikkan halaman per sesi**.

## Realita angka

| Pageview / bulan | Estimasi pendapatan (RPM $0,5–2) |
| ---------------- | -------------------------------- |
| 10.000           | $5–20                            |
| 50.000           | $25–100                          |
| 100.000          | $50–200                          |
| 300.000          | $150–600                         |

Biaya hosting statis mendekati nol, jadi biaya terbesar adalah waktu untuk SEO dan konten.
Model ini hanya masuk akal bila trafiknya tumbuh; satu alat tanpa konten tidak akan cukup.

## Blocker terbesar saat ini

Aplikasi masih SPA murni dengan hampir tanpa konten, sehingga sulit diindeks dan rawan ditolak
AdSense ("insufficient content").

- [ ] Belum ada `sitemap.xml`, `robots.txt`.
- [ ] Belum ada prerender/SSG; konten hanya dirender lewat JavaScript.
- [ ] Belum ada meta judul/deskripsi per halaman, canonical, atau structured data.
- [ ] Belum ada halaman Tentang, Kontak, Privasi, dan Syarat (syarat approval AdSense).
- [ ] Belum ada artikel pendukung sebagai pintu masuk SEO.

## Aturan penempatan iklan (jangan dilanggar)

- **Jangan menaruh slot iklan di dekat tombol "Unduh PDF" atau di dalam area dokumen.** Iklan yang
  terlihat seperti bagian antarmuka termasuk pelanggaran kebijakan dan berisiko akun disuspend.
- Maksimal 2–3 unit per layar. Slot yang disarankan: di bawah panel dokumen (desktop), sidebar
  kanan, dan satu anchor di bawah (mobile) dengan label jelas.
- Reservasi tinggi slot supaya layout tidak bergeser (CLS), dan muat iklan secara lazy.
- Hindari interstitial dan popup. Untuk produk kepercayaan seperti tanda tangan, reputasi lebih
  penting daripada RPM jangka pendek.
- Siapkan jaringan iklan cadangan (selain AdSense), karena suspend berarti pendapatan nol.

## Konsekuensi privasi (penting)

Klaim "file tidak pernah diunggah" tetap benar, tetapi iklan pihak ketiga memakai cookie dan
melacak perilaku. Karena itu:

- [ ] Perbarui kebijakan privasi: bedakan tegas "isi dokumen tetap di perangkat" vs "iklan memakai cookie".
- [ ] Tambahkan cookie notice / consent (UU PDP 27/2022; CMP jika menargetkan trafik EEA).
- [ ] Sediakan cara mematikan personalisasi iklan.

## Roadmap

### Fase 1 — Permukaan SEO dan konten

- [ ] Prerender/SSG (opsi: `vite-ssg`, Astro, atau Next) agar konten terbaca tanpa JavaScript.
- [ ] Meta per halaman: title, description, canonical, Open Graph, structured data (`SoftwareApplication`, `FAQPage`).
- [ ] `sitemap.xml`, `robots.txt`, Search Console.
- [ ] Halaman Tentang, Kontak, Privasi, Syarat, FAQ.
- [ ] 3–6 artikel pendukung, mis. "cara tanda tangan PDF di HP", "apa itu tanda tangan elektronik",
      "beda tanda tangan elektronik dan PSrE", "cara tanda tangan di Word lalu simpan PDF".

### Fase 2 — Slot iklan

- [ ] Komponen slot iklan: reserved height, lazy load, label "Iklan", jarak aman dari tombol aksi
      (`src/web/components/AdSlot.tsx`).
- [ ] Konfigurasi `ads.txt`, integrasi AdSense, dan `ads.txt` di `public/`.
- [ ] Cookie notice + consent gate sebelum memuat skrip iklan.
- [ ] Ukur RPM per slot dan sesuaikan penempatan.

### Fase 3 — Kumpulan alat (menaikkan trafik dan sesi)

Kandidat yang bisa dikerjakan 100% di browser dengan stack saat ini:

- [ ] Gabung PDF
- [ ] Pisah PDF
- [ ] PDF → JPG
- [ ] JPG → PDF
- [ ] Kompres PDF (penurunan resolusi gambar)
- [ ] Putar halaman
- [ ] Watermark
- [ ] Isi formulir (teks, tanggal, checkbox)

- [ ] Batch signing (satu tanda tangan untuk banyak dokumen).
- [ ] Template posisi tanda tangan (mis. "kiri-bawah, lebar 15%").
- [ ] Bagian "alat lain" setelah unduh, untuk menahan sesi.

### Fase 4 — Operasional dan pengukuran

- [ ] Domain + hosting statis + CDN.
- [ ] Analytics (GA4 atau Plausible/Umami) dan tujuan konversi "dokumen berhasil diunduh".
- [ ] Error tracking (Sentry) untuk menangkap kerusakan di perangkat pengguna.
- [ ] Uji Safari/iOS dan file besar (scan 50–100 MB, 300+ halaman).
- [ ] `ads.txt`, kebijakan privasi versi final, dan halaman kontak yang aktif.

### Fase 5 — Eksperimen

- [ ] Uji penempatan iklan A/B terhadap completion rate dan RPM.
- [ ] Pantau halaman masuk terbaik dari Search Console, lalu buat artikel lanjutan untuk kata kunci itu.
- [ ] Pertimbangkan sponsor lokal sebagai pelengkap, bukan pengganti, pendapatan iklan.

## Risiko yang perlu dipantau

- **Penolakan/suspend AdSense** karena konten tipis atau iklan menyerupai UI.
- **Ad blocker** di segmen pengguna teknis; jangan memaksa atau menyembunyikan konten.
- **Kualitas trafik**: SEO murah menghasilkan bounce tinggi; halaman artikel harus benar-benar menjawab
  pertanyaan pengguna.
- **Kepercayaan**: aplikasi yang menangani dokumen pribadi tidak boleh terlihat "penuh iklan".

## Catatan teknis terkait kode saat ini

- Entry: `src/App.tsx` (routing manual, tanpa router) — perlu ditambah router + halaman statis.
- Build: `vite.config.ts` — sudah ada PWA; service worker harus mengecualikan skrip iklan dari cache.
- Ukuran bundel: `npm run build` menghasilkan main ~87 KB gzip, pdf.js dan pdf-lib dimuat sesuai
  kebutuhan — pertahankan pola ini saat menambah alat baru.
- Uji: `npm test` (unit) dan `npm run test:e2e` (headless Chrome) — tambahkan skenario untuk setiap
  alat baru.
