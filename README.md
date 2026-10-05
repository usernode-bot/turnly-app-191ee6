# Turnly

Aplikasi arisan digital: mencatat giliran, iuran, pengingat bayar, dan
riwayat siapa yang sudah mendapat giliran. Dibangun di atas Homeroom
(web app, vanilla JS + Tailwind yang dikompilasi saat build).

## Tahap 2 — Layar utama (sekarang)

Dua layar inti di atas data contoh (demo), tanpa backend:

- **Beranda (`/`)** — sapaan sesuai waktu Jakarta, blok hero iuran yang
  harus dibayar (sudut tak simetris, jumlah besar), daftar "Arisan Anda"
  dengan lingkaran status mini dan chip berlabel, tombol "Buat arisan
  baru", pengaturan bahasa.
- **Detail arisan (`/arisan/<id>`)** — header melekat dengan tombol
  kembali, **lingkaran giliran**: avatar anggota tersusun searah jarum
  jam dari atas, cincin kuning di penerima periode ini, tengah lingkaran
  berisi giliran, nama penerima, dan nominal; garis terkumpul dan
  progres; keterangan status; tiga tab **Status / Giliran / Riwayat**;
  bilah aksi bawah yang melekat dan berubah menurut peran dan kondisi.
- **Peran demo** — di Detail arisan, saklar "Lihat sebagai (demo)"
  menukar tampilan anggota (bayar iuran, catatan menunggu konfirmasi)
  dan admin (Konfirmasi, Tolak dengan alasan, Ingatkan per baris, dan
  aksi "Ingatkan N anggota" di bilah bawah). Perubahan status terjadi di
  memori; muat ulang halaman untuk kembali ke data contoh.
- **Lembar bayar iuran** — kotak rekening kas dengan tombol salin, pemilih
  foto bukti, dan tombol "Kirim bukti" yang aktif setelah foto dipilih;
  setelah terkirim, status berubah menjadi "Menunggu konfirmasi".

## Tahap 1 — Fondasi

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
- **Lokalisasi** — semua teks lewat `public/js/i18n.js`; kata-katanya di
  `public/js/messages/en.js` dan `id.js` (format ICU, kunci sama di kedua
  berkas). Bahasa bawaan Inggris, bahasa Indonesia sebagai pilihan lewat
  pengaturan "Language" di layar (English / Bahasa Indonesia / Follow
  system), tersimpan di perangkat. `npm test` menjaga kunci tetap sepadan,
  bentuk jamak, dan tidak ada teks yang tertulis langsung di markup.

Layar fondasi Tahap 1 sudah digantikan oleh Beranda dan Detail arisan;
komponen dasar, model domain, dan data contohnya tetap dipakai kedua
layar tersebut.

## Menjalankan

```sh
npm ci --include=dev
npm run build   # kompilasi Tailwind ke public/tailwind.css
npm test        # uji lokalisasi dan domain (node --test)
npm start       # node server.js, PORT=3000
```

## Menambah perubahan

Buka aplikasi di Homeroom, ketuk ikon Homeroom lalu **Ask for a change**,
atau jalankan Claude Code langsung terhadap repo ini — mulai dari
`CLAUDE.md` untuk catatan khusus aplikasi ini.
