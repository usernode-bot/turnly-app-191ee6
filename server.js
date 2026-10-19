const express = require('express');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// The platform tells every container which environment it runs in. This is
// used only to seed obviously fake demo data and to accept a preview's
// ?un-now= moment; it never changes which code path runs (see the platform
// conventions, "Staging vs production").
const IS_STAGING = process.env.USERNODE_ENV === 'staging';

// The platform signs user-identity tokens with an RSA private key it never
// shares. Containers get only the PUBLIC half, so this app can verify who a
// user is but cannot mint an identity — and neither can any other app.
const JWT_PUBLIC_KEY = (process.env.USERNODE_JWT_PUBLIC_KEY || '')
  .replace(/\\n/g, '\n');

// Tokens are minted for one app: the audience is this app's numeric id, so a
// token issued for a different app is rejected below rather than accepted as
// a valid user.
const APP_AUDIENCE = process.env.USERNODE_APP_ID
  ? 'usernode:app:' + process.env.USERNODE_APP_ID
  : null;

// Visitors with no Homeroom account ("guests") may look around this app at
// its own address, read-only (every public app). The platform marks
// them with a token of their own: ES256, signed by a key of its own (its
// public half is USERNODE_GUEST_JWT_PUBLIC_KEY), this audience, `pur:
// 'guest'`, `guest: true`, and no id or username. Such a visitor is
// `req.guest`, never `req.user`, and every write they try is answered 401
// `account_required`, which the bridge turns into "Make an account to
// continue".
const GUEST_AUDIENCE = APP_AUDIENCE ? APP_AUDIENCE + ':guest' : null;
const GUEST_PUBLIC_KEY = (process.env.USERNODE_GUEST_JWT_PUBLIC_KEY || '')
  .replace(/\\n/g, '\n');

// Which API requests stay open without authentication lives in api-access.js
// so it can be unit-tested (see tests/api-access.test.js). GET /api/me is
// deliberately an open READ: the revision workshop's preview frames load
// /index.html same-origin with no identity token, and a gated read would 401
// in each — a console error, which fails the workshop's "no console errors"
// check. It is safe because the route only ever reports the caller
// ({ authenticated: false } without a token). The write, POST /api/me, is not
// listed and keeps requiring an account.
const { isPublicApiRequest } = require('./api-access');

app.use(express.json());

// Apply db/schema.sql on boot, idempotently: CREATE TABLE IF NOT EXISTS /
// ADD COLUMN IF NOT EXISTS, so repeated deploys are safe. Only the columns a
// reader needs are pinned here; the CREATE TABLEs are skipped when the table
// already exists, so a hand-migrated database is left alone.
async function applySchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  await pool.query(sql);
  // Grammar-level safety net for a users table made before this column
  // existed (a no-op when the CREATE TABLE above already added it).
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en'");
}

// Staging starts from a copy of production, so tables this change creates are
// empty and the Staging demo user does not exist. Seed the few rows a
// testing step needs, with fixed ids and ON CONFLICT DO NOTHING so a reload
// changes nothing. In production this block never runs.
async function seedStaging() {
  if (!IS_STAGING) return;
  await pool.query(`
    INSERT INTO users (id, username) VALUES (900001, 'Staging demo admin')
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO arisan (id, nama, nominal, periode, rekening_kas, total_periode, status, admin_id)
    VALUES ('demo-staging-reminder', 'Staging demo arisan', 100000, 'bulanan',
            'BCA 0000000000 a.n. Staging demo', 3, 'berjalan', 'demo-staging-arm1')
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO anggota_arisan (id, arisan_id, nama_tampil, nomor_hp, urutan_giliran, peran)
    VALUES ('demo-staging-arm1', 'demo-staging-reminder', 'Staging demo admin', '0800000000', 1, 'admin')
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO reminders (arisan_id, due_id, member_id, channel, sent_at, status, message_key)
    SELECT 'demo-staging-reminder', NULL, 'demo-staging-arm1', 'app', now(), 'sent', 'reminder.sentLine'
    WHERE NOT EXISTS (
      SELECT 1 FROM reminders WHERE arisan_id = 'demo-staging-reminder' AND member_id = 'demo-staging-arm1'
    );
  `);
}

let schemaReady = Promise.resolve();
function startSchema() {
  schemaReady = applySchema()
    .then(seedStaging)
    .then(() => console.log(`schema applied${IS_STAGING ? ' (staging seed included)' : ''}`))
    .catch((err) => console.error('schema apply failed: ' + err.message));
}
startSchema();

