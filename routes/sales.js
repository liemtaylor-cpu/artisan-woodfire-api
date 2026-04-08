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
 * Pulls today's real transactions from Shift4 and replaces store.sales.
 * Falls back gracefully if SHIFT4_API_KEY is not configured.
 */
router.post('/sync', async (req, res) => {
  await ensureLoaded();

  if (!process.env.SHIFT4_API_KEY) {
    return res.status(503).json({
      error: 'Shift4 not configured — set SHIFT4_API_KEY in environment variables',
      configured: false,
    });
  }

  try {
    const liveSales = await shift4.fetchTodaySales();

    // Merge with existing store: update qty for known recipes, add new ones
    for (const liveSale of liveSales) {
      const existing = store.sales.find(s => s.recipeId === liveSale.recipeId);
      if (existing) existing.qty = liveSale.qty;
      else store.sales.push(liveSale);
    }

    await persist('sales');
    res.json({ synced: true, sales: store.sales, count: liveSales.length });
  } catch (err) {
    console.error('[sales/sync] Shift4 error:', err.message);
    res.status(502).json({ error: `Shift4 sync failed: ${err.message}` });
  }
});

module.exports = router;
