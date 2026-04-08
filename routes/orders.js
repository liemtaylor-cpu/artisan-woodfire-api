const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { ensureLoaded, persist } = require('../lib/persistence');

const VALID_STATUSES = ['Pending', 'In Transit', 'Delivered', 'Cancelled'];

router.get('/', async (req, res) => {
  await ensureLoaded();
  res.json(store.orders);
});

router.post('/', async (req, res) => {
  await ensureLoaded();
  const { supplier, items, total, deliveryDate } = req.body;

  if (!supplier || typeof supplier !== 'string' || supplier.length > 100) {
    return res.status(400).json({ error: 'supplier is required (string, max 100 chars)' });
  }
  const parsedTotal = parseFloat(total);
  if (isNaN(parsedTotal) || parsedTotal < 0) {
    return res.status(400).json({ error: 'total must be a non-negative number' });
  }

  const id = `PO-2026-${String(store.orders.length + 43).padStart(3, '0')}`;
  const order = {
    id,
    supplier: supplier.trim(),
    items: Array.isArray(items)
      ? items.map(String).slice(0, 50)
      : String(items || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 50),
    total: Math.round(parsedTotal * 100) / 100,
    status: 'Pending',
    lineItems: [],
    orderDate: new Date().toISOString().slice(0, 10),
    deliveryDate: deliveryDate ? String(deliveryDate).slice(0, 20) : '—',
  };
  store.orders.unshift(order);
  await persist('orders');
  res.status(201).json(order);
});

router.patch('/:id', async (req, res) => {
  await ensureLoaded();
  const order = store.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });

  if (req.body.status !== undefined) {
    if (!VALID_STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    order.status = req.body.status;
  }
  await persist('orders');
  res.json(order);
});

module.exports = router;
