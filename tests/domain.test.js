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
