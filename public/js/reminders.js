/* Turnly reminders: the pure layer behind the Ingatkan (remind) actions.
 *
 * No DOM and no storage in here: the screens ask these functions what to
 * show and what to send, and the answers are plain data. Three of them are
 * the contract the tests pin:
 *
 *   dueState(due, today)        -> { state, daysLate }; state is
 *                                  'due_soon' | 'due_today' | 'overdue',
 *                                  and daysLate is ALWAYS derived from the
 *                                  due date (never stored);
 *   reminderQueue(arisan, today) -> the members who should be reminded
 *                                  right now, most-overdue first then
 *                                  nearest due date (a member already
 *                                  reminded today for a round is not in
 *                                  the queue: that is the cooldown gate);
 *   bulkReminderText(count, locale) -> the "Ingatkan N anggota" label,
 *                                  built from the ICU plural message in
 *                                  messages/{en,id}.js.
 *
 * recordReminder(arisan, opts) is the write path: it appends one row using
 * the reminders table's field names, but only when the cooldown gate above
 * says the send is allowed.
 *
 * Date math is calendar-date based in Asia/Jakarta. domain.js owns the
 * Jakarta calendar helpers (tanggalJakarta uses Intl.DateTimeFormat with an
 * explicit timeZone, parseHari/selisihHari do UTC-midnight day arithmetic,
 * both timezone-proof), and this file only counts whole days through them.
 * A reminder's lateness is looked up from its due date at read time, so the
 * stored row never carries a "telat" number.
 *
 * Also loadable as a CommonJS module for the Node tests.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TurnlyReminders = api;
})(typeof window !== 'undefined' ? window : null, function (root) {
  'use strict';

  var d = (root && root.TurnlyDomain) || require('./domain.js');
  var i18n = (root && root.TurnlyI18n) || require('./i18n.js');
  var messages = (root && root.TurnlyMessages) || {
    en: require('./messages/en.js'),
    id: require('./messages/id.js'),
  };

  // The words live in the message files; this only picks the locale's copy
  // (English is the fallback), so every key this module formats is the same
  // key the screens use and the message tests keep both files in step.
  function t(key, params, locale) {
    var dict = messages[locale] || {};
    var text = Object.prototype.hasOwnProperty.call(dict, key)
      ? dict[key]
      : (messages.en || {})[key];
    if (typeof text !== 'string') return key;
    return i18n.format(text, params || {}, locale || 'en');
  }

  // A reminder for one member in one round is sent at most once per Jakarta
  // calendar day: that is the cooldown the per-row button and the queue both
  // read, so the two never disagree.
  var COOLDOWN_DAYS = 1;

  // Today in Asia/Jakarta as a YYYY-MM-DD calendar date. domain.tanggalJakarta
  // formats through Intl.DateTimeFormat with timeZone 'Asia/Jakarta', so the
  // day is the group's day, not the server's or the device's.
  function todayJakarta(kini) {
    return d.tanggalJakarta(kini);
  }

  // How a due date stands against today. daysLate is past-the-due-days, 0 on
  // and before the due date; state is 'overdue' once any day is late.
  function dueState(due, today) {
    var daysLate = d.hitungTelatHari(due, today);
    if (daysLate > 0) return { state: 'overdue', daysLate: daysLate };
    if (d.selisihHari(today, due) === 0) return { state: 'due_today', daysLate: 0 };
    return { state: 'due_soon', daysLate: 0 };
  }

  // The most recent reminder recorded for one member in one round, or null.
  function lastReminder(arisan, memberId, dueId) {
    var rows = (arisan && arisan.reminders) || [];
    var found = null;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (row.member_id !== memberId) continue;
      if (dueId && row.due_id !== dueId) continue;
      if (!row.sent_at && !row.scheduled_for) continue;
      var at = row.sent_at || row.scheduled_for;
      if (!found || new Date(at).getTime() > new Date(found.sent_at || found.scheduled_for).getTime()) {
        found = row;
      }
    }
    return found;
  }

  // Was this member reminded for this round recently enough that the button
  // waits? Judged on the Jakarta calendar day, so the pure signature
  // (arisan, today) is enough and the answer is deterministic for a given day.
  // This is THE cooldown gate: the per-row button, the bulk queue and the
  // write below all read it, so the three can never disagree.
  function remindedToday(arisan, memberId, dueId, today) {
    var row = lastReminder(arisan, memberId, dueId);
    if (!row) return false;
    var at = row.sent_at || row.scheduled_for;
    if (!at) return false;
    var selisih = d.selisihHari(d.tanggalJakarta(new Date(at)), today);
    return selisih >= 0 && selisih < COOLDOWN_DAYS;
  }

  // Record one reminder for a member in a round, unless the cooldown still
  // holds for that pair. Returns the row, or null when the cooldown blocked
  // it. The moment is passed in (`at`, a Date or an ISO string) so the caller
  // decides what "now" is and this stays a pure append; the Jakarta day it
  // falls on is derived from it, never from a clock read in here. The field
  // names mirror the reminders table exactly.
  function recordReminder(arisan, opts) {
    opts = opts || {};
    var at = opts.at instanceof Date ? opts.at.toISOString() : opts.at;
    if (!at) return null;
    var today = opts.today || d.tanggalJakarta(new Date(at));
    if (remindedToday(arisan, opts.member_id, opts.due_id, today)) return null;
    arisan.reminders = arisan.reminders || [];
    var row = {
      id: opts.id || ['r', arisan.id, opts.member_id, at].join('-'),
      arisan_id: arisan.id,
      due_id: opts.due_id || null,
      member_id: opts.member_id,
      channel: opts.channel || 'app',
      scheduled_for: at,
      sent_at: at,
      status: 'sent',
      created_by: opts.created_by || null,
      message_key: opts.message_key || 'reminder.sentLine',
    };
    arisan.reminders.push(row);
    return row;
  }

  // The reminders due for a round right now: every unpaid member whose round
  // is not in cooldown, most-overdue first and then nearest due date. Sorting
  // by the due date rising gives exactly that (an earlier due is more overdue;
  // among future dues the earliest is nearest), and the draw order breaks ties
  // so two members in the same round keep a stable, human order.
  function reminderQueue(arisan, today) {
    var periode = {};
    var daftar = [];
    if (arisan.periode_aktif) daftar.push(arisan.periode_aktif);
    if (arisan.periode_lalu) daftar = daftar.concat(arisan.periode_lalu);
    daftar.forEach(function (p) { periode[p.id] = p; });

    var items = [];
    (arisan.iuran || []).forEach(function (row) {
      // Lunas and menunggu need no reminder; ditolak presents as unpaid again.
      if (row.status === 'lunas' || row.status === 'menunggu') return;
      var p = periode[row.periode_id];
      if (!p) return;
      var anggota = d.anggotaDenganId(arisan, row.anggota_id);
      if (!anggota) return;
      if (remindedToday(arisan, row.anggota_id, p.id, today)) return;
      var st = dueState(p.tanggal_jatuh_tempo, today);
      items.push({
        anggota: anggota,
        periode: p,
        due: p.tanggal_jatuh_tempo,
        state: st.state,
        daysLate: st.daysLate,
      });
    });

    items.sort(function (a, b) {
      if (a.due !== b.due) return a.due < b.due ? -1 : 1;
      return a.anggota.urutan_giliran - b.anggota.urutan_giliran;
    });
    return items;
  }

  // "Remind 3 members": the sticky bar label and the confirm sheet's line,
  // both from the reminder.bulk ICU plural.
  function bulkReminderText(count, locale) {
    return t('reminder.bulk', { count: count }, locale);
  }

  // "2 hours ago": a relative timestamp for the Pengingat rows. The day
  // bucket is counted on the Jakarta calendar, so a reminder sent late at
  // night does not read as a day older than it is.
  function relativeReminderTime(sentAtIso, kini, locale) {
    var nowMs = (kini instanceof Date ? kini.getTime()
      : (kini ? new Date(kini).getTime() : Date.now()));
    var sentMs = new Date(sentAtIso).getTime();
    var diff = nowMs - sentMs;
    if (!isFinite(diff) || diff < 0) diff = 0;
    if (diff < 60 * 1000) return t('reminder.ago.now', {}, locale);
    if (diff < 60 * 60 * 1000) {
      return t('reminder.ago.minutes', { count: Math.floor(diff / 60000) }, locale);
    }
    if (diff < 24 * 60 * 60 * 1000) {
      return t('reminder.ago.hours', { count: Math.floor(diff / 3600000) }, locale);
    }
    var hari = d.selisihHari(
      d.tanggalJakarta(new Date(sentMs)),
      d.tanggalJakarta(new Date(nowMs))
    );
    return t('reminder.ago.days', { count: hari }, locale);
  }

  // Every reminder recorded for an arisan, newest first, for the Pengingat
  // section of the Riwayat tab.
  function reminderHistory(arisan) {
    var rows = ((arisan && arisan.reminders) || []).slice();
    rows.sort(function (a, b) {
      var ax = a.sent_at || a.scheduled_for || 0;
      var bx = b.sent_at || b.scheduled_for || 0;
      return new Date(bx).getTime() - new Date(ax).getTime();
    });
    return rows.map(function (row) {
      var anggota = d.anggotaDenganId(arisan, row.member_id);
      return {
        id: row.id,
        anggota: anggota,
        nama: anggota ? anggota.nama_tampil : null,
        sentAt: row.sent_at || row.scheduled_for || null,
        channel: row.channel,
        messageKey: row.message_key,
      };
    });
  }

  return {
    COOLDOWN_DAYS: COOLDOWN_DAYS,
    dueState: dueState,
    todayJakarta: todayJakarta,
    lastReminder: lastReminder,
    remindedToday: remindedToday,
    recordReminder: recordReminder,
    reminderQueue: reminderQueue,
    reminderHistory: reminderHistory,
    bulkReminderText: bulkReminderText,
    relativeReminderTime: relativeReminderTime,
    format: t,
  };
});
