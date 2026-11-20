# Panduan Pasca Deploy PDFKit ID

Panduan untuk melanjutkan pengelolaan situs setelah deploy pertama ke GitHub Pages.
Diperbarui 20 November 2026.

## Alamat penting

| Kebutuhan | Alamat |
| --- | --- |
| Situs publik | https://ilyasistiqama.github.io/pdfkit-id/ |
| Repository | https://github.com/ilyasistiqama/pdfkit-id |
| Status build dan deploy | https://github.com/ilyasistiqama/pdfkit-id/actions |
| Sitemap | https://ilyasistiqama.github.io/pdfkit-id/sitemap.xml |
| Email kontak | ilyasistiqama@gmail.com |

Pada pengecekan 20 November 2026, beranda dan halaman gabung PDF dapat dibuka,
canonical mengarah ke URL GitHub Pages, dan sitemap berisi 20 halaman. Jumlah
halaman dapat bertambah setelah konten baru dibuat. Ini bukan pengganti pengujian
seluruh fitur pada perangkat nyata.

## 1. Push perubahan email dan panduan ini

Email kontak sudah diganti di `src/site/site.ts`. Seluruh halaman yang menggunakan
`CONTACT_EMAIL` akan mengikuti alamat tersebut pada build berikutnya.

Jalankan dari folder proyek:

```bash
git status
git diff -- src/site/site.ts
git add src/site/site.ts docs/panduan-pasca-deploy.md
git commit -m "docs: tambah panduan pasca deploy dan perbarui email kontak"
git push origin main
```

Perintah di atas hanya memasukkan perubahan email dan panduan. Jika ada perubahan
lain yang ingin disertakan, periksa isinya sebelum menambahkannya ke commit.

Setiap push ke `main` otomatis menjalankan tes, build, lalu deploy. Tidak perlu
menjalankan build manual atau memasukkan folder `dist` ke commit.

## 2. Pastikan versi terbaru sudah tayang

1. Buka tab **Actions** di repository.
2. Pilih workflow **Deploy ke GitHub Pages** untuk commit yang baru dipush.
3. Tunggu job **build** dan **deploy** berhasil, ditandai centang hijau.
4. Buka situs publik dan halaman **Tentang** atau **Privasi** dari footer.
5. Pastikan email yang tampil adalah `ilyasistiqama@gmail.com`. Klik email untuk
   memeriksa alamat tujuan pada aplikasi email.

Jika masih terlihat versi lama, coba **Ctrl+Shift+R** atau buka melalui jendela
incognito. GitHub Pages dan service worker aplikasi dapat menyimpan versi lama.
Jika Actions gagal, buka langkah berwarna merah dan baca pesan error pertama;
push yang berhasil belum berarti deploy juga berhasil.

Konfigurasi deploy sudah menyediakan:

- `BASE_PATH`: otomatis mengikuti nama repository, saat ini `/pdfkit-id/`.
- `VITE_SITE_URL`: nilai bawaan `https://ilyasistiqama.github.io/pdfkit-id`.

Tidak perlu mengisi ulang keduanya untuk alamat saat ini. Jika pernah membuat
repository variable dengan nama yang sama, nilainya akan mengalahkan nilai
bawaan workflow; pastikan tidak berisi alamat lama.

## 3. Uji aplikasi dari komputer dan HP

Gunakan PDF contoh yang tidak berisi data pribadi. Lakukan setidaknya satu kali
di komputer dan satu kali di HP sebelum membagikan situs secara luas.

- [ ] Beranda tampil dan tombol memilih PDF berfungsi.
- [ ] PDF beberapa halaman dapat dibuka dan halamannya bisa dipindah.
- [ ] Tanda tangan dapat digambar dengan mouse atau jari.
- [ ] PNG tanda tangan dapat diunggah.
- [ ] Tanda tangan dapat ditempel, digeser, diubah ukurannya, dan diputar.
- [ ] Undo dan redo berfungsi.
- [ ] PDF hasil unduhan dapat dibuka dan posisi tanda tangannya sesuai tampilan.
- [ ] Alat gabung PDF menghasilkan dokumen dengan urutan halaman yang benar.
- [ ] Alat pisah dan kompres PDF menghasilkan file yang dapat dibuka.
- [ ] Menu, footer, dan tautan pembuat berfungsi pada layar kecil.
- [ ] Halaman alat dapat dibuka melalui URL langsung, lalu di-refresh tanpa error.

Contoh URL untuk tes refresh langsung:

```text
https://ilyasistiqama.github.io/pdfkit-id/alat/gabung-pdf/
https://ilyasistiqama.github.io/pdfkit-id/faq/
```

Jika menemukan masalah, catat perangkat, browser, langkah pemicu, dan pesan error.

## 4. Daftarkan situs ke Google Search Console

### Tambahkan properti situs

