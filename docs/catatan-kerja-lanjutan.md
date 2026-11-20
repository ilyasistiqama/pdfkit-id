# Catatan Kerja Lanjutan

> Dokumen ini memisahkan pekerjaan yang **sudah dikerjakan** di repo (semuanya statis, aman untuk
> GitHub Pages) dari pekerjaan yang **harus menunggu VPS, domain, atau akun pihak ketiga**.
> Dibuat 20 November 2026.

## Sudah dikerjakan di repo (statis / GitHub Pages)

- Router path tanpa server (History API) + prerender HTML per rute saat build.
- Meta per halaman: title, description, canonical, Open Graph, Twitter card, JSON-LD.
- `sitemap.xml`, `robots.txt`, `ads.txt`, dan `404.html` dibuat saat build.
- Halaman Tentang, Kontak, Privasi, Syarat, FAQ.
- Empat artikel pendukung sebagai pintu masuk SEO.
- Komponen slot iklan (`AdSlot`) dengan tinggi yang dipesan, lazy load, label "Iklan", jarak aman
  dari tombol unduh, dan tanpa memuat skrip sebelum consent.
- Cookie/consent notice (tersimpan di perangkat) yang menjadi gerbang pemuatan skrip iklan.
  Notice dan tautan "Pengaturan cookie" di footer **hanya muncul bila `VITE_ADSENSE_CLIENT` atau
  `VITE_ANALYTICS_SCRIPT` diisi** saat build (`consentNeeded()` di `src/site/consent.ts`). Selama
  keduanya kosong, notice disembunyikan dan halaman Privasi/FAQ menyatakan belum ada cookie pihak
  ketiga. Begitu iklan diaktifkan, notice dan teks lama kembali otomatis tanpa ubah kode.
- Pelacakan konversi "dokumen berhasil diunduh" lewat hook analitik tanpa dependensi.
- Kumpulan alat: gabung, pisah, PDF → JPG, JPG → PDF, kompres, putar halaman, watermark,
  isi formulir, dan batch signing.
- Cross-link "alat lain" setelah unduh untuk menahan sesi.
- Ekspor tanda tangan tersimpan sebagai PNG transparan (tombol unduh di kartu tanda tangan, di
  halaman tanda tangan utama dan Tanda Tangan Massal). Berkas `tanda-tangan-N.png` bisa diimpor
  ulang lewat "Unggah PNG"; keterangan nama/tanggal ikut di gambar.
- Workflow GitHub Actions untuk build + deploy ke GitHub Pages.

## Perbaikan bug (20 November 2026)

- **Putar PDF:** memilih "Genap" pada PDF 1 halaman dulu memutar semua halaman. Sekarang muncul
  pesan bahwa tidak ada halaman genap; `rotatePdf` membedakan `pages` kosong dan tidak diisi.
- **Watermark:** watermark miring dulu bergeser dari tengah (±45 pt ke kiri, ±78 pt ke atas di A4).
  Posisi kini dihitung dari pusat halaman (`watermarkLayout`), ikut `/Rotate` halaman, dan teks
  yang terlalu besar dikecilkan agar muat (maks. 90% halaman).
- **Tanda Tangan Massal:** preset "kanan-bawah" dan "tengah" dulu memakai posisi x tetap sehingga
  tanda tangan lebar bisa keluar halaman. Posisi kini dihitung dari lebar tanda tangan.
- **PDF dengan CropBox:** posisi tanda tangan dan watermark dulu dihitung dari MediaBox, padahal
  pratinjau pdf.js memakai CropBox. Sekarang semuanya memakai irisan CropBox–MediaBox
  (`visibleBox` di `src/core/geometry.ts`), jadi hasil unduhan sama dengan pratinjau.
- **SEO:** URL `og:image` tidak lagi diberi garis miring akhir (`og.png/` → 404), `lastmod` di
  sitemap mengikuti `CONTENT_UPDATED`, dan tag `article:*` dihapus saat pindah ke halaman
  non-artikel.
