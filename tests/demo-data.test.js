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

test('the Home turn line and recipient follow from the viewer\'s urutan_giliran', () => {
  const data = demo.build(ANCHOR);
  const [kb, k3] = data.arisan;

  const milik = (arisan) => arisan.anggota.filter((a) => a.user_id === demo.PENGGUNA_DEMO_ID)[0];
  const giliranKb = d.giliranPengguna(kb, milik(kb));
  assert.equal(giliranKb.nomor, 5);
  assert.equal(giliranKb.keadaan, 'nanti');
  assert.equal(giliranKb.tanggal, '2026-11-06');
  assert.equal(d.penerimaPeriode(kb).nama_tampil, 'Bu Sari');

  const giliranK3 = d.giliranPengguna(k3, milik(k3));
  assert.equal(giliranK3.nomor, 3);
  assert.equal(giliranK3.keadaan, 'nanti');
  assert.equal(giliranK3.tanggal, '2026-10-09');
  assert.equal(d.penerimaPeriode(k3).nama_tampil, 'Mba Tika');
});

test('the turn stays 32 (KB) and 4 (K3) days out on every anchor', () => {
  for (const anchor of [ANCHOR, '2026-01-01', '2024-02-29']) {
    const data = demo.build(anchor);
    for (const arisan of data.arisan) {
      const milik = arisan.anggota.filter((a) => a.user_id === demo.PENGGUNA_DEMO_ID)[0];
      const giliran = d.giliranPengguna(arisan, milik);
      const jarak = arisan.id === 'demo-kb' ? 32 : 4;
      assert.equal(d.selisihHari(anchor, giliran.tanggal), jarak, arisan.nama);
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

    // Payments: one row per member per finished round, every row naming a
    // member and a real round, and no id shared with another row.
    const iuranIds = new Set();
    const periodeIds = new Set([arisan.periode_aktif.id, ...arisan.periode_lalu.map((p) => p.id)]);
    for (const r of arisan.iuran) {
      assert.ok(!iuranIds.has(r.id), arisan.nama + ' has a duplicate iuran id ' + r.id);
      iuranIds.add(r.id);
      assert.ok(ids.has(r.anggota_id), arisan.nama + ' iuran names a missing member');
      assert.ok(periodeIds.has(r.periode_id), arisan.nama + ' iuran names a missing periode');
      assert.ok(Object.values(d.IURAN_STATUS).includes(r.status),
        arisan.nama + ' iuran ' + r.id + ' has an unknown status');
    }
    for (const p of arisan.periode_lalu) {
      const rows = arisan.iuran.filter((r) => r.periode_id === p.id);
      assert.equal(rows.length, arisan.anggota.length,
        arisan.nama + ' periode ' + p.nomor + ' does not have one payment per member');
      assert.equal(new Set(rows.map((r) => r.anggota_id)).size, arisan.anggota.length,
        arisan.nama + ' periode ' + p.nomor + ' pays a member twice');
    }
  }
}

test('the nearest turn is the office group four days out, with its pot', () => {
  const pasanganDari = (data) => data.arisan.map((arisan) => ({
    arisan,
    anggota: arisan.anggota.filter((a) => a.user_id === demo.PENGGUNA_DEMO_ID)[0],
  }));

  for (const anchor of [ANCHOR, '2026-01-01', '2024-02-29']) {
    const pilihan = d.giliranTerdekat(pasanganDari(demo.build(anchor)), anchor);
    // The nearer office turn wins over the family group's bigger, later pot.
    assert.equal(pilihan.arisan.id, 'demo-k3');
    assert.equal(pilihan.dana, 600000);
    assert.equal(pilihan.sisaHari, 4);
    assert.equal(pilihan.tanggal, d.tanggalPlus(anchor, 4));
    assert.equal(pilihan.arisan.periode_aktif.nomor, 2);
    assert.equal(pilihan.arisan.total_periode, 6);
  }

  const kb = demo.build(ANCHOR).arisan[0];
  assert.equal(d.danaArisan(kb), 5000000);
  assert.equal(d.giliranTerdekat(pasanganDari(demo.build(ANCHOR)), ANCHOR).tanggal, '2026-10-09');
});

test('the past-round payments do not change the active round', () => {
  for (const anchor of [ANCHOR, '2026-01-01', '2024-02-29']) {
    const [kb, k3] = demo.build(anchor).arisan;
    assert.equal(d.hitungLunas(kb), 7, 'Keluarga Besar active round');
    assert.equal(d.hitungLunas(k3), 5, 'Kantor Lantai 3 active round');
  }
});

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