// The platform's three centrally hosted files — the bridge, the native UI
// kit and the Tailwind runtime — are reachable at these paths on this app's
// OWN origin, so index.html can load them with a RELATIVE path and never
// name the platform's hostname. A hostname baked into an app is what breaks
// every app at once when the platform's domain moves.
//
// In production and on a staging preview the platform's edge answers these
// before the request ever reaches this process (a per-app Ingress rule on
// Kubernetes, the wildcard site's matcher on the docker runtime). This
// handler is what makes the same relative paths work under a plain
// `node server.js`, where there is no edge in front of the app at all.
//
// Registered BEFORE the auth middleware because these three files are
// public: the platform serves them anonymously from any app origin, and a
// login redirect arriving where a <script> was expected is exactly the
// failure a relative path is meant to avoid.
// The platform's origin, at RUNTIME, and ONLY from the variable the platform
// injects. No hostname is written into this file: a baked-in one is what left
// the whole fleet pointing at a domain the platform had moved away from.
// Unset only outside the platform (a plain local `node server.js`) — set
// USERNODE_PLATFORM_ORIGIN there too if you want the hosted assets locally.
const PLATFORM_ORIGIN = (process.env.USERNODE_PLATFORM_ORIGIN || '')
  .replace(/\/+$/, '');

app.get(/^\/usernode-(?:bridge|native|tailwind)\//, async (req, res) => {
  try {
    if (!PLATFORM_ORIGIN) return res.sendStatus(503);
    const upstream = await fetch(PLATFORM_ORIGIN + req.path);
    if (!upstream.ok) return res.sendStatus(upstream.status);
    const type = upstream.headers.get('content-type');
    if (type) res.type(type);
    // max-age=0 with revalidation, never a long TTL: the whole point of
    // central hosting is that a platform-side fix lands on the next load.
    res.set('Cache-Control', 'public, max-age=0, must-revalidate');
    return res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    console.warn('hosted asset fetch failed: ' + err.message);
    return res.sendStatus(502);
  }
});

