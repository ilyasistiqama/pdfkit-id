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
- [ ] Tombol unduh di kartu tanda tangan tersimpan menghasilkan PNG transparan, dan PNG itu
      bisa diimpor ulang lewat "Unggah PNG" (cek juga di iPhone/Safari).
- [ ] PDF hasil unduhan dapat dibuka dan posisi tanda tangannya sesuai tampilan.
- [ ] Alat gabung PDF menghasilkan dokumen dengan urutan halaman yang benar.
- [ ] Alat pisah dan kompres PDF menghasilkan file yang dapat dibuka.
- [ ] Putar PDF: pilihan "Genap" pada PDF 1 halaman menampilkan pesan, bukan memutar halaman.
- [ ] Watermark miring tampil tepat di tengah halaman, termasuk pada halaman landscape/diputar.
- [ ] Tanda Tangan Massal: preset kanan-bawah dan tengah dengan lebar 60% tetap di dalam halaman.
- [ ] PDF hasil scan atau yang pernah di-crop: posisi tanda tangan di hasil unduhan sama dengan
      pratinjau.
- [ ] Selama iklan belum aktif, panel “Pilihan privasi” dan tautan “Pengaturan privasi” tidak
      muncul.
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

### Iklan di alamat github.io

Selama PDFKit masih di `https://ilyasistiqama.github.io/pdfkit-id/`, biarkan variabel
AdSense kosong. `ilyasistiqama.github.io` dipakai bersama oleh beberapa proyek, dan
AdSense menerima pengajuan untuk alamat `ilyasistiqama.github.io` tanpa path `/pdfkit-id/`.
`ads.txt` untuk alamat itu juga perlu tersedia di `https://ilyasistiqama.github.io/ads.txt`.
[Format URL AdSense](https://support.google.com/adsense/answer/2784438) ·
[Panduan crawling ads.txt](https://support.google.com/adsense/answer/7679060)

### AdSense untuk PDFKit di subdomain

Setelah domain tersedia, gunakan `muis.life` untuk situs profil bebas iklan dan
`pdfkit.muis.life` untuk PDFKit dengan unit iklan manual.

1. Arahkan `pdfkit.muis.life` ke deployment PDFKit. Di repo PDFKit, set variabel GitHub
   Actions `BASE_PATH=/` dan `VITE_SITE_URL=https://pdfkit.muis.life`, lalu deploy ulang.
2. Di **AdSense → Sites → New site**, daftarkan domain utama `muis.life`. Pilih verifikasi
   **meta tag** dan pasang tag dari AdSense di `<head>` halaman profil `muis.life`. Gunakan
   tag verifikasi saja di profil. Ajukan peninjauan dan tunggu status **Ready**.
   [Aturan situs dan subdomain](https://support.google.com/adsense/answer/12170421) ·
   [Panduan verifikasi dan peninjauan](https://support.google.com/adsense/answer/12169212)
3. Publikasikan baris `ads.txt` dari AdSense di `https://muis.life/ads.txt`. Build PDFKit
   dapat menghasilkan file yang sama di `https://pdfkit.muis.life/ads.txt`. Crawler
   AdSense mulai dari domain utama, jadi pastikan file di `muis.life` dapat diakses publik.
   [Panduan crawling ads.txt](https://support.google.com/adsense/answer/7679060)
4. Biarkan **Auto ads** mati. Pasang CMP TCF yang tersertifikasi Google dan mendukung pemasangan skrip mandiri, lalu isi `VITE_ADSENSE_CMP_SCRIPT` dengan URL HTTPS dari penyedia. Setelah situs **Ready**, isi ID publisher dan unit hanya di repo PDFKit. ID saja tidak mengaktifkan iklan. Unit hanya dicoba pada katalog dan panduan setelah persetujuan pengunjung dan sinyal CMP. [Persyaratan CMP Google](https://support.google.com/adsense/answer/13554116)
5. Verifikasi permintaan jaringan pada kunjungan baru, penolakan, persetujuan, dan pencabutan. Uji juga pembukaan alat dari panduan dan pastikan dokumen dibuka pada halaman baru tanpa skrip iklan.

### Privasi dan penyimpanan browser

Gambar tanda tangan, preset workflow, dan template bisa dipakai dalam tab berjalan. Untuk mengizinkan penyimpanan antarsesi pada origin HTTPS khusus, set `BASE_PATH=/` dan `VITE_SIGNATURE_STORAGE_ORIGIN` dengan origin tanpa path, misalnya `https://pdfkit.muis.life`. Jangan set variabel ini untuk host yang juga dipakai proyek lain. Penyimpanan gambar tetap harus dipilih pengguna dan penyimpanan data sensitif dibatasi ke tab jika iklan dikonfigurasi. Salinan lama bisa ditinjau dan dihapus lewat halaman Privasi.

Analitik dan iklan punya pilihan terpisah. Uji pengiriman dan pencabutan analitik dengan penyedia pilihan sebelum produksi. Saat izin analitik dicabut, frame terisolasi ditutup tanpa memuat ulang alat.

### Status pendaftaran PSE

Konfirmasikan klasifikasi PDFKit kepada Komdigi berdasarkan bentuk pengelola, layanan publik, dan data yang diproses. Jika klasifikasinya mewajibkan pendaftaran, siapkan data pengelola dan ikuti prosedur OSS sebelum tahap operasional yang relevan. [Kriteria PSE Lingkup Privat](https://pse.komdigi.go.id/panduan/kriteria-pendaftaran-pse-lingkup-privat)

### Konfigurasi AdSense

Konfigurasi proyek telah menyiapkan `VITE_ADSENSE_CLIENT`, `VITE_ADSENSE_SLOT_*`, dan
`VITE_ADSENSE_CMP_SCRIPT`, tetapi penyiapan akun, verifikasi kepemilikan, dan persetujuan
situs tetap perlu diselesaikan. Jangan mengisi ID contoh. Baca juga
`docs/catatan-kerja-lanjutan.md` untuk pekerjaan yang menunggu akun atau domain.

Prioritas tahap sekarang: deploy email terbaru, tes perangkat nyata, verifikasi
Search Console, kirim sitemap, lalu pantau penggunaan situs.
