const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { ensureLoaded, persist } = require('../lib/persistence');

router.get('/', async (req, res) => {
  await ensureLoaded();
  res.json(store.competencies);
});

router.post('/', async (req, res) => {
  await ensureLoaded();
  const body = req.body;
  if (typeof body !== 'object' || Array.isArray(body) || body === null) {
    return res.status(400).json({ error: 'Competencies must be a JSON object' });
  }
  store.competencies = body;
  await persist('competencies');
  res.json(store.competencies);
});

module.exports = router;
