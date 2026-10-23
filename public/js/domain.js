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

  // The member the organizer should chase first this round: the first
  // anggota in turn order whose contribution still presents as 'belum' or
  // 'telat'. A missing iuran row and a rejected ('ditolak') row both
  // present as 'belum', so they count; 'menunggu' (proof already sent)
  // and 'lunas' do not. null when there is no active periode or nobody
  // is left to pay.
  function anggotaBerikutnyaBayar(arisan, hariIni) {
    if (!arisan.periode_aktif) return null;
    var urut = anggotaUrut(arisan);
    for (var i = 0; i < urut.length; i++) {
      var key = statusIuranTampil(
        iuranUntukAnggota(arisan, urut[i].id), arisan.periode_aktif, hariIni
      ).key;
      if (key === 'belum' || key === 'telat') return urut[i];
    }
    return null;
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

  // Group initials for an avatar, from the group's name: drop a leading
  // "Arisan" when other words remain, keep all-digit words whole ('3' in
  // Kantor Lantai 3), uppercase the rest, cap at 3 characters.
  function inisialGrup(nama) {
    var words = nama.split(/\s+/).filter(Boolean);
    if (words.length > 1 && words[0].toLowerCase() === 'arisan') words = words.slice(1);
    return words.map(function (w) {
      return /^\d+$/.test(w) ? w : w.charAt(0).toUpperCase();
    }).join('').slice(0, 3);
  }

  // When a member receives the pot: { nomor, keadaan: 'nanti'|'sekarang'|
  // 'lewat', tanggal }. The date of a future turn follows the demo rounds'
  // spacing from the active round's due date (30-day steps for 'bulanan',
  // 7 for 'mingguan'); a past turn gets no date.
  function giliranPengguna(arisan, anggota) {
    var aktif = arisan.periode_aktif;
    var nomor = anggota && anggota.urutan_giliran;
    if (!aktif || nomor === undefined || nomor === null) return null;
    var keadaan;
    if (nomor > aktif.nomor) keadaan = 'nanti';
    else if (nomor === aktif.nomor) keadaan = 'sekarang';
    else keadaan = 'lewat';
    var tanggal = null;
    if (keadaan === 'nanti') {
      var langkah = arisan.periode === 'mingguan' ? 7 : 30;
      tanggal = tanggalPlus(aktif.tanggal_jatuh_tempo, (nomor - aktif.nomor) * langkah);
    }
    return { nomor: nomor, keadaan: keadaan, tanggal: tanggal };
  }

  // '2026-12-07' -> 'Des 2026' (id) or 'Dec 2026' (en): the month and year
  // of a Jakarta calendar day, parsed and formatted in UTC like the other
  // date formatters.
  function formatBulanTahun(iso, locale) {
    var instant = parseHari(iso);
    return new Intl.DateTimeFormat(locale || 'en', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(instant));
  }

  // A finished periode's payments, in turn order: every member of the
  // arisan with that periode's iuran row (or null when they have none) and
  // how it presents now. Read-only; used by the History tab.
  function pembayaranPeriode(arisan, periode, hariIni) {
    if (!periode) return [];
    var rows = arisan.iuran || [];
    return anggotaUrut(arisan).map(function (a) {
      var iuran = null;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].periode_id === periode.id && rows[i].anggota_id === a.id) {
          iuran = rows[i];
          break;
        }
      }
      return { anggota: a, iuran: iuran, status: statusIuranTampil(iuran, periode, hariIni) };
    });
  }

  // A phone number in the form wa.me expects: digits only, with the
  // Indonesian country code. A local 08... becomes 628..., an already
  // international 62... is kept, and a bare 8... gains the 62. Anything
  // else, or a result outside 10-15 digits, returns null so a member with
  // no usable number simply gets no reminder link.
  function nomorWhatsApp(nomorHp) {
    if (nomorHp === null || nomorHp === undefined) return null;
    var digit = String(nomorHp).replace(/\D/g, '');
    if (!digit) return null;
    var nomor;
    if (digit.indexOf('62') === 0) nomor = digit;
    else if (digit.charAt(0) === '0') nomor = '62' + digit.slice(1);
    else if (digit.charAt(0) === '8') nomor = '62' + digit;
    else return null;
    if (nomor.length < 10 || nomor.length > 15) return null;
    return nomor;
  }

  // How urgently the viewer's own payment should lead the Home list: late
  // first, then unpaid, then awaiting confirmation, then paid. Anything
  // with no status (the viewer is not a member, say) sorts last.
  var URUTAN_STATUS = { telat: 0, belum: 1, menunggu: 2, lunas: 3 };

  // A new array ordered by each item's status key (see URUTAN_STATUS),
  // with equal and unknown statuses keeping their original order. The
  // input array is never mutated.
  function urutkanMenurutStatus(daftar) {
    return (daftar || []).map(function (item, index) {
      return { item: item, index: index };
    }).sort(function (a, b) {
      var ka = a.item && a.item.status && a.item.status.key;
      var kb = b.item && b.item.status && b.item.status.key;
      var ra = ka in URUTAN_STATUS ? URUTAN_STATUS[ka] : 4;
      var rb = kb in URUTAN_STATUS ? URUTAN_STATUS[kb] : 4;
      if (ra !== rb) return ra - rb;
      return a.index - b.index;
    }).map(function (entry) { return entry.item; });
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
    anggotaBerikutnyaBayar: anggotaBerikutnyaBayar,
    anggotaDenganId: anggotaDenganId,
    hitungLunas: hitungLunas,
    totalTerkumpul: totalTerkumpul,
    pembayaranPeriode: pembayaranPeriode,
    penerimaPeriode: penerimaPeriode,
    nomorWhatsApp: nomorWhatsApp,
    URUTAN_STATUS: URUTAN_STATUS,
    urutkanMenurutStatus: urutkanMenurutStatus,
    inisialGrup: inisialGrup,
    giliranPengguna: giliranPengguna,
    formatBulanTahun: formatBulanTahun,
  };
});
