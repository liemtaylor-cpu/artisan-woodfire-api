const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/', (req, res) => {
  res.json(store.sales);
});

router.post('/sync', (req, res) => {
  store.sales = store.sales.map(s => ({ ...s, qty: s.qty + Math.floor(Math.random() * 4) }));
  res.json(store.sales);
});

module.exports = router;
