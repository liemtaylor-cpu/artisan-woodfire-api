const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { ensureLoaded, persist } = require('../lib/persistence');
const shift4 = require('../lib/shift4');

router.get('/', async (req, res) => {
  await ensureLoaded();
  res.json(store.sales);
});

/**
 * POST /api/sales/sync
 * Pulls today's transactions from Shift4 (real or simulated) and updates store.sales.
 */
router.post('/sync', async (req, res) => {
  await ensureLoaded();

  try {
    const { sales: liveSales, simulated } = await shift4.fetchTodaySales();

    for (const liveSale of liveSales) {
      const existing = store.sales.find(s => s.recipeId === liveSale.recipeId);
      if (existing) existing.qty = liveSale.qty;
      else store.sales.push(liveSale);
    }

    await persist('sales');
    res.json({
      synced: true,
      simulated,
      sales: store.sales,
      count: liveSales.length,
      ...(simulated && { note: 'Running in simulation mode — set SHIFT4_API_KEY to sync real POS data' }),
    });
  } catch (err) {
    console.error('[sales/sync] Shift4 error:', err.message);
    res.status(502).json({ error: `Shift4 sync failed: ${err.message}` });
  }
});

module.exports = router;