// Verify platform-issued JWT if one was passed, then enforce auth on
// anything not explicitly marked public. The iframe adds `?token=…`
// on load; the frontend script forwards the token via `x-usernode-token`
// on subsequent fetches.
app.use((req, res, next) => {
  const token = req.query.token || req.headers['x-usernode-token'];
  if (token && JWT_PUBLIC_KEY && APP_AUDIENCE) {
    try {
      // Pin the algorithm, issuer and audience. Without `algorithms` a
      // caller could hand us an HS256 token signed with the public PEM
      // (which every app knows) and forge any user.
      const claims = jwt.verify(token, JWT_PUBLIC_KEY, {
        algorithms: ['RS256'],
        issuer: 'usernode',
        audience: APP_AUDIENCE,
      });
      // `pur` names what the token is for. Only user-identity tokens
      // authenticate a person here.
      if (claims && claims.pur === 'iframe') req.user = claims;
    } catch {}
  }
  if (!req.user && token && GUEST_PUBLIC_KEY && GUEST_AUDIENCE) {
    try {
      const guest = jwt.verify(token, GUEST_PUBLIC_KEY, {
        algorithms: ['ES256'],
        issuer: 'usernode',
        audience: GUEST_AUDIENCE,
      });
      if (guest && guest.pur === 'guest' && guest.guest === true) req.guest = true;
    } catch {}
  }

  // Static assets (CSS/JS/images) are always served; the API and the HTML
  // shell are gated so direct hits to the staging/prod subdomain don't
  // leak app data to the public internet. A guest may READ: every GET,
  // `/api/*` included, so read routes must not assume req.user (use
  // `req.user ? req.user.id : null`). Every write needs an account.
  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    if (isPublicApiRequest(req.method, req.path, !!req.user)) return next();
    if (!req.user && req.guest) {
      if (req.method === 'GET' || req.method === 'HEAD') return next();
      return res.status(401).json({ error: 'account_required' });
    }
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── The account copy of the language ──────────────────────────────────────
// public/js/user-profile.js keeps the language choice on the device
// ('turnly.user'); when the app is signed in it ALSO keeps it on the account
// here (users.language), so the choice follows the person to another device.
// GET answers who is signed in and what the account already holds: the server
// value wins on load, applied by public/js/i18n.js. POST writes it. A guest,
// or an account with no language yet, gets null and the device copy stands.
const LANGUAGES = new Set(['en', 'id']);

app.get('/api/me', async (req, res) => {
  // An open READ by design (see api-access.js): a caller without a verified
  // platform token gets only this, never a real person's language.
  if (!req.user) return res.json({ authenticated: false, username: null, language: null });
  try {
    await schemaReady;
    const { rows } = await pool.query('SELECT language FROM users WHERE id = $1', [req.user.id]);
    return res.json({ authenticated: true, username: req.user.username || null, language: rows[0] ? rows[0].language : null });
  } catch (err) {
    console.error('/api/me read failed: ' + err.message);
    return res.json({ authenticated: true, username: req.user.username || null, language: null });
  }
});

app.post('/api/me', async (req, res) => {
  const language = req.body && req.body.language;
  if (!LANGUAGES.has(language)) {
    return res.status(400).json({ error: 'Unsupported language' });
  }
  // A write without an account was already answered by the auth middleware
  // (guests get account_required); this is the belt to that braces.
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  try {
    await schemaReady;
    await pool.query(
      `INSERT INTO users (id, username, language) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET language = EXCLUDED.language`,
      [req.user.id, req.user.username || null, language]
    );
    return res.json({ language });
  } catch (err) {
    // The device copy still holds the choice; say so honestly rather than
    // pretending the account was written.
    console.error('/api/me write failed: ' + err.message);
    return res.status(503).json({ error: 'Language not saved' });
  }
});

// The template ships no favicon file; index.html carries an inline SVG
// icon instead. Answer 204 here so anything that still probes
// /favicon.ico (older browsers, direct visits) doesn't fall through to
// the auth-gated catch-all and surface a 401 in the console on every
// fresh load.
app.get('/favicon.ico', (_req, res) => res.status(204).end());

app.use(express.static(path.join(__dirname, 'public')));

// HTML shell: serve the app if authenticated. Unauthenticated top-level
// visits (share links pasted into a browser — Sec-Fetch-Dest: document)
// are sent to the platform's chromeless view of this app, where the shell
// embeds it with a real token so the link just works. Every other
// tokenless case (iframe loads with an expired token, old browsers
// without Sec-Fetch-*) gets the "open in Homeroom" landing page instead
// of a redirect, so the platform shell is never loaded INSIDE its own
// app iframe and stray visits still don't reveal the app.
app.get('*', (req, res) => {
  if (!req.user && !req.guest) {
    // Deep-link pass-through (platform #743): carry the visited
    // path+query into the chromeless view so share links land on the
    // shared screen, not Home. The clean platform route stores `path`
    // as one encoded query value so an inner ?, &, or = survives. The
    // shell decodes and validates it as relative-only before use. The
    // character test keeps the
    // value attribute-safe for the landing anchor below — anything
    // unusual falls back to the bare link.
    const deepPath = /^\/[A-Za-z0-9\-._~!$&()*+,;=:@\/%?]*$/.test(req.originalUrl)
      ? '?path=' + encodeURIComponent(req.originalUrl) : '';
    if (PLATFORM_ORIGIN && req.get('sec-fetch-dest') === 'document') {
      return res.redirect(302, PLATFORM_ORIGIN + '/app/turnly-app-191ee6/full' + deepPath);
    }
    return res.status(401).send(`<!doctype html><meta charset=utf-8><title>Open in Homeroom</title>
<body style="font-family:system-ui;background:#09090b;color:#e4e4e7;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
  <div style="max-width:24rem;padding:2rem;text-align:center">
    <h1 style="font-size:1.25rem;margin:0 0 0.5rem">Open this app inside Homeroom</h1>
    <p style="color:#a1a1aa;font-size:0.9rem;margin:0 0 1.25rem">This page is served via the platform; direct visits aren't authenticated.</p>
    <a href="${PLATFORM_ORIGIN}/app/turnly-app-191ee6/full${deepPath}" style="display:inline-block;padding:0.5rem 1rem;background:#7c3aed;color:white;border-radius:0.5rem;text-decoration:none;font-size:0.9rem">Open in Homeroom</a>
  </div>
</body>`);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(port, () => console.log(`Listening on :${port}`));
// Let Envoy retire idle upstream connections at 60s, with a 15s margin.
server.keepAliveTimeout = 75_000;

// Graceful shutdown: stop accepting connections, drain briefly, close the
// pool, exit. The platform stops the container with SIGTERM on redeploy.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
