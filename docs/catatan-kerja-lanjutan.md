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
- Pelacakan konversi "dokumen berhasil diunduh" lewat hook analitik tanpa dependensi.
- Kumpulan alat: gabung, pisah, PDF → JPG, JPG → PDF, kompres, putar halaman, watermark,
  isi formulir, dan batch signing.
- Cross-link "alat lain" setelah unduh untuk menahan sesi.
- Workflow GitHub Actions untuk build + deploy ke GitHub Pages.

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
- [ ] Ganti isi `public/ads.txt` dengan baris publisher resmi dari AdSense
      (`google.com, pub-xxxxxxxx, DIRECT, f08c47fec0942fa0`).
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
