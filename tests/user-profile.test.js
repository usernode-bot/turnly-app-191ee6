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