- Tes unit ditambah untuk semua perbaikan di atas (`npm test`).

## Belum dikerjakan — menunggu VPS / domain / akun

### 1. Domain dan hosting

- [ ] Daftarkan domain, arahkan ke GitHub Pages (atau VPS bila nanti mau dinamis).
- [ ] Set `VITE_SITE_URL` (mis. `https://ttdpdf.id`) saat build agar canonical, Open Graph,
      `sitemap.xml`, dan `robots.txt` memakai URL final.
- [ ] Bila pindah ke VPS: tambahkan header cache, kompresi Brotli, dan HTTP/2 atau HTTP/3 di reverse
      proxy (nginx/Caddy). Tidak wajib selama masih di GitHub Pages.

### 2. Akun iklan

- [ ] Daftar AdSense, tunggu approval setelah konten terindeks.
- [ ] Isi `VITE_ADSENSE_CLIENT` (format `ca-pub-xxxxxxxx`) dan `VITE_ADSENSE_SLOT_*` di environment
      build. Tanpa nilai ini slot hanya menampilkan ruang kosong berlabel, tidak error.
- [ ] `ads.txt` dibuat otomatis saat build dari `VITE_ADSENSE_CLIENT`
      (`google.com, pub-xxxxxxxx, DIRECT, f08c47fec0942fa0`), tidak perlu file di `public/`.
- [ ] **Bila tetap memakai `ilyasistiqama.github.io/pdfkit-id`:** `ads.txt` hasil build ada di
      `/pdfkit-id/ads.txt`, sedangkan AdSense membacanya di akar domain
      (`https://ilyasistiqama.github.io/ads.txt`). Buat repo terpisah `ilyasistiqama.github.io`,
      aktifkan Pages, dan taruh `ads.txt` di akarnya. Dengan domain sendiri (`BASE_PATH=/`) masalah
      ini hilang, dan peluang approval AdSense juga lebih baik daripada subdomain `github.io`.
- [ ] Setelah `VITE_ADSENSE_CLIENT` diisi, pastikan notice "Iklan memakai cookie" muncul lagi di
      kunjungan pertama dan skrip AdSense baru dimuat setelah "Setuju".
- [ ] Siapkan jaringan iklan cadangan (mis. Ezoic/Mediavine sesuai syarat trafik) agar suspend
      AdSense tidak berarti pendapatan nol.

### 3. Analytics dan pemantauan

- [ ] Buat properti GA4 **atau** Plausible/Umami, lalu isi `VITE_ANALYTICS_SCRIPT` dan
      `VITE_ANALYTICS_DOMAIN`. Skrip hanya dimuat setelah pengguna menyetujui consent.
- [ ] Buat proyek Sentry, tambahkan DSN. Integrasi SDK belum dipasang karena menambah berat bundel;
      alternatif ringan: kirim `window.onerror` ke endpoint Sentry lewat `fetch`, dikerjakan saat DSN
      sudah ada.
- [ ] Daftarkan situs ke Google Search Console dan kirim `sitemap.xml`.

### 4. Kepatuhan privasi lanjutan

- [ ] Bila menargetkan trafik EEA/UK, pasang CMP bersertifikat (Google CMP atau penyedia lain) di
      atas consent notice bawaan. Consent bawaan sekarang cukup untuk UU PDP Indonesia, belum tentu
      untuk TCF v2.
- [ ] Tinjau ulang kebijakan privasi setelah venue iklan dan analytics final dipilih.

### 5. Pengujian perangkat nyata

- [ ] Uji Safari/iOS dan file besar (scan 50–100 MB, 300+ halaman) di perangkat asli.
- [ ] Uji alur unduhan ganda di Safari (beberapa file hasil pisah) dan sesuaikan bila perlu.
- [ ] Ukur Core Web Vitals setelah iklan aktif; sesuaikan tinggi slot agar CLS tetap hijau.
