// The two message files must stay in step: same keys, same placeholders,
// well-formed ICU, no em dashes. Fails naming the offending key and file.
const test = require('node:test');
const assert = require('node:assert/strict');
const en = require('../public/js/messages/en.js');
const id = require('../public/js/messages/id.js');

const files = { en, id };

function placeholders(text) {
  // Top-level and nested {name} / {name, plural, ...} argument names.
  const names = new Set();
  const re = /\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:,|\})/g;
  let m;
  while ((m = re.exec(text))) names.add(m[1]);
  return names;
}

// The bodies of every {name, plural, ...} block, found by brace depth.
function pluralBodies(text) {
  const bodies = [];
  const re = /\{\s*\w+\s*,\s*plural\s*,/g;
  let m;
  while ((m = re.exec(text))) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    for (; i < text.length && depth > 0; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
    }
    bodies.push(text.slice(start, i - 1));
  }
  return bodies;
}

test('en and id have exactly the same keys', () => {
  const missingInId = Object.keys(en).filter((k) => !(k in id));
  const missingInEn = Object.keys(id).filter((k) => !(k in en));
  assert.deepEqual(missingInId, [], 'keys present in en but missing from id');
  assert.deepEqual(missingInEn, [], 'keys present in id but missing from en');
});

test('no message is empty and every value is a string', () => {
  for (const [name, dict] of Object.entries(files)) {
    for (const [key, value] of Object.entries(dict)) {
      assert.equal(typeof value, 'string', `${name}: ${key} is not a string`);
      assert.ok(value.trim().length > 0, `${name}: ${key} is empty`);
    }
  }
});

test('each key uses the same placeholder names in both files', () => {
  for (const key of Object.keys(en)) {
    if (!(key in id)) continue;
    assert.deepEqual([...placeholders(id[key])].sort(), [...placeholders(en[key])].sort(),
      `placeholders differ for ${key}`);
  }
});

test('braces balance and every plural has an "other" option', () => {
  for (const [name, dict] of Object.entries(files)) {
    for (const [key, value] of Object.entries(dict)) {
      let depth = 0;
      for (const ch of value) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
        assert.ok(depth >= 0, `${name}: ${key} closes a brace it never opened`);
      }
      assert.equal(depth, 0, `${name}: ${key} has unbalanced braces`);
      for (const body of pluralBodies(value)) {
        assert.match(body, /\bother\s*\{/, `${name}: ${key} has a plural without "other"`);
      }
    }
  }
});

test('no em dash in any encoding (platform copy rule)', () => {
  const bad = /—|&mdash;|&#8212;|\\u2014/;
  for (const [name, dict] of Object.entries(files)) {
    for (const [key, value] of Object.entries(dict)) {
      assert.ok(!bad.test(value), `${name}: ${key} contains an em dash`);
    }
  }
});

test('the Home turn schedule has its copy in both files', () => {
  for (const [name, dict] of Object.entries(files)) {
    assert.equal(typeof dict['groups.payout'], 'string', `${name}: groups.payout`);
    assert.deepEqual([...placeholders(dict['groups.payout'])].sort(), ['date', 'name']);
    assert.deepEqual([...placeholders(dict['groups.payoutYou'])].sort(), ['date']);
    assert.deepEqual([...placeholders(dict['groups.turnDone'])].sort(), ['round']);
    assert.equal(typeof dict['groups.schedule'], 'string', `${name}: groups.schedule`);
  }
  // The payout line names the recipient, so the old dateless line is gone.
  assert.equal('groups.recipient' in en, false);
  assert.equal('groups.recipient' in id, false);
});
