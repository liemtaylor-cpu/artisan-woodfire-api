const express = require('express');
const router = express.Router();
const { RECIPES } = require('../data/seed');

// GET /api/recipes
router.get('/', (req, res) => {
  res.json(RECIPES);
});

module.exports = router;
