const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/', (req, res) => {
  res.json(store.inventory);
});

router.patch('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { currentStock } = req.body;
  const item = store.inventory.find(i => i.id === id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  item.currentStock = Math.round(currentStock * 100) / 100;
  res.json(item);
});

router.post('/receive', (req, res) => {
  const { id, qty } = req.body;
  const item = store.inventory.find(i => i.id === id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  if (!qty || isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'Invalid qty' });
  item.currentStock = Math.round((item.currentStock + qty) * 100) / 100;
  res.json(item);
});

router.post('/bulk-update', (req, res) => {
  const { updates } = req.body;
  updates.forEach(u => {
    const item = store.inventory.find(i => i.id === u.id);
    if (item) item.currentStock = Math.round(u.currentStock * 100) / 100;
  });
  res.json(store.inventory);
});

module.exports = router;
