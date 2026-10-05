// No user-facing copy outside the message files: the markup carries no
// text, the screen scripts build no sentences by hand, every t() key exists
// and every message is used somewhere.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const en = require('../public/js/messages/en.js');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const hasLetters = (s) => /[A-Za-z]/.test(s);

test('index.html carries no text nodes and no literal copy attributes', () => {
  let html = read('public/index.html');
  html = html.replace(/<!--[^]*?-->/g, '');
  html = html.replace(/<script\b[^>]*>[^]*?<\/script>/g, '');
  html = html.replace(/<style\b[^>]*>[^]*?<\/style>/g, '');
  html = html.replace(/<title>Turnly<\/title>/, ''); // the brand, the one allowed literal

  const textNodes = html.replace(/<[^>]*>/g, '\n').split('\n').map((s) => s.trim()).filter(hasLetters);
  assert.deepEqual(textNodes, [], 'text written directly in index.html');

  const attrRe = /\s(aria-label|title|placeholder|alt|value)\s*=\s*"([^"]*)"/g;
  const offenders = [];
  let m;
  while ((m = attrRe.exec(html))) {
    if (m[1] === 'value' && /^(en|id|system)$/.test(m[2])) continue; // option identifiers
    if (hasLetters(m[2])) offenders.push(`${m[1]}="${m[2]}"`);
  }
  assert.deepEqual(offenders, [], 'literal copy in an attribute');
});

const screenFiles = fs.readdirSync(path.join(root, 'public/js'))
  .filter((f) => f.endsWith('.js') && f !== 'i18n.js')
  .map((f) => 'public/js/' + f);

test('screen scripts never write literal copy or glue messages together', () => {
  const offenders = [];
  for (const file of screenFiles) {
    const src = read(file).replace(/\/\*[^]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      const where = `${file}:${i + 1}`;
      const literal = (re) => { const m = re.exec(line); return m && hasLetters(m[1]); };
      if (literal(/textContent\s*=\s*'([^']*)'/)) offenders.push(`${where} textContent literal`);
      if (literal(/setAttribute\('(?:aria-label|title|placeholder)',\s*'([^']*)'\)/)) offenders.push(`${where} attribute literal`);
      if (literal(/\btoast\('([^']*)'/)) offenders.push(`${where} toast literal`);
      if (/t\([^)]*\)\s*\+\s*'[^']*[A-Za-z][^']*'/.test(line) || /'[^']*[A-Za-z][^']*'\s*\+\s*t\(/.test(line)) {
        offenders.push(`${where} message concatenated with text`);
      }
      if (/\bt\(\s*'[^']*'\s*\+/.test(line)) offenders.push(`${where} dynamic key building`);
    });
  }
  assert.deepEqual(offenders, []);
});

test('every t() key exists in en, and every en key is used', () => {
  const used = new Set();
  for (const file of screenFiles) {
    const src = read(file);
    const re = /\bt\(\s*'([^']+)'/g;
    let m;
    while ((m = re.exec(src))) used.add(m[1]);
  }
  // Keys reached through the literal lookup tables in foundation.js.
  for (const file of screenFiles) {
    const src = read(file);
    const re = /:\s*'((?:status|legend)\.[a-z]+)'/g;
    let m;
    while ((m = re.exec(src))) used.add(m[1]);
  }
  const unknown = [...used].filter((k) => !(k in en));
  assert.deepEqual(unknown, [], 't() keys that have no message');
  const dead = Object.keys(en).filter((k) => !used.has(k));
  assert.deepEqual(dead, [], 'messages nothing renders');
});
