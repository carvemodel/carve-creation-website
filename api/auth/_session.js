// Shared helpers for signing and verifying the portal session cookie.
// Used by login.js, logout.js, and me.js (all run on Vercel's Node.js
// runtime, so they can use the built-in `crypto` module directly).
//
// The session token format is:
//   base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)
//
// The signature covers the base64url-encoded payload string. This same
// format is re-verified independently in /middleware.js, which runs on
// the Edge runtime and uses the Web Crypto API instead of Node's `crypto`
// module -- HMAC-SHA256 output is identical across both as long as the
// secret and message bytes match, which is what makes it possible to
// verify the same cookie in two different JS runtimes without a shared
// dependency.

const crypto = require('crypto');

const COOKIE_NAME = 'portal_session';
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signSession(payload, secret) {
  const payloadB64 = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return payloadB64 + '.' + sig;
}

function verifySession(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const idx = token.lastIndexOf('.');
  if (idx === -1) return null;
  const payloadB64 = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload || !payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach(function (part) {
    const eq = part.indexOf('=');
    if (eq === -1) return;
    out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  });
  return out;
}

function verifyPassword(password, salt, expectedHash) {
  return new Promise(function (resolve, reject) {
    crypto.scrypt(password, salt, 64, function (err, derivedKey) {
      if (err) return reject(err);
      const actual = derivedKey.toString('hex');
      const a = Buffer.from(actual, 'hex');
      const b = Buffer.from(expectedHash, 'hex');
      resolve(a.length === b.length && crypto.timingSafeEqual(a, b));
    });
  });
}

function getUsers() {
  try {
    const parsed = JSON.parse(process.env.PORTAL_USERS || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

module.exports = {
  COOKIE_NAME: COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS: SESSION_MAX_AGE_SECONDS,
  signSession: signSession,
  verifySession: verifySession,
  parseCookies: parseCookies,
  verifyPassword: verifyPassword,
  getUsers: getUsers
};
