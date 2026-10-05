# Turnly

Aplikasi arisan digital: mencatat giliran, iuran, pengingat bayar, dan
riwayat siapa yang sudah mendapat giliran. Dibangun di atas Homeroom
(web app, vanilla JS + Tailwind yang dikompilasi saat build).

## Tahap 1 — Fondasi (sekarang)

Fondasi tampilan, belum ada alur produk:

- **Tema** — palet terang dan gelap dari brief (aksen kunyit `#F0A202` /
  `#F6B93B`, tinta indigo `#222B5A`), mengikuti tema Homeroom penonton.
  Token warna di `styles/tailwind-input.css`, nama token di
  `tailwind.config.js`.
- **Huruf** — Bricolage Grotesque (judul dan angka besar) dan Figtree
  (isi teks), dimuat dari Google Fonts dengan fallback system sans.
- **Komponen dasar** — tombol utama (sudut 14) dan sekunder (sudut 10),
  chip status bulat penuh yang selalu memuat teks, avatar status dengan
  empat pola yang dibedakan bukan hanya warna, baris daftar berpemisah
  garis tipis, blok hero bersudut tak simetris, bottom sheet dan toast
  dari UI kit platform (`usernode-native`).
- **Model domain** — `public/js/domain.js`: enum status, `formatRupiah`
  (rupiah bulat, tanpa desimal), hitungan telat yang selalu diturunkan
  dari tanggal jatuh tempo. Nama field sama persis dengan tabel database
  yang direncanakan, supaya tahap backend menempel tanpa penulisan ulang.
- **Data contoh** — `public/js/demo-data.js`: dua arisan demo (Arisan
  Keluarga Besar dan Arisan Kantor Lantai 3), dengan jangkar
  `DEMO_HARI_INI` agar label relatif ("2 hari lagi", "Telat 3 hari")
  stabil di semua tampilan.
- **Lokalisasi** — semua teks lewat `public/js/i18n.js` (bahasa Indonesia).

Layar fondasi di `/` adalah pratinjau komponen di atas data contoh; tahap
berikutnya menggantinya dengan Beranda dan Detail arisan yang sesungguhnya.

## Menjalankan

```sh
npm ci --include=dev
npm run build   # kompilasi Tailwind ke public/tailwind.css
npm start       # node server.js, PORT=3000
```

## Menambah perubahan

Buka aplikasi di Homeroom, ketuk ikon Homeroom lalu **Ask for a change**,
atau jalankan Claude Code langsung terhadap repo ini — mulai dari
`CLAUDE.md` untuk catatan khusus aplikasi ini.
