/* Turnly user profile: the client-side stand-in for the backend users
 * table row planned for the backend stage (Tahap 3). It lives on this
 * device under localStorage 'turnly.user' as one JSON object, so fields
 * can be added as the backend grows without more storage keys.
 *
 * `language` mirrors the planned users.language column exactly: 'en' or
 * 'id' when the person picked a language, null when they chose "follow
 * system" (the column is nullable and null means follow system there
 * too). Anything else reads back as null, so a half-written or stale
 * value can never select an unsupported language.
 *
 * The choice is also saved to the account (GET/PUT /api/user/language,
 * the users.language column) so it follows the person across devices;
 * the device store stays the working truth when the server is unreachable.
 *
 * Also loadable as a CommonJS module for the Node tests, which inject a
 * stand-in storage on globalThis (the browser passes window itself).
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TurnlyUserProfile = api;
})(typeof window !== 'undefined' ? window : null, function (root) {
  'use strict';

  var STORAGE_KEY = 'turnly.user';
  var LANGUAGES = ['en', 'id'];

  // window.localStorage in the browser; the globalThis fallback is the
  // seam the Node tests inject through (root is null there).
  function storage() {
    if (root && root.localStorage) return root.localStorage;
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
    return null;
  }

  function read() {
    try {
      var store = storage();
      var raw = store && store.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) { return {}; }
  }

  function write(profile) {
    try {
      var store = storage();
      if (store) store.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) { /* private mode: the profile lasts this visit */ }
  }

  // The saved language column value: 'en', 'id', or null (follow system).
  function getLanguage() {
    var lang = read().language;
    return LANGUAGES.indexOf(lang) !== -1 ? lang : null;
  }

  // lang is 'en', 'id' or null. null ("follow system") and anything
  // unknown store the null column value. Other profile fields survive.
  function setLanguage(lang) {
    var profile = read();
    profile.language = LANGUAGES.indexOf(lang) !== -1 ? lang : null;
    write(profile);
    return profile;
  }

  // ── The account half ─────────────────────────────────────────────────────
  // The same choice, saved on the server (GET/PUT /api/user/language), so
  // it follows the person across devices. The device store stays the
  // working truth: a failed sync never blocks or undoes a local choice.

  // The page token, read once at load: the iframe URL carries ?token=… and
  // later fetches forward it by header. At the app's own address there is
  // no query token and the platform edge attaches identity itself, so
  // sending nothing there is correct. Node has neither location nor fetch,
  // so this whole half is inert under the tests.
  var pageToken = null;
  if (root && root.location && root.location.search) {
    try {
      pageToken = new URLSearchParams(root.location.search).get('token');
    } catch (e) { pageToken = null; }
  }

  function fetchHeaders() {
    var headers = {};
    if (pageToken) headers['x-usernode-token'] = pageToken;
    return headers;
  }

  // The account's saved language: 'en', 'id', or null (the account has no
  // choice, or it could not be reached — callers treat both as "none").
  function fetchServerLanguage() {
    if (typeof fetch !== 'function') return Promise.resolve(null);
    return fetch('/api/user/language', { headers: fetchHeaders() })
      .then(function (res) {
        if (!res.ok) {
          console.warn('language sync: server answered ' + res.status);
          return null;
        }
        return res.json().then(function (body) {
          var lang = body && body.language;
          return (lang === 'en' || lang === 'id') ? lang : null;
        }, function (err) {
          console.warn('language sync: bad answer: ' + (err && err.message));
          return null;
        });
      })
      .catch(function (err) {
        console.warn('language sync failed: ' + (err && err.message));
        return null;
      });
  }

  // Fire-and-forget: a failed save simply means the account catches up on
  // a later visit; the device already has the choice.
  function saveServerLanguage(lang) {
    if (typeof fetch !== 'function') return;
    var headers = fetchHeaders();
    headers['Content-Type'] = 'application/json';
    try {
      fetch('/api/user/language', {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({ language: lang }),
      }).catch(function () { /* the device keeps the working truth */ });
    } catch (e) { /* as above */ }
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    LANGUAGES: LANGUAGES,
    read: read,
    write: write,
    getLanguage: getLanguage,
    setLanguage: setLanguage,
    fetchServerLanguage: fetchServerLanguage,
    saveServerLanguage: saveServerLanguage,
  };
});
