// The pure speech helpers: voice picking and tag mapping, no DOM, no copy.
// The browser part of speech.js is a no-op where speechSynthesis is absent
// (like under Node), which is exactly the hidden-button case in a browser.
const test = require('node:test');
const assert = require('node:assert/strict');
const speech = require('../public/js/speech.js');

test("langTag maps the app's locales onto BCP-47 tags", () => {
  assert.equal(speech.langTag('id'), 'id-ID');
  assert.equal(speech.langTag('en'), 'en-US');
  assert.equal(speech.langTag('en-US'), 'en-US');
  assert.equal(speech.langTag(undefined), 'en-US');
});

test('pilihSuara prefers an exact language-tag match', () => {
  const idID = { lang: 'id-ID', name: 'Indonesian' };
  const enUS = { lang: 'en-US', name: 'English' };
  assert.equal(speech.pilihSuara([enUS, idID], 'id'), idID);
  assert.equal(speech.pilihSuara([idID, enUS], 'en'), enUS);
});

test('pilihSuara falls back to the language prefix, then null', () => {
  const id = { lang: 'id', name: 'Indonesian' };
  const underscore = { lang: 'id_ID', name: 'Indonesian legacy' };
  const enUS = { lang: 'en-US', name: 'English' };
  assert.equal(speech.pilihSuara([enUS, underscore], 'id'), underscore);
  assert.equal(speech.pilihSuara([enUS, id], 'id'), id);
  assert.equal(speech.pilihSuara([enUS], 'id'), null);
  assert.equal(speech.pilihSuara([], 'en'), null);
  assert.equal(speech.pilihSuara(null, 'en'), null);
});

test('isSupported is false without speechSynthesis (Node, like a bare browser)', () => {
  assert.equal(speech.isSupported(), false);
});

test('speak and stop are safe no-ops where speech is unsupported', () => {
  let called = 0;
  speech.speak(['a sentence'], 'en', () => { called++; });
  speech.stop();
  assert.equal(speech.isSpeaking(), false);
  assert.equal(called, 0);
});
