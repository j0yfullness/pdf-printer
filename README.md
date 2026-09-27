# PDF Printer

[![Live Demo](https://img.shields.io/badge/Live_Demo-j0yfullness.github.io%2Fpdf--printer-brightgreen?style=flat-square)](https://j0yfullness.github.io/pdf-printer/)
[![GitHub Pages](https://img.shields.io/badge/Hosted_on-GitHub_Pages-222?style=flat-square&logo=github)](https://j0yfullness.github.io/pdf-printer/)
![HTML](https://img.shields.io/badge/HTML-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
[![pdf-lib](https://img.shields.io/badge/pdf--lib-1.17-4f46e5?style=flat-square)](https://pdf-lib.js.org/)
[![pdf.js](https://img.shields.io/badge/pdf.js-3.11-c84b2f?style=flat-square)](https://mozilla.github.io/pdf.js/)

Aplikasi web statis untuk mencetak PDF — satu file (solo) atau banyak file sekaligus (bulk). Semua proses berjalan di browser, tidak ada file yang diunggah ke server.

**Demo live:** https://j0yfullness.github.io/pdf-printer/

## Fitur

- Tambah banyak PDF via drag & drop atau pemilih file.
- Mode cetak:
  - **Merge** — semua PDF digabung jadi satu dokumen, lalu satu dialog cetak.
  - **Per-file** — tiap PDF dicetak terpisah, berurutan lewat antrean dengan progres.
  - **Keduanya** — pilih metode saat menekan tombol Cetak.
- Pengaturan cetak: ukuran halaman (A4/Letter/Legal/F4/ikuti konten), orientasi (otomatis/portrait/landscape), skala 25–200%, margin (mm), perkecil otomatis agar tidak terpotong.
- Rentang halaman per file (mis. `1-3,5`).
- Ubah urutan file (drag atau tombol ▲▼), hapus file.
- Pratinjau hasil per halaman (render malas), zoom, tema terang/gelap.
- Unduh hasil sebagai PDF, atau cetak langsung.

## Menjalankan

**Cara termudah:** buka [demo live](https://j0yfullness.github.io/pdf-printer/) — tidak perlu instal apa pun.

**Lokal:** butuh server statis (bukan `file://`) karena pdf.js memakai Web Worker dari CDN.

```powershell
python -m http.server 8777
# lalu buka http://127.0.0.1:8777/
```

## Teknologi

- [pdf-lib](https://pdf-lib.js.org/) — memuat, menggabungkan, dan mengubah ukuran/margin halaman.
- [pdf.js](https://mozilla.github.io/pdf.js/) — merender pratinjau ke canvas.
- Keduanya dimuat dari CDN (cdnjs), jadi butuh koneksi internet saat pertama dibuka.

## Batasan

- PDF terenkripsi / berkata sandi tidak didukung (ditolak dengan pesan).
- Anotasi, isian formulir, dan tautan tidak dipertahankan pada hasil gabungan (hanya tampilan halaman yang dicetak).
- Cetak langsung memakai dialog cetak browser; jumlah dialog berulang pada mode per-file bergantung pada izin browser.
- Untuk pratinjau yang lebih ringan pada dokumen besar, gunakan zoom lebih kecil.
