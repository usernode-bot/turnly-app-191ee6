// Every asset a screen loads comes from this app's own origin. The staging
// checks fail a page on any resource error, and the one third-party request
// the shell used to make (Google Fonts) was the slowest thing on the page —
// the one a network change in a capture container or on a phone aborts. The
// fonts are self-hosted from /fonts/ now, so the shell must name no
// external host at all.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const shell = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

test('the HTML shell loads nothing from an external host', () => {
  const external = shell.match(/(?:src|href)="https?:\/\/[^"]+"/g) || [];
  assert.deepEqual(external, [],
    'external references found in index.html: ' + external.join(', '));
});
