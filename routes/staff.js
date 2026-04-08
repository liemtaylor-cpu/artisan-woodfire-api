const express = require('express');
const router = express.Router();
const { STAFF, TODAY_SHIFTS } = require('../data/seed');
const store = require('../data/store');
const { ensureLoaded, persist } = require('../lib/persistence');
const sling = require('../lib/sling');

const h = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /api/staff — roster + today's shifts
router.get('/', h(async (req, res) => {
  await ensureLoaded();
  res.json({ staff: store.staff, shifts: TODAY_SHIFTS });
}));

// PUT /api/staff/:id — update an employee
router.put('/:id', h(async (req, res) => {
  await ensureLoaded();
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'id must be a number' });
  const idx = store.staff.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Employee not found' });
  const { name, role, phone, rate, status, skills } = req.body;
  if (name    !== undefined) store.staff[idx].name   = name;
  if (role    !== undefined) store.staff[idx].role   = role;
  if (phone   !== undefined) store.staff[idx].phone  = phone;
  if (rate    !== undefined) store.staff[idx].rate   = rate;
  if (status  !== undefined) store.staff[idx].status = status;
  if (skills  !== undefined) store.staff[idx].skills = skills;
  await persist('staff');
  res.json(store.staff[idx]);
}));

// POST /api/staff — add a new employee
router.post('/', h(async (req, res) => {
  await ensureLoaded();
  const { name, role, phone, rate, status, skills } = req.body;
  const id = Math.max(...store.staff.map(s => s.id), 0) + 1;
  const employee = { id, name, role, phone, rate, status: status || 'active', skills: skills || [] };
  store.staff.push(employee);
  await persist('staff');
  res.status(201).json(employee);
}));

// DELETE /api/staff/:id — remove an employee
router.delete('/:id', h(async (req, res) => {
  await ensureLoaded();
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'id must be a number' });
  const idx = store.staff.findIndex(s => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Employee not found' });
  store.staff.splice(idx, 1);
  await persist('staff');
  res.json({ deleted: true });
}));

/**
 * POST /api/staff/alert
 * Sends a message via Sling (real or simulated).
 * Body: { message: "..." }
 */
router.post('/alert', async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'message is required' });
  }
  if (message.length > 500) {
    return res.status(400).json({ error: 'message too long (max 500 chars)' });
  }

  try {
    const result = await sling.sendMessage(message.trim());
    res.json({
      sent: true,
      message: message.trim(),
      simulated: result.simulated || false,
      ...(result.simulated && { note: 'Running in simulation mode — set SLING_API_TOKEN, SLING_ORG_ID, SLING_GROUP_ID to send real Sling messages' }),
    });
  } catch (err) {
    console.error('[staff/alert] Sling error:', err.message);
    res.status(502).json({ error: `Sling send failed: ${err.message}` });
  }
});

/**
 * GET /api/staff/shifts/live
 * Fetches today's actual shift schedule from Sling (or returns simulation note).
 */
router.get('/shifts/live', async (req, res) => {
  try {
    const result = await sling.fetchTodayShifts();
    res.json(result);
  } catch (err) {
    console.error('[staff/shifts/live] Sling error:', err.message);
    res.status(502).json({ error: `Sling fetch failed: ${err.message}` });
  }
});

module.exports = router;