1. Buka [Google Search Console](https://search.google.com/search-console/).
2. Masuk dengan akun Google yang akan mengelola situs.
3. Pilih **Add property / Tambahkan properti**.
4. Pilih **URL prefix / Awalan URL**, lalu masukkan:

   ```text
   https://ilyasistiqama.github.io/pdfkit-id/
   ```

5. Lanjutkan ke verifikasi dan pilih metode **HTML tag / Tag HTML**.
6. Salin tag verifikasi yang diberikan Google.

Metode URL prefix dapat diverifikasi melalui tag HTML. Properti Domain memakai
verifikasi DNS; untuk alamat proyek GitHub Pages ini gunakan URL prefix.
Lihat [panduan verifikasi resmi Google](https://support.google.com/webmasters/answer/9008080).

### Pasang tag verifikasi

Buka `index.html` di root proyek, lalu letakkan tag dari Google di dalam `<head>`,
misalnya sesudah `<meta charset="UTF-8" />`:

```html
<meta name="google-site-verification" content="TOKEN_DARI_GOOGLE" />
```

`TOKEN_DARI_GOOGLE` hanya contoh. Gunakan tag lengkap dengan token asli milik akunmu.
Jangan menempelkan contoh ini tanpa mengganti token.

Commit dan push perubahan:

```bash
git add index.html
git commit -m "seo: tambah verifikasi Google Search Console"
git push origin main
```

Setelah Actions berhasil, buka sumber halaman publik melalui **View page source /
Lihat sumber halaman**, lalu cari `google-site-verification`. Skrip prerender
proyek mempertahankan tag tambahan di `<head>` dari `index.html`.

Kembali ke Search Console dan klik **Verify / Verifikasi**. Jangan menghapus tag
setelah berhasil karena Google dapat memeriksa kepemilikan kembali.
Sumber: [verifikasi dengan tag HTML](https://support.google.com/webmasters/answer/9008080).

### Kirim sitemap

1. Pilih properti situs yang sudah terverifikasi.
2. Buka menu **Sitemaps / Peta situs**.
3. Masukkan `sitemap.xml` jika kolom sudah menampilkan prefix alamat situs.
   Jika kolom meminta URL lengkap, gunakan:

   ```text
   https://ilyasistiqama.github.io/pdfkit-id/sitemap.xml
   ```

4. Klik **Submit / Kirim**.
5. Periksa statusnya. Jika gagal, buka URL sitemap di browser dan baca detail error
   pada laporan Search Console.

Sitemap membantu Google menemukan halaman; status berhasil tidak berarti semua
halaman langsung terindeks. Google akan membaca ulang sitemap secara berkala,
sehingga tidak perlu mengirimnya ulang setiap selesai deploy.
Sumber: [laporan sitemap Google](https://support.google.com/webmasters/answer/7451001).

### Minta pengindeksan halaman utama

Gunakan **URL Inspection / Inspeksi URL**, masukkan URL beranda, lalu gunakan
**Request indexing / Minta pengindeksan** jika tersedia. Lakukan juga untuk beberapa
halaman alat atau artikel utama yang ingin diprioritaskan.

Proses crawling dapat memakan waktu beberapa hari sampai beberapa minggu.
Permintaan tidak menjamin halaman masuk hasil pencarian; mengulang permintaan
untuk URL yang sama tidak mempercepat proses.
Sumber: [panduan permintaan crawling Google](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).

## 5. Rutinitas setelah situs terdaftar

Sekali seminggu:

- Periksa laporan **Page indexing / Pengindeksan halaman** di Search Console.
- Periksa **Performance / Performa** untuk melihat impresi, klik, dan kata pencarian.
- Perbaiki tautan rusak atau error yang dilaporkan pengguna.
- Tambahkan atau perbarui artikel berdasarkan pertanyaan pengguna dan data pencarian.
- Ulangi tes singkat buka PDF, tanda tangan, dan unduh setelah perubahan fitur.

Utamakan panduan yang membantu pengguna menyelesaikan pekerjaan, misalnya cara
menyiapkan PNG transparan atau mengatur posisi tanda tangan di HP. Hindari membuat
banyak artikel yang isinya hampir sama hanya untuk mengejar kata kunci.

Analytics tambahan bersifat opsional. Saat penyedianya sudah dipilih, sesuaikan
konfigurasi proyek dan periksa bahwa skrip hanya dimuat setelah consent diberikan.

## 6. Persiapan monetisasi berikutnya

Setelah fungsi utama stabil, tinjau halaman Tentang, Privasi, Syarat, FAQ, serta
kejelasan kontak. Sesuaikan informasi privasi dengan layanan iklan dan analytics
yang benar-benar digunakan.

Untuk AdSense, ikuti alur penambahan dan verifikasi situs pada akunmu. Persetujuan
tetap ditentukan Google melalui peninjauan situs. Tidak ada jaminan diterima hanya
karena fitur dan halaman pendukung sudah tersedia.
Sumber: [menghubungkan situs ke AdSense](https://support.google.com/adsense/answer/7584263).

Konfigurasi proyek telah menyiapkan `VITE_ADSENSE_CLIENT` dan
`VITE_ADSENSE_SLOT_*`, tetapi penyiapan akun, verifikasi kepemilikan, dan persetujuan
situs tetap perlu diselesaikan. Jangan mengisi ID contoh. Baca juga
`docs/catatan-kerja-lanjutan.md` untuk pekerjaan yang menunggu akun atau domain.

Prioritas tahap sekarang: deploy email terbaru, tes perangkat nyata, verifikasi
Search Console, kirim sitemap, lalu pantau penggunaan situs.
