const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { ensureLoaded, persist } = require('../lib/persistence');
const { validateShift4Webhook } = require('../middleware/validateWebhook');
const sling = require('../lib/sling');

// Wraps async handlers so thrown errors reach Express's error handler
const h = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function processOrder(order) {
  const results = [];
  order.items.forEach(lineItem => {
    // Build SKU map dynamically from store so recipe edits take effect immediately
    const recipe = store.recipes.find(r => r.sku && r.sku.toUpperCase() === (lineItem.sku || '').toUpperCase());
    if (!recipe) return;
    const qty = Math.max(0, parseInt(lineItem.qty) || 1);
    const sale = store.sales.find(s => s.recipeId === recipe.id);
    if (sale) sale.qty += qty;
    else store.sales.push({ recipeId: recipe.id, qty });
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

// GET /api/webhook/pos — browser-friendly confirmation (Shift4 only POSTs here)
router.get('/pos', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Shift4 webhook endpoint is live. This URL only accepts POST requests from Shift4.' });
});

// POST /api/webhook/pos — receives live Shift4 events
router.post('/pos', validateShift4Webhook, h(async (req, res) => {
  await ensureLoaded();
  const body = req.body || {};

  // Support both Shift4 event envelope formats:
  // Real Shift4: { type: "CHARGE_SUCCEEDED", data: { id, details: { lineItems } } }
  // Legacy/test:  { event: "order.completed", transaction_id, order: { items } }
  const event          = body.type        || body.event        || null;
  const transaction_id = body.data?.id   || body.transaction_id || null;
  const timestamp      = body.created    || body.timestamp    || new Date().toISOString();
  const location_id    = body.locationId || body.location_id  || null;
  const amountCents    = body.data?.amount ?? null;   // Shift4 sends amount in cents

  // Per Shift4 docs: webhook only contains the event ID.
  // Fetch full charge details from Shift4 API to get line items.
  let chargeData = body.data || {};
  if (transaction_id && sling.isConfigured !== undefined && require('../lib/shift4').isConfigured()) {
    try {
      const shift4 = require('../lib/shift4');
      const fullCharge = await shift4.fetchCharge(transaction_id);
      chargeData = fullCharge;
    } catch (e) {
      console.warn('[webhook] Could not fetch full charge from Shift4:', e.message);
      // Fall through and use whatever data came in the webhook body
    }
  }

  // Normalize line items — try all known Shift4 payload locations
  const rawItems = chargeData.details?.lineItems
    || chargeData.lineItems
    || body.data?.details?.lineItems
    || body.data?.lineItems
    || body.order?.items
    || [];

  const normalizedItems = rawItems.map(item => ({
    sku: item.sku || item.productCode || item.description || item.name || '',
    qty: item.quantity ?? item.qty ?? 1,
  }));

  // Fallback: extract SKU from description field (manual test charges)
  if (normalizedItems.length === 0) {
    const desc = (chargeData.description || body.data?.description || body.description || '').trim().toUpperCase();
    const matchedRecipe = store.recipes.find(r => r.sku && r.sku.toUpperCase() === desc);
    if (desc && matchedRecipe) {
      normalizedItems.push({ sku: desc, qty: 1 });
    }
  }

  // Respond 200 immediately — Shift4 marks anything else as FAILED
  // (We'll still process, but we ack first)

  if (!transaction_id || typeof transaction_id !== 'string' || transaction_id.length > 200) {
    return res.status(200).json({ status: 'ignored', reason: 'Missing or invalid transaction/charge ID' });
  }

  const ACCEPTED_EVENTS = ['CHARGE_SUCCEEDED', 'order.completed', 'charge.succeeded'];
  if (event && !ACCEPTED_EVENTS.includes(event)) {
    return res.status(200).json({ status: 'ignored', reason: `event "${event}" not processed` });
  }

  if (normalizedItems.length === 0) {
    return res.status(200).json({ status: 'ignored', reason: 'No line items found in payload' });
  }
  if (normalizedItems.length > 100) {
    return res.status(200).json({ status: 'ignored', reason: 'Too many line items' });
  }

  if (store.transactions.has(transaction_id)) {
    return res.status(200).json({ status: 'duplicate', transaction_id });
  }

  const order = { items: normalizedItems };
  const deductions = processOrder(order);
  store.transactions.add(transaction_id);
  const record = {
    transaction_id,
    event: event || 'CHARGE_SUCCEEDED',
    location_id: location_id || null,
    timestamp,
    receivedAt: new Date().toISOString(),
    amount: amountCents !== null ? amountCents / 100 : null,  // convert cents → dollars
    order,
    deductions,
    lowStockAlerts: deductions.filter(d => d.wentLow).map(d => d.name),
  };
  store.txLog.unshift(record);
  if (store.txLog.length > 500) store.txLog = store.txLog.slice(0, 500);

  await Promise.all([persist('inventory'), persist('sales'), persist('txLog')]);

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
}));

// GET /api/webhook/transactions
router.get('/transactions', h(async (req, res) => {
  await ensureLoaded();
  res.json(store.txLog);
}));

// POST /api/webhook/test — fires a simulated POS order, no HMAC required
router.post('/test', h(async (req, res) => {
  await ensureLoaded();
  const shift4 = require('../lib/shift4');

  const body = req.body || {};
  const testOrder = Array.isArray(body.items) && body.items.length
    ? {
        event: 'order.completed',
        transaction_id: `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        location_id: 'LOC-CHI-001',
        order: { items: body.items },
      }
    : shift4.generateTestOrder();

  store.transactions.add(testOrder.transaction_id);
  const deductions = processOrder(testOrder.order);

  const record = {
    transaction_id: testOrder.transaction_id,
    event: testOrder.event,
    location_id: testOrder.location_id,
    timestamp: testOrder.timestamp,
    receivedAt: new Date().toISOString(),
    order: testOrder.order,
    deductions,
    lowStockAlerts: deductions.filter(d => d.wentLow).map(d => d.name),
    test: true,
  };
  store.txLog.unshift(record);
  if (store.txLog.length > 500) store.txLog = store.txLog.slice(0, 500);

  await Promise.all([persist('inventory'), persist('sales'), persist('txLog')]);

  for (const d of deductions.filter(d => d.wentLow)) {
    const item = store.inventory.find(i => i.id === d.itemId);
    if (item) {
      sling.sendLowStockAlert(item.name, d.remaining, item.unit, item.supplier)
        .catch(e => console.warn('[sling] low-stock alert failed:', e.message));
    }
  }

  res.json({
    status: 'test_processed',
    transaction_id: testOrder.transaction_id,
    order: testOrder.order,
    inventoryUpdates: deductions.length,
    lowStockAlerts: record.lowStockAlerts,
    deductions,
  });
}));

module.exports = router;
