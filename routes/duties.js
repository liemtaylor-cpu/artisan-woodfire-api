const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/', (req, res) => {
  res.json(store.duties);
});

router.post('/', (req, res) => {
  store.duties = req.body;
  res.json(store.duties);
});

module.exports = router;
