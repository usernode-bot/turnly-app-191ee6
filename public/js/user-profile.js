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

  return {
    STORAGE_KEY: STORAGE_KEY,
    LANGUAGES: LANGUAGES,
    read: read,
    write: write,
    getLanguage: getLanguage,
    setLanguage: setLanguage,
  };
});
