const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/', (req, res) => {
  res.json(store.competencies);
});

router.post('/', (req, res) => {
  store.competencies = req.body;
  res.json(store.competencies);
});

module.exports = router;
