const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/', (req, res) => {
  res.json(store.orders);
});

router.post('/', (req, res) => {
  const { supplier, items, total, deliveryDate } = req.body;
  if (!supplier || !total) return res.status(400).json({ error: 'supplier and total required' });
  const id = `PO-2026-${String(store.orders.length + 43).padStart(3, '0')}`;
  const order = {
    id, supplier,
    items: Array.isArray(items) ? items : items.split(',').map(s => s.trim()).filter(Boolean),
    total: parseFloat(total),
    status: 'Pending',
    lineItems: [],
    orderDate: new Date().toISOString().slice(0, 10),
    deliveryDate: deliveryDate || '—',
  };
  store.orders.unshift(order);
  res.status(201).json(order);
});

router.patch('/:id', (req, res) => {
  const order = store.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  if (req.body.status) order.status = req.body.status;
  res.json(order);
});

module.exports = router;
