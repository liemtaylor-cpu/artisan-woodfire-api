/**
 * Shift4 webhook signature validation middleware.
 *
 * Shift4 sends: Shift4-Signature: t=TIMESTAMP,v1=HMAC_SHA256_HEX
 * Signed payload: `${timestamp}.${rawBody}`
 *
 * If SHIFT4_WEBHOOK_SECRET is not set, validation is skipped (dev mode).
 * In production, always set this env var.
 */
const crypto = require('crypto');

function validateShift4Webhook(req, res, next) {
  const secret = process.env.SHIFT4_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[webhook] SHIFT4_WEBHOOK_SECRET not set — skipping signature validation');
    return next();
  }

  const header = req.headers['shift4-signature'] || req.headers['x-shift4-signature'];
  if (!header) {
    return res.status(401).json({ error: 'Missing Shift4-Signature header' });
  }

  // Parse t=...,v1=...
  const parts = {};
  header.split(',').forEach(part => {
    const [k, v] = part.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  });

  const timestamp = parts.t;
  const receivedSig = parts.v1;

  if (!timestamp || !receivedSig) {
    return res.status(401).json({ error: 'Malformed Shift4-Signature header' });
  }

  // Replay attack protection: reject if timestamp is >5 minutes old
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp));
  if (age > 300) {
    return res.status(401).json({ error: 'Webhook timestamp too old — possible replay attack' });
  }

  // Compute expected signature: HMAC-SHA256(secret, "timestamp.rawBody")
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(receivedSig, 'hex'), Buffer.from(expected, 'hex'))) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  next();
}

module.exports = { validateShift4Webhook };
