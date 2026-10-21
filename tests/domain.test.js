// Dates follow the active language; money never does.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const d = require('../public/js/domain.js');

// demo-data.js reads the domain helpers off window (the browser loads
// domain.js first); the sandbox gets the real module — same setup as
// tests/demo-data.test.js.
const sandbox = { window: { TurnlyDomain: d } };
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '../public/js/demo-data.js'), 'utf8'),
  sandbox
);
const demo = sandbox.window.TurnlyDemoData;

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

test('inisialGrup takes the initials after a leading "Arisan"', () => {
  assert.equal(d.inisialGrup('Arisan Keluarga Besar'), 'KB');
  assert.equal(d.inisialGrup('Arisan Kantor Lantai 3'), 'KL3'); // digits stay whole
  assert.equal(d.inisialGrup('Arisan'), 'A'); // nothing left to drop
  assert.equal(d.inisialGrup('arisan rt'), 'R');
  assert.equal(d.inisialGrup('Geng RT 05'), 'GR0'); // capped at 3 characters
  assert.equal(d.inisialGrup('Arisan  Kantor   Lantai'), 'KL'); // extra spaces ignored
});

test('formatBulanTahun follows the locale, on the Jakarta calendar day', () => {
  assert.equal(d.formatBulanTahun('2026-12-07', 'id'), 'Des 2026');
  assert.equal(d.formatBulanTahun('2026-12-07', 'en'), 'Dec 2026');
  assert.equal(d.formatBulanTahun('2026-11-06', 'en'), 'Nov 2026');
});

test('giliranPengguna sorts the turn into nanti, sekarang and lewat', () => {
  const aktif = { nomor: 4, tanggal_jatuh_tempo: '2026-10-07' };
  const bulanan = { periode: 'bulanan', periode_aktif: aktif };
  assert.deepEqual(
    d.giliranPengguna(bulanan, { urutan_giliran: 5 }),
    { nomor: 5, keadaan: 'nanti', tanggal: '2026-11-06' }, // 30-day step
  );
  assert.equal(d.giliranPengguna(bulanan, { urutan_giliran: 4 }).keadaan, 'sekarang');
  assert.equal(d.giliranPengguna(bulanan, { urutan_giliran: 4 }).tanggal, null);
  const lewat = d.giliranPengguna(bulanan, { urutan_giliran: 2 });
  assert.equal(lewat.keadaan, 'lewat');
  assert.equal(lewat.tanggal, null); // a past turn shows no date

  const mingguan = { periode: 'mingguan', periode_aktif: { nomor: 2, tanggal_jatuh_tempo: '2026-10-02' } };
  assert.deepEqual(
    d.giliranPengguna(mingguan, { urutan_giliran: 3 }),
    { nomor: 3, keadaan: 'nanti', tanggal: '2026-10-09' }, // 7-day step
  );
});

test('anggotaBerikutnyaBayar picks the first unpaid member in turn order', () => {
  const aktif = { id: 'p1', nomor: 3, tanggal_jatuh_tempo: '2026-10-07' };
  // Array order deliberately differs from turn order: b leads the array,
  // but turn order (urutan_giliran) decides who is next to pay.
  const anggota = [
    { id: 'a', urutan_giliran: 2 },
    { id: 'b', urutan_giliran: 1 },
    { id: 'c', urutan_giliran: 3 },
    { id: 'd', urutan_giliran: 4 },
    { id: 'e', urutan_giliran: 5 },
  ];
  const iuran = [
    { anggota_id: 'b', periode_id: 'p1', status: 'lunas' },
    { anggota_id: 'c', periode_id: 'p1', status: 'menunggu' }, // proof sent: settled
    { anggota_id: 'd', periode_id: 'p1', status: 'ditolak' }, // back to belum
    // a has no row at all: presents as belum
    { anggota_id: 'e', periode_id: 'p1', status: 'lunas' },
  ];
  const arisan = { periode: 'bulanan', periode_aktif: aktif, anggota, iuran };

  // b (turn 1) is lunas, so the first unpaid in turn order is a (turn 2,
  // no iuran row) — not d, whose ditolak row also counts but turns later.
  assert.equal(d.anggotaBerikutnyaBayar(arisan, '2026-10-05').id, 'a');

  // A past-due belum presents as telat and still counts.
  const telat = { ...arisan, periode_aktif: { ...aktif, tanggal_jatuh_tempo: '2026-10-02' } };
  assert.equal(d.anggotaBerikutnyaBayar(telat, '2026-10-05').id, 'a');

  // Everyone lunas or menunggu: nobody left to chase.
  const tuntas = { ...arisan, iuran: [
    { anggota_id: 'a', periode_id: 'p1', status: 'menunggu' },
    { anggota_id: 'b', periode_id: 'p1', status: 'lunas' },
    { anggota_id: 'c', periode_id: 'p1', status: 'lunas' },
    { anggota_id: 'd', periode_id: 'p1', status: 'menunggu' },
    { anggota_id: 'e', periode_id: 'p1', status: 'lunas' },
  ] };
  assert.equal(d.anggotaBerikutnyaBayar(tuntas, '2026-10-05'), null);

  // No active periode: no next-to-pay.
  assert.equal(d.anggotaBerikutnyaBayar({ ...arisan, periode_aktif: null }, '2026-10-05'), null);
});

