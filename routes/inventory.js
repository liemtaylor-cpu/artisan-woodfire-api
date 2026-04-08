const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { ensureLoaded, persist } = require('../lib/persistence');

router.get('/', async (req, res) => {
  await ensureLoaded();
  res.json(store.inventory);
});

router.patch('/:id', async (req, res) => {
  await ensureLoaded();
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const { currentStock } = req.body;
  if (currentStock === undefined || isNaN(parseFloat(currentStock))) {
    return res.status(400).json({ error: 'currentStock must be a number' });
  }
  const stock = Math.max(0, parseFloat(currentStock));

  const item = store.inventory.find(i => i.id === id);
  if (!item) return res.status(404).json({ error: 'Not found' });

  item.currentStock = Math.round(stock * 100) / 100;
  await persist('inventory');
  res.json(item);
});

router.post('/receive', async (req, res) => {
  await ensureLoaded();
  const { id, qty } = req.body;
  if (!id || isNaN(parseFloat(qty)) || parseFloat(qty) <= 0) {
    return res.status(400).json({ error: 'id and positive qty required' });
  }
  const item = store.inventory.find(i => i.id === parseInt(id));
  if (!item) return res.status(404).json({ error: 'Not found' });

  item.currentStock = Math.round((item.currentStock + parseFloat(qty)) * 100) / 100;
  await persist('inventory');
  res.json(item);
});

router.post('/bulk-update', async (req, res) => {
  await ensureLoaded();
  const { updates } = req.body;
  if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates must be an array' });

  for (const u of updates) {
    if (isNaN(parseFloat(u.currentStock)) || u.currentStock < 0) continue;
    const item = store.inventory.find(i => i.id === u.id);
    if (item) item.currentStock = Math.round(parseFloat(u.currentStock) * 100) / 100;
  }
  await persist('inventory');
  res.json(store.inventory);
});

module.exports = router;
