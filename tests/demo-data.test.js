// The demo datasets stay valid: the History tab renders periode_lalu rows
// through the domain layer, so every row must parse as a Jakarta calendar
// date and point at a real member, ahead of the active round.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const d = require('../public/js/domain.js');

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '../public/js/demo-data.js'), 'utf8'),
  sandbox
);
const demo = sandbox.window.TurnlyDemoData;

test('the demo anchor is unchanged, so relative labels stay stable', () => {
  assert.equal(demo.DEMO_HARI_INI, '2026-10-05');
});

test('every arisan has well-formed past periodes for the History tab', () => {
  for (const arisan of demo.arisan) {
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
});

test('the turn circle data has a recipient in the active round', () => {
  for (const arisan of demo.arisan) {
    const penerima = d.penerimaPeriode(arisan);
    assert.ok(penerima, arisan.nama + ' has no recipient');
    assert.ok(d.anggotaUrut(arisan).some((a) => a.id === penerima.id));
  }
});
