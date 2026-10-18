/* Read aloud (Bacakan): speak whole sentences through the browser's built-in
 * speechSynthesis. Nothing is recorded, uploaded or stored: the phone's own
 * voice does the speaking, and only the sentences the active screen already
 * shows are handed over.
 *
 * The helpers are pure so the Node tests can run them; the browser part is
 * a no-op wherever speechSynthesis is missing. No copy lives here: screens
 * build the sentences from i18n and pass them in.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TurnlySpeech = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  // 'id' -> 'id-ID', anything else -> 'en-US'. The app's locales are the
  // two-letter tags i18n.js resolves to.
  function langTag(locale) {
    return (locale || 'en').toLowerCase().split(/[-_]/)[0] === 'id' ? 'id-ID' : 'en-US';
  }

  // The first voice that matches the full tag, else one matching the
  // language prefix ('id_ID', 'id'), else null (let the browser pick).
  function pilihSuara(voices, locale) {
    var tag = langTag(locale);
    var awalan = tag.slice(0, 2);
    var list = voices || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].lang === tag) return list[i];
    }
    for (var j = 0; j < list.length; j++) {
      if (list[j].lang && list[j].lang.split(/[-_]/)[0] === awalan) return list[j];
    }
    return null;
  }

  function isSupported() {
    return typeof window !== 'undefined'
      && 'speechSynthesis' in window
      && typeof window.SpeechSynthesisUtterance === 'function';
  }

  // The utterance whose onEnd is still owed. A token guards it: when a new
  // speak() starts, the previous reading's late 'end' event (a cancel fires
  // one in Chrome) can no longer fire the newer reading's callback.
  var tokenSaatIni = 0;
  var onEndTertunda = null;

  // Speak the sentences in order, one utterance each. Cancels anything
  // already playing first. onEnd runs at most once, after the last
  // utterance ends, on error, or after stop().
  function speak(sentences, locale, onEnd) {
    if (!isSupported()) return;
    var synth = window.speechSynthesis;
    synth.cancel();
    var token = ++tokenSaatIni;
    onEndTertunda = onEnd || null;

    var selesaiSekali = function () {
      if (token !== tokenSaatIni) return; // a newer reading owns the callback now
      var cb = onEndTertunda;
      onEndTertunda = null;
      if (cb) cb();
    };

    var list = Array.isArray(sentences) ? sentences : [sentences];
    var adaIsi = false;
    list.forEach(function (text) {
      if (!text) return;
      adaIsi = true;
      var u = new window.SpeechSynthesisUtterance(text);
      u.lang = langTag(locale);
      u.rate = 0.9; // a little slower than normal, easier to follow
      var suara = pilihSuara(synth.getVoices(), locale);
      if (suara) u.voice = suara;
      u.onend = selesaiSekali;
      u.onerror = selesaiSekali;
      synth.speak(u);
    });
    if (!adaIsi) selesaiSekali();
  }

  // Stop at once and release the pending callback, so the button label
  // falls back without waiting for the cancelled utterance's own event.
  function stop() {
    if (!isSupported()) return;
    window.speechSynthesis.cancel();
    var cb = onEndTertunda;
    onEndTertunda = null;
    tokenSaatIni++; // late 'end' events of the cancelled reading are stale
    if (cb) cb();
  }

  function isSpeaking() {
    return isSupported() && window.speechSynthesis.speaking;
  }

  return {
    langTag: langTag,
    pilihSuara: pilihSuara,
    isSupported: isSupported,
    speak: speak,
    stop: stop,
    isSpeaking: isSpeaking,
  };
});
