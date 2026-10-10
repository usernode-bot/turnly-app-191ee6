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
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TurnlyDomain = api;
})(typeof window !== 'undefined' ? window : null, function () {
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

  // THE one money formatter. Rupiah is always "Rp" plus dot thousands
  // (Rp500.000) in every UI language, because the currency is rupiah and the
  // users are in Indonesia. Should an English comma separator ever be wanted,
  // this is the only line to change.
  function formatRupiah(nominal) {
    if (!Number.isInteger(nominal)) {
      throw new Error('Nominal harus bilangan bulat rupiah: ' + nominal);
    }
    return 'Rp' + nominal.toLocaleString('id-ID');
  }

  // '2026-10-07' -> 'Oct 7' (en) or '7 Okt' (id): a short date without the
  // year, in the active UI language. The ISO string is a Jakarta calendar
  // date parsed as UTC midnight, so formatting in UTC gives that same day.
  function formatTanggalPendek(iso, locale) {
    var instant = parseHari(iso);
    return new Intl.DateTimeFormat(locale || 'en', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(instant));
  }

  // Days past the due date; 0 when not yet due. Derived, never stored.
  function hitungTelatHari(jatuhTempo, hariIni) {
    var n = selisihHari(jatuhTempo, hariIni);
    return n > 0 ? n : 0;
  }

  // The greeting band for an hour of the Jakarta clock: pagi 04-10,
  // siang 11-14, sore 15-17, malam otherwise. The screen passes the hour
  // it read in Asia/Jakarta; this only maps it, so the bands stay testable.
  function bandSapa(jam) {
    if (jam >= 4 && jam <= 10) return 'pagi';
    if (jam >= 11 && jam <= 14) return 'siang';
    if (jam >= 15 && jam <= 17) return 'sore';
    return 'malam';
  }

  // The current hour in Asia/Jakarta (UTC+7, no daylight saving).
  function jamJakarta(kini) {
    return Number(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: 'numeric',
      hour12: false,
    }).format(kini || new Date()));
  }

  // Today in Asia/Jakarta as a YYYY-MM-DD calendar date — the moving
  // stand-in for the demo data's anchor day (demo-data.js). Built from
  // formatToParts so the order a locale prints the parts in cannot matter.
  function tanggalJakarta(kini) {
    var parts = new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(kini || new Date());
    var nilai = {};
    parts.forEach(function (p) { nilai[p.type] = p.value; });
    return nilai.year + '-' + nilai.month + '-' + nilai.day;
  }

  // A whole number of days from a YYYY-MM-DD calendar date. UTC-midnight day
  // arithmetic is exact here (no daylight saving): '2026-10-05', -3 ->
  // '2026-10-02'.
  function tanggalPlus(iso, days) {
    return new Date(parseHari(iso) + days * 86400000).toISOString().slice(0, 10);
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

  return {
    IURAN_STATUS: IURAN_STATUS,
    parseHari: parseHari,
    PERIODE_STATUS: PERIODE_STATUS,
    selisihHari: selisihHari,
    hitungTelatHari: hitungTelatHari,
    bandSapa: bandSapa,
    jamJakarta: jamJakarta,
    tanggalJakarta: tanggalJakarta,
    tanggalPlus: tanggalPlus,
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
});
