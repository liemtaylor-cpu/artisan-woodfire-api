/**
 * Staff portal authentication.
 * POST /api/auth/staff  { password: "..." }  → { ok: true } or 401
 *
 * The actual password lives in STAFF_PORTAL_PASSWORD env var — never in frontend code.
 * Frontend stores a flag in localStorage after a successful check.
 */
const express = require('express');
const router = express.Router();

router.post('/staff', (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'password required' });

  const expected = process.env.STAFF_PORTAL_PASSWORD;
  if (!expected) {
    // Not configured — allow any non-empty password in dev
    return res.json({ ok: true });
  }

  if (password !== expected) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  res.json({ ok: true });
});

module.exports = router;
