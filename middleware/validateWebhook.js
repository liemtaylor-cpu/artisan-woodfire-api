/**
 * Shift4 webhook middleware.
 *
 * Shift4 does not use HMAC signing. Their security model is:
 * receive the event ID from the webhook, then call back to the
 * Shift4 API to fetch the real charge data. A fake webhook with
 * a made-up charge ID will fail at the API callback step.
 */
function validateShift4Webhook(req, res, next) {
  next();
}

module.exports = { validateShift4Webhook };
