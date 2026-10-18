// The user profile object ('turnly.user'): the client-side stand-in for the
// backend users table row. Its `language` field must map onto the planned
// users.language column exactly: 'en' | 'id', null = follow system.
const test = require('node:test');
const assert = require('node:assert/strict');

// The module reads window.localStorage in the browser; Node tests inject a
// stand-in on globalThis (the module's fallback) before each fresh require.
function fresh(stub) {
  delete require.cache[require.resolve('../public/js/user-profile.js')];
  globalThis.localStorage = stub;
  return require('../public/js/user-profile.js');
}

function memoryStorage() {
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  };
}

test.after(() => { delete globalThis.localStorage; });

test('language is null until a supported one is set', () => {
  const profile = fresh(memoryStorage());
  assert.equal(profile.getLanguage(), null);
  profile.setLanguage('id');
  assert.equal(profile.getLanguage(), 'id');
  profile.setLanguage('en');
  assert.equal(profile.getLanguage(), 'en');
  profile.setLanguage(null);
  assert.equal(profile.getLanguage(), null);
});

test('hasLanguage tells a first launch from a saved choice, null included', () => {
  const profile = fresh(memoryStorage());
  assert.equal(profile.hasLanguage(), false, 'an empty store never chose');
  profile.setLanguage('id');
  assert.equal(profile.hasLanguage(), true);
  profile.setLanguage(null); // null is an explicit Follow system, a choice
  assert.equal(profile.hasLanguage(), true);
});

test('setLanguage stores the column value and keeps other profile fields', () => {
  const storage = memoryStorage();
  const profile = fresh(storage);
  profile.write({ name: 'Rina' });
  profile.setLanguage('en');
  assert.deepEqual(JSON.parse(storage.getItem('turnly.user')),
    { name: 'Rina', language: 'en' });
  profile.setLanguage('system');
  assert.deepEqual(JSON.parse(storage.getItem('turnly.user')),
    { name: 'Rina', language: null });
});

test('a stored language the app does not support reads as null', () => {
  const storage = memoryStorage();
  const profile = fresh(storage);
  storage.setItem('turnly.user', JSON.stringify({ language: 'fr' }));
  assert.equal(profile.getLanguage(), null);
});

test('a corrupt profile object reads as empty', () => {
  const storage = memoryStorage();
  const profile = fresh(storage);
  storage.setItem('turnly.user', '{not json');
  assert.deepEqual(profile.read(), {});
  assert.equal(profile.getLanguage(), null);
});

test('"follow system" resolves to the language the account stores', () => {
  const profile = fresh(memoryStorage());
  // The device language decides, and Indonesian wins when it starts with id.
  assert.equal(profile.resolveFollowSystem(null, ['id-ID']), 'id');
  assert.equal(profile.resolveFollowSystem(null, ['in']), 'id');
  assert.equal(profile.resolveFollowSystem(null, ['en-US']), 'en');
  // The Homeroom platform locale outranks the device language.
  assert.equal(profile.resolveFollowSystem('id', ['en-US']), 'id');
  assert.equal(profile.resolveFollowSystem('pt-BR', ['en-US']), 'en');
  // Nothing recognisable falls back to English (the account column has no
  // "follow system" and is NOT NULL, so a value must be chosen).
  assert.equal(profile.resolveFollowSystem(null, []), 'en');
  assert.equal(profile.resolveFollowSystem(null, undefined), 'en');
});

test('saving a language writes the device copy without touching the account', () => {
  const storage = memoryStorage();
  const profile = fresh(storage);
  // saveLanguage only writes the device copy; the account write is a separate
  // explicit syncLanguageToAccount() call (a no-op in Node, which has no
  // window and so no fetch).
  profile.saveLanguage('id');
  assert.deepEqual(JSON.parse(storage.getItem('turnly.user')), { language: 'id' });
});

test('a server language is applied verbatim and an unsupported one is ignored', () => {
  const storage = memoryStorage();
  const profile = fresh(storage);
  assert.equal(profile.applyServerLanguage('id'), 'id');
  assert.equal(profile.getLanguage(), 'id');
  assert.equal(profile.applyServerLanguage('fr'), null);
  assert.equal(profile.getLanguage(), 'id', 'an unsupported server value leaves the stored one');
});
