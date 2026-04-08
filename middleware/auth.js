/**
 * API key authentication middleware.
 * Checks X-API-Key header against API_SECRET_KEY env var.
 * If API_SECRET_KEY is not configured, all requests pass through (dev mode).
 *
 * Webhook routes use their own HMAC validation and are exempt.
 */
function requireApiKey(req, res, next) {
  const expected = process.env.API_SECRET_KEY;
  if (!expected) return next(); // Not configured — dev/unconfigured mode, allow all

  const key = req.headers['x-api-key'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  if (!key || key !== expected) {
    return res.status(401).json({ error: 'Unauthorized — invalid or missing API key' });
  }
  next();
}

module.exports = { requireApiKey };
