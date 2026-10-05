// Screen-level rendering tests: Beranda, Detail arisan and the pay sheet
// rendered for real (index.html + the screen scripts in jsdom) in English
// and in Bahasa Indonesia, so a missing or mistranslated string fails here
// and not only in a browser.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// The same scripts, in the same order, as the bottom of index.html.
const SCRIPTS = [
  'public/js/messages/en.js',
  'public/js/messages/id.js',
  'public/js/user-profile.js',
  'public/js/i18n.js',
  'public/js/domain.js',
  'public/js/demo-data.js',
  'public/js/app.js',
  'public/js/beranda.js',
  'public/js/detail.js',
];

// Boot the app the way a browser does: the real shell, the real scripts,
// the language chosen the way a visitor arrives at it (?lang or storage).
// jsdom has no dialog.showModal, so that one method is stood in for here;
// everything the sheet renders is the real code path.
function boot(pathname, prepare) {
  const dom = new JSDOM(read('public/index.html'), {
    url: 'http://localhost' + pathname,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  if (prepare) prepare(dom.window);
  for (const file of SCRIPTS) dom.window.eval(read(file));
  return dom.window;
}

const text = (win, id) => win.document.getElementById(id).textContent;

test('Beranda renders in English by default', () => {
  const win = boot('/');
  assert.equal(win.TurnlyI18n.getLocale(), 'en', 'English stays the default');
  assert.match(text(win, 'home-greeting'), /^Good (morning|afternoon|evening), Bu Rina$/);
  assert.equal(text(win, 'hero-label'), 'Contribution due');
  assert.equal(text(win, 'hero-nama'), 'Arisan Keluarga Besar');
  assert.equal(text(win, 'hero-nominal'), 'Rp500.000', 'rupiah keeps dot thousands');
  assert.equal(text(win, 'hero-jatuh-tempo'), 'Due Oct 7, in 2 days');
  assert.equal(text(win, 'btn-bayar'), 'Pay contribution');
  assert.equal(text(win, 'arisan-anda-label'), 'Your arisan groups');
  assert.match(text(win, 'groups-explainer'), /rotating savings group/);
  assert.match(text(win, 'daftar-arisan'), /7 of 10 paid · Round 4 of 10/);
  assert.match(text(win, 'daftar-arisan'), /Unpaid/);
  assert.equal(text(win, 'btn-arisan-baru'), 'Create new arisan');
  assert.equal(text(win, 'language-label'), 'Language');
  assert.equal(win.document.title, 'Turnly');
});

test('Beranda renders in Bahasa Indonesia with ?lang=id', () => {
  const win = boot('/?lang=id');
  assert.equal(win.TurnlyI18n.getLocale(), 'id');
  assert.match(text(win, 'home-greeting'), /^Selamat .*, Bu Rina$/);
  assert.equal(text(win, 'hero-label'), 'Iuran yang harus dibayar');
  assert.equal(text(win, 'hero-nominal'), 'Rp500.000', 'money never changes language');
  assert.equal(text(win, 'hero-jatuh-tempo'), 'Jatuh tempo 7 Okt, 2 hari lagi');
  assert.equal(text(win, 'btn-bayar'), 'Bayar iuran');
  assert.equal(text(win, 'arisan-anda-label'), 'Arisan Anda');
  assert.match(text(win, 'daftar-arisan'), /7 dari 10 lunas · Periode 4 dari 10/);
  assert.match(text(win, 'daftar-arisan'), /Belum bayar/);
  assert.equal(text(win, 'btn-arisan-baru'), 'Buat arisan baru');
  assert.equal(text(win, 'language-label'), 'Bahasa');
  assert.equal(win.document.getElementById('language-select').value, 'id',
    'the picker shows the ?lang override in force');
});

test('picking a language in the setting applies at once, without a restart', () => {
  const win = boot('/');
  win.TurnlyI18n.setChoice('id');
  assert.equal(text(win, 'arisan-anda-label'), 'Arisan Anda', 'Beranda re-renders in Indonesian');
  assert.equal(win.document.getElementById('language-select').value, 'id');
  assert.deepEqual(JSON.parse(win.localStorage.getItem('turnly.user')), { language: 'id' },
    'the choice is saved on the device in the profile');

  win.TurnlyI18n.setChoice('system');
  assert.equal(text(win, 'arisan-anda-label'), 'Your arisan groups', 'back to English in the same session');
  assert.deepEqual(JSON.parse(win.localStorage.getItem('turnly.user')), { language: null },
    'Follow system stores the null column value');
});

test('a saved profile language is picked up on the next visit', () => {
  const again = boot('/', (win) => {
    win.localStorage.setItem('turnly.user', JSON.stringify({ language: 'id' }));
  });
  assert.equal(again.TurnlyI18n.getLocale(), 'id');
  assert.equal(text(again, 'arisan-anda-label'), 'Arisan Anda');
});

test('Detail arisan renders in English', () => {
  const win = boot('/arisan/demo-kb');
  assert.equal(text(win, 'detail-nama'), 'Arisan Keluarga Besar');
  assert.match(text(win, 'lingkaran-giliran'), /Turn 4 of 10/);
  assert.match(text(win, 'lingkaran-giliran'), /Bu Sari/);
  assert.match(text(win, 'lingkaran-giliran'), /Rp500\.000/);
  assert.equal(text(win, 'detail-terkumpul'), 'Collected Rp3.500.000 of Rp5.000.000');
  assert.equal(text(win, 'detail-progres'), '7 members paid');
  assert.equal(text(win, 'tab-status'), 'Status');
  assert.equal(text(win, 'tab-turns'), 'Turns');
  assert.equal(text(win, 'tab-history'), 'History');
  assert.equal(text(win, 'keterangan-label'), 'What the statuses mean');
  assert.match(text(win, 'daftar-status'), /Awaiting confirmation/);
  assert.match(text(win, 'daftar-status'), /Bu Rina/);
  assert.equal(text(win, 'role-member'), 'Member');
  assert.equal(text(win, 'role-admin'), 'Admin');
  const you = [...win.document.querySelectorAll('#daftar-status .tag')].map((n) => n.textContent);
  assert.ok(you.includes('You'), 'the Anda tag reads You');
  assert.equal(win.document.getElementById('btn-kembali').getAttribute('aria-label'), 'Back');
});

test('Detail arisan renders in Bahasa Indonesia', () => {
  const win = boot('/arisan/demo-kb?lang=id');
  assert.match(text(win, 'lingkaran-giliran'), /Giliran 4 dari 10/);
  assert.equal(text(win, 'detail-terkumpul'), 'Terkumpul Rp3.500.000 dari Rp5.000.000');
  assert.equal(text(win, 'detail-progres'), '7 anggota lunas');
  assert.equal(text(win, 'tab-status'), 'Status');
  assert.equal(text(win, 'tab-turns'), 'Giliran');
  assert.equal(text(win, 'tab-history'), 'Riwayat');
  assert.equal(text(win, 'keterangan-label'), 'Keterangan status');
  assert.match(text(win, 'daftar-status'), /Menunggu konfirmasi/);
  const tags = [...win.document.querySelectorAll('#daftar-status .tag')].map((n) => n.textContent);
  assert.ok(tags.includes('Anda'), 'the You tag reads Anda');
});

test('the pay sheet renders in English', () => {
  const win = boot('/');
  win.document.getElementById('btn-bayar').click();
  const sheet = win.document.querySelector('dialog');
  assert.ok(sheet, 'the fallback sheet opened');
  assert.equal(sheet.querySelector('#sheet-judul').textContent,
    'Pay contribution for Arisan Keluarga Besar');
  assert.equal(sheet.querySelector('#sheet-nominal').textContent, 'Rp500.000');
  assert.equal(sheet.querySelector('#sheet-transfer-label').textContent, 'Transfer to');
  assert.equal(sheet.querySelector('#sheet-rekening').textContent,
    'BCA 1234567890 a.n. Kas Arisan Keluarga Besar (demo)');
  assert.equal(sheet.querySelector('#btn-salin').textContent, 'Copy account number');
  assert.equal(sheet.querySelector('#sheet-proof-title').textContent, 'Send proof of transfer');
  assert.equal(sheet.querySelector('#btn-pilih-foto').textContent, 'Choose photo');
  assert.equal(sheet.querySelector('#btn-kirim').textContent, 'Send proof');
  assert.equal(sheet.querySelector('#btn-kirim').disabled, true,
    'send proof waits for a chosen photo');
  assert.equal(sheet.querySelector('#btn-batal').textContent, 'Cancel');
});

test('the pay sheet renders in Bahasa Indonesia', () => {
  const win = boot('/?lang=id');
  win.document.getElementById('btn-bayar').click();
  const sheet = win.document.querySelector('dialog');
  assert.ok(sheet, 'the fallback sheet opened');
  assert.equal(sheet.querySelector('#sheet-judul').textContent,
    'Bayar iuran Arisan Keluarga Besar');
  assert.equal(sheet.querySelector('#sheet-nominal').textContent, 'Rp500.000');
  assert.equal(sheet.querySelector('#sheet-transfer-label').textContent, 'Transfer ke');
  assert.equal(sheet.querySelector('#btn-salin').textContent, 'Salin nomor rekening');
  assert.equal(sheet.querySelector('#sheet-proof-title').textContent, 'Kirim bukti transfer');
  assert.equal(sheet.querySelector('#btn-pilih-foto').textContent, 'Pilih foto');
  assert.equal(sheet.querySelector('#btn-kirim').textContent, 'Kirim bukti');
  assert.equal(sheet.querySelector('#btn-batal').textContent, 'Batal');
});
