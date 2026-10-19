/* Which API requests the auth middleware answers without a platform token.
 *
 * Kept in one place, and unit-tested, because a READ the app itself makes
 * from a same-origin page or frame that carries no identity token must not
 * 401: a 401 is a console error, and a console error fails the proposal
 * checks. The Quick revision workshop (public/revisi.html) loads /index.html
 * in three preview frames with no token, and each frame's language lookup
 * hits GET /api/me — so that read has to be open.
 *
 * Being open is safe because GET /api/me only ever reports the CALLER:
 * `{ authenticated: false, language: null }` when no token verified, and the
 * caller's own account language otherwise. It never returns another person's
 * data. The write side, POST /api/me (which stores users.language), is not
 * listed here: it keeps requiring an account.
 */
'use strict';

// Open regardless of method: liveness, and nothing else.
const OPEN_API_PATHS = new Set(['/health']);

// Open to anonymous READERS only (GET/HEAD); any write stays gated.
const OPEN_READ_API_PATHS = new Set(['/api/me']);

// Should the auth middleware let this request through with no identity?
// `authed` is true once the middleware has verified req.user; a verified
// caller is never "public", the guest/account rules decide for them.
function isPublicApiRequest(method, path, authed) {
  if (authed) return false;
  if (OPEN_API_PATHS.has(path)) return true;
  if (method === 'GET' || method === 'HEAD') return OPEN_READ_API_PATHS.has(path);
  return false;
}

module.exports = { OPEN_API_PATHS, OPEN_READ_API_PATHS, isPublicApiRequest };
