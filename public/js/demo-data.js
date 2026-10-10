/* Turnly demo datasets — obviously fake, for the demo mode only.
 *
 * The shapes mirror the future database tables (arisan, anggota_arisan,
 * periode, iuran) field for field. build(hariIni) generates the dataset
 * against an anchor DAY, offsetting every date from it, so the relative
 * labels ("2 hari lagi", "Telat 3 hari") tell the same story on any day
 * with fresh dates — the family group's due date is always 2 days away,
 * the office group's late member is always 3 days late. The default
 * anchor is today in Asia/Jakarta, pinned for one page load with
 * ?anchor=YYYY-MM-DD (deterministic screenshots and tests); an invalid
 * anchor silently falls back to today. The declared rules
 * (aturan_jatuh_tempo: "the 7th", "Fridays") stay in the data untouched —
 * nothing renders them yet — so the concrete round dates are offsets from
 * the anchor rather than rule-derived; acceptable while the data is
 * demo-only. Nothing in app logic keys off these rows — real data
 * replaces them (and this generator retires) at the backend stage.
 */
(function () {
  'use strict';

  var d = window.TurnlyDomain;

  // The member the demo viewer "is": Bu Rina, present in both groups.
  var PENGGUNA_DEMO_ID = 'demo-user-rina';

  function build(hariIni) {
    d.parseHari(hariIni); // reject a malformed anchor early
    // A date `n` days from the anchor day.
    var tgl = function (n) { return d.tanggalPlus(hariIni, n); };

    function anggota(arisanId, nomor, nama, peran, userId) {
      return {
        id: arisanId + '-a' + nomor,
        arisan_id: arisanId,
        user_id: userId || null, // null = anggota manual (belum pakai aplikasi)
        nama_tampil: nama,
        nomor_hp: '08120000' + String(1000 + nomor),
        urutan_giliran: nomor,
        peran: peran,
      };
    }

    function iuran(arisanId, nomor, anggotaId, status) {
      return {
        id: arisanId + '-i' + nomor,
        periode_id: arisanId + '-periode-aktif',
        anggota_id: anggotaId,
        status: status,
      };
    }

    // ── Arisan Keluarga Besar ──────────────────────────────────────────────
    // Rp500.000 per bulan, jatuh tempo tiap tanggal 7. Periode 4 dari 10,
    // penerima Bu Sari. 7 lunas, Pak Hendra menunggu konfirmasi, Bu Rina
    // dan Pak Joko belum bayar. Rounds land on 30-day steps back from the
    // active due date (+2 days from the anchor).
    var keluargaBesar = {
      id: 'demo-kb',
      nama: 'Arisan Keluarga Besar',
      nominal: 500000,
      periode: 'bulanan',
      aturan_jatuh_tempo: { tipe: 'tanggal', nilai: 7 },
      tanggal_mulai: tgl(-88),
      total_periode: 10,
      rekening_kas: 'BCA 1234567890 a.n. Kas Arisan Keluarga Besar (demo)',
      status: 'berjalan',
      admin_id: 'demo-kb-a3',
      // Rounds 1-3 already finished: the pot was handed to each recipient.
      periode_lalu: [
        {
          id: 'demo-kb-periode-1',
          arisan_id: 'demo-kb',
          nomor: 1,
          tanggal_jatuh_tempo: tgl(-88),
          penerima_anggota_id: 'demo-kb-a1',
          status: 'dana_diserahkan',
        },
        {
          id: 'demo-kb-periode-2',
          arisan_id: 'demo-kb',
          nomor: 2,
          tanggal_jatuh_tempo: tgl(-58),
          penerima_anggota_id: 'demo-kb-a2',
          status: 'dana_diserahkan',
        },
        {
          id: 'demo-kb-periode-3',
          arisan_id: 'demo-kb',
          nomor: 3,
          tanggal_jatuh_tempo: tgl(-28),
          penerima_anggota_id: 'demo-kb-a3',
          status: 'dana_diserahkan',
        },
      ],
      anggota: [
        anggota('demo-kb', 1, 'Pak Budi', 'anggota'),
        anggota('demo-kb', 2, 'Bu Wati', 'anggota'),
        anggota('demo-kb', 3, 'Pak Anto', 'admin'),
        anggota('demo-kb', 4, 'Bu Sari', 'anggota'),
        anggota('demo-kb', 5, 'Bu Rina', 'anggota', PENGGUNA_DEMO_ID),
        anggota('demo-kb', 6, 'Bu Dewi', 'anggota'),
        anggota('demo-kb', 7, 'Pak Hendra', 'anggota'),
        anggota('demo-kb', 8, 'Bu Lestari', 'anggota'),
        anggota('demo-kb', 9, 'Pak Joko', 'anggota'),
        anggota('demo-kb', 10, 'Bu Maya', 'anggota'),
      ],
      periode_aktif: {
        id: 'demo-kb-periode-aktif',
        arisan_id: 'demo-kb',
        nomor: 4,
        tanggal_jatuh_tempo: tgl(2),
        penerima_anggota_id: 'demo-kb-a4',
        status: 'berjalan',
      },
      iuran: [
        iuran('demo-kb', 1, 'demo-kb-a1', 'lunas'),
        iuran('demo-kb', 2, 'demo-kb-a2', 'lunas'),
        iuran('demo-kb', 3, 'demo-kb-a3', 'lunas'),
        iuran('demo-kb', 4, 'demo-kb-a4', 'lunas'),
        iuran('demo-kb', 5, 'demo-kb-a5', 'belum'), // Bu Rina, pengguna
        iuran('demo-kb', 6, 'demo-kb-a6', 'lunas'),
        iuran('demo-kb', 7, 'demo-kb-a7', 'menunggu'), // Pak Hendra
        iuran('demo-kb', 8, 'demo-kb-a8', 'lunas'),
        iuran('demo-kb', 9, 'demo-kb-a9', 'belum'), // Pak Joko
        iuran('demo-kb', 10, 'demo-kb-a10', 'lunas'),
      ],
    };

    // ── Arisan Kantor Lantai 3 ─────────────────────────────────────────────
    // Rp100.000 per minggu, jatuh tempo tiap Jumat. Periode 2 dari 6,
    // penerima Mba Tika. Lima lunas, Mba Putri telat 3 hari (jatuh tempo
    // 3 hari sebelum hari anchor). Rounds land a week apart.
    var kantorLantai3 = {
      id: 'demo-k3',
      nama: 'Arisan Kantor Lantai 3',
      nominal: 100000,
      periode: 'mingguan',
      aturan_jatuh_tempo: { tipe: 'hari', nilai: 'Jumat' },
      tanggal_mulai: tgl(-10),
      total_periode: 6,
      rekening_kas: 'Mandiri 9876543210 a.n. Kas Arisan Kantor (demo)',
      status: 'berjalan',
      admin_id: 'demo-k3-a5',
      periode_lalu: [
        {
          id: 'demo-k3-periode-1',
          arisan_id: 'demo-k3',
          nomor: 1,
          tanggal_jatuh_tempo: tgl(-10),
          penerima_anggota_id: 'demo-k3-a1',
          status: 'dana_diserahkan',
        },
      ],
      anggota: [
        anggota('demo-k3', 1, 'Mas Yoga', 'anggota'),
        anggota('demo-k3', 2, 'Mba Tika', 'anggota'),
        anggota('demo-k3', 3, 'Bu Rina', 'anggota', PENGGUNA_DEMO_ID),
        anggota('demo-k3', 4, 'Mba Nia', 'anggota'),
        anggota('demo-k3', 5, 'Mas Dimas', 'admin'),
        anggota('demo-k3', 6, 'Mba Putri', 'anggota'),
      ],
      periode_aktif: {
        id: 'demo-k3-periode-aktif',
        arisan_id: 'demo-k3',
        nomor: 2,
        tanggal_jatuh_tempo: tgl(-3),
        penerima_anggota_id: 'demo-k3-a2',
        status: 'berjalan',
      },
      iuran: [
        iuran('demo-k3', 1, 'demo-k3-a1', 'lunas'),
        iuran('demo-k3', 2, 'demo-k3-a2', 'lunas'),
        iuran('demo-k3', 3, 'demo-k3-a3', 'lunas'), // Bu Rina, pengguna
        iuran('demo-k3', 4, 'demo-k3-a4', 'lunas'),
        iuran('demo-k3', 5, 'demo-k3-a5', 'lunas'),
        iuran('demo-k3', 6, 'demo-k3-a6', 'belum'), // Mba Putri -> telat 3 hari
      ],
    };

    return { arisan: [keluargaBesar, kantorLantai3] };
  }

  // The anchor for this page load: ?anchor=YYYY-MM-DD when it parses,
  // otherwise today in Asia/Jakarta. Guarded so the Node/vm sandbox, which
  // has no `location`, still loads the module.
  function anchorHariIni() {
    try {
      if (typeof location !== 'undefined' && location.search) {
        var m = /[?&]anchor=(\d{4}-\d{2}-\d{2})(?:&|$)/.exec(location.search);
        if (m) {
          d.parseHari(m[1]);
          return m[1];
        }
      }
    } catch (e) { /* malformed anchor: today it is */ }
    return d.tanggalJakarta();
  }

  var DEMO_HARI_INI = anchorHariIni();
  var hasil = build(DEMO_HARI_INI);

  window.TurnlyDemoData = {
    DEMO_HARI_INI: DEMO_HARI_INI,
    PENGGUNA_DEMO_ID: PENGGUNA_DEMO_ID,
    build: build,
    arisan: hasil.arisan,
  };
})();
