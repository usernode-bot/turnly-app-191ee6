// Which API requests the auth middleware answers without an identity token.
//
// The Quick revision workshop (public/revisi.html) loads /index.html in three
// same-origin preview frames that carry no token. Each frame's language lookup
// hits GET /api/me; if that read is gated the frame gets a 401, and a 401 is a
// console error, which fails the workshop's "no console errors" proposal
// check. This pins the policy: the read stays open, the write stays gated.
const test = require('node:test');
const assert = require('node:assert/strict');
const { OPEN_API_PATHS, OPEN_READ_API_PATHS, isPublicApiRequest } =
  require('../api-access.js');

test('the anonymous account read is open, so tokenless frames do not 401', () => {
  assert.equal(isPublicApiRequest('GET', '/api/me', false), true);
  assert.equal(isPublicApiRequest('HEAD', '/api/me', false), true);
});

test('the account write is never open', () => {
  assert.equal(isPublicApiRequest('POST', '/api/me', false), false);
  assert.equal(isPublicApiRequest('PUT', '/api/me', false), false);
  assert.equal(isPublicApiRequest('DELETE', '/api/me', false), false);
});

test('every other API path and the HTML shell stay gated', () => {
  assert.equal(isPublicApiRequest('GET', '/', false), false);
  assert.equal(isPublicApiRequest('GET', '/revisi.html', false), false);
  assert.equal(isPublicApiRequest('GET', '/api/reminders', false), false);
  assert.equal(isPublicApiRequest('POST', '/api/reminders', false), false);
});

test('liveness stays open for any method, and a signed-in caller is not "public"', () => {
  assert.equal(isPublicApiRequest('GET', '/health', false), true);
  assert.equal(isPublicApiRequest('POST', '/health', false), true);
  // A verified caller goes through the ordinary path, not the public shortcut.
  assert.equal(isPublicApiRequest('GET', '/api/me', true), false);
});

test('the open sets are exactly what the middleware reasons about', () => {
  assert.deepEqual([...OPEN_API_PATHS], ['/health']);
  assert.deepEqual([...OPEN_READ_API_PATHS], ['/api/me']);
});
