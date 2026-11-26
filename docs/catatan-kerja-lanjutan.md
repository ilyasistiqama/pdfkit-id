# Catatan Kerja Lanjutan

> Dokumen ini memisahkan pekerjaan yang **sudah dikerjakan** di repo (semuanya statis, aman untuk
> GitHub Pages) dari pekerjaan yang **harus menunggu VPS, domain, atau akun pihak ketiga**.
> Dibuat 20 November 2026.

## Sudah dikerjakan di repo (statis / GitHub Pages)

- Router path tanpa server (History API) + prerender HTML per rute saat build.
- Meta per halaman: title, description, canonical, Open Graph, Twitter card, JSON-LD.
- `sitemap.xml`, `robots.txt`, `ads.txt`, dan `404.html` dibuat saat build.
- Halaman Tentang, Kontak, Privasi, Syarat, FAQ.
- Artikel tentang pilihan alat PDF, alur pengolahan dokumen, dan tanda tangan sebagai pintu masuk SEO.
- Komponen slot iklan (`AdSlot`) memuat iklan saat mendekati area layar dan setelah pengguna
  menyetujui cookie. Slot terisi diberi label "Iklan" dan berjarak dari tombol unduh. Slot kosong
  atau belum dikonfigurasi tidak menyisakan ruang.
- Cookie/consent notice (tersimpan di perangkat) yang menjadi gerbang pemuatan skrip iklan.
  Panel privasi menyediakan pilihan terpisah untuk analitik dan iklan sesuai layanan yang
  dikonfigurasi. AdSense memerlukan CMP dan hanya berjalan pada katalog dan panduan.
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

- [ ] Setelah `muis.life` tersedia, gunakan domain utama untuk profil dan arahkan `pdfkit.muis.life`
      ke deployment PDFKit.
- [ ] Set `BASE_PATH=/` dan `VITE_SITE_URL=https://pdfkit.muis.life` agar canonical, Open Graph,
      `sitemap.xml`, dan `robots.txt` memakai URL final.
- [ ] Bila pindah ke VPS: tambahkan header cache, kompresi Brotli, dan HTTP/2 atau HTTP/3 di reverse
      proxy (nginx/Caddy). Tidak wajib selama masih di GitHub Pages.

### 2. Akun iklan

- [ ] Tunda aktivasi iklan selama PDFKit memakai `ilyasistiqama.github.io/pdfkit-id/`.
- [ ] Daftarkan `muis.life` ke AdSense, verifikasi dengan meta tag di situs profil, dan tunggu
      status **Ready**. Publikasikan `ads.txt` di `https://muis.life/ads.txt`.
- [ ] Biarkan Auto ads mati. Setelah **Ready**, isi `VITE_ADSENSE_CLIENT`,
      `VITE_ADSENSE_SLOT_CONTENT`, dan `VITE_ADSENSE_CMP_SCRIPT` hanya di repo PDFKit. Ikuti
      [panduan AdSense untuk PDFKit di subdomain](panduan-pasca-deploy.md#adsense-untuk-pdfkit-di-subdomain).
- [ ] Uji pilihan dan pencabutan izin. Pastikan permintaan iklan menunggu sinyal CMP dan alat terbuka
      tanpa skrip iklan.
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

- [ ] Verifikasi CMP bersertifikat Google dan uji sinyal TCF sebelum penayangan.
- [ ] Konfirmasi status PSE Lingkup Privat PDFKit ke Komdigi. Lanjutkan melalui OSS jika diwajibkan.
- [ ] Tinjau ulang kebijakan privasi setelah venue iklan dan analytics final dipilih.

### 5. Pengujian perangkat nyata

- [ ] Uji Safari/iOS dan file besar (scan 50–100 MB, 300+ halaman) di perangkat asli.
- [ ] Uji alur unduhan ganda di Safari (beberapa file hasil pisah) dan sesuaikan bila perlu.
- [ ] Ukur Core Web Vitals setelah iklan aktif; sesuaikan tinggi slot agar CLS tetap hijau.
