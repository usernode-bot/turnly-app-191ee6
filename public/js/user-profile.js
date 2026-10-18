/* Turnly user profile: the client-side stand-in for the backend users table
 * row planned for the backend stage (Tahap 3). It lives on this device under
 * localStorage 'turnly.user' as one JSON object, so fields can be added as
 * the backend grows without more storage keys.
 *
 * `language` mirrors the users.language column exactly: 'en' or 'id' when the
 * person picked a language, null when they chose "follow system". Anything
 * else reads back as null, so a half-written or stale value can never select
 * an unsupported language. The account column has no "follow system" and is
 * NOT NULL, so a "follow system" choice stores its resolved language
 * ('en' or 'id') on the account, while the device copy keeps the null that
 * means "keep following the system".
 *
 * When the app is signed in, the language is ALSO kept on the account
 * (users.language) through the API, so it follows the person to another
 * device. The server value wins on load: when GET /api/me already has a
 * language, that is applied here before the first paint. Offline, on a
 * guest, or when the write fails, the choice stays on this device, which is
 * exactly today's behaviour.
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
  var DEFAULT_LANGUAGE = 'en';
  var ACCOUNT_PATH = '/api/me';

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

  function valid(lang) {
    return LANGUAGES.indexOf(lang) !== -1;
  }

  // The language a "follow system" choice resolves to: the viewer's
  // Homeroom locale when it maps (id-ID -> id), otherwise the device
  // language when that maps, otherwise English. That resolved value is what
  // is stored on the account, because users.language has no "follow
  // system" and is NOT NULL.
  function resolveFollowSystem(platformLocale, languages) {
    var list = [];
    if (platformLocale) list.push(platformLocale);
    (languages || []).forEach(function (l) { list.push(l); });
    for (var i = 0; i < list.length; i++) {
      var tag = String(list[i] || '').toLowerCase();
      if (tag.indexOf('id') === 0 || tag.indexOf('in') === 0) return 'id';
    }
    return DEFAULT_LANGUAGE;
  }

  // The device languages, most preferred first.
  function deviceLanguages() {
    var nav = root && root.navigator;
    if (!nav) return [];
    if (nav.languages && nav.languages.length) return Array.prototype.slice.call(nav.languages);
    return nav.language ? [nav.language] : [];
  }

  // True when the stored profile object has its own `language` property,
  // including null: null means an explicit "follow system", which is a
  // choice, while a missing property means the person never chose one. The
  // first-launch language sheet uses this to decide whether to appear.
  function hasLanguage() {
    return Object.prototype.hasOwnProperty.call(read(), 'language');
  }

  // lang is 'en', 'id' or null. Anything else stores the null column value.
  // Other profile fields survive. Returns the stored profile. This only
  // writes the device copy: the account write is a separate, explicit
  // syncLanguageToAccount() so a programmatic change (the server value
  // applied on load) never echoes straight back to the account, and a picker
  // change fires exactly one write.
  function saveLanguage(lang) {
    var profile = read();
    profile.language = valid(lang) ? lang : null;
    write(profile);
    return profile;
  }

  // Keep the older name the i18n picker already calls.
  var setLanguage = saveLanguage;

  // Persist the language on the account when a session can be asked for one.
  // Never on a guest, never offline (the request simply fails and the device
  // copy stands), and never awaited: the UI applies the change at once.
  function syncLanguageToAccount(storedLanguage) {
    if (!root || typeof fetch !== 'function') return Promise.resolve(null);
    var value = storedLanguage || resolveFollowSystem(null, deviceLanguages());
    var token = iframeToken();
    var headers = {};
    if (token) headers['x-usernode-token'] = token;
    return fetch(ACCOUNT_PATH, {
      method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json' }, headers),
      body: JSON.stringify({ language: value }),
    }).then(function (res) {
      if (!res || !res.ok) return null;
      return res.json().then(function (body) { return body && body.language; }, function () { return null; });
    }, function () { return null; });
  }

  // The iframe identity token, straight from the URL. At the app's own
  // address the platform adds it as a request header instead, and the
  // browser sends that automatically, so no token here is fine.
  function iframeToken() {
    try {
      return new URLSearchParams(root.location.search).get('token');
    } catch (e) { return null; }
  }

  function applyServerLanguage(lang) {
    if (!valid(lang)) return null;
    var profile = read();
    profile.language = lang;
    write(profile);
    return lang;
  }

  // Ask the server who is signed in and what language their account holds.
  // The server value wins on load: when it has one, it is applied here. When
  // nobody is signed in, or the account has no language yet, nothing
  // changes. Returns the applied language or null.
  function loadFromAccount() {
    if (!root || typeof fetch !== 'function') return Promise.resolve(null);
    var token = iframeToken();
    var headers = {};
    if (token) headers['x-usernode-token'] = token;
    return fetch(ACCOUNT_PATH, { headers: headers }).then(function (res) {
      if (!res || !res.ok) return null;
      return res.json().then(function (body) {
        return body ? applyServerLanguage(body.language) : null;
      }, function () { return null; });
    }, function () { return null; });
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    LANGUAGES: LANGUAGES,
    DEFAULT_LANGUAGE: DEFAULT_LANGUAGE,
    ACCOUNT_PATH: ACCOUNT_PATH,
    read: read,
    write: write,
    getLanguage: getLanguage,
    hasLanguage: hasLanguage,
    setLanguage: setLanguage,
    saveLanguage: saveLanguage,
    syncLanguageToAccount: syncLanguageToAccount,
    loadFromAccount: loadFromAccount,
    applyServerLanguage: applyServerLanguage,
    resolveFollowSystem: resolveFollowSystem,
  };
});
