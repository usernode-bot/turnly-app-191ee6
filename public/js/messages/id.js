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

    // Beranda
    'home.greeting.morning': 'Selamat pagi, {name}',
    'home.greeting.afternoon': 'Selamat siang, {name}',
    'home.greeting.evening': 'Selamat sore, {name}',
    'home.greeting.night': 'Selamat malam, {name}',
    'home.dueTitle': 'Iuran yang harus dibayar',
    'home.dueIn': 'Jatuh tempo {date}, {days} hari lagi',
    'home.dueToday': 'Jatuh tempo hari ini',
    'home.pastDue': 'Lewat jatuh tempo {days} hari',
    'home.allPaid': 'Semua iuran lunas',
    'home.newArisan': 'Buat arisan baru',
    'home.newArisanDemo': 'Pembuatan arisan baru hadir bersama akun. Demo ini berisi grup contoh.',

    'groups.title': 'Arisan Anda',
    'groups.explainer': 'Arisan adalah tabungan bergilir: anggota membayar tiap periode dan bergantian menerima dana.',
    'groups.summary': '{paid} dari {total} lunas · Periode {round} dari {rounds}',

    // Detail arisan: lingkaran giliran dan sekelilingnya
    'detail.turnOf': 'Giliran {round} dari {rounds}',
    'detail.collected': 'Terkumpul {collected} dari {total}',
    'detail.paidProgress': '{paid} anggota lunas',
    'detail.viewAs': 'Lihat sebagai (demo)',
    'role.member': 'Anggota',
    'role.admin': 'Admin',

    'tab.status': 'Status',
    'tab.turns': 'Giliran',
    'tab.history': 'Riwayat',

    'turns.current': 'Menerima periode ini',

    'history.round': 'Periode {round} · {date}',
    'history.recipient': 'Penerima: {name}',
    'history.paidOut': 'Dana diserahkan',
    'history.empty': 'Belum ada periode selesai. Penyerahan dana pertama muncul di sini.',

    'action.confirm': 'Konfirmasi',
    'action.reject': 'Tolak',
    'action.remind': 'Ingatkan',

    'reject.title': 'Tolak bukti dari {name}',
    'reject.reasonLabel': 'Alasan (opsional)',
    'reject.reasonPlaceholder': 'Contoh: nominal tidak sesuai',

    'bar.remindUnpaid': 'Ingatkan {count} anggota',

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
    'a11y.back': 'Kembali',

    'pay.action': 'Bayar iuran',
    'pay.title': 'Bayar iuran {group}',
    'pay.transferTo': 'Transfer ke',
    'pay.copyAccount': 'Salin nomor rekening',
    'pay.proofTitle': 'Kirim bukti transfer',
    'pay.choosePhoto': 'Pilih foto',
    'pay.changePhoto': 'Ganti foto',
    'pay.sendProof': 'Kirim bukti',
    'pay.proofAlt': 'Foto bukti yang dipilih',
    'pay.cancel': 'Batal',

    'toast.accountCopied': 'Nomor rekening disalin',
    'toast.confirmed': 'Iuran {name} dikonfirmasi lunas',
    'toast.rejected': 'Bukti ditolak. {name} bisa kirim ulang.',
    'toast.reminderSent': 'Pengingat terkirim ke {name}',
    'toast.remindersSent': 'Pengingat terkirim ke {count} anggota',
    'demo.note': 'Tampilan berisi data contoh untuk mode demo.',

    'language.title': 'Bahasa',
    'language.english': 'English',
    'language.indonesian': 'Bahasa Indonesia',
    'language.system': 'Ikuti sistem',
  };
});
