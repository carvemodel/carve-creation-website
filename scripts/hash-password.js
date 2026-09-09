#!/usr/bin/env node
// Admin-only helper for adding or resetting a Carve Creation project portal
// account. There is no self-serve registration page anywhere in this
// project on purpose -- this script is the only way a portal account gets
// created, and it only runs on whoever's machine has this repo checked
// out, not on the live site.
//
// Usage:
//   node scripts/hash-password.js "person@carvecreation.com" "Their Name" "a-strong-password"
//
// What to do with the output:
//   1. Copy the printed JSON object.
//   2. In the Vercel project (Settings -> Environment Variables), open
//      PORTAL_USERS. It holds a JSON array of these objects -- add the new
//      one to the array (or replace an existing entry with the same email
//      to reset that person's password).
//   3. Save, then redeploy (or trigger a redeploy) so the new value takes
//      effect. Vercel serverless functions and Edge Middleware only pick
//      up environment variable changes on a fresh deployment.
//
// If PORTAL_USERS doesn't exist yet, create it as a new environment
// variable with a JSON array containing just this one object, e.g.:
//   [{"email":"person@carvecreation.com","name":"Their Name","salt":"...","hash":"..."}]
//
// You'll also need a SESSION_SECRET environment variable set to any long
// random string (e.g. run `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
// once and reuse the same value forever -- changing it later logs
// everyone out).

const crypto = require('crypto');

const email = process.argv[2];
const name = process.argv[3];
const password = process.argv[4];

if (!email || !name || !password) {
  console.error('Usage: node scripts/hash-password.js "<email>" "<full name>" "<password>"');
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString('hex');
crypto.scrypt(password, salt, 64, function (err, derivedKey) {
  if (err) throw err;
  const hash = derivedKey.toString('hex');
  const entry = { email: email.trim().toLowerCase(), name: name.trim(), salt: salt, hash: hash };
  console.log('\nAdd this object to the PORTAL_USERS array in Vercel:\n');
  console.log(JSON.stringify(entry, null, 2));
  console.log('');
});
