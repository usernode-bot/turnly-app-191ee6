// The reminder layer: how a due date stands against today, which members the
// Ingatkan queue holds and in what order, the one-reminder-per-day cooldown
// gate the per-row button and the queue both read, and the reminder copy
// staying present in both message files.
//
// The module is required for real (not stubbed) so these tests exercise the
// code the screens call: reminders.recordReminder is exactly what
// app.catatPengingat delegates to.
const test = require('node:test');
const assert = require('node:assert/strict');

const reminders = require('../public/js/reminders.js');
const en = require('../public/js/messages/en.js');
const id = require('../public/js/messages/id.js');

const TODAY = '2026-10-05';

// A small arisan with one finished round (its member still unpaid) and the
// active round, so the queue has to order two different due dates.
function group() {
  return {
    id: 'x',
    periode_aktif: {
      id: 'p2', arisan_id: 'x', nomor: 2,
      tanggal_jatuh_tempo: '2026-10-08', penerima_anggota_id: 'a1', status: 'berjalan',
    },
    periode_lalu: [{
      id: 'p1', arisan_id: 'x', nomor: 1,
      tanggal_jatuh_tempo: '2026-10-04', penerima_anggota_id: 'a2', status: 'dana_diserahkan',
    }],
    anggota: [
      { id: 'a1', nama_tampil: 'Bu Satu', urutan_giliran: 1 },
      { id: 'a2', nama_tampil: 'Pak Dua', urutan_giliran: 2 },
      { id: 'a3', nama_tampil: 'Bu Tiga', urutan_giliran: 3 },
      { id: 'a4', nama_tampil: 'Pak Empat', urutan_giliran: 4 },
    ],
    iuran: [
      { id: 'i1', periode_id: 'p2', anggota_id: 'a1', status: 'belum' },
      { id: 'i2', periode_id: 'p1', anggota_id: 'a2', status: 'belum' },
      { id: 'i3', periode_id: 'p2', anggota_id: 'a3', status: 'lunas' },
      { id: 'i4', periode_id: 'p2', anggota_id: 'a4', status: 'menunggu' },
    ],
  };
}

test('dueState: the day before is due_soon, the due day is due_today, three days on is overdue', () => {
  // The day before the due date.
  assert.deepEqual(
    reminders.dueState('2026-10-07', '2026-10-06'),
    { state: 'due_soon', daysLate: 0 });
  // The due day itself.
  assert.deepEqual(
    reminders.dueState('2026-10-07', '2026-10-07'),
    { state: 'due_today', daysLate: 0 });
  // Three days past.
  assert.deepEqual(
    reminders.dueState('2026-10-02', '2026-10-05'),
    { state: 'overdue', daysLate: 3 });
});

test('dueState derives daysLate from the due date alone', () => {
  // Whatever else is around, one day past reads as exactly one day past.
  assert.deepEqual(
    reminders.dueState('2026-10-04', '2026-10-05'),
    { state: 'overdue', daysLate: 1 });
  // Well before the due date it is still due_soon, never a negative lateness.
  assert.deepEqual(
    reminders.dueState('2026-11-01', '2026-10-05'),
    { state: 'due_soon', daysLate: 0 });
});

test('reminderQueue: most overdue first, then the nearest due date', () => {
  const antrean = reminders.reminderQueue(group(), TODAY);
  assert.deepEqual(antrean.map((i) => i.anggota.id), ['a2', 'a1'],
    'the overdue member comes before the one not yet due');
  assert.deepEqual(antrean.map((i) => i.state), ['overdue', 'due_soon']);
  assert.deepEqual(antrean.map((i) => i.daysLate), [1, 0]);
  assert.deepEqual(antrean.map((i) => i.due), ['2026-10-04', '2026-10-08']);
});

test('reminderQueue leaves paid and awaiting members out', () => {
  const antrean = reminders.reminderQueue(group(), TODAY);
  const ids = antrean.map((i) => i.anggota.id);
  assert.ok(!ids.includes('a3'), 'a paid member is not reminded');
  assert.ok(!ids.includes('a4'), 'a member awaiting confirmation is not reminded');
});

