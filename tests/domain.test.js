// Dates follow the active language; money never does.
const test = require('node:test');
const assert = require('node:assert/strict');
const d = require('../public/js/domain.js');

test('short dates follow the locale, on the Jakarta calendar day', () => {
  assert.equal(d.formatTanggalPendek('2026-10-07', 'en'), 'Oct 7');
  assert.equal(d.formatTanggalPendek('2026-10-07', 'id'), '7 Okt');
  assert.equal(d.formatTanggalPendek('2026-05-01', 'en'), 'May 1');
  assert.equal(d.formatTanggalPendek('2026-05-01', 'id'), '1 Mei');
  assert.throws(() => d.formatTanggalPendek('7/10/2026', 'en'));
});

test('rupiah is always Rp with dot thousands, whatever the language', () => {
  assert.equal(d.formatRupiah(500000), 'Rp500.000');
  assert.equal(d.formatRupiah(3500000), 'Rp3.500.000');
  assert.equal(d.formatRupiah(0), 'Rp0');
  assert.throws(() => d.formatRupiah(500000.5));
});

test('the demo anchor still yields 2 days ahead and 3 days late', () => {
  assert.equal(d.selisihHari('2026-10-05', '2026-10-07'), 2);
  assert.equal(d.selisihHari('2026-10-05', '2026-10-02'), -3);
  assert.equal(d.hitungTelatHari('2026-10-02', '2026-10-05'), 3);
  assert.equal(d.hitungTelatHari('2026-10-07', '2026-10-05'), 0);
});

test('the greeting band follows the Jakarta day-part conventions', () => {
  assert.equal(d.bandSapa(4), 'pagi');
  assert.equal(d.bandSapa(5), 'pagi');
  assert.equal(d.bandSapa(10), 'pagi');
  assert.equal(d.bandSapa(11), 'siang');
  assert.equal(d.bandSapa(14), 'siang');
  assert.equal(d.bandSapa(15), 'sore');
  assert.equal(d.bandSapa(17), 'sore');
  assert.equal(d.bandSapa(18), 'malam');
  assert.equal(d.bandSapa(23), 'malam');
  assert.equal(d.bandSapa(0), 'malam');
  assert.equal(d.bandSapa(3), 'malam');
});

test('tanggalJakarta is the Jakarta calendar day as YYYY-MM-DD', () => {
  // 2026-10-10 01:30 UTC is already 08:30 on the 10th in Jakarta.
  assert.equal(d.tanggalJakarta(new Date('2026-10-10T01:30:00Z')), '2026-10-10');
  // 2026-10-10 17:00 UTC is 01:00 on the NEXT day in Jakarta (UTC+7).
  assert.equal(d.tanggalJakarta(new Date('2026-10-10T17:00:00Z')), '2026-10-11');
  // The shape is always the parseable ISO day the demo generator needs.
  const hariIni = d.tanggalJakarta();
  assert.match(hariIni, /^\d{4}-\d{2}-\d{2}$/);
  assert.doesNotThrow(() => d.parseHari(hariIni));
});

test('tanggalPlus offsets whole days across month and year boundaries', () => {
  assert.equal(d.tanggalPlus('2026-10-05', 2), '2026-10-07');
  assert.equal(d.tanggalPlus('2026-10-05', -3), '2026-10-02');
  assert.equal(d.tanggalPlus('2026-10-05', -88), '2026-07-09');
  assert.equal(d.tanggalPlus('2026-01-01', -1), '2025-12-31');
  assert.equal(d.tanggalPlus('2026-03-01', -1), '2026-02-28');
  assert.equal(d.tanggalPlus('2024-03-01', -1), '2024-02-29'); // leap day
  assert.equal(d.tanggalPlus('2026-02-28', 1), '2026-03-01');
  assert.equal(d.tanggalPlus('2026-10-05', 0), '2026-10-05');
  assert.throws(() => d.tanggalPlus('7/10/2026', 1));
});
