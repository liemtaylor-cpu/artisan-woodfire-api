const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { ensureLoaded, persist } = require('../lib/persistence');
const { validateShift4Webhook } = require('../middleware/validateWebhook');
const { RECIPES } = require('../data/seed');
const sling = require('../lib/sling');

// Map POS SKUs to internal recipe IDs
const SKU_MAP = {
  'PIZZA-MARGHERITA':  1,
  'PIZZA-SAUSAGE':     2,
  'PIZZA-PROSCIUTTO':  3,
  'PIZZA-TRUFFLE':     4,
  'PIZZA-BURRATA':     5,
  'PIZZA-PANCETTA':    6,
};

function processOrder(order) {
  const results = [];

  order.items.forEach(lineItem => {
    const recipeId = SKU_MAP[lineItem.sku];
    if (!recipeId) return;

    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) return;

    const qty = Math.max(0, parseInt(lineItem.qty) || 1);

    const sale = store.sales.find(s => s.recipeId === recipeId);
    if (sale) sale.qty += qty;
    else store.sales.push({ recipeId, qty });

    recipe.ingredients.forEach(ing => {
      const item = store.inventory.find(i => i.id === ing.id);
      if (!item) return;
      const deducted = Math.round(ing.qty * qty * 100) / 100;
      const before = item.currentStock;
      item.currentStock = Math.max(0, Math.round((item.currentStock - deducted) * 100) / 100);
      const wentLow = item.currentStock < item.minStock && before >= item.minStock;
      results.push({ itemId: item.id, name: item.name, deducted, remaining: item.currentStock, wentLow });
    });
  });

  return results;
}

// POST /api/webhook/pos — Shift4 sends events here
// validateShift4Webhook verifies HMAC signature before processing
router.post('/pos', validateShift4Webhook, async (req, res) => {
  await ensureLoaded();

  const { event, transaction_id, timestamp, location_id, order } = req.body;

  if (!transaction_id || typeof transaction_id !== 'string' || transaction_id.length > 200) {
    return res.status(400).json({ error: 'Invalid transaction_id' });
  }
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    return res.status(400).json({ error: 'Missing or empty order.items' });
  }
  if (order.items.length > 100) {
    return res.status(400).json({ error: 'Too many line items' });
  }

  if (event && event !== 'order.completed') {
    return res.status(200).json({ status: 'ignored', reason: `event "${event}" not processed` });
  }

  if (store.transactions.has(transaction_id)) {
    return res.status(200).json({ status: 'duplicate', transaction_id });
  }

  const deductions = processOrder(order);

  store.transactions.add(transaction_id);
  const record = {
    transaction_id,
    event: event || 'order.completed',
    location_id: location_id || null,
    timestamp: timestamp || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    order,
    deductions,
    lowStockAlerts: deductions.filter(d => d.wentLow).map(d => d.name),
  };
  store.txLog.unshift(record);
  // Keep txLog bounded to last 500 entries
  if (store.txLog.length > 500) store.txLog = store.txLog.slice(0, 500);

  // Persist inventory and sales updates
  await Promise.all([persist('inventory'), persist('sales'), persist('txLog')]);

  // Send Sling alerts for any newly low items (fire-and-forget, non-blocking)
  if (store.settings?.notifications?.lowStock !== false) {
    for (const d of deductions.filter(d => d.wentLow)) {
      const item = store.inventory.find(i => i.id === d.itemId);
      if (item) {
        sling.sendLowStockAlert(item.name, d.remaining, item.unit, item.supplier)
          .catch(e => console.warn('[sling] low-stock alert failed:', e.message));
      }
    }
  }

  res.status(200).json({
    status: 'processed',
    transaction_id,
    itemsProcessed: order.items.length,
    inventoryUpdates: deductions.length,
    lowStockAlerts: record.lowStockAlerts,
  });
});

// GET /api/webhook/transactions
router.get('/transactions', async (req, res) => {
  await ensureLoaded();
  res.json(store.txLog);
});

module.exports = router;