test('the cooldown gate blocks a second reminder the same Jakarta day', () => {
  const arisan = group();
  const at = '2026-10-05T03:00:00+07:00'; // morning in Asia/Jakarta

  const row = reminders.recordReminder(arisan, {
    member_id: 'a2', due_id: 'p1', at: at, today: TODAY, created_by: 'demo-user-rina',
  });
  assert.ok(row, 'the first reminder is recorded');
  assert.equal(row.status, 'sent');
  assert.equal(row.channel, 'app');
  assert.equal(row.message_key, 'reminder.sentLine');
  assert.equal(row.created_by, 'demo-user-rina');

  // The gate now holds: the button waits and the queue drops the member.
  assert.equal(reminders.remindedToday(arisan, 'a2', 'p1', TODAY), true);
  assert.equal(
    reminders.recordReminder(arisan, { member_id: 'a2', due_id: 'p1', at: at, today: TODAY }),
    null,
    'a second reminder the same day is refused');
  assert.deepEqual(
    reminders.reminderQueue(arisan, TODAY).map((i) => i.anggota.id),
    ['a1'],
    'a member already reminded today leaves the queue');

  // The next Jakarta day the cooldown has passed.
  assert.equal(reminders.remindedToday(arisan, 'a2', 'p1', '2026-10-06'), false);
  assert.ok(
    reminders.recordReminder(arisan, { member_id: 'a2', due_id: 'p1', at: '2026-10-06T03:00:00+07:00', today: '2026-10-06' }),
    'the next day a new reminder may be recorded');
});

test('the cooldown only covers the round it was recorded for', () => {
  const arisan = group();
  reminders.recordReminder(arisan, { member_id: 'a1', due_id: 'p2', at: '2026-10-05T03:00:00+07:00', today: TODAY });
  assert.equal(reminders.remindedToday(arisan, 'a1', 'p2', TODAY), true);
  assert.equal(reminders.remindedToday(arisan, 'a1', 'p1', TODAY), false,
    'a reminder for another round does not put this member in cooldown');
});

test('bulkReminderText is the ICU plural in both languages', () => {
  assert.equal(reminders.bulkReminderText(1, 'en'), 'Remind 1 member');
  assert.equal(reminders.bulkReminderText(3, 'en'), 'Remind 3 members');
  assert.equal(reminders.bulkReminderText(3, 'id'), 'Ingatkan 3 anggota');
});

test('relativeReminderTime buckets a recorded moment in Jakarta days', () => {
  const now = new Date('2026-10-05T09:00:00+07:00');
  assert.equal(reminders.relativeReminderTime('2026-10-05T08:59:30+07:00', now, 'en'), 'just now');
  assert.equal(reminders.relativeReminderTime('2026-10-05T08:30:00+07:00', now, 'en'), '30 minutes ago');
  assert.equal(reminders.relativeReminderTime('2026-10-05T06:00:00+07:00', now, 'en'), '3 hours ago');
  assert.equal(reminders.relativeReminderTime('2026-10-04T09:00:00+07:00', now, 'en'), '1 day ago');
  assert.equal(reminders.relativeReminderTime('2026-10-02T09:00:00+07:00', now, 'en'), '3 days ago');
  assert.equal(reminders.relativeReminderTime('2026-10-04T09:00:00+07:00', now, 'id'), '1 hari lalu');
});

test('every reminder message key exists in both message files', () => {
  const inEn = Object.keys(en).filter((k) => k.startsWith('reminder.'));
  const inId = Object.keys(id).filter((k) => k.startsWith('reminder.'));
  assert.ok(inEn.length > 0, 'there are reminder messages');
  assert.deepEqual(inEn.filter((k) => !(k in id)), [], 'reminder keys present in en but missing from id');
  assert.deepEqual(inId.filter((k) => !(k in en)), [], 'reminder keys present in id but missing from en');
  // The keys the reminder UI reads by name, so a rename cannot slip through.
  ['reminder.bulk', 'reminder.again', 'reminder.sentLine', 'reminder.sentToast',
    'reminder.bulkToast', 'reminder.confirmTitle', 'reminder.confirmBody',
    'reminder.confirmSend', 'reminder.confirmCancel', 'reminder.sheetTitle',
    'reminder.sheetBody', 'reminder.historyTitle', 'reminder.historyEmpty',
    'reminder.ago.now', 'reminder.ago.minutes', 'reminder.ago.hours',
    'reminder.ago.days'].forEach((key) => {
    assert.ok(key in en, `missing ${key} in en`);
    assert.ok(key in id, `missing ${key} in id`);
  });
});
