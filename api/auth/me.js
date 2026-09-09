// Vercel serverless function: returns the signed-in portal user's identity
// based on the session cookie, for client-side header display (name,
// avatar initials, etc.). This is a UX convenience only -- actual page
// access is enforced server-side by /middleware.js, not by this endpoint
// or by any client-side check.

const { parseCookies, verifySession, COOKIE_NAME } = require('./_session');

module.exports = async function handler(req, res) {
  if (!process.env.SESSION_SECRET) {
    return res.status(500).json({ error: 'Sign-in is not configured yet.' });
  }

  const cookies = parseCookies(req.headers.cookie);
  const payload = verifySession(cookies[COOKIE_NAME], process.env.SESSION_SECRET);

  if (!payload) {
    return res.status(401).json({ error: 'Not signed in.' });
  }

  return res.status(200).json({ email: payload.email, name: payload.name });
};
