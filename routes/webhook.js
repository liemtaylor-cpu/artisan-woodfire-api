const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { RECIPES } = require('../data/seed');

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
    if (!recipeId) return; // unknown SKU — skip

    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) return;

    const qty = lineItem.qty;

    // 1. Update sales totals
    const sale = store.sales.find(s => s.recipeId === recipeId);
    if (sale) {
      sale.qty += qty;
    } else {
      store.sales.push({ recipeId, qty });
    }

    // 2. Deduct inventory for each ingredient
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

// POST /api/webhook/pos
router.post('/pos', (req, res) => {
  const { event, transaction_id, timestamp, location_id, order } = req.body;

  // Validate required fields
  if (!transaction_id || !order || !Array.isArray(order.items)) {
    return res.status(400).json({ error: 'Missing transaction_id or order.items' });
  }

  // Only process completed orders
  if (event && event !== 'order.completed') {
    return res.status(200).json({ status: 'ignored', reason: `event "${event}" not processed` });
  }

  // Idempotency check
  if (store.transactions.has(transaction_id)) {
    return res.status(200).json({ status: 'duplicate', transaction_id });
  }

  // Process
  const deductions = processOrder(order);

  // Record transaction
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

  res.status(200).json({
    status: 'processed',
    transaction_id,
    itemsProcessed: order.items.length,
    inventoryUpdates: deductions.length,
    lowStockAlerts: record.lowStockAlerts,
  });
});

// GET /api/webhook/transactions — view all processed transactions
router.get('/transactions', (req, res) => {
  res.json(store.txLog);
});

module.exports = router;
