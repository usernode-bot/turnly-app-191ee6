/* Turnly reminders: who this device's admin has nudged in the active
 * round, and when. Demo-stage only: all data is sample data shared with
 * nobody, so a reminder is a local record that drives the "Reminded"
 * chip on Detail arisan — nothing is sent to members and no notification
 * arrives.
 *
 * One localStorage object under 'turnly.reminders': a map of
 * "<arisan_id>/<periode_id>/<anggota_id>" to an ISO timestamp string.
 * The periode id in the key is what makes a new round start clean;
 * re-reminding overwrites the value for the same key. The timestamp is
 * recorded but never displayed (the demo date is anchored, so showing a
 * real clock time could contradict the sample data).
 *
 * Also loadable as a CommonJS module for the Node tests, which inject a
 * stand-in storage on globalThis (the browser passes window itself).
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TurnlyReminders = api;
})(typeof window !== 'undefined' ? window : null, function (root) {
  'use strict';

  var STORAGE_KEY = 'turnly.reminders';
  // When no usable storage exists (private mode), records last this visit.
  var mem = {};

  // window.localStorage in the browser; the globalThis fallback is the
  // seam the Node tests inject through (root is null there).
  function storage() {
    if (root && root.localStorage) return root.localStorage;
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
    return null;
  }

  function readMap() {
    var store = null;
    try { store = storage(); } catch (e) { store = null; }
    if (!store) return mem;
    try {
      var raw = store.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (e) { return {}; } // corrupt storage reads as empty
  }

  function writeMap(map) {
    var store = null;
    try { store = storage(); } catch (e) { store = null; }
    if (!store) { mem = map; return; }
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch (e) {
      mem = map; // private mode: the reminders last this visit
    }
  }

  function key(arisanId, periodeId, anggotaId) {
    return arisanId + '/' + periodeId + '/' + anggotaId;
  }

  // whenIso is an ISO timestamp string; re-reminding overwrites.
  function record(arisanId, periodeId, anggotaId, whenIso) {
    var map = readMap();
    map[key(arisanId, periodeId, anggotaId)] = whenIso;
    writeMap(map);
  }

  // The recorded timestamp, or null when this member has not been
  // reminded in this round on this device.
  function get(arisanId, periodeId, anggotaId) {
    var value = readMap()[key(arisanId, periodeId, anggotaId)];
    return typeof value === 'string' ? value : null;
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    record: record,
    get: get,
  };
});
