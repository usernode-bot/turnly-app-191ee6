/* Turnly messages: Bahasa Indonesia (the second language).
 *
 * Same keys and placeholders as en.js; tests/messages.test.js checks that.
 * Indonesian has no plural forms, so a plain {days} variable is the correct
 * ICU form here. No em dashes in any message.
 */
(function (root, factory) {
  var messages = factory();
  if (typeof module === 'object' && module.exports) module.exports = messages;
  if (root) {
    root.TurnlyMessages = root.TurnlyMessages || {};
    root.TurnlyMessages.id = messages;
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  return {
    'app.name': 'Turnly',
    'foundation.subtitle': 'Pratinjau fondasi tampilan dan data contoh',

    'home.dueTitle': 'Iuran yang harus dibayar',
    'home.dueIn': 'Jatuh tempo {date}, {days} hari lagi',
    'home.dueToday': 'Jatuh tempo hari ini',
    'home.pastDue': 'Lewat jatuh tempo {days} hari',
    'home.allPaid': 'Semua iuran lunas',

    'groups.title': 'Arisan Anda',
    'groups.explainer': 'Arisan adalah tabungan bergilir: anggota membayar tiap periode dan bergantian menerima dana.',
    'groups.summary': '{paid} dari {total} lunas · Periode {round} dari {rounds}',

    'board.title': 'Papan status iuran',
    'board.round': 'Periode {round} dari {rounds}',
    'board.roundWithRecipient': 'Periode {round} dari {rounds} · Penerima: {name}',

    'status.paid': 'Lunas',
    'status.awaiting': 'Menunggu konfirmasi',
    'status.unpaid': 'Belum bayar',
    'status.late': 'Telat {days} hari',

    'legend.title': 'Keterangan status',
    'legend.paid': 'Iuran periode ini diterima',
    'legend.awaiting': 'Bukti terkirim, menunggu konfirmasi admin',
    'legend.unpaid': 'Belum ada bukti iuran',
    'legend.late': 'Lewat jatuh tempo',
    'legend.sampleName': 'Contoh',

    'tag.you': 'Anda',
    'tag.admin': 'Admin',

    'a11y.memberStatus': '{name}, {status}',

    'pay.action': 'Bayar iuran',
    'pay.title': 'Bayar iuran {group}',
    'pay.transferTo': 'Transfer ke',
    'pay.copyAccount': 'Salin nomor rekening',
    'pay.cancel': 'Batal',

    'toast.accountCopied': 'Nomor rekening disalin',
    'demo.note': 'Tampilan berisi data contoh untuk mode demo.',

    'language.title': 'Bahasa',
    'language.english': 'English',
    'language.indonesian': 'Bahasa Indonesia',
    'language.system': 'Ikuti sistem',
  };
});
