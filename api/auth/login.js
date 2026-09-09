// Vercel serverless function: verifies portal credentials and issues a
// signed, httpOnly session cookie. No self-serve registration exists
// anywhere in this project on purpose -- accounts are provisioned only by
// a Carve admin running scripts/hash-password.js locally and adding the
// result to the PORTAL_USERS environment variable in Vercel. See
// scripts/hash-password.js for instructions.
//
// Required environment variables (Vercel Project Settings -> Environment
// Variables):
//   SESSION_SECRET  - long random string used to sign session cookies
//   PORTAL_USERS    - JSON array of { email, name, salt, hash }, produced
//                      by scripts/hash-password.js

const {
  COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signSession,
  verifyPassword,
  getUsers
} = require('./_session');

// Fixed dummy salt/hash used when the email doesn't match any account, so
// an unknown-email login still runs a real scrypt hash of the same cost.
// Without this, a login attempt against a real account would take
// noticeably longer than one against a nonexistent email (scrypt vs. an
// instant lookup miss), which is enough of a timing difference to let
// someone probe which emails have portal accounts.
const DUMMY_SALT = 'c9f0a2b1d3e4f5061728394a5b6c7d8e';
const DUMMY_HASH =
  '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!process.env.SESSION_SECRET) {
    console.error('Missing SESSION_SECRET environment variable.');
    return res.status(500).json({ error: 'Sign-in is not configured yet.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const users = getUsers();
  const user = users.find(function (u) { return String(u.email || '').toLowerCase() === email; });

  let passwordOk = false;
  try {
    passwordOk = await verifyPassword(
      password,
      user ? user.salt : DUMMY_SALT,
      user ? user.hash : DUMMY_HASH
    );
  } catch (err) {
    console.error('Password verification error:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }

  if (!user || !passwordOk) {
    // Deliberately generic -- doesn't reveal whether the email exists.
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = signSession(
    {
      email: user.email,
      name: user.name || user.email,
      exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
    },
    process.env.SESSION_SECRET
  );

  res.setHeader('Set-Cookie', [
    COOKIE_NAME + '=' + token + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + SESSION_MAX_AGE_SECONDS
  ]);

  return res.status(200).json({ ok: true, email: user.email, name: user.name || user.email });
};
