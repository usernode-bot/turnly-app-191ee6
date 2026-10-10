// The demo datasets stay valid on ANY anchor day: build(hariIni) offsets
// every date from the anchor, so the demo story (due in 2 days, one member
// 3 days late) holds with fresh dates, and the History tab still renders
// periode_lalu rows through the domain layer.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const d = require('../public/js/domain.js');

// demo-data.js reads the domain helpers off window (the browser loads
// domain.js first); the sandbox gets the real module.
const sandbox = { window: { TurnlyDomain: d } };
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '../public/js/demo-data.js'), 'utf8'),
  sandbox
);
const demo = sandbox.window.TurnlyDemoData;

const ANCHOR = '2026-10-05'; // the day the demo story was drawn on

test('the default anchor is today in Jakarta, and build accepts any day', () => {
  assert.equal(demo.DEMO_HARI_INI, d.tanggalJakarta());
  assert.doesNotThrow(() => demo.build('2026-10-05'));
  assert.throws(() => demo.build('7/10/2026'), 'a malformed anchor is rejected');
});

test('the anchor 2026-10-05 reproduces the demo story exactly', () => {
  const data = demo.build(ANCHOR);
  const kb = data.arisan[0];
  const k3 = data.arisan[1];

  // The hero: the contribution is due in 2 days.
  assert.equal(kb.periode_aktif.tanggal_jatuh_tempo, '2026-10-07');
  assert.equal(d.selisihHari(ANCHOR, kb.periode_aktif.tanggal_jatuh_tempo), 2);
  // The office group's late member is 3 days late.
  assert.equal(k3.periode_aktif.tanggal_jatuh_tempo, '2026-10-02');
  assert.equal(d.hitungTelatHari(k3.periode_aktif.tanggal_jatuh_tempo, ANCHOR), 3);
  // Past rounds sit earlier than the active round, a month (KB) and a
  // week (K3) apart, starting at the group's first day. Array.from first:
  // the dataset comes from the vm sandbox, so its arrays are cross-realm.
  assert.deepEqual(
    [...kb.periode_lalu].map((p) => p.tanggal_jatuh_tempo),
    ['2026-07-09', '2026-08-08', '2026-09-07'],
  );
  assert.equal(kb.tanggal_mulai, '2026-07-09');
  assert.deepEqual([...k3.periode_lalu].map((p) => p.tanggal_jatuh_tempo), ['2026-09-25']);
  assert.equal(k3.tanggal_mulai, '2026-09-25');
});

test('the story is the same on a moving anchor (leap days included)', () => {
  for (const anchor of ['2026-01-01', '2026-03-01', '2024-02-29']) {
    const data = demo.build(anchor);
    const kb = data.arisan[0];
    const k3 = data.arisan[1];
    assert.equal(d.selisihHari(anchor, kb.periode_aktif.tanggal_jatuh_tempo), 2);
    assert.equal(d.hitungTelatHari(k3.periode_aktif.tanggal_jatuh_tempo, anchor), 3);
    for (const p of kb.periode_lalu) {
      assert.ok(d.selisihHari(p.tanggal_jatuh_tempo, kb.periode_aktif.tanggal_jatuh_tempo) > 0,
        'a past round stays past the active one');
    }
  }
});

function struktural(data) {
  for (const arisan of data.arisan) {
    assert.ok(Array.isArray(arisan.periode_lalu), arisan.nama + ' has no periode_lalu');
    const ids = new Set(arisan.anggota.map((a) => a.id));
    const nomor = new Set();
    for (const p of arisan.periode_lalu) {
      assert.ok(p.id, 'periode has an id');
      assert.doesNotThrow(() => d.parseHari(p.tanggal_jatuh_tempo),
        arisan.nama + ' periode ' + p.nomor + ' has a bad date');
      assert.ok(ids.has(p.penerima_anggota_id),
        arisan.nama + ' periode ' + p.nomor + ' names a member that does not exist');
      assert.ok(!nomor.has(p.nomor) && p.nomor < arisan.periode_aktif.nomor,
        arisan.nama + ' periode ' + p.nomor + ' is not a finished earlier round');
      nomor.add(p.nomor);
      assert.ok(Object.values(d.PERIODE_STATUS).includes(p.status),
        arisan.nama + ' periode ' + p.nomor + ' has an unknown status');
    }
  }
}

test('every generated dataset has well-formed past periodes for the History tab', () => {
  for (const anchor of [ANCHOR, '2026-01-01', '2024-02-29']) {
    struktural(demo.build(anchor));
  }
  struktural({ arisan: demo.arisan }); // the page-load instance too
});

test('the turn circle data has a recipient in the active round', () => {
  for (const anchor of [ANCHOR, '2026-01-01']) {
    for (const arisan of demo.build(anchor).arisan) {
      const penerima = d.penerimaPeriode(arisan);
      assert.ok(penerima, arisan.nama + ' has no recipient');
      assert.ok(d.anggotaUrut(arisan).some((a) => a.id === penerima.id));
    }
  }
});