test('pembayaranPeriode lists every member in turn order for one round', () => {
  const periode = { id: 'p1', tanggal_jatuh_tempo: '2026-09-01' };
  // Array order deliberately differs from turn order.
  const arisan = {
    anggota: [
      { id: 'b', urutan_giliran: 2 },
      { id: 'a', urutan_giliran: 1 },
      { id: 'c', urutan_giliran: 3 },
      { id: 'd', urutan_giliran: 4 },
    ],
    iuran: [
      { anggota_id: 'a', periode_id: 'p1', status: 'lunas' },
      { anggota_id: 'b', periode_id: 'p1', status: 'menunggu' },
      { anggota_id: 'c', periode_id: 'p1', status: 'ditolak' },
      { anggota_id: 'a', periode_id: 'p2', status: 'lunas' }, // another round
      { anggota_id: 'd', periode_id: 'p2', status: 'lunas' }, // another round
    ],
  };

  const hasil = d.pembayaranPeriode(arisan, periode, '2026-09-10');
  assert.deepEqual(hasil.map((r) => r.anggota.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(hasil[0].status, { key: 'lunas', telatHari: 0 });
  assert.equal(hasil[0].iuran.periode_id, 'p1');
  assert.deepEqual(hasil[1].status, { key: 'menunggu', telatHari: 0 });
  // A rejected row presents as unpaid, past its due date: late.
  assert.equal(hasil[2].iuran.status, 'ditolak');
  assert.deepEqual(hasil[2].status, { key: 'telat', telatHari: 9 });
  // No row for this round at all: null iuran, unpaid before the due date.
  assert.equal(hasil[3].iuran, null);
  assert.deepEqual(
    d.pembayaranPeriode(arisan, periode, '2026-08-30')[3].status,
    { key: 'belum', telatHari: 0 },
  );

  // Without a periode there is nothing to list.
  assert.deepEqual(d.pembayaranPeriode(arisan, null, '2026-09-10'), []);
});

test('the demo payment history tells the same story on the anchor day', () => {
  const data = demo.build('2026-10-05');
  const [kb, k3] = data.arisan;
  const rowsFor = (arisan, nomor) => d.pembayaranPeriode(
    arisan,
    arisan.periode_lalu.filter((p) => p.nomor === nomor)[0],
    '2026-10-05',
  );

  for (const nomor of [1, 2]) {
    const rows = rowsFor(kb, nomor);
    assert.equal(rows.length, kb.anggota.length);
    assert.ok(rows.every((r) => r.status.key === 'lunas'), 'everyone paid in round ' + nomor);
  }

  const ketiga = rowsFor(kb, 3);
  assert.equal(ketiga.length, kb.anggota.length);
  assert.equal(ketiga.filter((r) => r.status.key === 'lunas').length, 9);
  const joko = ketiga.filter((r) => r.anggota.id === 'demo-kb-a9')[0];
  assert.equal(joko.iuran.status, 'belum');
  assert.deepEqual(joko.status, { key: 'telat', telatHari: 28 });

  const k3Pertama = rowsFor(k3, 1);
  assert.equal(k3Pertama.length, k3.anggota.length);
  assert.ok(k3Pertama.every((r) => r.status.key === 'lunas'));
});

test('anggotaBerikutnyaBayar follows the demo story on the anchor day', () => {
  const data = demo.build('2026-10-05');
  const [kb, k3] = data.arisan;
  // Bu Rina is next to pay in Keluarga Besar; Mba Putri (telat 3 days) in
  // Kantor Lantai 3.
  assert.equal(d.anggotaBerikutnyaBayar(kb, '2026-10-05').id, 'demo-kb-a5');
  assert.equal(d.anggotaBerikutnyaBayar(k3, '2026-10-05').id, 'demo-k3-a6');
});
