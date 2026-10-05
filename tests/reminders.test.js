// The reminder store ('turnly.reminders'): which member this device's
// admin has nudged in the active round, and when. The periode id in the
// record key is what makes a new round start clean; re-reminding
// overwrites; corrupt storage reads as empty.
const test = require('node:test');
const assert = require('node:assert/strict');

// The module reads window.localStorage in the browser; Node tests inject a
// stand-in on globalThis (the module's fallback) before each fresh require.
function fresh(stub) {
  delete require.cache[require.resolve('../public/js/reminders.js')];
  globalThis.localStorage = stub;
  return require('../public/js/reminders.js');
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

test('record then get returns the timestamp', () => {
  const reminders = fresh(memoryStorage());
  reminders.record('demo-kb', 'demo-kb-periode-aktif', 'demo-kb-a5', '2026-10-05T09:00:00.000Z');
  assert.equal(reminders.get('demo-kb', 'demo-kb-periode-aktif', 'demo-kb-a5'),
    '2026-10-05T09:00:00.000Z');
  assert.equal(reminders.get('demo-kb', 'demo-kb-periode-aktif', 'demo-kb-a9'), null,
    'a member never reminded reads as none');
});

test('re-reminding the same member overwrites the timestamp', () => {
  const reminders = fresh(memoryStorage());
  reminders.record('demo-kb', 'demo-kb-periode-aktif', 'demo-kb-a5', '2026-10-05T09:00:00.000Z');
  reminders.record('demo-kb', 'demo-kb-periode-aktif', 'demo-kb-a5', '2026-10-05T10:30:00.000Z');
  assert.equal(reminders.get('demo-kb', 'demo-kb-periode-aktif', 'demo-kb-a5'),
    '2026-10-05T10:30:00.000Z');
});

test('a different periode id reads as no reminder (a new round starts clean)', () => {
  const reminders = fresh(memoryStorage());
  reminders.record('demo-kb', 'demo-kb-periode-4', 'demo-kb-a5', '2026-10-05T09:00:00.000Z');
  assert.equal(reminders.get('demo-kb', 'demo-kb-periode-5', 'demo-kb-a5'), null);
  assert.equal(reminders.get('demo-k3', 'demo-kb-periode-4', 'demo-kb-a5'), null,
    'a different arisan reads as none too');
});

test('records survive a reload and other keys are kept', () => {
  const storage = memoryStorage();
  const reminders = fresh(storage);
  reminders.record('demo-kb', 'demo-kb-periode-4', 'demo-kb-a5', '2026-10-05T09:00:00.000Z');
  reminders.record('demo-kb', 'demo-kb-periode-4', 'demo-kb-a9', '2026-10-05T09:05:00.000Z');
  const reloaded = fresh(storage);
  assert.equal(reloaded.get('demo-kb', 'demo-kb-periode-4', 'demo-kb-a9'),
    '2026-10-05T09:05:00.000Z');
  assert.equal(reloaded.get('demo-kb', 'demo-kb-periode-4', 'demo-kb-a5'),
    '2026-10-05T09:00:00.000Z');
});

test('corrupted storage reads as empty', () => {
  const storage = memoryStorage();
  const reminders = fresh(storage);
  storage.setItem('turnly.reminders', '{not json');
  assert.equal(reminders.get('demo-kb', 'demo-kb-periode-4', 'demo-kb-a5'), null);
});
