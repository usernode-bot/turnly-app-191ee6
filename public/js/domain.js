/* Turnly domain layer: pure functions and status enums, no DOM.
 *
 * Field names deliberately mirror the future database tables (users,
 * arisan, anggota_arisan, periode, iuran) from the product brief, so the
 * backend stage can slot in without renaming anything.
 *
 * Money is always an integer number of rupiah — never a float. "Telat" is
 * never stored; it is derived from the periode's due date at render time.
 * All schedule arithmetic is on calendar dates in Asia/Jakarta (UTC+7, no
 * daylight saving), so plain YYYY-MM-DD day counts are exact.
 */
(function () {
  'use strict';

  var IURAN_STATUS = {
    BELUM: 'belum',
    MENUNGGU: 'menunggu',
    LUNAS: 'lunas',
    DITOLAK: 'ditolak',
  };

  var PERIODE_STATUS = {
    BERJALAN: 'berjalan',
    DANA_TERKUMPUL: 'dana_terkumpul',
    DANA_DISERAHKAN: 'dana_diserahkan',
  };

  var BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  function parseHari(iso) {
    // Parse 'YYYY-MM-DD' as UTC so day arithmetic is timezone-proof.
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) throw new Error('Tanggal harus berformat YYYY-MM-DD: ' + iso);
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  // Whole days dari -> hingga (positive when hingga is later).
  function selisihHari(dari, hingga) {
    return Math.round((parseHari(hingga) - parseHari(dari)) / 86400000);
  }

  function formatRupiah(nominal) {
    if (!Number.isInteger(nominal)) {
      throw new Error('Nominal harus bilangan bulat rupiah: ' + nominal);
    }
    return 'Rp' + nominal.toLocaleString('id-ID');
  }

  // '2026-10-07' -> '7 Okt' (Indonesian short date, no year).
  function formatTanggalPendek(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) throw new Error('Tanggal harus berformat YYYY-MM-DD: ' + iso);
    return Number(m[3]) + ' ' + BULAN_PENDEK[Number(m[2]) - 1];
  }

  // Days past the due date; 0 when not yet due. Derived, never stored.
  function hitungTelatHari(jatuhTempo, hariIni) {
    var n = selisihHari(jatuhTempo, hariIni);
    return n > 0 ? n : 0;
  }

  // Resolve how a member's iuran should be PRESENTED this periode:
  // { key: 'lunas'|'menunggu'|'belum'|'telat', telatHari }. A 'belum'
  // iuran past its due date presents as 'telat'. 'ditolak' returns to
  // 'belum' presentation until the member resends proof.
  function statusIuranTampil(iuran, periode, hariIni) {
    var status = iuran ? iuran.status : IURAN_STATUS.BELUM;
    if (status === IURAN_STATUS.LUNAS) return { key: 'lunas', telatHari: 0 };
    if (status === IURAN_STATUS.MENUNGGU) return { key: 'menunggu', telatHari: 0 };
    var telat = hitungTelatHari(periode.tanggal_jatuh_tempo, hariIni);
    return { key: telat > 0 ? 'telat' : 'belum', telatHari: telat };
  }

  // The iuran row for one anggota in the arisan's active periode.
  function iuranUntukAnggota(arisan, anggotaId) {
    var periodeId = arisan.periode_aktif && arisan.periode_aktif.id;
    var rows = arisan.iuran || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].anggota_id === anggotaId && rows[i].periode_id === periodeId) return rows[i];
    }
    return null;
  }

  function anggotaUrut(arisan) {
    return (arisan.anggota || []).slice().sort(function (a, b) {
      return a.urutan_giliran - b.urutan_giliran;
    });
  }

  function anggotaDenganId(arisan, anggotaId) {
    var found = (arisan.anggota || []).filter(function (a) { return a.id === anggotaId; });
    return found[0] || null;
  }

  function hitungLunas(arisan) {
    var periodeId = arisan.periode_aktif && arisan.periode_aktif.id;
    return (arisan.iuran || []).filter(function (r) {
      return r.periode_id === periodeId && r.status === IURAN_STATUS.LUNAS;
    }).length;
  }

  // Total collected this periode: only confirmed lunas rows count.
  function totalTerkumpul(arisan) {
    return hitungLunas(arisan) * arisan.nominal;
  }

  // The periode's recipient anggota.
  function penerimaPeriode(arisan) {
    if (!arisan.periode_aktif) return null;
    return anggotaDenganId(arisan, arisan.periode_aktif.penerima_anggota_id);
  }

  window.TurnlyDomain = {
    IURAN_STATUS: IURAN_STATUS,
    PERIODE_STATUS: PERIODE_STATUS,
    selisihHari: selisihHari,
    hitungTelatHari: hitungTelatHari,
    formatRupiah: formatRupiah,
    formatTanggalPendek: formatTanggalPendek,
    statusIuranTampil: statusIuranTampil,
    iuranUntukAnggota: iuranUntukAnggota,
    anggotaUrut: anggotaUrut,
    anggotaDenganId: anggotaDenganId,
    hitungLunas: hitungLunas,
    totalTerkumpul: totalTerkumpul,
    penerimaPeriode: penerimaPeriode,
  };
})();
