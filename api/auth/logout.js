// Vercel serverless function: clears the portal session cookie.

const { COOKIE_NAME } = require('./_session');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  res.setHeader('Set-Cookie', [
    COOKIE_NAME + '=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
  ]);

  return res.status(200).json({ ok: true });
};
