/* Turnly revision store: the Quick revision workshop's checklist and its
 * version history. Client-side only — the workshop is the owner's tool and
 * owns no server state — it lives on this device under localStorage
 * 'turnly.revisi' as one JSON object, the same pattern as user-profile.js.
 *
 * Shape: { points: [{ id, text, done, createdAt, doneAt }],
 *          versions: [{ id, at, action, points }] }.
 *
 * Every mutation snapshots the points as they were BEFORE it, newest
 * first, capped at MAX_VERSIONS (the oldest version drops). Undo restores
 * versions[0] and snapshots the current state first, so redo is just
 * Restore of that entry. `action` is one fixed code (added, edited,
 * deleted, markedDone, reopened, restored) that the screen maps onto a
 * message key.
 *
 * Also loadable as a CommonJS module for the Node tests, which inject a
 * stand-in storage on globalThis (the browser passes window itself).
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TurnlyRevisiStore = api;
})(typeof window !== 'undefined' ? window : null, function (root) {
  'use strict';

  var STORAGE_KEY = 'turnly.revisi';
  var MAX_TEXT = 300;   // a point is one short instruction
  var MAX_VERSIONS = 50;

  // window.localStorage in the browser; the globalThis fallback is the
  // seam the Node tests inject through (root is null there).
  function storage() {
    if (root && root.localStorage) return root.localStorage;
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
    return null;
  }

  // The visit's last known state, for browsers where storage is absent
  // (private mode): the state then simply lasts this visit.
  var mem = null;

  function kosong() {
    return { points: [], versions: [] };
  }

  function read() {
    var store = storage();
    if (!store) return mem ? salinState(mem) : kosong();
    try {
      var raw = store.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed !== 'object') return kosong();
      return {
        points: Array.isArray(parsed.points) ? parsed.points : [],
        versions: Array.isArray(parsed.versions) ? parsed.versions : [],
      };
    } catch (e) {
      return kosong(); // a half-written or corrupt store reads back empty
    }
  }

  function salinState(state) {
    return {
      points: state.points.map(function (p) {
        return { id: p.id, text: p.text, done: !!p.done, createdAt: p.createdAt, doneAt: p.doneAt || null };
      }),
      versions: state.versions.map(function (v) {
        return { id: v.id, at: v.at, action: v.action, points: salinPoints(v.points) };
      }),
    };
  }

  function salinPoints(points) {
    return (points || []).map(function (p) {
      return { id: p.id, text: p.text, done: !!p.done, createdAt: p.createdAt, doneAt: p.doneAt || null };
    });
  }

  function write(state) {
    mem = state;
    try {
      var store = storage();
      if (store) store.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* private mode: the state lasts this visit */ }
  }

  // One short instruction: trimmed, capped at MAX_TEXT.
  function bersihkan(text) {
    var bersih = String(text === undefined || text === null ? '' : text).trim();
    return bersih.slice(0, MAX_TEXT);
  }

  function catat(state, action, pointsSebelum) {
    state.versions.unshift({
      id: 'v' + Date.now() + '-' + state.versions.length,
      at: Date.now(),
      action: action,
      points: salinPoints(pointsSebelum),
    });
    if (state.versions.length > MAX_VERSIONS) state.versions.length = MAX_VERSIONS;
  }

  function anggotaDenganId(points, id) {
    for (var i = 0; i < points.length; i++) {
      if (points[i].id === id) return points[i];
    }
    return null;
  }

  function addPoint(text) {
    var bersih = bersihkan(text);
    if (!bersih) return;
    var state = read();
    catat(state, 'added', state.points);
    state.points.push({
      id: 'p' + Date.now() + '-' + state.points.length,
      text: bersih,
      done: false,
      createdAt: Date.now(),
      doneAt: null,
    });
    write(state);
  }

  function editPoint(id, text) {
    var bersih = bersihkan(text);
    if (!bersih) return;
    var state = read();
    var poin = anggotaDenganId(state.points, id);
    if (!poin || poin.text === bersih) return;
    catat(state, 'edited', state.points);
    poin.text = bersih;
    write(state);
  }

  function removePoint(id) {
    var state = read();
    if (!anggotaDenganId(state.points, id)) return;
    catat(state, 'deleted', state.points);
    state.points = state.points.filter(function (p) { return p.id !== id; });
    write(state);
  }

  function setDone(id, done) {
    var state = read();
    var poin = anggotaDenganId(state.points, id);
    if (!poin || poin.done === !!done) return;
    catat(state, done ? 'markedDone' : 'reopened', state.points);
    poin.done = !!done;
    poin.doneAt = done ? Date.now() : null;
    write(state);
  }

  // Undo takes back the newest change: the pre-change points become live
  // again, and the state being left behind is itself recorded, so redo is
  // just Restore of that newest entry.
  function undo() {
    var state = read();
    var terakhir = state.versions[0];
    if (!terakhir) return;
    restoreVersion(terakhir.id);
  }

  function restoreVersion(versionId) {
    var state = read();
    var versi = null;
    for (var i = 0; i < state.versions.length; i++) {
      if (state.versions[i].id === versionId) { versi = state.versions[i]; break; }
    }
    if (!versi) return;
    var sekarang = state.points;
    state.versions.splice(i, 1); // spent: its points are live now
    catat(state, 'restored', sekarang);
    state.points = salinPoints(versi.points);
    write(state);
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    MAX_TEXT: MAX_TEXT,
    MAX_VERSIONS: MAX_VERSIONS,
    read: read,
    addPoint: addPoint,
    editPoint: editPoint,
    removePoint: removePoint,
    setDone: setDone,
    undo: undo,
    restoreVersion: restoreVersion,
  };
});
