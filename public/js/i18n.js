/* Turnly localization runtime. EVERY user-visible string goes through t():
 * the words live in public/js/messages/{en,id}.js, this file only picks the
 * language and formats the ICU subset those files use.
 *
 * Supported: {name} variables and {name, plural, =0{...} one{...} other{...}}
 * with # for the formatted number. Options may nest variables. A key missing
 * in the active language falls back to English, then to the key itself.
 *
 * Language choice, in order: the ?lang=en|id URL parameter wins for this
 * page load only and is never saved; then the user's profile language
 * (user-profile.js, localStorage 'turnly.user' — its `language` field maps
 * one-to-one onto the users.language column planned for the backend stage:
 * 'en' | 'id' | null, null = follow system); then the device-wide
 * preference saved under localStorage 'turnly.lang' ('en', 'id' or
 * 'system' — the setting the profile layer replaced, kept as the fallback
 * for devices that saved it before the profile existed); then 'system':
 * the viewer's Homeroom locale when set (usernode.getUserLocale), else the
 * device language, else English; only the language subtag matters
 * ("id-ID" -> id, anything else -> en). The picker writes BOTH layers, so
 * they only ever disagree on a device that saved 'turnly.lang' before the
 * profile existed.
 *
 * Also loadable as a CommonJS module for the Node tests.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TurnlyI18n = api;
})(typeof window !== 'undefined' ? window : null, function (root) {
  'use strict';

  var DEFAULT_LOCALE = 'en';
  var SUPPORTED = ['en', 'id'];
  var STORAGE_KEY = 'turnly.lang';
  var CHOICES = ['en', 'id', 'system'];

  var messages = (root && root.TurnlyMessages) || {
    en: require('./messages/en.js'),
    id: require('./messages/id.js'),
  };
  // The user profile owns the top language layer (see the header comment).
  var profile = (root && root.TurnlyUserProfile) || require('./user-profile.js');

  // ── ICU subset ──────────────────────────────────────────────────────────

  // Split a message into literal text and {...} argument blocks, honouring
  // nested braces inside plural options.
  function splitTopLevel(text) {
    var parts = [];
    var depth = 0;
    var start = 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch === '{') {
        if (depth === 0) {
          if (i > start) parts.push({ literal: text.slice(start, i) });
          start = i + 1;
        }
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          parts.push({ arg: text.slice(start, i) });
          start = i + 1;
        }
        if (depth < 0) throw new Error('Unbalanced braces in message: ' + text);
      }
    }
    if (depth !== 0) throw new Error('Unbalanced braces in message: ' + text);
    if (start < text.length) parts.push({ literal: text.slice(start) });
    return parts;
  }

  // 'one{in 1 day} other{in # days}' -> { one: 'in 1 day', other: 'in # days' }
  function parsePluralOptions(text) {
    var options = {};
    var i = 0;
    while (i < text.length) {
      while (i < text.length && /\s/.test(text.charAt(i))) i++;
      var nameStart = i;
      while (i < text.length && text.charAt(i) !== '{' && !/\s/.test(text.charAt(i))) i++;
      var name = text.slice(nameStart, i);
      while (i < text.length && /\s/.test(text.charAt(i))) i++;
      if (text.charAt(i) !== '{') throw new Error('Plural option without braces: ' + text);
      var depth = 0;
      var bodyStart = i + 1;
      for (; i < text.length; i++) {
        if (text.charAt(i) === '{') depth++;
        else if (text.charAt(i) === '}') { depth--; if (depth === 0) break; }
      }
      options[name] = text.slice(bodyStart, i);
      i++;
    }
    return options;
  }

  function formatNumber(value, locale) {
    try { return new Intl.NumberFormat(locale).format(value); } catch (e) { return String(value); }
  }

  function pluralCategory(value, locale) {
    try { return new Intl.PluralRules(locale).select(value); } catch (e) { return 'other'; }
  }

  function format(text, params, locale) {
    params = params || {};
    return splitTopLevel(text).map(function (part) {
      if (part.literal !== undefined) return part.literal;
      var arg = part.arg;
      var comma = arg.indexOf(',');
      if (comma === -1) {
        var name = arg.trim();
        return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : '{' + name + '}';
      }
      var argName = arg.slice(0, comma).trim();
      var rest = arg.slice(comma + 1);
      var comma2 = rest.indexOf(',');
      var type = (comma2 === -1 ? rest : rest.slice(0, comma2)).trim();
      if (type !== 'plural') throw new Error('Unsupported ICU argument type "' + type + '" in: ' + text);
      var options = parsePluralOptions(rest.slice(comma2 + 1));
      var value = Number(params[argName]);
      var chosen = options['=' + value];
      if (chosen === undefined) chosen = options[pluralCategory(value, locale)];
      if (chosen === undefined) chosen = options.other;
      if (chosen === undefined) throw new Error('Plural without "other" in: ' + text);
      return format(chosen.replace(/#/g, formatNumber(value, locale)), params, locale);
    }).join('');
  }

  // ── Locale resolution ───────────────────────────────────────────────────

  // Map any BCP-47 tag onto a supported locale by language subtag. 'in' is
  // the legacy tag some Android builds still report for Indonesian.
  function mapTag(tag) {
    if (!tag || typeof tag !== 'string') return null;
    var lang = tag.toLowerCase().split(/[-_]/)[0];
    if (lang === 'id' || lang === 'in') return 'id';
    if (lang === 'en') return 'en';
    return null;
  }

  // The language for 'system': platform locale, then device languages, then
  // the default. Unsupported languages fall through to the default.
  function resolveSystem(platformLocale, deviceLanguages) {
    var fromPlatform = mapTag(platformLocale);
    if (fromPlatform) return fromPlatform;
    var list = deviceLanguages || [];
    for (var i = 0; i < list.length; i++) {
      var mapped = mapTag(list[i]);
      if (mapped) return mapped;
    }
    return DEFAULT_LOCALE;
  }

  // choice ('en'|'id'|'system'), an optional URL override, and the system
  // inputs -> the locale to render.
  function resolveLocale(choice, urlLocale, platformLocale, deviceLanguages) {
    if (urlLocale && SUPPORTED.indexOf(urlLocale) !== -1) return urlLocale;
    if (choice === 'en' || choice === 'id') return choice;
    return resolveSystem(platformLocale, deviceLanguages);
  }

  // window.localStorage in the browser; the globalThis fallback is the
  // seam the Node tests inject through (root is null there).
  function storage() {
    if (root && root.localStorage) return root.localStorage;
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
    return null;
  }

  function readChoice() {
    try {
      var store = storage();
      var saved = store && store.getItem(STORAGE_KEY);
      return CHOICES.indexOf(saved) !== -1 ? saved : 'system';
    } catch (e) { return 'system'; }
  }

  function writeChoice(choice) {
    try {
      var store = storage();
      if (!store) return;
      if (choice === 'system') store.removeItem(STORAGE_KEY);
      else store.setItem(STORAGE_KEY, choice);
    } catch (e) { /* private mode: the choice simply lasts this visit */ }
  }

  function urlLocaleOf() {
    try {
      var value = new URLSearchParams(root.location.search).get('lang');
      return SUPPORTED.indexOf(value) !== -1 ? value : null;
    } catch (e) { return null; }
  }

  function deviceLanguages() {
    var nav = root && root.navigator;
    if (!nav) return [];
    if (nav.languages && nav.languages.length) return Array.prototype.slice.call(nav.languages);
    return nav.language ? [nav.language] : [];
  }

  // ── Runtime state ───────────────────────────────────────────────────────

  var choice = readChoice(); // the device-wide layer; the profile is read live
  var urlLocale = root ? urlLocaleOf() : null;
  var platformLocale = null;
  var locale = resolveLocale(effectiveChoice(), urlLocale, platformLocale, deviceLanguages());
  var listeners = [];

  function applyLocale(next) {
    var changed = next !== locale;
    locale = next;
    if (root && root.document) root.document.documentElement.lang = locale;
    if (!changed) return;
    listeners.forEach(function (fn) { try { fn(locale); } catch (e) { console.error(e); } });
    if (root && typeof root.CustomEvent === 'function') {
      root.dispatchEvent(new root.CustomEvent('turnly:locale-changed', { detail: { locale: locale } }));
    }
  }

  function t(key, params) {
    var dict = messages[locale] || {};
    var text;
    if (Object.prototype.hasOwnProperty.call(dict, key)) text = dict[key];
    else if (Object.prototype.hasOwnProperty.call(messages.en || {}, key)) text = messages.en[key];
    else return key;
    return format(text, params, locale);
  }

  function getLocale() { return locale; }
  // The choice in force: the user profile's language when it has one, else
  // the device-wide preference. The picker reads this.
  function effectiveChoice() {
    var fromProfile = profile.getLanguage();
    return fromProfile || choice;
  }
  function getChoice() { return effectiveChoice(); }
  // What the picker should show: the URL-forced language while it is in
  // effect (the language actually in use), otherwise the saved choice.
  function getEffectiveChoice() { return urlLocale || choice; }

  function setChoice(next) {
    if (CHOICES.indexOf(next) === -1) return;
    // Write through BOTH layers: the profile language is the setting going
    // forward (it maps onto the users.language column, null = follow
    // system), and the device-wide key stays in step so a device that only
    // has that key still agrees after the picker is used.
    profile.setLanguage(next === 'system' ? null : next);
    choice = next;
    urlLocale = null; // an explicit choice ends the URL override for this visit
    writeChoice(choice);
    applyLocale(resolveLocale(effectiveChoice(), urlLocale, platformLocale, deviceLanguages()));
  }

  function setPlatformLocale(tag) {
    platformLocale = tag || null;
    applyLocale(resolveLocale(effectiveChoice(), urlLocale, platformLocale, deviceLanguages()));
  }

  function onChange(fn) { listeners.push(fn); }

  if (root && root.document) {
    root.document.documentElement.lang = locale;
    // The platform locale arrives asynchronously; follow it in 'system' mode.
    if (root.usernode && typeof root.usernode.getUserLocale === 'function') {
      try {
        Promise.resolve(root.usernode.getUserLocale()).then(function (res) {
          setPlatformLocale(res && res.locale);
        }, function () {});
      } catch (e) { /* bridge absent: device language it is */ }
    }
    root.addEventListener('usernode:locale-changed', function (e) {
      setPlatformLocale(e && e.detail && e.detail.locale);
    });
  }

  return {
    t: t,
    format: format,
    getLocale: getLocale,
    getChoice: getChoice,
    getEffectiveChoice: getEffectiveChoice,
    setChoice: setChoice,
    setPlatformLocale: setPlatformLocale,
    onChange: onChange,
    mapTag: mapTag,
    resolveLocale: resolveLocale,
    SUPPORTED: SUPPORTED,
    DEFAULT_LOCALE: DEFAULT_LOCALE,
    STORAGE_KEY: STORAGE_KEY,
  };
});
