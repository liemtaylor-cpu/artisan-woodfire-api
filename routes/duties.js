const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { ensureLoaded, persist } = require('../lib/persistence');

router.get('/', async (req, res) => {
  await ensureLoaded();
  res.json(store.duties);
});

router.post('/', async (req, res) => {
  await ensureLoaded();
  const body = req.body;
  // Must be a plain object, not an array or primitive
  if (typeof body !== 'object' || Array.isArray(body) || body === null) {
    return res.status(400).json({ error: 'Duties must be a JSON object' });
  }
  store.duties = body;
  await persist('duties');
  res.json(store.duties);
});

module.exports = router;
