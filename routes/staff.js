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
