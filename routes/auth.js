/**
 * Staff portal authentication.
 * POST /api/auth/staff  { password: "..." }  → { ok: true, role: "owner"|"manager"|"employee" } or 401
 *
 * Passwords live in env vars — never in frontend code.
 * Defaults are for local dev only; set real passwords in Vercel env vars.
 */
const express = require('express');
const router = express.Router();

router.post('/staff', (req, res) => {
  const { password } = req.body || {};
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password required' });
  }

  const ownerPw    = process.env.OWNER_PASSWORD    || 'owner2026';
  const managerPw  = process.env.MANAGER_PASSWORD  || 'manager2026';
  const employeePw = process.env.EMPLOYEE_PASSWORD || 'employee2026';

  if (password === ownerPw)    return res.json({ ok: true, role: 'owner' });
  if (password === managerPw)  return res.json({ ok: true, role: 'manager' });
  if (password === employeePw) return res.json({ ok: true, role: 'employee' });

  return res.status(401).json({ error: 'Invalid password' });
});

module.exports = router;
