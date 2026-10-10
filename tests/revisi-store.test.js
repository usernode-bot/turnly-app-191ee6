// The Quick revision store: checklist points with a version history that
// snapshots BEFORE every mutation, undo via the newest entry, restore of
// any older one, a version cap, and defensive reads. Runs against the real
// module with an injected memory storage (the module's Node seam).
const test = require('node:test');
const assert = require('node:assert/strict');

function memoryStorage() {
  const mem = new Map();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  };
}

function freshStore(storage) {
  delete require.cache[require.resolve('../public/js/revisi-store.js')];
  globalThis.localStorage = storage;
  return require('../public/js/revisi-store.js');
}

test.after(() => { delete globalThis.localStorage; });

test('adding a point snapshots the empty state before it', () => {
  const store = freshStore(memoryStorage());
  store.addPoint('  Shorten the due date line  ');
  const state = store.read();
  assert.equal(state.points.length, 1);
  assert.equal(state.points[0].text, 'Shorten the due date line'); // trimmed
  assert.equal(state.points[0].done, false);
  assert.equal(state.versions.length, 1);
  assert.equal(state.versions[0].action, 'added');
  assert.deepEqual(state.versions[0].points, []); // how it was BEFORE
});

test('an empty point adds nothing and records nothing', () => {
  const store = freshStore(memoryStorage());
  store.addPoint('   ');
  store.addPoint('');
  assert.deepEqual(store.read(), { points: [], versions: [] });
});

test('point text is trimmed and capped at 300 characters', () => {
  const store = freshStore(memoryStorage());
  store.addPoint('x'.repeat(400));
  assert.equal(store.read().points[0].text.length, store.MAX_TEXT);
  store.addPoint('   '); // whitespace only: dropped
  assert.equal(store.read().points.length, 1);
});

test('every mutation records what changed and keeps the count in step', () => {
  const store = freshStore(memoryStorage());
  store.addPoint('Point one');
  const id = store.read().points[0].id;
  store.editPoint(id, 'Point one, rewritten');
  store.setDone(id, true);
  store.setDone(id, true); // no change: no version
  store.setDone(id, false);
  store.removePoint(id);

  const actions = store.read().versions.map((v) => v.action);
  assert.deepEqual(actions, ['deleted', 'reopened', 'markedDone', 'edited', 'added']);
  assert.deepEqual(store.read().points, []);
  // Each entry froze the points as they were before its mutation.
  assert.deepEqual(store.read().versions[0].points.map((p) => p.text), ['Point one, rewritten']);
});

test('undo takes back the newest change; redo is Restore of the recorded state', () => {
  const store = freshStore(memoryStorage());
  store.addPoint('Point one');
  store.addPoint('Point two');
  store.undo();

  let state = store.read();
  assert.deepEqual(state.points.map((p) => p.text), ['Point one']);
  assert.equal(state.versions[0].action, 'restored');
  // The restored entry froze the two-point state: restoring it redoes the undo.
  assert.deepEqual(state.versions[0].points.map((p) => p.text), ['Point one', 'Point two']);

  store.undo(); // takes back the undo
  assert.deepEqual(store.read().points.map((p) => p.text), ['Point one', 'Point two']);
});

test('restore brings back any earlier version, not only the newest', () => {
  const store = freshStore(memoryStorage());
  store.addPoint('Point one');
  store.addPoint('Point two');
  const snapshotDenganSatu = store.read().versions[0].id; // before 'Point two'
  store.addPoint('Point three');

  store.restoreVersion(snapshotDenganSatu);
  const teks = store.read().points.map((p) => p.text);
  assert.deepEqual(teks, ['Point one']);
});

test('restoring a version spends it: it does not linger in the history', () => {
  const store = freshStore(memoryStorage());
  store.addPoint('Point one');
  const id = store.read().versions[0].id;
  store.removePoint(store.read().points[0].id);
  const sebelum = store.read().versions.length;

  store.restoreVersion(id);
  const state = store.read();
  assert.equal(state.versions.length, sebelum, 'one entry spent, one recorded');
  assert.ok(!state.versions.some((v) => v.id === id));
});

test('the version history is capped at 50, newest kept', () => {
  const store = freshStore(memoryStorage());
  let id;
  for (let i = 0; i < 60; i++) {
    store.addPoint('Point ' + i);
    id = store.read().points[0].id;
    store.removePoint(id);
  }
  const state = store.read();
  assert.ok(state.versions.length <= store.MAX_VERSIONS);
  assert.equal(state.versions.length, store.MAX_VERSIONS);
});

test('a corrupt store reads back empty instead of throwing', () => {
  const storage = memoryStorage();
  const store = freshStore(storage);
  storage.setItem('turnly.revisi', '{not json');
  assert.deepEqual(store.read(), { points: [], versions: [] });
  storage.setItem('turnly.revisi', JSON.stringify({ points: 'nope', versions: 42 }));
  assert.deepEqual(store.read(), { points: [], versions: [] });
  // And writing after corruption recovers cleanly.
  store.addPoint('Point one');
  assert.equal(JSON.parse(storage.getItem('turnly.revisi')).points.length, 1);
});

test('with no storage at all, the state lasts this visit', () => {
  // No globalThis.localStorage in the module's seam: the memory fallback.
  delete globalThis.localStorage;
  delete require.cache[require.resolve('../public/js/revisi-store.js')];
  const store = require('../public/js/revisi-store.js');
  store.addPoint('Point one');
  assert.deepEqual(store.read().points.map((p) => p.text), ['Point one']);
  store.undo();
  assert.deepEqual(store.read().points, []);
});
