// Vercel Edge Middleware: gates every real portal page behind a signed
// session cookie. portal-login.html and the (currently stubbed)
// forgot/reset-password pages are intentionally left out of the matcher
// below so people can always reach the sign-in screen.
//
// This runs on Vercel's Edge runtime, not Node.js, so it verifies the
// session cookie with the Web Crypto API instead of Node's `crypto`
// module. See api/auth/_session.js for the Node-side signer -- both sides
// produce and check the same HMAC-SHA256-based token format.

export const config = {
  matcher: [
    '/portal-overview.html',
    '/portal-projects.html',
    '/portal-project-detail.html',
    '/portal-leads.html',
    '/portal-quotes.html',
    '/portal-finance.html',
    '/portal-clients.html',
    '/portal-team-access.html',
    '/portal-overview',
    '/portal-projects',
    '/portal-project-detail',
    '/portal-leads',
    '/portal-quotes',
    '/portal-finance',
    '/portal-clients',
    '/portal-team-access'
  ]
};

const COOKIE_NAME = 'portal_session';

function parseCookieHeader(header) {
  const out = {};
  (header || '').split(';').forEach(function (part) {
    const eq = part.indexOf('=');
    if (eq === -1) return;
    out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  });
  return out;
}

function base64UrlToBytes(base64url) {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifySession(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const idx = token.lastIndexOf('.');
  if (idx === -1) return null;
  const payloadB64 = token.slice(0, idx);
  const sigB64 = token.slice(idx + 1);

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expectedSigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  const expectedBytes = new Uint8Array(expectedSigBuf);
  const providedBytes = base64UrlToBytes(sigB64);

  if (!bytesEqual(providedBytes, expectedBytes)) return null;

  try {
    const payloadBytes = base64UrlToBytes(payloadB64);
    const payloadStr = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(payloadStr);
    if (!payload || !payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export default async function middleware(request) {
  const secret = process.env.SESSION_SECRET;
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const payload = secret ? await verifySession(cookies[COOKIE_NAME], secret) : null;

  if (!payload) {
    const url = new URL('/portal-login.html', request.url);
    url.searchParams.set('next', new URL(request.url).pathname);
    return Response.redirect(url.toString(), 302);
  }

  // No return value = let the request through to the requested page.
}
