// The i18n runtime: ICU subset formatting, plurals at 0/1/many in both
// languages, fallback, locale mapping and choice precedence.
const test = require('node:test');
const assert = require('node:assert/strict');
const i18n = require('../public/js/i18n.js');

test('variables interpolate and unknown ones stay visible', () => {
  assert.equal(i18n.format('Hello, {name}', { name: 'Rina' }, 'en'), 'Hello, Rina');
  assert.equal(i18n.format('Hello, {name}', {}, 'en'), 'Hello, {name}');
});

test('English plurals at 0, 1 and many', () => {
  i18n.setChoice('en');
  assert.equal(i18n.t('status.late', { days: 0 }), 'Late 0 days');
  assert.equal(i18n.t('status.late', { days: 1 }), 'Late 1 day');
  assert.equal(i18n.t('status.late', { days: 3 }), 'Late 3 days');
  assert.equal(i18n.t('home.dueIn', { date: 'Oct 7', days: 1 }), 'Due Oct 7, in 1 day');
  assert.equal(i18n.t('home.dueIn', { date: 'Oct 7', days: 2 }), 'Due Oct 7, in 2 days');
  assert.equal(i18n.t('home.pastDue', { days: 1 }), '1 day past due');
  assert.equal(i18n.t('home.pastDue', { days: 3 }), '3 days past due');
});

test('Indonesian plurals at 0, 1 and many (no plural forms)', () => {
  i18n.setChoice('id');
  assert.equal(i18n.t('status.late', { days: 0 }), 'Telat 0 hari');
  assert.equal(i18n.t('status.late', { days: 1 }), 'Telat 1 hari');
  assert.equal(i18n.t('status.late', { days: 3 }), 'Telat 3 hari');
  assert.equal(i18n.t('home.dueIn', { date: '7 Okt', days: 2 }), 'Jatuh tempo 7 Okt, 2 hari lagi');
  i18n.setChoice('en');
});

test('plural engine: proofs and members at 0, 1 and many, with =0 and nesting', () => {
  const proofs = '{count, plural, one{1 proof needs confirmation} other{# proofs need confirmation}}';
  assert.equal(i18n.format(proofs, { count: 0 }, 'en'), '0 proofs need confirmation');
  assert.equal(i18n.format(proofs, { count: 1 }, 'en'), '1 proof needs confirmation');
  assert.equal(i18n.format(proofs, { count: 5 }, 'en'), '5 proofs need confirmation');
  const members = 'Remind {count, plural, =0{nobody} one{1 member} other{# members}} who {count, plural, one{hasn\'t} other{haven\'t}} paid';
  assert.equal(i18n.format(members, { count: 0 }, 'en'), 'Remind nobody who haven\'t paid');
  assert.equal(i18n.format(members, { count: 1 }, 'en'), 'Remind 1 member who hasn\'t paid');
  assert.equal(i18n.format(members, { count: 2 }, 'en'), 'Remind 2 members who haven\'t paid');
  const nested = '{n, plural, one{{name} owes 1 day} other{{name} owes # days}}';
  assert.equal(i18n.format(nested, { n: 2, name: 'Bu Rina' }, 'en'), 'Bu Rina owes 2 days');
  assert.equal(i18n.format('{n, plural, other{# items}}', { n: 1234 }, 'en'), '1,234 items');
  assert.equal(i18n.format('{n, plural, other{# item}}', { n: 1234 }, 'id'), '1.234 item');
});

test('a key missing from the active locale falls back to English, then to the key', () => {
  i18n.setChoice('id');
  assert.equal(i18n.t('app.name'), 'Turnly');
  assert.equal(i18n.t('does.not.exist'), 'does.not.exist');
  i18n.setChoice('en');
});

test('locale tags map by language subtag', () => {
  assert.equal(i18n.mapTag('id-ID'), 'id');
  assert.equal(i18n.mapTag('in'), 'id');
  assert.equal(i18n.mapTag('en-GB'), 'en');
  assert.equal(i18n.mapTag('pt-BR'), null);
  assert.equal(i18n.mapTag(null), null);
  assert.equal(i18n.mapTag(''), null);
});

test('resolution: URL wins, then an explicit choice, then platform, then device, then English', () => {
  assert.equal(i18n.resolveLocale('system', 'id', null, ['en-US']), 'id');
  assert.equal(i18n.resolveLocale('system', 'fr', null, ['en-US']), 'en', 'unsupported URL value is ignored');
  assert.equal(i18n.resolveLocale('id', null, 'en', ['en-US']), 'id');
  assert.equal(i18n.resolveLocale('en', null, 'id', ['id-ID']), 'en');
  assert.equal(i18n.resolveLocale('system', null, 'id', ['en-US']), 'id');
  assert.equal(i18n.resolveLocale('system', null, 'pt-BR', ['id-ID']), 'id', 'unsupported platform tag falls through to the device');
  assert.equal(i18n.resolveLocale('system', null, null, ['fr-FR', 'id']), 'id');
  assert.equal(i18n.resolveLocale('system', null, null, ['pt-BR']), 'en');
  assert.equal(i18n.resolveLocale('system', null, null, []), 'en');
  assert.equal(i18n.resolveLocale('system', null, null, undefined), 'en');
});

test('setChoice applies at once and notifies listeners', () => {
  const seen = [];
  i18n.onChange((l) => seen.push(l));
  i18n.setChoice('id');
  assert.equal(i18n.getLocale(), 'id');
  assert.equal(i18n.getChoice(), 'id');
  i18n.setChoice('en');
  assert.deepEqual(seen, ['id', 'en']);
  i18n.setChoice('nope');
  assert.equal(i18n.getChoice(), 'en', 'an unknown choice is ignored');
});
