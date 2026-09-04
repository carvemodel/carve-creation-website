// Vercel serverless function: receives the contact form submission and
// emails it via Resend. No npm dependencies required (uses native fetch).
//
// Required environment variable (set in Vercel Project Settings -> Environment Variables):
//   RESEND_API_KEY      - your Resend API key
// Optional:
//   CONTACT_TO_EMAIL    - inbox that should receive leads (defaults to sales@carvecreation.com)
//   CONTACT_FROM_EMAIL  - verified sender address (defaults to Resend's sandbox sender,
//                         which works immediately but is best replaced once carvecreation.com
//                         is verified as a sending domain in Resend)

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('Missing RESEND_API_KEY environment variable.');
    return res.status(500).json({ error: 'Email service is not configured yet.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const {
    name, company, email, phone,
    project_name, project_location, role, market,
    needs, project_stage, budget, delivery_timing,
    project_details, file_link
  } = body;

  if (!name || !company || !email || !project_location || !project_stage || !project_details) {
    return res.status(400).json({ error: 'Please complete all required fields.' });
  }

  const needsList = Array.isArray(needs) ? needs.join(', ') : (needs || 'Not specified');

  const html = `
    <h2 style="font-family:sans-serif;">New Project Inquiry &mdash; Carve Creation Website</h2>
    <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;">
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Name</td><td>${escapeHtml(name)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Company</td><td>${escapeHtml(company)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Email</td><td>${escapeHtml(email)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Phone</td><td>${escapeHtml(phone || 'Not provided')}</td></tr>
      <tr><td style="padding:12px 12px 4px 0;color:#666;">Project Name</td><td style="padding-top:12px;">${escapeHtml(project_name || 'Not provided')}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Project Location</td><td>${escapeHtml(project_location)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Role</td><td>${escapeHtml(role || 'Not provided')}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Market</td><td>${escapeHtml(market || 'Not provided')}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">What They Need</td><td>${escapeHtml(needsList)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Project Stage</td><td>${escapeHtml(project_stage)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Budget</td><td>${escapeHtml(budget || 'Not provided')}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666;">Target Delivery Timing</td><td>${escapeHtml(delivery_timing || 'Not provided')}</td></tr>
      <tr><td style="padding:12px 12px 4px 0;color:#666;vertical-align:top;">Project Description</td><td style="padding-top:12px;white-space:pre-wrap;">${escapeHtml(project_details)}</td></tr>
      <tr><td style="padding:12px 12px 4px 0;color:#666;">File-Sharing Link</td><td style="padding-top:12px;">${escapeHtml(file_link || 'None provided')}</td></tr>
    </table>
  `;

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL || 'Carve Creation Website <onboarding@resend.dev>',
        to: process.env.CONTACT_TO_EMAIL || 'sales@carvecreation.com',
        reply_to: email,
        subject: `New Project Inquiry from ${name} (${company})`,
        html
      })
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend API error:', resendRes.status, errText);
      return res.status(502).json({ error: 'The email service rejected the message.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact form send error:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
