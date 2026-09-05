// Vercel serverless function: issues short-lived client tokens so the browser
// can upload project files (drawings, specs, renderings, etc.) directly to
// Vercel Blob storage, bypassing the ~4.5MB request body limit that a normal
// serverless function endpoint would hit.
//
// Required environment variable (auto-added when you create a Blob store in
// Vercel: Project -> Storage -> Create Database -> Blob):
//   BLOB_READ_WRITE_TOKEN
//
// This route does not receive file bytes itself -- it only authorizes the
// upload and (optionally) gets notified once it finishes. See:
// https://vercel.com/docs/vercel-blob/client-upload

const { handleUpload } = require('@vercel/blob/client');

// Keep this in sync with the formats advertised on the contact form.
// Many browsers report generic/absent MIME types for CAD files like .dwg, so
// 'application/octet-stream' is included as a practical fallback -- this
// endpoint relies on the max size cap (below) and Blob's private storage
// rather than strict MIME filtering to control abuse.
const ALLOWED_CONTENT_TYPES = [
  'application/pdf',
  'application/acad',
  'application/x-acad',
  'application/dwg',
  'application/x-dwg',
  'image/vnd.dwg',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream'
];

const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200MB per file

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_FILE_SIZE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ pathname })
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // No database to update yet -- the browser already has the blob URL
        // and includes it in the /api/contact submission. Logged for visibility
        // in Vercel's function logs.
        console.log('Project file uploaded to Blob:', blob.url);
      }
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('Blob client-upload token error:', error);
    // handleUpload's webhook step retries on non-200s, so keep this at 400
    // for actual client errors (bad content-type, oversized file, etc.).
    return res.status(400).json({ error: error.message || 'Upload could not be authorized.' });
  }
};
