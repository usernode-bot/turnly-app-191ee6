/* Turnly localization. EVERY user-visible string goes through t() so a
 * second language is one more dictionary, never a sweep of the markup.
 * Indonesian only for now, per the product brief.
 */
(function () {
  'use strict';

  var dictionaries = {
    id: {
      'app.nama': 'Turnly',
      'app.tagline': 'Catat arisan dengan tenang',
      'fondasi.subjudul': 'Pratinjau fondasi tampilan dan data contoh',

      'iuran.label': 'Iuran yang harus dibayar',
      'iuran.jatuh_tempo.lagi': 'Jatuh tempo {tanggal}, {n} hari lagi',
      'iuran.jatuh_tempo.hari_ini': 'Jatuh tempo hari ini',
      'iuran.jatuh_tempo.lewat': 'Lewat jatuh tempo {n} hari',
      'iuran.lunas_semua': 'Semua iuran lunas',

      'arisan.anda': 'Arisan Anda',
      'arisan.lunas.dari': '{lunas} dari {total} lunas',
      'arisan.periode.info': 'Periode {nomor} dari {total}',
      'arisan.penerima': 'Penerima: {nama}',

      'papan.judul': 'Papan status iuran',

      'status.lunas': 'Lunas',
      'status.menunggu': 'Menunggu konfirmasi',
      'status.belum': 'Belum bayar',
      'status.telat': 'Telat {n} hari',
      'status.telat.1': 'Telat 1 hari',

      'ket.lunas': 'Iuran periode ini diterima',
      'ket.menunggu': 'Bukti terkirim, menunggu konfirmasi admin',
      'ket.belum': 'Belum ada bukti iuran',
      'ket.telat': 'Lewat jatuh tempo',
      'keterangan.judul': 'Keterangan status',

      'tag.anda': 'Anda',
      'tag.admin': 'Admin',

      'aksi.bayar': 'Bayar iuran',
      'bayar.judul': 'Bayar iuran {arisan}',
      'bayar.transfer_ke': 'Transfer ke',
      'bayar.salin': 'Salin nomor rekening',
      'bayar.batal': 'Batal',

      'toast.rekening_tersalin': 'Nomor rekening disalin',
      'demo.catatan': 'Tampilan berisi data contoh untuk mode demo.',
    },
  };

  var locale = 'id';

  function interpolate(text, params) {
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, function (m, key) {
      return Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : m;
    });
  }

  function t(key, params) {
    var dict = dictionaries[locale] || {};
    var text = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
    return interpolate(text, params);
  }

  document.documentElement.lang = locale;

  window.TurnlyI18n = { t: t, locale: locale };
})();
