# PDF Printer

Aplikasi web statis untuk mencetak PDF — satu file (solo) atau banyak file sekaligus (bulk). Semua proses berjalan di browser, tidak ada file yang diunggah ke server.

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

Butuh server statis (bukan `file://`) karena pdf.js memakai Web Worker dari CDN.

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
