const express = require('express');
const router = express.Router();
const { STAFF, TODAY_SHIFTS } = require('../data/seed');
const sling = require('../lib/sling');

// GET /api/staff — roster + today's shifts
router.get('/', (req, res) => {
  res.json({ staff: STAFF, shifts: TODAY_SHIFTS });
});

/**
 * POST /api/staff/alert
 * Sends a message via the real Sling API.
 * Body: { message: "..." }
 * Falls back with a clear error if SLING_API_TOKEN is not set.
 */
router.post('/alert', async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'message is required' });
  }
  if (message.length > 500) {
    return res.status(400).json({ error: 'message too long (max 500 chars)' });
  }

  if (!process.env.SLING_API_TOKEN) {
    return res.status(503).json({
      error: 'Sling not configured — set SLING_API_TOKEN, SLING_ORG_ID, SLING_GROUP_ID in environment variables',
      configured: false,
    });
  }

  try {
    await sling.sendMessage(message.trim());
    res.json({ sent: true, message: message.trim() });
  } catch (err) {
    console.error('[staff/alert] Sling error:', err.message);
    res.status(502).json({ error: `Sling send failed: ${err.message}` });
  }
});

/**
 * GET /api/staff/shifts/live
 * Fetches today's actual shift schedule from Sling.
 */
router.get('/shifts/live', async (req, res) => {
  if (!process.env.SLING_API_TOKEN) {
    return res.status(503).json({
      error: 'Sling not configured',
      configured: false,
    });
  }

  try {
    const shifts = await sling.fetchTodayShifts();
    res.json(shifts);
  } catch (err) {
    console.error('[staff/shifts/live] Sling error:', err.message);
    res.status(502).json({ error: `Sling fetch failed: ${err.message}` });
  }
});

module.exports = router;
